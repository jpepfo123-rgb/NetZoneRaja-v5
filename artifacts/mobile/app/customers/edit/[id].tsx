import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, PRIORITIES, Category, Priority } from '@/constants/colors';
import { useCRM } from '@/contexts/CRMContext';

export default function EditCustomerScreen() {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCustomerById, updateCustomer } = useCRM();
  const customer = getCustomerById(id);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<Category>('New Lead');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setMobile(customer.mobile);
      setEmail(customer.email);
      setAddress(customer.address);
      setCategory(customer.category);
      setPriority(customer.priority);
      setNotes(customer.notes);
    }
  }, [customer]);

  if (!customer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Customer not found</Text>
      </View>
    );
  }

  function handleSave() {
    if (!name.trim() || !mobile.trim()) {
      Alert.alert('Validation', 'Name and Mobile are required');
      return;
    }
    updateCustomer(id, {
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      address: address.trim(),
      category,
      priority,
      notes: notes.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 100, padding: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Information</Text>
          <Field label="Full Name *" value={name} onChangeText={setName} placeholder="Customer name" icon="user" colors={colors} />
          <Field label="Mobile Number *" value={mobile} onChangeText={setMobile} placeholder="Mobile number" icon="phone" keyboardType="phone-pad" colors={colors} />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="Email address" icon="mail" keyboardType="email-address" colors={colors} />
          <Field label="Address" value={address} onChangeText={setAddress} placeholder="Address" icon="map-pin" colors={colors} />
        </View>

        {/* Category */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                  category === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => { setCategory(c); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: category === c ? '#fff' : colors.foreground }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const pColor = p === 'High' ? colors.high : p === 'Medium' ? colors.medium : colors.low;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                    priority === p && { backgroundColor: pColor, borderColor: pColor },
                  ]}
                  onPress={() => { setPriority(p); Haptics.selectionAsync(); }}
                >
                  <Feather name="flag" size={13} color={priority === p ? '#fff' : pColor} />
                  <Text style={[styles.chipText, { color: priority === p ? '#fff' : colors.foreground }]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.85}>
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, icon, keyboardType, colors }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; icon: string; keyboardType?: any; colors: any;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name={icon as any} size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType ?? 'default'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', padding: 0 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  notesInput: {
    borderRadius: 10, borderWidth: 1, padding: 12,
    fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 90,
  },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  saveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
