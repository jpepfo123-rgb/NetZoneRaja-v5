/**
 * DateTimePickerModal — clean date/time picker with quick-select chips.
 *
 * Format displayed: "18 Jul 2026, 09:30 AM"
 *
 * Quick-pick buttons:
 *   Today | Tomorrow | Next Week | Custom
 *
 * When "Custom" is chosen, stepper controls appear for full manual entry.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(month: number, year: number) {
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function toAMPM(hour: number): { display: number; period: 'AM' | 'PM' } {
  if (hour === 0) return { display: 12, period: 'AM' };
  if (hour < 12) return { display: hour, period: 'AM' };
  if (hour === 12) return { display: 12, period: 'PM' };
  return { display: hour - 12, period: 'PM' };
}

function fromAMPM(display: number, period: 'AM' | 'PM'): number {
  if (period === 'AM' && display === 12) return 0;
  if (period === 'PM' && display === 12) return 12;
  return period === 'PM' ? display + 12 : display;
}

/** Format a Date object as "18 Jul 2026, 09:30 AM" */
export function formatDateTimeDisplay(d: Date): string {
  const { display, period } = toAMPM(d.getHours());
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(display)}:${pad(d.getMinutes())} ${period}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DateTimePickerModalProps {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  title?: string;
}

type QuickPick = 'today' | 'tomorrow' | 'next_week' | 'custom';

// ── Sub-components ────────────────────────────────────────────────────────────

interface StepperProps {
  value: number;
  display?: string;
  onInc: () => void;
  onDec: () => void;
  label: string;
  colors: ReturnType<typeof useColors>;
}

function Stepper({ value, display, onInc, onDec, label, colors }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.stepBtn, { backgroundColor: colors.primaryLight }]}
        onPress={() => { onInc(); Haptics.selectionAsync(); }}
      >
        <Feather name="chevron-up" size={18} color={colors.primary} />
      </TouchableOpacity>
      <Text style={[styles.stepValue, { color: colors.foreground }]}>
        {display ?? pad(value)}
      </Text>
      <TouchableOpacity
        style={[styles.stepBtn, { backgroundColor: colors.muted }]}
        onPress={() => { onDec(); Haptics.selectionAsync(); }}
      >
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DateTimePickerModal({
  visible,
  value,
  onChange,
  onClose,
  minimumDate,
  title = 'Set Date & Time',
}: DateTimePickerModalProps) {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();

  const [day,    setDay]    = useState(value.getDate());
  const [month,  setMonth]  = useState(value.getMonth() + 1);
  const [year,   setYear]   = useState(value.getFullYear());
  const [hour12, setHour12] = useState(toAMPM(value.getHours()).display);
  const [period, setPeriod] = useState<'AM' | 'PM'>(toAMPM(value.getHours()).period);
  const [minute, setMinute] = useState(value.getMinutes());
  const [quick,  setQuick]  = useState<QuickPick>('custom');

  // Sync internal state when the modal opens
  useEffect(() => {
    if (!visible) return;
    const ap = toAMPM(value.getHours());
    setDay(value.getDate());
    setMonth(value.getMonth() + 1);
    setYear(value.getFullYear());
    setHour12(ap.display);
    setPeriod(ap.period);
    setMinute(value.getMinutes());
    setQuick('custom');
  }, [visible]);

  function applyDate(d: Date) {
    setDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    const ap = toAMPM(d.getHours());
    setHour12(ap.display);
    setPeriod(ap.period);
    setMinute(d.getMinutes());
  }

  function handleQuick(q: QuickPick) {
    Haptics.selectionAsync();
    setQuick(q);
    const now = new Date();
    if (q === 'today') {
      applyDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0));
    } else if (q === 'tomorrow') {
      applyDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0));
    } else if (q === 'next_week') {
      applyDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 10, 0));
    }
    // 'custom' → don't change the date, just reveal steppers
  }

  const maxDay = daysInMonth(month, year);

  function clamp(d: number) { return Math.min(d, daysInMonth(month, year)); }

  function incDay()    { setDay(d  => d  >= maxDay ? 1 : d + 1); }
  function decDay()    { setDay(d  => d  <= 1 ? maxDay : d - 1); }
  function incMonth()  { setMonth(m => { const n = m >= 12 ? 1 : m + 1; setDay(d => clamp(d)); return n; }); }
  function decMonth()  { setMonth(m => { const n = m <= 1 ? 12 : m - 1; setDay(d => clamp(d)); return n; }); }
  function incYear()   { setYear(y  => y + 1); }
  function decYear()   { setYear(y  => y - 1); }
  function incHour()   { setHour12(h => h >= 12 ? 1 : h + 1); }
  function decHour()   { setHour12(h => h <= 1 ? 12 : h - 1); }
  function incMinute() { setMinute(m => (m + 15) % 60); }
  function decMinute() { setMinute(m => (m - 15 + 60) % 60); }
  function togglePeriod() {
    Haptics.selectionAsync();
    setPeriod(p => p === 'AM' ? 'PM' : 'AM');
  }

  function buildDate(): Date {
    return new Date(year, month - 1, day, fromAMPM(hour12, period), minute);
  }

  function handleConfirm() {
    const d = buildDate();
    if (minimumDate && d < minimumDate) return;
    onChange(d);
    onClose();
  }

  const preview = formatDateTimeDisplay(buildDate());

  const QUICK_PICKS: Array<{ key: QuickPick; label: string }> = [
    { key: 'today',     label: 'Today' },
    { key: 'tomorrow',  label: 'Tomorrow' },
    { key: 'next_week', label: 'Next Week' },
    { key: 'custom',    label: 'Custom' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: bottom + 16 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Quick pick chips */}
          <View style={styles.quickRow}>
            {QUICK_PICKS.map(({ key, label }) => {
              const active = quick === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleQuick(key)}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.muted },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#fff' : colors.mutedForeground },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: colors.primaryLight }]}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.previewText, { color: colors.primary }]}>{preview}</Text>
          </View>

          {/* Steppers — always visible so user can fine-tune after quick pick */}
          <View style={styles.stepperRow}>
            <Stepper value={day}    onInc={incDay}    onDec={decDay}    label="Day"   colors={colors} />
            <Stepper
              value={month}
              display={MONTHS[month - 1]}
              onInc={incMonth}
              onDec={decMonth}
              label="Month"
              colors={colors}
            />
            <Stepper value={year}   onInc={incYear}   onDec={decYear}   label="Year"  colors={colors} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.stepperRow}>
            <Stepper value={hour12}  onInc={incHour}   onDec={decHour}   label="Hour"  colors={colors} />
            <Stepper value={minute}  onInc={incMinute} onDec={decMinute} label="Min"   colors={colors} />
            {/* AM/PM toggle */}
            <View style={styles.stepper}>
              <Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>Period</Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: colors.primaryLight }]}
                onPress={togglePeriod}
              >
                <Feather name="repeat" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                {period}
              </Text>
              <View style={[styles.stepBtn, { backgroundColor: 'transparent' }]} />
            </View>
          </View>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.confirmText}>Set Date &amp; Time</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },

  quickRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
  },
  previewText: { fontSize: 15, fontFamily: 'Inter_700Bold' },

  stepperRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  divider: { height: 1, marginVertical: 2 },

  stepper: { alignItems: 'center', gap: 4, minWidth: 64 },
  stepperLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontFamily: 'Inter_600SemiBold', minWidth: 36, textAlign: 'center' },

  confirmBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  confirmText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
