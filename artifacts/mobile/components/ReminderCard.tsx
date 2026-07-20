import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Reminder } from '@/contexts/CRMContext';

interface ReminderCardProps {
  reminder: Reminder;
  onComplete: () => void;
  onDelete: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' at ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getStatusStyle(status: Reminder['status'], colors: ReturnType<typeof useColors>) {
  switch (status) {
    case 'overdue': return { bg: colors.missedLight, text: colors.missed, icon: 'alert-circle' };
    case 'completed': return { bg: colors.incomingLight, text: colors.incoming, icon: 'check-circle' };
    default: return { bg: colors.warningLight, text: colors.warning, icon: 'clock' };
  }
}

export function ReminderCard({ reminder, onComplete, onDelete }: ReminderCardProps) {
  const colors = useColors();
  const status = getStatusStyle(reminder.status, colors);
  const initials = reminder.customerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statusBar, { backgroundColor: status.text }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.foreground }]}>{reminder.customerName}</Text>
            <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{reminder.customerMobile}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Feather name={status.icon as any} size={12} color={status.text} />
            <Text style={[styles.statusText, { color: status.text }]}>
              {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
            </Text>
          </View>
        </View>
        <View style={[styles.timeRow, { backgroundColor: colors.muted }]}>
          <Feather name="calendar" size={13} color={colors.mutedForeground} />
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatDateTime(reminder.dateTime)}</Text>
        </View>
        {reminder.notes ? (
          <Text style={[styles.notes, { color: colors.foreground }]}>{reminder.notes}</Text>
        ) : null}
        <View style={styles.actions}>
          {reminder.status === 'pending' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.incomingLight }]} onPress={onComplete}>
              <Feather name="check" size={14} color={colors.incoming} />
              <Text style={[styles.btnText, { color: colors.incoming }]}>Done</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.missedLight }]} onPress={onDelete}>
            <Feather name="trash-2" size={14} color={colors.missed} />
            <Text style={[styles.btnText, { color: colors.missed }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 5,
    overflow: 'hidden',
  },
  statusBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  mobile: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  notes: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
