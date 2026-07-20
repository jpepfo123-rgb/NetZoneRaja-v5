import React, { useState } from 'react';
import {
  Alert,
  Linking,
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CategoryBadge } from '@/components/CategoryBadge';
import { CallHistoryItem } from '@/components/CallHistoryItem';
import { CallPopupModal } from '@/components/CallPopupModal';
import { DateTimePickerModal, formatDateTimeDisplay } from '@/components/DateTimePickerModal';
import { useCRM } from '@/contexts/CRMContext';
import { useAuth } from '@/contexts/AuthContext';
import type { ReminderType } from '@/services/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const REMINDER_TYPES: ReminderType[] = ['Call Back', 'Meeting', 'Follow-up', 'Payment Due', 'Other'];

function fmtDate(iso: string | undefined | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate().toString().padStart(2, '0')} ${
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]
  } ${d.getFullYear()}`;
}

function fmtDateTime(iso: string | undefined | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return formatDateTimeDisplay(d);
}

function timeAgo(iso: string | undefined | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[statStyles.box, { backgroundColor: colors.muted }]}>
      <Text style={[statStyles.value, { color: color ?? colors.primary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box:   { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, gap: 2 },
  value: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type ActiveTab = 'timeline' | 'calls' | 'reminders';

export default function CustomerDetailScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getCustomerById, getCustomerRemarks, getCustomerCalls, reminders,
    addRemark, updateRemark, addReminder, updateReminderStatus, deleteReminder,
    deleteCustomer, updateCustomer,
  } = useCRM();
  const { user } = useAuth();

  const customer   = getCustomerById(id);
  const remarks    = getCustomerRemarks(id);
  const calls      = getCustomerCalls(id);
  const custReminders = reminders.filter(r => r.customerId === id);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]           = useState<ActiveTab>('timeline');
  const [remarkModal,   setRemarkModal]     = useState(false);
  const [remarkText,    setRemarkText]      = useState('');
  const [editRemarkId,  setEditRemarkId]    = useState<string | null>(null);
  const [popupVisible,  setPopupVisible]    = useState(false);

  // Reminder form
  const [reminderModal,  setReminderModal]  = useState(false);
  const [reminderNote,   setReminderNote]   = useState('');
  const [reminderType,   setReminderType]   = useState<ReminderType>('Call Back');
  const [reminderDate,   setReminderDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d;
  });
  const [datePickerVis,  setDatePickerVis]  = useState(false);

  // Status modal
  const [statusModal,    setStatusModal]    = useState(false);
  const [closeRemark,    setCloseRemark]    = useState('');
  const [closeBy,        setCloseBy]        = useState(user?.name ?? '');

  if (!customer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Customer not found</Text>
      </View>
    );
  }

  const initials    = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const priorityColor = customer.priority === 'High' ? colors.high
    : customer.priority === 'Medium' ? colors.medium : colors.low;
  const isClosed    = customer.status === 'Closed';

  const nextReminder = custReminders
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

  const lastRemark = [...remarks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAddRemark() {
    if (!remarkText.trim()) return;
    if (editRemarkId) {
      updateRemark(editRemarkId, remarkText.trim());
    } else {
      addRemark({ customerId: id, text: remarkText.trim(), agentName: user?.name ?? 'Agent', isCallNote: false });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRemarkModal(false);
    setRemarkText('');
    setEditRemarkId(null);
  }

  async function handleAddReminder() {
    if (!reminderNote.trim()) return;
    await addReminder({
      customerId:     id,
      customerName:   customer!.name,
      customerMobile: customer!.mobile,
      dateTime:       reminderDate.toISOString(),
      notes:          reminderNote.trim(),
      reminder_type:  reminderType,
      status:         'pending',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReminderModal(false);
    setReminderNote('');
    setReminderType('Call Back');
  }

  function handleDelete() {
    Alert.alert('Delete Customer', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { deleteCustomer(id); Haptics.selectionAsync(); router.back(); },
      },
    ]);
  }

  async function handleMarkClosed() {
    if (!closeRemark.trim()) return;
    await updateCustomer(id, {
      status:       'Closed',
      close_date:   new Date().toISOString(),
      close_remark: closeRemark.trim(),
      close_by:     closeBy.trim() || (user?.name ?? 'Agent'),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatusModal(false);
  }

  async function handleReopen() {
    await updateCustomer(id, { status: 'Active', close_date: undefined, close_remark: undefined, close_by: undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // FAB action depends on active tab
  function handleFab() {
    if (activeTab === 'reminders') {
      setReminderNote('');
      setReminderType('Call Back');
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
      setReminderDate(d);
      setReminderModal(true);
    } else {
      setEditRemarkId(null);
      setRemarkText('');
      setRemarkModal(true);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Profile Header ───────────────────────────────────────────────── */}
      <View style={[styles.profileHeader, { backgroundColor: colors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{customer.name}</Text>
            {/* Status badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: isClosed ? 'rgba(255,255,255,0.15)' : 'rgba(46,125,50,0.25)' },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: isClosed ? '#B0BEC5' : '#69F0AE' }]} />
              <Text style={styles.statusBadgeText}>{isClosed ? 'Closed' : 'Active'}</Text>
            </View>
          </View>
          <Text style={styles.mobile}>{customer.mobile}</Text>
          <View style={styles.badges}>
            <CategoryBadge category={customer.category} size="sm" />
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={styles.priorityText}>{customer.priority}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* ── Quick Stats Row ──────────────────────────────────────────────── */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <StatBox label="Total Calls" value={String(customer.total_calls ?? calls.length)} color={colors.primary} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatBox label="Last Call"   value={timeAgo(customer.last_call_at ?? calls[0]?.createdAt)} color={colors.outgoing} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatBox
          label="Next Reminder"
          value={nextReminder ? fmtDate(nextReminder.dateTime) : 'None'}
          color={nextReminder ? colors.warning : colors.mutedForeground}
        />
      </View>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      <View style={[styles.actionRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.incomingLight }]}
          onPress={() => Linking.openURL(`tel:${customer.mobile}`)}
        >
          <Feather name="phone" size={18} color={colors.incoming} />
          <Text style={[styles.actionText, { color: colors.incoming }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]}
          onPress={() => Linking.openURL(`whatsapp://send?phone=91${customer.mobile}`)}
        >
          <Feather name="message-circle" size={18} color="#25D366" />
          <Text style={[styles.actionText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => setPopupVisible(true)}
        >
          <Feather name="clipboard" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Log Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          onPress={() => router.push(`/customers/edit/${id}` as any)}
        >
          <Feather name="edit-2" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main scrollable content ──────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 110 }}
      >
        {/* Info Card */}
        {(customer.email || customer.address || customer.notes || customer.company) ? (
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {customer.company ? (
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={15} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>{customer.company}</Text>
              </View>
            ) : null}
            {customer.email ? (
              <View style={styles.infoRow}>
                <Feather name="mail" size={15} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>{customer.email}</Text>
              </View>
            ) : null}
            {customer.address ? (
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={15} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>{customer.address}{customer.city ? `, ${customer.city}` : ''}</Text>
              </View>
            ) : null}
            {customer.notes ? (
              <View style={styles.infoRow}>
                <Feather name="file-text" size={15} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>{customer.notes}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Last Remark preview ──────────────────────────────────────── */}
        {lastRemark ? (
          <View style={[styles.lastRemarkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.lastRemarkHeader}>
              <Feather name="message-square" size={14} color={colors.mutedForeground} />
              <Text style={[styles.lastRemarkLabel, { color: colors.mutedForeground }]}>Last Remark</Text>
              <Text style={[styles.lastRemarkDate, { color: colors.mutedForeground }]}>{fmtDateTime(lastRemark.createdAt)}</Text>
            </View>
            <Text style={[styles.lastRemarkText, { color: colors.foreground }]} numberOfLines={2}>
              {lastRemark.text}
            </Text>
            <Text style={[styles.lastRemarkAgent, { color: colors.primary }]}>{lastRemark.agentName}</Text>
          </View>
        ) : null}

        {/* ── Closed status card ───────────────────────────────────────── */}
        {isClosed ? (
          <View style={[styles.closedCard, { backgroundColor: '#ECEFF1', borderColor: '#90A4AE' }]}>
            <View style={styles.closedHeader}>
              <Feather name="lock" size={15} color="#546E7A" />
              <Text style={[styles.closedTitle, { color: '#546E7A' }]}>Closed on {fmtDate(customer.close_date)}</Text>
              <TouchableOpacity onPress={handleReopen} style={[styles.reopenBtn, { borderColor: '#546E7A' }]}>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#546E7A' }}>Reopen</Text>
              </TouchableOpacity>
            </View>
            {customer.close_remark ? (
              <Text style={[styles.closedRemark, { color: '#455A64' }]}>{customer.close_remark}</Text>
            ) : null}
            {customer.close_by ? (
              <Text style={[styles.closedBy, { color: '#78909C' }]}>Closed by {customer.close_by}</Text>
            ) : null}
          </View>
        ) : (
          /* ── Mark as Closed button ─────────────────────────────────── */
          <TouchableOpacity
            style={[styles.markClosedBtn, { borderColor: colors.border }]}
            onPress={() => { setCloseRemark(''); setCloseBy(user?.name ?? ''); setStatusModal(true); }}
          >
            <Feather name="check-circle" size={14} color={colors.mutedForeground} />
            <Text style={[styles.markClosedText, { color: colors.mutedForeground }]}>Mark as Closed</Text>
          </TouchableOpacity>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {([
            { key: 'timeline',  label: `Remarks (${remarks.length})` },
            { key: 'calls',     label: `Calls (${calls.length})` },
            { key: 'reminders', label: `Reminders (${custReminders.length})` },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, { color: activeTab === key ? colors.primary : colors.mutedForeground },
                activeTab === key && { fontFamily: 'Inter_600SemiBold' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab content ──────────────────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <View style={{ paddingTop: 8 }}>
            {remarks.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="message-square" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No remarks yet</Text>
              </View>
            ) : remarks.map((r, i) => (
              <View key={r.id} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                  {i < remarks.length - 1 && <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />}
                </View>
                <View style={[styles.remarkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.remarkText, { color: colors.foreground }]}>{r.text}</Text>
                  <View style={styles.remarkMeta}>
                    <Text style={[styles.remarkAgent, { color: colors.primary }]}>{r.agentName}</Text>
                    <Text style={[styles.remarkDate, { color: colors.mutedForeground }]}>{fmtDateTime(r.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editRemark}
                    onPress={() => { setEditRemarkId(r.id); setRemarkText(r.text); setRemarkModal(true); }}
                  >
                    <Feather name="edit-2" size={12} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'calls' && (
          <View style={{ paddingTop: 8 }}>
            {calls.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="phone-off" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No calls yet</Text>
              </View>
            ) : calls.map(c => <CallHistoryItem key={c.id} call={c} />)}
          </View>
        )}

        {activeTab === 'reminders' && (
          <View style={{ paddingTop: 8 }}>
            {custReminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="bell-off" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reminders set</Text>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Tap + to add one</Text>
              </View>
            ) : custReminders.map(rem => {
              const isPast = new Date(rem.dateTime) < new Date();
              const bgColor = rem.status === 'completed' ? colors.successLight
                : rem.status === 'overdue' || isPast  ? colors.missedLight
                : colors.card;
              const borderColor = rem.status === 'completed' ? '#4CAF50'
                : rem.status === 'overdue' || isPast  ? colors.missed
                : colors.border;
              return (
                <View key={rem.id} style={[styles.reminderCard, { backgroundColor: bgColor, borderColor }]}>
                  <View style={styles.reminderRow}>
                    <Feather
                      name={rem.status === 'completed' ? 'check-circle' : rem.status === 'overdue' ? 'alert-circle' : 'clock'}
                      size={16}
                      color={rem.status === 'completed' ? colors.success : rem.status === 'overdue' ? colors.missed : colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTime, { color: colors.foreground }]}>{fmtDateTime(rem.dateTime)}</Text>
                      {rem.reminder_type ? (
                        <Text style={[styles.reminderType, { color: colors.primary }]}>{rem.reminder_type}</Text>
                      ) : null}
                    </View>
                    <View style={styles.reminderActions}>
                      {rem.status !== 'completed' && (
                        <TouchableOpacity
                          onPress={() => { updateReminderStatus(rem.id, 'completed'); Haptics.selectionAsync(); }}
                          style={[styles.reminderBtn, { backgroundColor: colors.successLight }]}
                        >
                          <Feather name="check" size={14} color={colors.success} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Delete Reminder', 'Remove this reminder?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(rem.id) },
                          ]);
                        }}
                        style={[styles.reminderBtn, { backgroundColor: colors.missedLight }]}
                      >
                        <Feather name="trash-2" size={14} color={colors.missed} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {rem.notes ? (
                    <Text style={[styles.reminderNote, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {rem.notes}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent, bottom: bottom + 16 }]}
        onPress={handleFab}
      >
        <Feather name={activeTab === 'reminders' ? 'bell' : 'plus'} size={22} color="#fff" />
      </TouchableOpacity>

      {/* ── Remark Modal ─────────────────────────────────────────────────── */}
      <Modal visible={remarkModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, paddingBottom: bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editRemarkId ? 'Edit Remark' : 'Add Remark'}
              </Text>
              <TouchableOpacity onPress={() => setRemarkModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.remarkInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={remarkText}
              onChangeText={setRemarkText}
              placeholder="Enter your remark..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddRemark}
            >
              <Text style={styles.saveBtnText}>{editRemarkId ? 'Update Remark' : 'Save Remark'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Reminder Modal ────────────────────────────────────────────────── */}
      <Modal visible={reminderModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.reminderModalCard, { backgroundColor: colors.card, paddingBottom: bottom + 16 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Reminder</Text>
                <TouchableOpacity onPress={() => setReminderModal(false)}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Reminder Type */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reminder Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {REMINDER_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { setReminderType(t); Haptics.selectionAsync(); }}
                      style={[
                        styles.typeChip,
                        { backgroundColor: reminderType === t ? colors.primary : colors.muted },
                      ]}
                    >
                      <Text style={[styles.typeChipText, { color: reminderType === t ? '#fff' : colors.mutedForeground }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Date & Time */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date &amp; Time</Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => setDatePickerVis(true)}
              >
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.datePickerText, { color: colors.primary }]}>
                  {formatDateTimeDisplay(reminderDate)}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>

              {/* Note */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reminder Note</Text>
              <TextInput
                style={[styles.remarkInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={reminderNote}
                onChangeText={setReminderNote}
                placeholder="What should be done? (e.g., Call to follow up on payment)"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: reminderNote.trim() ? 1 : 0.5 }]}
                onPress={handleAddReminder}
                disabled={!reminderNote.trim()}
              >
                <Feather name="bell" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Reminder</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Mark as Closed Modal ──────────────────────────────────────────── */}
      <Modal visible={statusModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, paddingBottom: bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mark as Closed</Text>
              <TouchableOpacity onPress={() => setStatusModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Close Date</Text>
            <View style={[styles.datePickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="calendar" size={16} color={colors.mutedForeground} />
              <Text style={[styles.datePickerText, { color: colors.foreground }]}>{fmtDate(new Date().toISOString())}</Text>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Close Remark *</Text>
            <TextInput
              style={[styles.remarkInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={closeRemark}
              onChangeText={setCloseRemark}
              placeholder="Reason for closing (e.g., Deal done, Not interested)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Closed By</Text>
            <TextInput
              style={[styles.singleInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={closeBy}
              onChangeText={setCloseBy}
              placeholder="Agent name"
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#546E7A', opacity: closeRemark.trim() ? 1 : 0.5 }]}
              onPress={handleMarkClosed}
              disabled={!closeRemark.trim()}
            >
              <Feather name="lock" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Confirm Closed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Date/Time Picker ─────────────────────────────────────────────── */}
      <DateTimePickerModal
        visible={datePickerVis}
        value={reminderDate}
        onChange={setReminderDate}
        onClose={() => setDatePickerVis(false)}
        minimumDate={new Date()}
        title="Set Reminder Date & Time"
      />

      <CallPopupModal visible={popupVisible} customer={customer} callType="Outgoing" onClose={() => setPopupVisible(false)} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },

  profileHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingTop: 12 },
  avatar:         { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name:           { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#fff', flexShrink: 1 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText:{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  mobile:         { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  badges:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityDot:    { width: 8, height: 8, borderRadius: 4 },
  priorityText:   { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#fff' },
  deleteBtn:      { padding: 8 },

  statsRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, gap: 4 },
  statDivider:    { width: 1, height: 32 },

  actionRow:      { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderBottomWidth: 1 },
  actionBtn:      { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 10 },
  actionText:     { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  infoCard:       { margin: 12, marginBottom: 6, borderRadius: 12, padding: 14, borderWidth: 1, gap: 10 },
  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText:       { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },

  lastRemarkCard: { marginHorizontal: 12, marginBottom: 6, borderRadius: 12, padding: 12, borderWidth: 1, gap: 4 },
  lastRemarkHeader:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastRemarkLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', flex: 1 },
  lastRemarkDate:  { fontSize: 11, fontFamily: 'Inter_400Regular' },
  lastRemarkText:  { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  lastRemarkAgent: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  closedCard:     { marginHorizontal: 12, marginBottom: 6, borderRadius: 12, padding: 12, borderWidth: 1, gap: 4 },
  closedHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closedTitle:    { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  reopenBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  closedRemark:   { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  closedBy:       { fontSize: 11, fontFamily: 'Inter_400Regular' },

  markClosedBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 6,
                    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  markClosedText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  tabRow:         { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 12, marginTop: 4 },
  tab:            { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:        { fontSize: 12, fontFamily: 'Inter_500Medium' },

  timelineItem:   { flexDirection: 'row', paddingLeft: 16, paddingRight: 12, marginBottom: 4 },
  timelineLine:   { alignItems: 'center', marginRight: 12, width: 16 },
  timelineDot:    { width: 10, height: 10, borderRadius: 5, marginTop: 12 },
  timelineConnector:{ width: 2, flex: 1, marginTop: 4 },
  remarkCard:     { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 6, marginBottom: 8 },
  remarkText:     { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  remarkMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remarkAgent:    { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  remarkDate:     { fontSize: 11, fontFamily: 'Inter_400Regular' },
  editRemark:     { position: 'absolute', top: 10, right: 10 },

  reminderCard:   { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1, gap: 6 },
  reminderRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reminderTime:   { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  reminderType:   { fontSize: 11, fontFamily: 'Inter_500Medium' },
  reminderNote:   { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  reminderActions:{ flexDirection: 'row', gap: 6 },
  reminderBtn:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  emptyState:     { padding: 40, alignItems: 'center', gap: 8 },
  emptyText:      { fontSize: 14, fontFamily: 'Inter_400Regular' },
  emptyHint:      { fontSize: 12, fontFamily: 'Inter_400Regular' },

  fab: {
    position: 'absolute', right: 20,
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },

  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  reminderModalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:   { fontSize: 17, fontFamily: 'Inter_700Bold' },

  fieldLabel:   { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  typeChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  typeChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14 },
  datePickerText:{ flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  remarkInput:  { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', minHeight: 90 },
  singleInput:  { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  saveBtn:      { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  saveBtnText:  { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
