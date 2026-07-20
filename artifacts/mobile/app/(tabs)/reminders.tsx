import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { ReminderCard } from '@/components/ReminderCard';
import { EmptyState } from '@/components/EmptyState';
import { DateTimePickerModal } from '@/components/DateTimePickerModal';
import { useCRM, Reminder } from '@/contexts/CRMContext';

type FilterTab = 'Today' | 'Upcoming' | 'Overdue' | 'All';

const FILTER_TABS: FilterTab[] = ['Today', 'Upcoming', 'Overdue', 'All'];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatDateTime(d: Date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SummaryStrip({
  reminders,
  colors,
}: {
  reminders: Reminder[];
  colors: ReturnType<typeof useColors>;
}) {
  const today = new Date().toDateString();
  const now = new Date();
  const todayCount = reminders.filter(r => new Date(r.dateTime).toDateString() === today && r.status !== 'completed').length;
  const upcomingCount = reminders.filter(r => new Date(r.dateTime) > now && r.status === 'pending').length;
  const overdueCount = reminders.filter(r => new Date(r.dateTime) < now && r.status !== 'completed').length;

  return (
    <View style={[strip.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {[
        { label: 'Today', value: todayCount, color: colors.warning },
        { label: 'Upcoming', value: upcomingCount, color: colors.primary },
        { label: 'Overdue', value: overdueCount, color: colors.missed },
        { label: 'Total', value: reminders.length, color: colors.mutedForeground },
      ].map(s => (
        <View key={s.label} style={strip.item}>
          <Text style={[strip.val, { color: s.color }]}>{s.value}</Text>
          <Text style={[strip.label, { color: colors.mutedForeground }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const strip = StyleSheet.create({
  bar: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10 },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  val: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 10, fontFamily: 'Inter_500Medium' },
});

export default function RemindersScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { reminders, updateReminderStatus, deleteReminder, customers, addReminder } = useCRM();

  const [filter, setFilter] = useState<FilterTab>('Today');
  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id ?? '');
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date(Date.now() + 3600000));

  const filtered = useMemo(() => {
    const today = new Date().toDateString();
    const now = new Date();
    switch (filter) {
      case 'Today':
        return reminders.filter(r =>
          new Date(r.dateTime).toDateString() === today && r.status !== 'completed',
        );
      case 'Upcoming':
        return reminders.filter(r => new Date(r.dateTime) > now && r.status === 'pending');
      case 'Overdue':
        return reminders.filter(r => new Date(r.dateTime) < now && r.status !== 'completed');
      default:
        return reminders;
    }
  }, [reminders, filter]);

  function openModal() {
    setSelectedCustomerId(customers[0]?.id ?? '');
    setReminderNote('');
    setReminderDate(new Date(Date.now() + 3600000));
    setModalVisible(true);
  }

  function handleAddReminder() {
    const c = customers.find(x => x.id === selectedCustomerId) ?? customers[0];
    if (!c) return;
    addReminder({
      customerId: c.id,
      customerName: c.name,
      customerMobile: c.mobile,
      dateTime: reminderDate.toISOString(),
      notes: reminderNote.trim(),
      status: 'pending',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  function getFilterCount(f: FilterTab) {
    const today = new Date().toDateString();
    const now = new Date();
    switch (f) {
      case 'Today':
        return reminders.filter(r => new Date(r.dateTime).toDateString() === today && r.status !== 'completed').length;
      case 'Upcoming':
        return reminders.filter(r => new Date(r.dateTime) > now && r.status === 'pending').length;
      case 'Overdue':
        return reminders.filter(r => new Date(r.dateTime) < now && r.status !== 'completed').length;
      default:
        return reminders.length;
    }
  }

  const filterColors: Record<FilterTab, string> = {
    Today: colors.warning,
    Upcoming: colors.primary,
    Overdue: colors.missed,
    All: colors.mutedForeground,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SummaryStrip reminders={reminders} colors={colors} />

      {/* Filter Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {FILTER_TABS.map(f => {
          const active = filter === f;
          const fColor = filterColors[f];
          return (
            <TouchableOpacity
              key={f}
              style={[styles.tab, active && { borderBottomColor: fColor, borderBottomWidth: 2 }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[
                styles.tabText,
                { color: active ? fColor : colors.mutedForeground },
                active && { fontFamily: 'Inter_700Bold' },
              ]}>
                {f}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: active ? fColor + '22' : colors.muted }]}>
                <Text style={[styles.tabBadgeText, { color: active ? fColor : colors.mutedForeground }]}>
                  {getFilterCount(f)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onComplete={() => {
              updateReminderStatus(item.id, 'completed');
              Haptics.selectionAsync();
            }}
            onDelete={() => deleteReminder(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off"
            title={`No ${filter.toLowerCase()} reminders`}
            subtitle="Tap + to schedule a reminder"
          />
        }
        contentContainerStyle={{ paddingBottom: bottom + 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottom + 90 }]}
        onPress={openModal}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Reminder Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: bottom + 20 }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelBtn, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Reminder</Text>
              <TouchableOpacity onPress={handleAddReminder}>
                <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Date & Time Picker trigger */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>DATE & TIME</Text>
                <TouchableOpacity
                  style={[styles.dateTrigger, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Feather name="calendar" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dateValue, { color: colors.primary }]}>
                      {formatDateTime(reminderDate)}
                    </Text>
                    <Text style={[styles.dateTap, { color: colors.primary + 'AA' }]}>Tap to change</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Customer Picker */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>CUSTOMER</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {customers.map(c => {
                    const active = selectedCustomerId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.custChip,
                          { borderColor: colors.border, backgroundColor: colors.muted },
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          setSelectedCustomerId(c.id);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Text style={[styles.custChipText, { color: active ? '#fff' : colors.foreground }]}>
                          {c.name.split(' ')[0]}
                        </Text>
                        {active && <Feather name="check" size={12} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {selectedCustomerId && (
                  <View style={[styles.selectedCustomer, { backgroundColor: colors.muted }]}>
                    <Feather name="user" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.selectedName, { color: colors.foreground }]}>
                      {customers.find(c => c.id === selectedCustomerId)?.name}
                    </Text>
                    <Text style={[styles.selectedMobile, { color: colors.mutedForeground }]}>
                      {customers.find(c => c.id === selectedCustomerId)?.mobile}
                    </Text>
                  </View>
                )}
              </View>

              {/* Note */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>REMINDER NOTE</Text>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={reminderNote}
                  onChangeText={setReminderNote}
                  placeholder="What is this reminder about?"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddReminder}
              >
                <Feather name="bell" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Set Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Time Picker */}
      <DateTimePickerModal
        visible={datePickerVisible}
        value={reminderDate}
        onChange={d => setReminderDate(d)}
        onClose={() => setDatePickerVisible(false)}
        minimumDate={new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, minWidth: 20, alignItems: 'center' },
  tabBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  fab: {
    position: 'absolute', right: 20,
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1565C0', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  cancelBtn: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  dateValue: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  dateTap: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  custChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
  },
  custChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  selectedCustomer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10,
  },
  selectedName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  selectedMobile: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  noteInput: {
    borderRadius: 12, borderWidth: 1, padding: 13,
    fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 80,
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 14,
  },
  saveButtonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
