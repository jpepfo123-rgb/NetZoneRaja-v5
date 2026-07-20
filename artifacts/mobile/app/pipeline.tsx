import React, { useState, useMemo } from 'react';
import {
  FlatList, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCRM } from '@/contexts/CRMContext';
import type { Customer } from '@/services/types';

const STAGES = ['New Lead','Contacted','Interested','Proposal Sent','Negotiation','Won','Lost'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  'New Lead':      '#64748b',
  'Contacted':     '#3b82f6',
  'Interested':    '#06b6d4',
  'Proposal Sent': '#f59e0b',
  'Negotiation':   '#f97316',
  'Won':           '#22c55e',
  'Lost':          '#ef4444',
};

export default function PipelineScreen() {
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const { customers } = useCRM();
  const [activeStage, setActiveStage] = useState<Stage | 'All'>('All');

  const byStage = useMemo(() => {
    const map: Record<string, Customer[]> = {};
    for (const s of STAGES) map[s] = [];
    for (const c of customers) {
      const s = (c as any).pipeline_stage ?? 'New Lead';
      if (!map[s]) map[s] = [];
      map[s].push(c);
    }
    return map;
  }, [customers]);

  const displayed = activeStage === 'All'
    ? customers
    : byStage[activeStage] ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lead Pipeline</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stage filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[styles.stageBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center', paddingVertical: 10 }}>
        {(['All', ...STAGES] as const).map(s => {
          const isActive = activeStage === s;
          const color = s === 'All' ? colors.primary : STAGE_COLORS[s as Stage];
          const count = s === 'All' ? customers.length : (byStage[s as Stage] ?? []).length;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveStage(s as any)}
              style={[styles.stagePill, { backgroundColor: isActive ? color : color + '18', borderColor: color + '44' }]}
            >
              <Text style={[styles.stagePillText, { color: isActive ? '#fff' : color }]}>
                {s} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 12 }}>
        {STAGES.map(s => {
          const count = (byStage[s] ?? []).length;
          if (!count) return null;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveStage(s)}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.statCount, { color: STAGE_COLORS[s] }]}>{count}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Customer list */}
      <FlatList
        data={displayed}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: bottom + 100, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="target" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No leads in this stage</Text>
          </View>
        }
        renderItem={({ item }) => {
          const stage = ((item as any).pipeline_stage ?? 'New Lead') as Stage;
          const stageColor = STAGE_COLORS[stage] ?? colors.mutedForeground;
          const initials = item.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/customers/${item.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: stageColor + '20' }]}>
                <Text style={[styles.avatarText, { color: stageColor }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: colors.foreground }]}>{item.name}</Text>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.mobile}</Text>
                </View>
              </View>
              <View style={[styles.stageBadge, { backgroundColor: stageColor + '18', borderColor: stageColor + '44' }]}>
                <Text style={[styles.stageBadgeText, { color: stageColor }]}>{stage}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Inter_700Bold' },
  stageBar: { borderBottomWidth: 1, flexGrow: 0 },
  stagePill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  stagePillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statCard: { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', minWidth: 90 },
  statCount: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2, textAlign: 'center' },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  customerName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  stageBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  stageBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
