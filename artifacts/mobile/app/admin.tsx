import React, { useState } from 'react';
import {
  Alert,
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
import { useCRM } from '@/contexts/CRMContext';

export default function AdminScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { agents, calls, customers } = useCRM();
  const [addUserModal, setAddUserModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const liveCallCount = calls.filter(c => {
    const diff = Date.now() - new Date(c.createdAt).getTime();
    return diff < 3600000;
  }).length;

  function handleAddUser() {
    if (!newName || !newUsername) { Alert.alert('Error', 'Name and username required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', `Agent "${newName}" added successfully`);
    setAddUserModal(false);
    setNewName('');
    setNewUsername('');
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottom + 30, gap: 16, padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Live Stats */}
      <View style={[styles.liveCard, { backgroundColor: colors.primary }]}>
        <View style={styles.liveHeader}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTitle}>Live Dashboard</Text>
        </View>
        <View style={styles.liveStats}>
          {[
            { label: 'Live Calls', value: liveCallCount },
            { label: 'Active Agents', value: agents.filter(a => a.isActive).length },
            { label: 'Total Customers', value: customers.length },
          ].map((s) => (
            <View key={s.label} style={styles.liveStat}>
              <Text style={styles.liveVal}>{s.value}</Text>
              <Text style={styles.liveLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* User Management */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>User Management</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
            onPress={() => setAddUserModal(true)}
          >
            <Feather name="user-plus" size={14} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Agent</Text>
          </TouchableOpacity>
        </View>

        {agents.map((agent, i) => {
          const agentCalls = calls.filter(c => c.agentId === agent.id).length;
          return (
            <View
              key={agent.id}
              style={[styles.userRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}
            >
              <View style={[styles.userAvatar, { backgroundColor: agent.role === 'admin' ? colors.primaryLight : colors.customerLight }]}>
                <Feather name={agent.role === 'admin' ? 'shield' : 'user'} size={16} color={agent.role === 'admin' ? colors.primary : colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{agent.name}</Text>
                <Text style={[styles.userSub, { color: colors.mutedForeground }]}>@{agent.username} · {agent.role}</Text>
              </View>
              <View style={[styles.activeDot, { backgroundColor: agent.isActive ? colors.success : colors.mutedForeground }]} />
              <Text style={[styles.userCalls, { color: colors.primary }]}>{agentCalls} calls</Text>
              <TouchableOpacity onPress={() => Alert.alert('Edit', `Edit ${agent.name}`)}>
                <Feather name="more-vertical" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Agent Performance */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Agent Performance</Text>
        {agents.filter(a => a.role === 'agent').map((agent) => {
          const agentCalls = calls.filter(c => c.agentId === agent.id);
          const missed = agentCalls.filter(c => c.type === 'Missed').length;
          const connected = agentCalls.length - missed;
          const rate = agentCalls.length > 0 ? Math.round((connected / agentCalls.length) * 100) : 0;
          return (
            <View key={agent.id} style={[styles.perfCard, { backgroundColor: colors.muted, borderRadius: 12, padding: 14 }]}>
              <View style={styles.perfHeader}>
                <Text style={[styles.perfName, { color: colors.foreground }]}>{agent.name}</Text>
                <View style={[styles.rateBadge, { backgroundColor: rate >= 70 ? colors.incomingLight : colors.warningLight }]}>
                  <Text style={[styles.rateText, { color: rate >= 70 ? colors.incoming : colors.warning }]}>{rate}% connected</Text>
                </View>
              </View>
              <View style={styles.perfStats}>
                <View style={styles.perfStat}>
                  <Text style={[styles.perfVal, { color: colors.primary }]}>{agentCalls.length}</Text>
                  <Text style={[styles.perfLabel, { color: colors.mutedForeground }]}>Total</Text>
                </View>
                <View style={styles.perfStat}>
                  <Text style={[styles.perfVal, { color: colors.incoming }]}>{connected}</Text>
                  <Text style={[styles.perfLabel, { color: colors.mutedForeground }]}>Connected</Text>
                </View>
                <View style={styles.perfStat}>
                  <Text style={[styles.perfVal, { color: colors.missed }]}>{missed}</Text>
                  <Text style={[styles.perfLabel, { color: colors.mutedForeground }]}>Missed</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Live Call Report */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
        {calls.slice(0, 5).map((call, i) => (
          <View key={call.id} style={[styles.callRow, { borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
            <View style={[styles.callIcon, {
              backgroundColor: call.type === 'Missed' ? colors.missedLight : call.type === 'Incoming' ? colors.incomingLight : colors.outgoingLight
            }]}>
              <Feather
                name={call.type === 'Incoming' ? 'phone-incoming' : call.type === 'Outgoing' ? 'phone-outgoing' : 'phone-missed'}
                size={13}
                color={call.type === 'Missed' ? colors.missed : call.type === 'Incoming' ? colors.incoming : colors.outgoing}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.callName, { color: colors.foreground }]}>{call.customerName}</Text>
              <Text style={[styles.callAgent, { color: colors.mutedForeground }]}>{call.agentName}</Text>
            </View>
            <Text style={[styles.callDur, { color: colors.mutedForeground }]}>{call.duration}</Text>
          </View>
        ))}
      </View>

      {/* Export */}
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={() => Alert.alert('Export', 'Exporting data as Excel...')}
        >
          <Feather name="download" size={16} color="#fff" />
          <Text style={styles.exportText}>Export Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.secondary }]}
          onPress={() => Alert.alert('Export', 'Generating PDF report...')}
        >
          <Feather name="file-text" size={16} color="#fff" />
          <Text style={styles.exportText}>Export PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Add Agent Modal */}
      <Modal visible={addUserModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, paddingBottom: bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add New Agent</Text>
              <TouchableOpacity onPress={() => setAddUserModal(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Full Name"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAddUser}>
              <Text style={styles.saveBtnText}>Add Agent</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  liveCard: {
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5252' },
  liveTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  liveStats: { flexDirection: 'row', justifyContent: 'space-around' },
  liveStat: { alignItems: 'center', gap: 4 },
  liveVal: { fontSize: 26, fontFamily: 'Inter_700Bold', color: '#fff' },
  liveLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  userSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  userCalls: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  perfCard: { gap: 10 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rateBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rateText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  perfStats: { flexDirection: 'row', gap: 20 },
  perfStat: { alignItems: 'center', gap: 2 },
  perfVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  perfLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  callIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  callName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  callAgent: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  callDur: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  exportRow: { flexDirection: 'row', gap: 10 },
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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
