import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, getCategoryColor } from '@/hooks/useColors';
import { CATEGORIES, Category } from '@/constants/colors';
import { CustomerCard } from '@/components/CustomerCard';
import { CallPopupModal } from '@/components/CallPopupModal';
import { useCRM, Customer } from '@/contexts/CRMContext';

const CATEGORY_ICONS: Record<Category, string> = {
  'New Lead': 'user-plus',
  'Interested': 'heart',
  'Follow-up': 'refresh-cw',
  'Customer': 'check-circle',
  'Payment Pending': 'credit-card',
  'Closed': 'x-circle',
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  'New Lead': 'Fresh contacts not yet engaged',
  'Interested': 'Showing interest, in discussion',
  'Follow-up': 'Require callback or follow-up',
  'Customer': 'Active paying customers',
  'Payment Pending': 'Deal done, payment awaited',
  'Closed': 'Deals completed or lost',
};

export default function CategoriesScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { customers } = useCRM();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [popupCustomer, setPopupCustomer] = useState<Customer | null>(null);

  const stats = useMemo(() =>
    CATEGORIES.map(cat => ({
      category: cat,
      count: customers.filter(c => c.category === cat).length,
      customers: customers.filter(c => c.category === cat),
    })),
    [customers],
  );

  const totalCustomers = customers.length;

  const filteredCustomers = useMemo(() => {
    if (!activeCategory) return [];
    return customers.filter(c => c.category === activeCategory);
  }, [customers, activeCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 100 }}>

        {/* Summary Header */}
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryTitle}>Customer Categories</Text>
          <Text style={styles.summaryCount}>{totalCustomers}</Text>
          <Text style={styles.summaryLabel}>Total Customers</Text>
        </View>

        {/* Category Cards */}
        <View style={styles.grid}>
          {stats.map(({ category, count, customers: catCustomers }) => {
            const { bg, text } = getCategoryColor(category, colors);
            const icon = CATEGORY_ICONS[category];
            const pct = totalCustomers > 0 ? Math.round((count / totalCustomers) * 100) : 0;
            const isActive = activeCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.catCard,
                  { backgroundColor: colors.card, borderColor: isActive ? text : colors.border },
                  isActive && { shadowColor: text, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
                ]}
                onPress={() => setActiveCategory(isActive ? null : category)}
                activeOpacity={0.8}
              >
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: text }]} />

                <View style={styles.catContent}>
                  <View style={styles.catHeader}>
                    <View style={[styles.catIcon, { backgroundColor: bg }]}>
                      <Feather name={icon as any} size={18} color={text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catName, { color: colors.foreground }]}>{category}</Text>
                      <Text style={[styles.catDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {CATEGORY_DESCRIPTIONS[category]}
                      </Text>
                    </View>
                    <View style={styles.catRight}>
                      <Text style={[styles.catCount, { color: text }]}>{count}</Text>
                      <Text style={[styles.catPct, { color: colors.mutedForeground }]}>{pct}%</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: text, width: `${pct}%` as any },
                      ]}
                    />
                  </View>

                  {isActive && (
                    <View style={styles.chevronRow}>
                      <Text style={[styles.tapText, { color: text }]}>
                        {count > 0 ? `Showing ${count} customer${count !== 1 ? 's' : ''}` : 'No customers'}
                      </Text>
                      <Feather name="chevron-up" size={14} color={text} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtered Customers */}
        {activeCategory && filteredCustomers.length > 0 && (
          <View style={styles.customerSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {activeCategory}
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => router.push('/customers/add' as any)}
              >
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {filteredCustomers.map(c => (
              <CustomerCard
                key={c.id}
                customer={c}
                onPress={() => router.push(`/customers/${c.id}` as any)}
                onCall={() => setPopupCustomer(c)}
              />
            ))}
          </View>
        )}

        {activeCategory && filteredCustomers.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No customers in {activeCategory}
            </Text>
            <TouchableOpacity
              style={[styles.addCustomerBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/customers/add' as any)}
            >
              <Feather name="user-plus" size={15} color="#fff" />
              <Text style={styles.addCustomerText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CallPopupModal
        visible={!!popupCustomer}
        customer={popupCustomer}
        callType="Outgoing"
        onClose={() => setPopupCustomer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 4,
  },
  summaryTitle: { fontSize: 13, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' },
  summaryCount: { fontSize: 48, fontFamily: 'Inter_700Bold', color: '#fff', lineHeight: 56 },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' },
  grid: { padding: 16, gap: 10 },
  catCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: { width: 4 },
  catContent: { flex: 1, padding: 14, gap: 10 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  catName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  catDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  catRight: { alignItems: 'flex-end', gap: 2 },
  catCount: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  catPct: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  progressBar: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, minWidth: 4 },
  chevronRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tapText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  customerSection: { gap: 2, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyCard: {
    margin: 16, borderRadius: 16, borderWidth: 1,
    padding: 32, alignItems: 'center', gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  addCustomerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4,
  },
  addCustomerText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
