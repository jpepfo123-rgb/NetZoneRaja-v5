import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors, getCategoryColor } from '@/hooks/useColors';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const colors = useColors();
  const { bg, text } = getCategoryColor(category, colors);

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: text }, size === 'sm' && styles.textSm]}>
        {category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  textSm: {
    fontSize: 11,
  },
});
