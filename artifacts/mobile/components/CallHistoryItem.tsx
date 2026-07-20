import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors, getCallTypeColor } from '@/hooks/useColors';
import { CallRecord } from '@/contexts/CRMContext';

interface CallHistoryItemProps {
  call: CallRecord;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getCallIcon(type: string) {
  switch (type) {
    case 'Incoming': return 'phone-incoming';
    case 'Outgoing': return 'phone-outgoing';
    case 'Missed': return 'phone-missed';
    default: return 'phone';
  }
}

export function CallHistoryItem({ call }: CallHistoryItemProps) {
  const colors = useColors();
  const { color, bg } = getCallTypeColor(call.type, colors);
  const initials = call.customerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{call.customerName}</Text>
        <Text style={[styles.agent, { color: colors.mutedForeground }]}>{call.agentName}</Text>
        {call.remarks ? (
          <Text style={[styles.remarks, { color: colors.mutedForeground }]} numberOfLines={1}>{call.remarks}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={[styles.typeBadge, { backgroundColor: bg }]}>
          <Feather name={getCallIcon(call.type) as any} size={12} color={color} />
          <Text style={[styles.typeText, { color }]}>{call.type}</Text>
        </View>
        {call.duration !== '0:00' && (
          <Text style={[styles.duration, { color: colors.mutedForeground }]}>{call.duration}</Text>
        )}
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatDate(call.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
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
  agent: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  remarks: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  duration: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
