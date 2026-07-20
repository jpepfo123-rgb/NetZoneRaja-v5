/**
 * OverlayPermissionScreen
 *
 * Shown once on Android when SYSTEM_ALERT_WINDOW is not granted.
 * Explains WHY the permission is needed, shows manufacturer-specific
 * guidance, and offers "Grant Permission" or "Skip" choices.
 *
 * - Never shows the system permission dialog directly (avoids the
 *   repeated Android warning).
 * - Only shows this screen ONCE per install (choice stored via hook).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getDeviceManufacturer } from '@/hooks/useOverlayPermission';

interface OverlayPermissionScreenProps {
  onGrant: () => Promise<void>;
  onSkip: () => Promise<void>;
}

// ── Manufacturer-specific guidance ───────────────────────────────────────────

interface ManufacturerGuide {
  label: string;
  steps: string[];
}

function getManufacturerGuide(manufacturer: string): ManufacturerGuide | null {
  const m = manufacturer.toLowerCase();

  if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) {
    return {
      label: 'Xiaomi / Redmi / POCO',
      steps: [
        'Tap "Grant Permission" below.',
        'Find "Net Zone CRM Dialer" in the list.',
        'Enable "Display over other apps".',
        'Return to the app — it continues automatically.',
      ],
    };
  }
  if (m.includes('oppo') || m.includes('realme') || m.includes('oneplus')) {
    return {
      label: 'OPPO / Realme / OnePlus (ColorOS)',
      steps: [
        'Tap "Grant Permission" below.',
        'Tap "Net Zone CRM Dialer" in the list.',
        'Turn on "Allow display over other apps".',
        'Press Back — the app continues automatically.',
      ],
    };
  }
  if (m.includes('vivo') || m.includes('iqoo')) {
    return {
      label: 'Vivo / iQOO',
      steps: [
        'Tap "Grant Permission" below.',
        'Locate "Net Zone CRM Dialer".',
        'Enable "Show over other apps".',
        'Return here — the app resumes automatically.',
      ],
    };
  }
  if (m.includes('samsung')) {
    return {
      label: 'Samsung (One UI)',
      steps: [
        'Tap "Grant Permission" below.',
        'Find "Net Zone CRM Dialer" in the list.',
        'Toggle "Allow permission" ON.',
        'Press Back — the app continues automatically.',
      ],
    };
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OverlayPermissionScreen({ onGrant, onSkip }: OverlayPermissionScreenProps) {
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  const [opening, setOpening] = useState(false);

  const manufacturer = getDeviceManufacturer();
  const guide = getManufacturerGuide(manufacturer);

  const handleGrant = useCallback(async () => {
    setOpening(true);
    await onGrant();
    // AppState listener in the hook will detect return and re-check
    setOpening(false);
  }, [onGrant]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: top + 24, paddingBottom: bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Feather name="layers" size={40} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          Allow "Display Over Other Apps"
        </Text>

        {/* Description */}
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Net Zone CRM needs the{' '}
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
            "Display over other apps"
          </Text>{' '}
          permission to show the{' '}
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
            incoming call popup
          </Text>{' '}
          and{' '}
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>
            after-call note screen
          </Text>{' '}
          — even when your screen is locked.
        </Text>

        {/* Feature list */}
        {[
          { icon: 'phone-incoming', text: 'See caller name & category on incoming calls' },
          { icon: 'clipboard', text: 'Add call notes immediately after hanging up' },
          { icon: 'bell', text: 'Receive reminder popups without unlocking the phone' },
        ].map(({ icon, text }) => (
          <View key={icon} style={[styles.feature, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name={icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.foreground }]}>{text}</Text>
          </View>
        ))}

        {/* Manufacturer-specific guidance */}
        {guide && (
          <View style={[styles.guideCard, { backgroundColor: colors.warningLight, borderColor: '#FFB300' }]}>
            <View style={styles.guideHeader}>
              <Feather name="smartphone" size={16} color={colors.warning} />
              <Text style={[styles.guideTitle, { color: colors.warning }]}>
                {guide.label} — step-by-step
              </Text>
            </View>
            {guide.steps.map((step, i) => (
              <View key={i} style={styles.guideStep}>
                <View style={[styles.stepNum, { backgroundColor: colors.warning }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* No-action disclaimer */}
        <View style={[styles.safeNote, { backgroundColor: colors.muted }]}>
          <Feather name="shield" size={14} color={colors.mutedForeground} />
          <Text style={[styles.safeText, { color: colors.mutedForeground }]}>
            This permission is only used to display the CRM popup. The app never reads your
            screen content or captures any data from other apps.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky bottom actions */}
      <View
        style={[
          styles.actions,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: bottom + 16,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.grantBtn, { backgroundColor: colors.primary }]}
          onPress={handleGrant}
          disabled={opening}
          activeOpacity={0.85}
        >
          <Feather name="external-link" size={18} color="#fff" />
          <Text style={styles.grantText}>
            {opening ? 'Opening Settings…' : 'Grant Permission'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            Skip — I don't need call popups
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, alignItems: 'center' },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 14,
  },
  desc: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },

  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },

  guideCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  guideTitle: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  stepText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },

  safeNote: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  safeText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  grantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  grantText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
