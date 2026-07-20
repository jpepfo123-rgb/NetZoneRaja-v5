import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/EmptyState';
import { CallType, CALL_TYPES, getCategoryColor } from '@/constants/colors';
import { useCRM, CallRecord } from '@/contexts/CRMContext';
import type { Customer } from '@/services/types';

const FILTERS = ['All', ...CALL_TYPES] as const;
type FilterType = (typeof FILTERS)[number];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CallIcon({ type, colors }: { type: string; colors: ReturnType<typeof useColors> }) {
  const config = {
    Incoming: { icon: 'phone-incoming', color: colors.incoming, bg: colors.incomingLight },
    Outgoing: { icon: 'phone-outgoing', color: colors.outgoing, bg: colors.outgoingLight },
    Missed: { icon: 'phone-missed', color: colors.missed, bg: colors.missedLight },
  }[type] ?? { icon: 'phone', color: colors.mutedForeground, bg: colors.muted };
  return (
    <View style={[callStyles.iconWrap, { backgroundColor: config.bg }]}>
      <Feather name={config.icon as any} size={18} color={config.color} />
    </View>
  );
}

const callStyles = StyleSheet.create({
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

function CallItem({
  call,
  customer,
  colors,
}: {
  call: CallRecord;
  customer?: Customer;
  colors: ReturnType<typeof useColors>;
}) {
  const typeColor =
    call.type === 'Incoming'
      ? colors.incoming
      : call.type === 'Outgoing'
      ? colors.outgoing
      : colors.missed;

  // Use live customer category if available, fall back to server-joined value, then stored value
  const categoryLabel = customer?.category ?? call.customerCategoryLive ?? call.category;
  const catColors = categoryLabel ? getCategoryColor(categoryLabel, colors as any) : null;

  // Avatar initials
  const initials = call.customerName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/customers/${call.customerId}` as any)}
      activeOpacity={0.85}
    >
      {/* Left: avatar + call-type icon overlay */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={[styles.callIconBadge, { backgroundColor: typeColor + '22', borderColor: colors.card }]}>
          <Feather
            name={
              call.type === 'Incoming'
                ? 'phone-incoming'
                : call.type === 'Outgoing'
                ? 'phone-outgoing'
                : ('phone-missed' as any)
            }
            size={10}
            color={typeColor}
          />
        </View>
      </View>

      {/* Middle: info */}
      <View style={styles.itemInfo}>
        {/* Name + type badge row */}
        <View style={styles.nameRow}>
          <Text style={[styles.customerName, { color: colors.foreground }]} numberOfLines={1}>
            {call.customerName}
          </Text>
          <View style={[styles.typePill, { backgroundColor: typeColor + '18' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{call.type}</Text>
          </View>
        </View>

        {/* Date/time */}
        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
          {formatDateTime(call.createdAt)}
        </Text>

        {/* Agent + duration */}
        <View style={styles.agentRow}>
          <Feather name="user" size={11} color={colors.mutedForeground} />
          <Text style={[styles.agentText, { color: colors.mutedForeground }]}>{call.agentName}</Text>
          {call.duration !== '0:00' && (
            <>
              <Feather name="clock" size={11} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
              <Text style={[styles.durationText, { color: colors.mutedForeground }]}>{call.duration}</Text>
            </>
          )}
        </View>

        {/* Phone number */}
        <View style={styles.agentRow}>
          <Feather name="phone" size={11} color={colors.mutedForeground} />
          <Text style={[styles.agentText, { color: colors.mutedForeground }]}>
            {call.customerMobile}
          </Text>
          {/* Category badge right after phone */}
          {catColors && (
            <View style={[styles.catPill, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.catText, { color: catColors.text }]}>{categoryLabel}</Text>
            </View>
          )}
        </View>

        {/* Remarks (call note) or customer notes as fallback */}
        {(call.remarks || customer?.notes || call.customerNotes) ? (
          <Text style={[styles.remarksText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {call.remarks || customer?.notes || call.customerNotes}
          </Text>
        ) : null}

        {/* Reminder date if set on the call */}
        {call.reminder_date ? (
          <View style={styles.agentRow}>
            <Feather name="bell" size={11} color={colors.primary} />
            <Text style={[styles.agentText, { color: colors.primary }]}>
              {'Reminder: ' + new Date(call.reminder_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' })}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SummaryBar({ calls, colors }: { calls: CallRecord[]; colors: ReturnType<typeof useColors> }) {
  const totals = {
    Incoming: calls.filter(c => c.type === 'Incoming').length,
    Outgoing: calls.filter(c => c.type === 'Outgoing').length,
    Missed: calls.filter(c => c.type === 'Missed').length,
  };
  return (
    <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {[
        { label: 'Incoming', value: totals.Incoming, color: colors.incoming },
        { label: 'Outgoing', value: totals.Outgoing, color: colors.outgoing },
        { label: 'Missed', value: totals.Missed, color: colors.missed },
        { label: 'Total', value: calls.length, color: colors.primary },
      ].map(s => (
        <View key={s.label} style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CallsScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { calls, customers } = useCRM();
  const [filter, setFilter] = useState<FilterType>('All');

  // Primary lookup: customerId → Customer
  const customerMap = useMemo(
    () => new Map(customers.map(c => [c.id, c])),
    [customers],
  );

  // Fallback lookup: normalised phone (last 10 digits) → Customer
  // Used when a call was logged before the customer record existed so customerId is empty.
  const phoneMap = useMemo(() => {
    const m = new Map<string, Customer>();
    for (const c of customers) {
      const digits = c.mobile.replace(/[^0-9]/g, '').slice(-10);
      if (digits.length >= 7) m.set(digits, c);
      if (c.alternate_number) {
        const alt = c.alternate_number.replace(/[^0-9]/g, '').slice(-10);
        if (alt.length >= 7 && !m.has(alt)) m.set(alt, c);
      }
    }
    return m;
  }, [customers]);

  // Resolve the live customer for a call: prefer ID match, fall back to phone match.
  const resolveCustomer = (call: CallRecord): Customer | undefined => {
    if (call.customerId) {
      const byId = customerMap.get(call.customerId);
      if (byId) return byId;
    }
    // Also try matchedCustomerId (set by remoteAdapter from phone-JOIN)
    if ((call as any).matchedCustomerId) {
      const byMatched = customerMap.get((call as any).matchedCustomerId);
      if (byMatched) return byMatched;
    }
    const digits = (call.customerMobile ?? call.phoneNumber ?? '')
      .replace(/[^0-9]/g, '').slice(-10);
    if (digits.length >= 7) return phoneMap.get(digits);
    return undefined;
  };

  const filtered = useMemo(() => {
    if (filter === 'All') return calls;
    return calls.filter(c => c.type === filter);
  }, [calls, filter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary */}
      <SummaryBar calls={calls} colors={colors} />

      {/* Filter Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.activeTab]}
            onPress={() => setFilter(f)}
          >
            {filter === f && (
              <View style={[styles.activeTabIndicator, { backgroundColor: colors.primary }]} />
            )}
            <Text
              style={[
                styles.tabText,
                { color: filter === f ? colors.primary : colors.mutedForeground },
                filter === f && { fontFamily: 'Inter_700Bold' },
              ]}
            >
              {f}
            </Text>
            {f !== 'All' && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: filter === f ? colors.primary : colors.muted },
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: filter === f ? '#fff' : colors.mutedForeground },
                ]}>
                  {calls.filter(c => c.type === (f as string)).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CallItem call={item} customer={resolveCustomer(item)} colors={colors} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="phone-off"
            title={`No ${filter === 'All' ? '' : filter.toLowerCase()} calls`}
            subtitle="Call history will appear here"
          />
        }
        contentContainerStyle={{ paddingBottom: bottom + 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    position: 'relative',
  },
  activeTab: {},
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  tabText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  // ─── Call item ────────────────────────────────────────────────────────────────
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  // Avatar with call-type icon overlay
  avatarWrap: { position: 'relative', width: 44, height: 44 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  callIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info column
  itemInfo: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  dateText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  agentText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  durationText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  remarksText: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },

  // Type pill (shown inline in name row)
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Category pill (shown next to phone number)
  catPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  catText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
