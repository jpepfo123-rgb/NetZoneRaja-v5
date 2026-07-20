import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CustomerCard } from '@/components/CustomerCard';
import { CallPopupModal } from '@/components/CallPopupModal';
import { useAuth } from '@/contexts/AuthContext';
import { useCRM, Customer } from '@/contexts/CRMContext';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

interface HeroStatProps {
  value: number;
  label: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
}

function HeroStat({ value, label, colors, onPress }: HeroStatProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center' }}>
      <Text style={[styles.heroValue, { color: '#fff' }]}>{value}</Text>
      <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.75)' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface MiniStatProps {
  value: number;
  label: string;
  icon: string;
  color: string;
  bg: string;
  borderColor: string;
  onPress?: () => void;
}

function MiniStat({ value, label, icon, color, bg, borderColor, onPress }: MiniStatProps) {
  return (
    <TouchableOpacity
      style={[styles.miniCard, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Feather name={icon as any} size={16} color={color} />
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={[styles.miniLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface ActivityCardProps {
  value: number;
  label: string;
  icon: string;
  color: string;
  bg: string;
  borderColor: string;
  onPress?: () => void;
}

function ActivityCard({ value, label, icon, color, bg, borderColor, onPress }: ActivityCardProps) {
  return (
    <TouchableOpacity
      style={[styles.actCard, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actIconWrap, { backgroundColor: color + '22' }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.actValue, { color }]}>{value}</Text>
      <Text style={[styles.actLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const WEB_TOP = Platform.OS === 'web' ? 67 : 0;

export default function Dashboard() {
  const colors = useColors();
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const { customers, calls, getTodayCalls, getPendingFollowUps, getTodayReminders } = useCRM();

  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] ?? null);

  const allCalls = calls;
  const incomingCalls = calls.filter(c => c.type === 'Incoming');
  const outgoingCalls = calls.filter(c => c.type === 'Outgoing');
  const missedCalls = calls.filter(c => c.type === 'Missed');
  const todayCalls = getTodayCalls();
  const followUps = getPendingFollowUps();
  const todayReminders = getTodayReminders();
  const recentCustomers = customers.slice(0, 5);

  function openCallPopup(c: Customer) {
    setSelectedCustomer(c);
    setPopupVisible(true);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Header */}
        <LinearGradient
          colors={['#1565C0', '#1976D2', '#1E88E5']}
          style={[styles.header, { paddingTop: top + WEB_TOP + 16 }]}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.demoBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
              onPress={() => {
                if (customers.length > 0) openCallPopup(customers[0]);
              }}
            >
              <Feather name="phone-incoming" size={16} color="#fff" />
              <Text style={styles.demoBtnText}>Simulate Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push('/(tabs)/reminders' as any)}
            >
              <Feather name="bell" size={22} color="#fff" />
              {todayReminders.length > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{todayReminders.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Hero: Total Calls */}
          <View style={styles.heroSection}>
            <View style={styles.heroDivider} />
            <HeroStat
              value={allCalls.length}
              label="Total Calls"
              colors={colors}
              onPress={() => router.push('/(tabs)/calls' as any)}
            />
            <View style={styles.heroDivider} />
          </View>

          {/* Call type row */}
          <View style={styles.callTypeRow}>
            {[
              { value: incomingCalls.length, label: 'Incoming', icon: 'phone-incoming', color: '#81C784' },
              { value: outgoingCalls.length, label: 'Outgoing', icon: 'phone-outgoing', color: '#64B5F6' },
              { value: missedCalls.length, label: 'Missed', icon: 'phone-missed', color: '#EF9A9A' },
            ].map(s => (
              <TouchableOpacity
                key={s.label}
                style={styles.callTypeItem}
                onPress={() => router.push('/(tabs)/calls' as any)}
                activeOpacity={0.75}
              >
                <Feather name={s.icon as any} size={14} color={s.color} />
                <Text style={[styles.callTypeVal, { color: '#fff' }]}>{s.value}</Text>
                <Text style={[styles.callTypeLabel, { color: 'rgba(255,255,255,0.7)' }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* Today's Activity */}
        <View style={styles.sectionPad}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Activity</Text>
          <View style={styles.actRow}>
            <ActivityCard
              value={todayCalls.length}
              label="Today's Calls"
              icon="phone"
              color={colors.primary}
              bg={colors.primaryLight}
              borderColor={colors.primary + '33'}
              onPress={() => router.push('/(tabs)/calls' as any)}
            />
            <ActivityCard
              value={followUps.length}
              label="Follow-ups"
              icon="refresh-cw"
              color={colors.warning}
              bg={colors.warningLight}
              borderColor={colors.warning + '33'}
              onPress={() => router.push('/(tabs)/customers' as any)}
            />
            <ActivityCard
              value={todayReminders.length}
              label="Reminders"
              icon="bell"
              color={colors.missed}
              bg={colors.missedLight}
              borderColor={colors.missed + '33'}
              onPress={() => router.push('/(tabs)/reminders' as any)}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionPad}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: 'user-plus', label: 'Add Customer', route: '/customers/add', color: colors.primary, bg: colors.primaryLight },
              { icon: 'tag', label: 'Categories', route: '/categories', color: colors.accent, bg: colors.customerLight },
              { icon: 'phone-forwarded', label: 'Auto Dialer', route: '/dialer', color: colors.secondary, bg: colors.newLeadLight },
              { icon: 'bar-chart-2', label: 'Reports', route: '/reports', color: colors.warning, bg: colors.warningLight },
            ].map(a => (
              <TouchableOpacity
                key={a.label}
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                  <Feather name={a.icon as any} size={20} color={a.color} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Customers */}
        <View style={styles.sectionPad}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Customers</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/customers' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {recentCustomers.map(c => (
          <CustomerCard
            key={c.id}
            customer={c}
            onPress={() => router.push(`/customers/${c.id}` as any)}
            onCall={() => openCallPopup(c)}
          />
        ))}
      </ScrollView>

      <CallPopupModal
        visible={popupVisible}
        customer={selectedCustomer}
        callType="Incoming"
        onClose={() => setPopupVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  greeting: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },
  userName: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  demoBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FF5252', alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { fontSize: 8, fontFamily: 'Inter_700Bold', color: '#fff' },
  heroSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 16 },
  heroDivider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroValue: { fontSize: 52, fontFamily: 'Inter_700Bold', lineHeight: 60, textAlign: 'center' },
  heroLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', letterSpacing: 0.5 },
  callTypeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  callTypeItem: { flex: 1, alignItems: 'center', gap: 4 },
  callTypeVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  callTypeLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  sectionPad: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  actRow: { flexDirection: 'row', gap: 10 },
  actCard: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 16,
    borderWidth: 1.5, gap: 6,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  actIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actValue: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  actLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: {
    width: '47%', alignItems: 'center', gap: 10,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  quickIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  miniCard: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 4 },
  miniValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  miniLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
});
