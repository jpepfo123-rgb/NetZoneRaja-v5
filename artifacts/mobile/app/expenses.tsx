import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_KEY = '@netzone/server_url';
const TOKEN_KEY = '@netzone/auth_token';

const CATEGORIES = ['Travel','Food','Communication','Marketing','Utilities','Other'];
const STATUS_COLORS: Record<string, string> = {
  pending:  '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
};

interface Expense {
  id: string;
  agent_name: string;
  amount: number;
  category: string;
  description: string;
  status: string;
  expense_date: string;
  notes?: string;
}

export default function ExpensesScreen() {
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'Travel', description: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [base, token] = await Promise.all([
        AsyncStorage.getItem(BASE_KEY),
        AsyncStorage.getItem(TOKEN_KEY),
      ]);
      if (!base || !token) { setLoading(false); return; }
      const res = await fetch(`${base.replace(/\/+$/, '')}/api/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setExpenses(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.amount || !form.description) return;
    setSubmitting(true);
    try {
      const [base, token] = await Promise.all([
        AsyncStorage.getItem(BASE_KEY),
        AsyncStorage.getItem(TOKEN_KEY),
      ]);
      if (!base || !token) return;
      const res = await fetch(`${base.replace(/\/+$/, '')}/api/expenses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (res.ok) {
        setAddOpen(false);
        setForm({ amount: '', category: 'Travel', description: '', notes: '' });
        load();
      }
    } catch {}
    finally { setSubmitting(false); }
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const approved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Expenses</Text>
        <TouchableOpacity onPress={() => setAddOpen(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { label: 'Total', value: `₹${total.toLocaleString()}`, color: colors.primary },
          { label: 'Approved', value: `₹${approved.toLocaleString()}`, color: '#22c55e' },
          { label: 'Count', value: expenses.length, color: colors.mutedForeground },
        ].map(s => (
          <View key={s.label} style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => e.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottom + 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.amount, { color: colors.foreground }]}>₹{Number(item.amount).toLocaleString()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? '#888') + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? '#888' }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={[styles.desc, { color: colors.foreground }]}>{item.description}</Text>
              <View style={styles.cardMeta}>
                <View style={[styles.catBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.catText, { color: colors.mutedForeground }]}>{item.category}</Text>
                </View>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.expense_date?.slice(0, 10)}</Text>
              </View>
              {item.notes ? (
                <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text>
              ) : null}
            </View>
          )}
        />
      )}

      {/* Add Expense Modal */}
      <Modal visible={addOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 24, gap: 16 }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Amount (₹) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.mutedForeground}
                value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c}
                      style={[styles.catChip, { backgroundColor: form.category === c ? colors.primary : colors.muted }]}
                      onPress={() => setForm(f => ({ ...f, category: c }))}>
                      <Text style={[styles.catChipText, { color: form.category === c ? '#fff' : colors.mutedForeground }]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Description *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="What was this for?" placeholderTextColor={colors.mutedForeground}
                value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Additional details" placeholderTextColor={colors.mutedForeground} multiline
                value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={submit} disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Expense'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Inter_700Bold' },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  desc: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  catText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metaText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  notes: { fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  input: { borderRadius: 10, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  catChip: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  catChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
