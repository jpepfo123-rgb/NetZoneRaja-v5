import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useCRM } from '@/contexts/CRMContext';
import { CrmService } from '@/services/crmService';
import { resetLocalStorage } from '@/services/localAdapter';
import { clearRemoteToken, pingServer } from '@/services/remoteAdapter';

const WEB_TOP = Platform.OS === 'web' ? 67 : 0;

type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'failed';

function SectionTitle({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
  );
}

function SettingsRow({
  icon, label, subtitle, value, onPress, danger, right, colors,
}: {
  icon: string; label: string; subtitle?: string; value?: string;
  onPress?: () => void; danger?: boolean; right?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.missedLight : colors.muted }]}>
        <Feather name={icon as any} size={18} color={danger ? colors.missed : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? colors.missed : colors.foreground }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      {right ?? null}
      {onPress && !right && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const { user, logout, isRemote } = useAuth();
  const { customers, calls, reminders, reload } = useCRM();

  const PRODUCTION_API_URL = 'https://zip-repl--megvalrahulsing.replit.app/api';
  const [serverUrl, setServerUrl] = useState(user?.serverUrl ?? PRODUCTION_API_URL);
  const [editingUrl, setEditingUrl] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [syncingData, setSyncingData] = useState(false);

  useEffect(() => {
    if (user?.serverUrl) setServerUrl(user.serverUrl);
  }, [user?.serverUrl]);

  async function handleTestConnection() {
    if (!serverUrl.trim()) {
      Alert.alert('No URL', 'Enter a server URL first');
      return;
    }
    setConnStatus('checking');
    const ok = await pingServer(serverUrl.trim());
    setConnStatus(ok ? 'connected' : 'failed');
    Haptics.notificationAsync(
      ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
    if (ok) {
      CrmService.configure({ mode: 'remote', serverUrl: serverUrl.trim() });
    }
  }

  async function handleSyncNow() {
    setSyncingData(true);
    try {
      await reload();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Synced', 'Data synced successfully.');
    } catch {
      Alert.alert('Sync Failed', 'Could not sync. Check your connection.');
    } finally {
      setSyncingData(false);
    }
  }

  async function handleResetData() {
    Alert.alert(
      'Reset Demo Data',
      'This will restore all sample customers, calls, and reminders. Your changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetLocalStorage();
            await reload();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'Demo data restored.');
          },
        },
      ],
    );
  }

  async function handleClearAll() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all customers, calls, and reminders from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            await reload();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  }

  async function handleExportData() {
    const [c, cl, r, rem] = await Promise.all([
      CrmService.getCustomers(),
      CrmService.getCalls(),
      CrmService.getRemarks(),
      CrmService.getReminders(),
    ]);
    const json = JSON.stringify({ customers: c, calls: cl, remarks: r, reminders: rem }, null, 2);
    // On a real device you'd use expo-sharing; on web just log it
    console.log('EXPORT:', json);
    Alert.alert('Export Ready', `${c.length} customers, ${cl.length} calls. Check console for JSON.`);
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearRemoteToken();
          await logout();
        },
      },
    ]);
  }

  const connIcon = { idle: 'wifi-off', checking: 'loader', connected: 'wifi', failed: 'x-circle' }[connStatus];
  const connColor = {
    idle: colors.mutedForeground,
    checking: colors.warning,
    connected: colors.incoming,
    failed: colors.missed,
  }[connStatus];
  const connLabel = {
    idle: 'Not tested',
    checking: 'Checking…',
    connected: 'Connected ✓',
    failed: 'Unreachable',
  }[connStatus];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.primary, paddingTop: WEB_TOP + top + 16 }]}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.avatarText}>
            {user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <View style={styles.profileMeta}>
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name={user?.role === 'admin' ? 'shield' : 'user'} size={11} color="#fff" />
              <Text style={styles.roleBadgeText}>{user?.role === 'admin' ? 'Administrator' : 'Sales Agent'}</Text>
            </View>
            <View style={[styles.modeBadge, { backgroundColor: isRemote ? '#43A04720' : '#FF572220' }]}>
              <Feather name={isRemote ? 'cloud' : 'hard-drive'} size={11} color={isRemote ? '#43A047' : '#FF5722'} />
              <Text style={[styles.modeBadgeText, { color: isRemote ? '#43A047' : '#FF5722' }]}>
                {isRemote ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileUsername}>@{user?.username}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Customers', value: customers.length, icon: 'users',    color: colors.primary },
          { label: 'Calls',     value: calls.length,     icon: 'phone',    color: colors.outgoing },
          { label: 'Pending',   value: reminders.filter(r => r.status === 'pending').length, icon: 'bell', color: colors.warning },
        ].map(s => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Server Configuration ── */}
      <View style={styles.section}>
        <SectionTitle title="Server Configuration" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* URL Field */}
          <View style={[styles.urlRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name="server" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Server URL</Text>
              {editingUrl ? (
                <TextInput
                  style={[styles.urlInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="https://your-domain.replit.dev/api"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="url"
                  autoFocus
                  onBlur={() => setEditingUrl(false)}
                  onSubmitEditing={() => setEditingUrl(false)}
                />
              ) : (
                <TouchableOpacity onPress={() => setEditingUrl(true)}>
                  <Text style={[styles.rowSub, { color: serverUrl ? colors.primary : colors.mutedForeground }]}>
                    {serverUrl || 'Tap to set server URL'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setEditingUrl(v => !v)}>
              <Feather name={editingUrl ? 'check' : 'edit-2'} size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Connection Status */}
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name={connIcon as any} size={18} color={connColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Connection</Text>
              <Text style={[styles.rowSub, { color: connColor }]}>{connLabel}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionChip, { backgroundColor: colors.primaryLight }]}
              onPress={handleTestConnection}
            >
              {connStatus === 'checking'
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.actionChipText, { color: colors.primary }]}>Test</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Sync */}
          <SettingsRow
            icon="refresh-cw" label="Sync Now"
            subtitle={isRemote ? 'Pull latest data from server' : 'Connect to server first'}
            onPress={isRemote ? handleSyncNow : undefined}
            colors={colors}
            right={syncingData ? <ActivityIndicator size="small" color={colors.primary} /> : undefined}
          />
        </View>
      </View>

      {/* ── Notifications ── */}
      <View style={styles.section}>
        <SectionTitle title="Notifications" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.warningLight }]}>
              <Feather name="bell" size={18} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Reminder Alerts</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={v => { setNotificationsEnabled(v); Haptics.selectionAsync(); }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* ── Data Management ── */}
      <View style={styles.section}>
        <SectionTitle title="Data Management" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="database" label="Reset Demo Data"
            subtitle="Restore 8 sample customers & test data"
            onPress={handleResetData} colors={colors}
          />
          <SettingsRow
            icon="download" label="Export Data"
            subtitle="Export all data as JSON"
            onPress={handleExportData} colors={colors}
          />
          <SettingsRow
            icon="trash-2" label="Clear All Data"
            subtitle="Permanently delete all local data"
            onPress={handleClearAll} danger colors={colors}
          />
        </View>
      </View>

      {/* ── API Integration Info ── */}
      <View style={styles.section}>
        <SectionTitle title="API Integration" colors={colors} />
        <View style={[styles.infoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>Node.js + MySQL Ready</Text>
            <Text style={[styles.infoBody, { color: colors.primary + 'CC' }]}>
              Set a server URL and tap Test Connection to sync with your Node.js backend. The app works offline and syncs when connected. See the API server for endpoint documentation.
            </Text>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            ['POST', '/api/auth/login'],
            ['GET',  '/api/customers'],
            ['GET',  '/api/calls'],
            ['GET',  '/api/remarks'],
            ['GET',  '/api/reminders'],
          ].map(([method, path]) => (
            <View key={path} style={[styles.endpointRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.methodBadge, {
                backgroundColor: method === 'POST' ? colors.incomingLight : colors.primaryLight,
              }]}>
                <Text style={[styles.methodText, {
                  color: method === 'POST' ? colors.incoming : colors.primary,
                }]}>{method}</Text>
              </View>
              <Text style={[styles.endpointPath, { color: colors.foreground }]}>{path}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── About ── */}
      <View style={styles.section}>
        <SectionTitle title="About" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow icon="info"    label="Version"       value="1.0.0"               colors={colors} />
          <SettingsRow icon="code"    label="Platform"      value="Expo / React Native"  colors={colors} />
          <SettingsRow icon="layers"  label="Storage"       value={isRemote ? 'Remote + Local' : 'Local (AsyncStorage)'} colors={colors} />
          <SettingsRow icon="server"  label="Backend"       value="Node.js + Express"    colors={colors} />
          <SettingsRow icon="database"label="Database"      value="MySQL (ready)"        colors={colors} />
        </View>
      </View>

      {/* ── Sign Out ── */}
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="log-out" label="Sign Out"
            subtitle="Log out of your account"
            onPress={handleLogout} danger colors={colors}
          />
        </View>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>Net Zone CRM Dialer v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingBottom: 24,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  profileName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  profileMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  roleBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  modeBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  profileUsername: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statBox: {
    flex: 1, alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4, marginTop: 12,
  },
  card: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04,
    shadowRadius: 3, elevation: 1,
  },
  urlRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14, borderBottomWidth: 1 },
  urlInput: {
    marginTop: 4, padding: 8, borderRadius: 8, borderWidth: 1,
    fontSize: 13, fontFamily: 'Inter_400Regular',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 14, borderBottomWidth: 1,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  rowValue: { fontSize: 12, fontFamily: 'Inter_400Regular', marginRight: 4 },
  actionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    minWidth: 48, alignItems: 'center',
  },
  actionChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  infoCard: {
    flexDirection: 'row', gap: 12, padding: 14,
    borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  infoTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  infoBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  endpointRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  methodText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  endpointPath: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  footer: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', paddingVertical: 16 },
  warningLight: {},
});
