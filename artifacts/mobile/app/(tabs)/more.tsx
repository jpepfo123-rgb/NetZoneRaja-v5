import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useCRM } from '@/contexts/CRMContext';

interface MenuItem { icon: string; label: string; subtitle: string; route: string; color: string; bgColor: string; adminOnly?: boolean; }

const WEB_TOP = Platform.OS === 'web' ? 67 : 0;

export default function MoreScreen() {
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { customers, calls, reminders } = useCRM();

  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Management',
      items: [
        { icon: 'tag', label: 'Categories', subtitle: '6 customer categories', route: '/categories', color: colors.accent, bgColor: colors.customerLight },
        { icon: 'phone-forwarded', label: 'Auto Dialer', subtitle: 'Bulk call management', route: '/dialer', color: colors.primary, bgColor: colors.primaryLight },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { icon: 'bar-chart-2', label: 'Reports', subtitle: 'Daily, weekly & monthly', route: '/reports', color: colors.warning, bgColor: colors.warningLight },
        { icon: 'shield', label: 'Admin Panel', subtitle: 'User & agent management', route: '/admin', color: colors.secondary, bgColor: colors.newLeadLight, adminOnly: true },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.primary, paddingTop: WEB_TOP + 20 }]}>
        <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.profileInitials}>
            {user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <View style={styles.roleRow}>
            <Feather name={user?.role === 'admin' ? 'shield' : 'user'} size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.profileRole}>{user?.role === 'admin' ? 'Administrator' : 'Sales Agent'}</Text>
          </View>
          <Text style={styles.profileServer} numberOfLines={1}>{user?.serverUrl}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Customers', value: customers.length, icon: 'users', color: colors.primary },
          { label: 'Total Calls', value: calls.length, icon: 'phone-call', color: colors.accent },
          { label: 'Reminders', value: reminders.filter(r => r.status === 'pending').length, icon: 'bell', color: colors.warning },
        ].map(s => (
          <View key={s.label} style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
              <Feather name={s.icon as any} size={16} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Menu Groups */}
      {menuGroups.map(group => {
        const visibleItems = group.items.filter(i => !i.adminOnly || user?.role === 'admin');
        if (visibleItems.length === 0) return null;
        return (
          <View key={group.title} style={styles.groupSection}>
            <Text style={[styles.groupTitle, { color: colors.mutedForeground }]}>{group.title.toUpperCase()}</Text>
            <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {visibleItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    index < visibleItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.bgColor }]}>
                    <Feather name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                  </View>
                  <View style={[styles.arrowWrap, { backgroundColor: colors.muted }]}>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Logout */}
      <View style={styles.groupSection}>
        <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { Haptics.selectionAsync(); logout(); }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.missedLight }]}>
              <Feather name="log-out" size={20} color={colors.missed} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: colors.missed }]}>Sign Out</Text>
              <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>Log out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>Net Zone CRM Dialer v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 20, paddingBottom: 24,
  },
  profileAvatar: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitials: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  profileName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  profileRole: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
  profileServer: { fontSize: 11, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statItem: {
    flex: 1, alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  groupSection: { paddingHorizontal: 16, marginBottom: 12 },
  groupTitle: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
  },
  groupCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  menuSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  arrowWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 8, marginTop: 4 },
});
