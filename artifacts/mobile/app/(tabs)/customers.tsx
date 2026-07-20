import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CustomerCard } from '@/components/CustomerCard';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { CallPopupModal } from '@/components/CallPopupModal';
import { CATEGORIES, Category } from '@/constants/colors';
import { useCRM, Customer } from '@/contexts/CRMContext';

export default function CustomersScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { customers } = useCRM();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [popupCustomer, setPopupCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    let list = customers;
    if (activeCategory !== 'All') list = list.filter(c => c.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [customers, search, activeCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers..." />

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 48 }}
      >
        {(['All', ...CATEGORIES] as (Category | 'All')[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              { borderColor: colors.border, backgroundColor: colors.card },
              activeCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[
              styles.filterText,
              { color: colors.mutedForeground },
              activeCategory === cat && { color: '#fff' },
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={() => router.push(`/customers/${item.id}` as any)}
            onCall={() => setPopupCustomer(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No customers found"
            subtitle={search ? 'Try a different search term' : 'Add your first customer'}
          />
        }
        contentContainerStyle={{ paddingBottom: bottom + 100, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottom + 90 }]}
        onPress={() => router.push('/customers/add' as any)}
        activeOpacity={0.85}
      >
        <Feather name="user-plus" size={22} color="#fff" />
      </TouchableOpacity>

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
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
});
