import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { CrmService } from '@/services/crmService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_KEY = '@netzone/server_url';
const TOKEN_KEY = '@netzone/auth_token';

interface Target {
  id: string;
  agent_name: string;
  period: string;
  call_target: number;
  conv_target: number;
  revenue_target: number;
  achieved_calls: string;
  achieved_convs: string;
}

function ProgressRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const radius = size / 2 - 6;
  const circ = 2 * Math.PI * radius;
  const dash = Math.min(1, pct / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Simple ring using borders */}
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 5, borderColor: color + '22',
        alignItems: 'center', justifyContent: 'center', position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 5, borderColor: color,
        borderRightColor: pct >= 25 ? color : 'transparent',
        borderBottomColor: pct >= 50 ? color : 'transparent',
        borderLeftColor: pct >= 75 ? color : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }} />
      <Text style={{ position: 'absolute', fontSize: 13, fontFamily: 'Inter_700Bold', color }}>
        {Math.min(100, Math.round(pct))}%
      </Text>
    </View>
  );
}

export default function TargetsScreen() {
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const { user } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [period] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [base, token] = await Promise.all([
          AsyncStorage.getItem(BASE_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        if (!base || !token) { setLoading(false); return; }
        const res = await fetch(`${base.replace(/\/+$/, '')}/api/targets?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setTargets(await res.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, [period]);

  const myTargets = user?.role === 'agent'
    ? targets.filter(t => t.agent_name === user.name)
    : targets;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Sales Targets — {period}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottom + 100 }}>
          {myTargets.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="target" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No targets set for this month
              </Text>
            </View>
          ) : myTargets.map(t => {
            const calls = parseInt(t.achieved_calls ?? '0');
            const convs = parseInt(t.achieved_convs ?? '0');
            const callPct = t.call_target > 0 ? (calls / t.call_target) * 100 : 0;
            const convPct = t.conv_target > 0 ? (convs / t.conv_target) * 100 : 0;

            return (
              <View key={t.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.agentName, { color: colors.foreground }]}>{t.agent_name}</Text>

                <View style={styles.ringsRow}>
                  <View style={styles.ringWrap}>
                    <ProgressRing pct={callPct} color={colors.primary} />
                    <Text style={[styles.ringLabel, { color: colors.mutedForeground }]}>
                      Calls {calls}/{t.call_target}
                    </Text>
                  </View>
                  <View style={styles.ringWrap}>
                    <ProgressRing pct={convPct} color="#22c55e" />
                    <Text style={[styles.ringLabel, { color: colors.mutedForeground }]}>
                      Conversions {convs}/{t.conv_target}
                    </Text>
                  </View>
                  {Number(t.revenue_target) > 0 && (
                    <View style={styles.ringWrap}>
                      <View style={{ alignItems: 'center', justifyContent: 'center', width: 64, height: 64 }}>
                        <Feather name="trending-up" size={22} color="#f59e0b" />
                      </View>
                      <Text style={[styles.ringLabel, { color: colors.mutedForeground }]}>
                        ₹{Number(t.revenue_target).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: 'Inter_700Bold' },
  card: { borderRadius: 16, borderWidth: 1, padding: 18 },
  agentName: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 16 },
  ringsRow: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  ringWrap: { alignItems: 'center', gap: 8 },
  ringLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
