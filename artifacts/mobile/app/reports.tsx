import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCRM } from '@/contexts/CRMContext';

type Period = 'Daily' | 'Weekly' | 'Monthly';
type ReportView = 'Agent Wise' | 'Customer Wise';

function BarChart({ data, maxVal, colors }: {
  data: { label: string; value: number; color: string }[];
  maxVal: number;
  colors: any;
}) {
  return (
    <View style={styles.chart}>
      {data.map((d) => (
        <View key={d.label} style={styles.barItem}>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: d.color,
                  height: maxVal > 0 ? (d.value / maxVal) * 80 : 4,
                },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: colors.foreground }]}>{d.value}</Text>
          <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { calls, customers, agents } = useCRM();
  const [period, setPeriod] = useState<Period>('Daily');
  const [viewMode, setViewMode] = useState<ReportView>('Agent Wise');

  const stats = useMemo(() => {
    const now = new Date();
    let filtered = calls;
    if (period === 'Daily') {
      filtered = calls.filter(c => new Date(c.createdAt).toDateString() === now.toDateString());
    } else if (period === 'Weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      filtered = calls.filter(c => new Date(c.createdAt) >= weekAgo);
    } else {
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      filtered = calls.filter(c => new Date(c.createdAt) >= monthAgo);
    }
    const incoming = filtered.filter(c => c.type === 'Incoming').length;
    const outgoing = filtered.filter(c => c.type === 'Outgoing').length;
    const missed = filtered.filter(c => c.type === 'Missed').length;
    return { total: filtered.length, incoming, outgoing, missed, filtered };
  }, [calls, period]);

  const agentStats = useMemo(() =>
    agents.map(a => ({
      name: a.name.split(' ')[0],
      calls: stats.filtered.filter(c => c.agentId === a.id).length,
    })),
    [agents, stats.filtered],
  );

  const categoryStats = useMemo(() =>
    ['New Lead', 'Interested', 'Follow-up', 'Customer', 'Payment Pending', 'Closed'].map(cat => ({
      category: cat,
      count: customers.filter(c => c.category === cat).length,
    })),
    [customers],
  );

  const maxAgentCalls = Math.max(...agentStats.map(a => a.calls), 1);

  const barData = [
    { label: 'In', value: stats.incoming, color: colors.incoming },
    { label: 'Out', value: stats.outgoing, color: colors.outgoing },
    { label: 'Miss', value: stats.missed, color: colors.missed },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottom + 30 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Period Filter */}
      <View style={[styles.periodRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['Daily', 'Weekly', 'Monthly'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && { backgroundColor: colors.primary }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, { color: period === p ? '#fff' : colors.mutedForeground }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Total', value: stats.total, color: colors.primary, icon: 'phone-call' },
          { label: 'Incoming', value: stats.incoming, color: colors.incoming, icon: 'phone-incoming' },
          { label: 'Outgoing', value: stats.outgoing, color: colors.outgoing, icon: 'phone-outgoing' },
          { label: 'Missed', value: stats.missed, color: colors.missed, icon: 'phone-missed' },
        ].map((s) => (
          <View key={s.label} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={s.icon as any} size={16} color={s.color} />
            <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Call Type Chart */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Call Distribution</Text>
        <BarChart data={barData} maxVal={Math.max(stats.incoming, stats.outgoing, stats.missed, 1)} colors={colors} />
      </View>

      {/* View Toggle */}
      <View style={[styles.viewToggle, { backgroundColor: colors.muted }]}>
        {(['Agent Wise', 'Customer Wise'] as ReportView[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewBtn, viewMode === v && { backgroundColor: colors.card }]}
            onPress={() => setViewMode(v)}
          >
            <Text style={[styles.viewBtnText, { color: viewMode === v ? colors.primary : colors.mutedForeground }]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Agent Wise */}
      {viewMode === 'Agent Wise' && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Agent Performance</Text>
          {agentStats.filter(a => a.calls > 0 || a.name !== 'Admin').map((a, i) => (
            <View key={a.name} style={[styles.agentRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
              <View style={[styles.agentAvatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.agentInitial, { color: colors.primary }]}>{a.name[0]}</Text>
              </View>
              <Text style={[styles.agentName, { color: colors.foreground }]}>{a.name}</Text>
              <View style={[styles.agentBarWrap, { backgroundColor: colors.muted }]}>
                <View style={[styles.agentBar, { backgroundColor: colors.primary, width: `${maxAgentCalls > 0 ? (a.calls / maxAgentCalls) * 100 : 0}%` as any }]} />
              </View>
              <Text style={[styles.agentCalls, { color: colors.primary }]}>{a.calls}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Customer Wise */}
      {viewMode === 'Customer Wise' && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer by Category</Text>
          {categoryStats.map((c, i) => (
            <View key={c.category} style={[styles.agentRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
              <Text style={[styles.categoryName, { color: colors.foreground }]}>{c.category}</Text>
              <View style={[styles.agentBarWrap, { backgroundColor: colors.muted }]}>
                <View style={[styles.agentBar, { backgroundColor: colors.accent, width: `${Math.max((c.count / customers.length) * 100, 4)}%` as any }]} />
              </View>
              <Text style={[styles.agentCalls, { color: colors.accent }]}>{c.count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Export Buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.primary }]}>
          <Feather name="file-text" size={16} color="#fff" />
          <Text style={styles.exportText}>Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.accent }]}>
          <Feather name="download" size={16} color="#fff" />
          <Text style={styles.exportText}>Export Excel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  periodRow: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  periodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  periodText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  barItem: { alignItems: 'center', gap: 4, flex: 1 },
  barContainer: { height: 80, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: 32, borderRadius: 6, minHeight: 4 },
  barValue: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  barLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  viewBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  agentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  agentInitial: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  agentName: { fontSize: 13, fontFamily: 'Inter_500Medium', width: 60 },
  categoryName: { fontSize: 12, fontFamily: 'Inter_500Medium', width: 90, flexShrink: 1 },
  agentBarWrap: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  agentBar: { height: '100%', borderRadius: 4, minWidth: 4 },
  agentCalls: { fontSize: 13, fontFamily: 'Inter_700Bold', width: 24, textAlign: 'right' },
  exportRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 4 },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
