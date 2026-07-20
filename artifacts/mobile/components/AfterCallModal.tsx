/**
 * AfterCallModal — appears automatically after every call ends.
 * Agent can save: remark, category, follow-up date, reminder.
 * Triggered by the PhoneState native module via event emitter.
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCRM } from '@/contexts/CRMContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export interface AfterCallData {
  phoneNumber: string;
  duration: number;      // seconds
  callType: 'incoming' | 'outgoing' | 'missed';
  customerId?: string;
  customerName?: string;
}

interface Props {
  visible: boolean;
  data: AfterCallData | null;
  onClose: () => void;
}

const CATEGORIES = [
  'New Lead',
  'Interested',
  'Follow-up',
  'Not Interested',
  'Customer',
  'Closed',
];

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function AfterCallModal({ visible, data, onClose }: Props) {
  const colors = useColors();
  const { user } = useAuth();
  const { addCall, addRemark, addReminder, customers } = useCRM();

  const [remark, setRemark]         = useState('');
  const [category, setCategory]     = useState('Follow-up');
  const [followUpDate, setFollowUpDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [saving, setSaving]         = useState(false);

  // Resolve customer from phone number
  const customer = data?.customerId
    ? customers.find(c => c.id === data.customerId)
    : customers.find(c =>
        c.mobile === data?.phoneNumber ||
        c.alternate_number === data?.phoneNumber
      );

  const reset = useCallback(() => {
    setRemark('');
    setCategory('Follow-up');
    setFollowUpDate('');
    setReminderDate('');
    setSaving(false);
  }, []);

  const handleSkip = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const custId = customer?.id ?? data.customerId ?? '';

      if (custId) {
        // Log the call
        await addCall({
          customerId: custId,
          customerName: customer?.name ?? data.customerName ?? '',
          customerMobile: data.phoneNumber,
          agentId: user?.id ?? '',
          agentName: user?.name ?? '',
          type: data.callType === 'incoming' ? 'Incoming'
              : data.callType === 'outgoing' ? 'Outgoing'
              : 'Missed',
          duration: formatDuration(data.duration),
          durationSeconds: data.duration,
          remarks: remark,
          phoneNumber: data.phoneNumber,
          category,
          follow_up_date: followUpDate || undefined,
          reminder_date: reminderDate || undefined,
        });

        // Save remark if provided
        if (remark.trim()) {
          await addRemark({
            customerId: custId,
            text: remark,
            agentName: user?.name ?? 'Agent',
            isCallNote: true,
          });
        }

        // Create reminder if date provided
        if (reminderDate.trim() && custId) {
          await addReminder({
            customerId:     custId,
            customerName:   customer?.name ?? data.customerName ?? '',
            customerMobile: data.phoneNumber,
            dateTime:       reminderDate,
            notes:          remark || 'Post-call reminder',
            status:         'pending',
          });
        }
      }
    } catch (e) {
      console.error('AfterCallModal save error:', e);
    } finally {
      reset();
      onClose();
    }
  };

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.pill, { backgroundColor: colors.primary + '22' }]}>
              <Feather name="phone-off" size={18} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary }]}>Call Ended</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Call info */}
          <View style={[styles.infoRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {customer?.name ?? data.phoneNumber}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {customer ? data.phoneNumber : 'Unknown Caller'} • {data.callType.charAt(0).toUpperCase() + data.callType.slice(1)} • {formatDuration(data.duration)}
              </Text>
            </View>
            <View style={[styles.typeBadge, {
              backgroundColor: data.callType === 'missed'
                ? '#FFEBEE'
                : data.callType === 'incoming' ? '#E8F5E9' : '#E3F2FD',
            }]}>
              <Feather
                name={data.callType === 'missed' ? 'phone-missed' : data.callType === 'incoming' ? 'phone-incoming' : 'phone-outgoing'}
                size={14}
                color={data.callType === 'missed' ? '#E53935' : data.callType === 'incoming' ? '#43A047' : '#1E88E5'}
              />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Remark */}
            <Text style={[styles.label, { color: colors.foreground }]}>Remark</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Enter call remark..."
              placeholderTextColor={colors.mutedForeground}
              value={remark}
              onChangeText={setRemark}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Category */}
            <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: category === cat ? colors.primary : colors.background,
                      borderColor: category === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catText, { color: category === cat ? '#fff' : colors.foreground }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Follow-up date */}
            <Text style={[styles.label, { color: colors.foreground }]}>Follow-up Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={followUpDate}
              onChangeText={setFollowUpDate}
            />

            {/* Reminder */}
            <Text style={[styles.label, { color: colors.foreground }]}>Reminder Date & Time</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="YYYY-MM-DD HH:MM (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={reminderDate}
              onChangeText={setReminderDate}
            />
          </ScrollView>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: colors.border }]}
              onPress={handleSkip}
              disabled={saving}
            >
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pillText: {
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 48,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catText: {
    fontSize: 12,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  skipBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 2,
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
