import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CategoryBadge } from './CategoryBadge';
import { Customer } from '@/contexts/CRMContext';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
  onCall?: () => void;
}

export function CustomerCard({ customer, onPress, onCall }: CustomerCardProps) {
  const colors = useColors();
  const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{customer.name}</Text>
        <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{customer.mobile}</Text>
        <CategoryBadge category={customer.category} size="sm" />
      </View>
      <TouchableOpacity
        style={[styles.callBtn, { backgroundColor: colors.incomingLight }]}
        onPress={onCall}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="phone" size={18} color={colors.incoming} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  mobile: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
