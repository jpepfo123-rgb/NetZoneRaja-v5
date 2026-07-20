import React, { useEffect, useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CategoryBadge } from './CategoryBadge';
import { Customer, useCRM } from '@/contexts/CRMContext';
import { useAuth } from '@/contexts/AuthContext';

interface CallPopupModalProps {
  visible: boolean;
  customer: Customer | null;
  callType: 'Incoming' | 'Outgoing' | 'Missed';
  onClose: () => void;
}

export function CallPopupModal({ visible, customer, callType, onClose }: CallPopupModalProps) {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { user } = useAuth();
  const { addCall, addRemark, addReminder, getCustomerRemarks, getCustomerCalls } = useCRM();
  const [remark, setRemark] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  const remarks = customer ? getCustomerRemarks(customer.id).slice(0, 3) : [];
  const callHistory = customer ? getCustomerCalls(customer.id).slice(0, 3) : [];

  useEffect(() => {
    if (visible) setRemark('');
  }, [visible]);

  function handleSave() {
    if (!customer || !user) return;
    if (remark.trim()) {
      addRemark({ customerId: customer.id, text: remark.trim(), agentName: user.name, isCallNote: false });
    }
    addCall({
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      type: callType,
      duration: '0:00',
      durationSeconds: 0,
      agentName: user.name,
      agentId: user.id,
      remarks: remark.trim(),
    });
    if (reminderDate.trim()) {
      addReminder({
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        dateTime: new Date().toISOString(),
        notes: reminderDate.trim(),
        status: 'pending',
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  function handleWhatsApp() {
    if (!customer) return;
    Linking.openURL(`whatsapp://send?phone=91${customer.mobile}`);
  }

  function handleCall() {
    if (!customer) return;
    Linking.openURL(`tel:${customer.mobile}`);
  }

  if (!customer) return null;

  const typeColor = callType === 'Incoming' ? colors.incoming :
    callType === 'Outgoing' ? colors.outgoing : colors.missed;
  const typeBg = callType === 'Incoming' ? colors.incomingLight :
    callType === 'Outgoing' ? colors.outgoingLight : colors.missedLight;
  const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottom + 16 }]}>
          {/* Header */}
          <View style={[styles.callHeader, { backgroundColor: typeColor }]}>
            <View style={styles.callInfo}>
              <View style={[styles.avatarLg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.initialsLg}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.callName}>{customer.name}</Text>
                <Text style={styles.callMobile}>{customer.mobile}</Text>
                <View style={[styles.callTypeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.callTypeText}>{callType} Call</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Category & Priority */}
            <View style={styles.row}>
              <CategoryBadge category={customer.category} />
              <View style={[styles.priorityBadge, { backgroundColor: colors.muted }]}>
                <Feather name="flag" size={12} color={colors.mutedForeground} />
                <Text style={[styles.priorityText, { color: colors.mutedForeground }]}>{customer.priority}</Text>
              </View>
            </View>

            {/* Previous Remarks */}
            {remarks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Remarks</Text>
                {remarks.map((r) => (
                  <View key={r.id} style={[styles.remarkItem, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.remarkText, { color: colors.foreground }]}>{r.text}</Text>
                    <Text style={[styles.remarkMeta, { color: colors.mutedForeground }]}>{r.agentName}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Call History */}
            {callHistory.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Call History</Text>
                {callHistory.map((c) => (
                  <View key={c.id} style={[styles.callHistItem, { borderColor: colors.border }]}>
                    <Feather name="phone" size={13} color={c.type === 'Missed' ? colors.missed : c.type === 'Incoming' ? colors.incoming : colors.outgoing} />
                    <Text style={[styles.callHistType, { color: colors.foreground }]}>{c.type}</Text>
                    <Text style={[styles.callHistDur, { color: colors.mutedForeground }]}>{c.duration}</Text>
                    <Text style={[styles.callHistAgent, { color: colors.mutedForeground }]}>{c.agentName}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Add Remark */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Add Remark</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Enter remark..."
                placeholderTextColor={colors.mutedForeground}
                value={remark}
                onChangeText={setRemark}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Reminder */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Set Reminder (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Reminder note..."
                placeholderTextColor={colors.mutedForeground}
                value={reminderDate}
                onChangeText={setReminderDate}
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight }]} onPress={handleCall}>
              <Feather name="phone" size={20} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]} onPress={handleWhatsApp}>
              <Feather name="message-circle" size={20} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save</Text>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  callHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  callInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsLg: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  callName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  callMobile: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  callTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  callTypeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    marginTop: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  remarkItem: {
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  remarkText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  remarkMeta: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  callHistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  callHistType: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  callHistDur: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  callHistAgent: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 4,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
