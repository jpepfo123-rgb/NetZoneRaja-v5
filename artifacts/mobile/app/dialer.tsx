import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/EmptyState';
import { useCRM, DialerEntry } from '@/contexts/CRMContext';

type DialerState = 'idle' | 'running' | 'paused';

function StatusBadge({ status, colors }: { status: DialerEntry['status']; colors: any }) {
  const config: Record<DialerEntry['status'], { bg: string; text: string; label: string }> = {
    pending: { bg: colors.muted, text: colors.mutedForeground, label: 'Pending' },
    calling: { bg: colors.outgoingLight, text: colors.outgoing, label: 'Calling...' },
    busy: { bg: colors.warningLight, text: colors.warning, label: 'Busy' },
    no_answer: { bg: colors.missedLight, text: colors.missed, label: 'No Answer' },
    done: { bg: colors.incomingLight, text: colors.incoming, label: 'Done' },
    skipped: { bg: colors.muted, text: colors.mutedForeground, label: 'Skipped' },
  };
  const c = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// Sample data for demo
const SAMPLE_QUEUE: DialerEntry[] = [
  { id: 'd1', name: 'Ankit Gupta', mobile: '9876500001', status: 'done', attempts: 1 },
  { id: 'd2', name: 'Ritu Agarwal', mobile: '9876500002', status: 'busy', attempts: 2 },
  { id: 'd3', name: 'Sanjay Verma', mobile: '9876500003', status: 'no_answer', attempts: 1 },
  { id: 'd4', name: 'Nisha Kapoor', mobile: '9876500004', status: 'pending', attempts: 0 },
  { id: 'd5', name: 'Mahesh Sharma', mobile: '9876500005', status: 'pending', attempts: 0 },
  { id: 'd6', name: 'Pooja Mishra', mobile: '9876500006', status: 'pending', attempts: 0 },
];

export default function DialerScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { dialerQueue, setDialerQueue, updateDialerEntry } = useCRM();
  const [dialerState, setDialerState] = useState<DialerState>('idle');
  const [retryBusy, setRetryBusy] = useState(true);
  const [skipNoAnswer, setSkipNoAnswer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const queue = dialerQueue.length > 0 ? dialerQueue : [];
  const done = queue.filter(e => e.status === 'done').length;
  const progress = queue.length > 0 ? (done / queue.length) * 100 : 0;

  function handleImportDemo() {
    setDialerQueue(SAMPLE_QUEUE);
    setDialerState('idle');
    setCurrentIndex(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Imported', '6 contacts loaded into queue');
  }

  function handleStart() {
    if (queue.length === 0) { Alert.alert('Empty Queue', 'Import contacts first'); return; }
    setDialerState('running');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    simulateCall(0);
  }

  function simulateCall(index: number) {
    if (index >= queue.length) { setDialerState('idle'); return; }
    const entry = queue[index];
    if (entry.status === 'done' || entry.status === 'skipped') {
      setTimeout(() => simulateCall(index + 1), 500);
      return;
    }
    updateDialerEntry(entry.id, { status: 'calling' });
    setCurrentIndex(index);
    setTimeout(() => {
      const outcomes: DialerEntry['status'][] = ['done', 'busy', 'no_answer'];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      updateDialerEntry(entry.id, { status: outcome, attempts: entry.attempts + 1 });
    }, 3000);
  }

  function handlePause() {
    setDialerState('paused');
    Haptics.selectionAsync();
  }

  function handleResume() {
    setDialerState('running');
    simulateCall(currentIndex + 1);
    Haptics.selectionAsync();
  }

  function handleStop() {
    setDialerState('idle');
    Haptics.selectionAsync();
  }

  function handleClear() {
    Alert.alert('Clear Queue', 'Remove all contacts from queue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setDialerQueue([]); setDialerState('idle'); } },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Control Panel */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Progress */}
        {queue.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                {done} / {queue.length} completed
              </Text>
              <Text style={[styles.progressPct, { color: colors.primary }]}>{Math.round(progress)}%</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` as any }]} />
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {dialerState === 'idle' && (
            <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.incomingLight }]} onPress={handleStart}>
              <Feather name="play" size={18} color={colors.incoming} />
              <Text style={[styles.ctrlText, { color: colors.incoming }]}>Start</Text>
            </TouchableOpacity>
          )}
          {dialerState === 'running' && (
            <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.warningLight }]} onPress={handlePause}>
              <Feather name="pause" size={18} color={colors.warning} />
              <Text style={[styles.ctrlText, { color: colors.warning }]}>Pause</Text>
            </TouchableOpacity>
          )}
          {dialerState === 'paused' && (
            <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.incomingLight }]} onPress={handleResume}>
              <Feather name="play" size={18} color={colors.incoming} />
              <Text style={[styles.ctrlText, { color: colors.incoming }]}>Resume</Text>
            </TouchableOpacity>
          )}
          {dialerState !== 'idle' && (
            <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.missedLight }]} onPress={handleStop}>
              <Feather name="square" size={18} color={colors.missed} />
              <Text style={[styles.ctrlText, { color: colors.missed }]}>Stop</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.muted }]} onPress={handleImportDemo}>
            <Feather name="upload" size={18} color={colors.primary} />
            <Text style={[styles.ctrlText, { color: colors.primary }]}>Import</Text>
          </TouchableOpacity>
          {queue.length > 0 && (
            <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.muted }]} onPress={handleClear}>
              <Feather name="trash" size={18} color={colors.mutedForeground} />
              <Text style={[styles.ctrlText, { color: colors.mutedForeground }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings */}
        <View style={[styles.settings, { borderTopColor: colors.border }]}>
          <View style={styles.settingRow}>
            <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>Retry Busy</Text>
            <Switch value={retryBusy} onValueChange={setRetryBusy} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.settingRow}>
            <Feather name="skip-forward" size={15} color={colors.mutedForeground} />
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>Skip No Answer</Text>
            <Switch value={skipNoAnswer} onValueChange={setSkipNoAnswer} trackColor={{ true: colors.primary }} />
          </View>
        </View>
      </View>

      {/* Queue */}
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          queue.length > 0 ? (
            <Text style={[styles.queueHeader, { color: colors.mutedForeground }]}>CALL QUEUE ({queue.length})</Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={[
            styles.queueItem,
            { backgroundColor: colors.card, borderColor: colors.border },
            item.status === 'calling' && { borderColor: colors.primary, borderWidth: 2 },
          ]}>
            <View style={[styles.queueNum, { backgroundColor: colors.muted }]}>
              <Text style={[styles.queueNumText, { color: colors.mutedForeground }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.queueName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.queueMobile, { color: colors.mutedForeground }]}>{item.mobile}</Text>
              {item.attempts > 0 && (
                <Text style={[styles.queueAttempts, { color: colors.mutedForeground }]}>Attempts: {item.attempts}</Text>
              )}
            </View>
            <StatusBadge status={item.status} colors={colors} />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="phone-outgoing"
            title="Queue is empty"
            subtitle="Tap Import to load contacts from Excel or add manually"
          />
        }
        contentContainerStyle={{ paddingBottom: bottom + 20, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: {
    borderBottomWidth: 1,
    gap: 12,
    padding: 16,
  },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  progressPct: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  controls: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctrlText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  settings: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  queueHeader: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  queueNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueNumText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  queueName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  queueMobile: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  queueAttempts: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
