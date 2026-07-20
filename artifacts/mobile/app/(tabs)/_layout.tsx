import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

/** Height of the visible tab bar (icons + labels), excluding system nav bar */
const TAB_CONTENT_HEIGHT = 58;

export default function TabLayout() {
  const colors  = useColors();
  const { user }   = useAuth();
  const { bottom } = useSafeAreaInsets();

  const isIOS  = Platform.OS === 'ios';
  const isWeb  = Platform.OS === 'web';

  if (!user) return <Redirect href="/(auth)/login" />;

  /**
   * On Android: bottom = height of the system navigation bar in logical pixels.
   * We extend the tab bar height to fill that gap so the background reaches the
   * very bottom of the screen, then pad the content (icons/labels) upward.
   *
   * On iOS: SafeAreaProvider + expo-router handle the home-indicator gap via
   * BlurView, so we only need a small aesthetic padding.
   */
  const tabBarHeight     = isWeb ? 84  : TAB_CONTENT_HEIGHT + (bottom > 0 ? bottom : 8);
  const tabBarPadBottom  = isWeb ? 34  : bottom > 0 ? bottom : 8;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position:         'absolute',
          backgroundColor:  isIOS ? 'transparent' : colors.card,
          borderTopWidth:   1,
          borderTopColor:   colors.border,
          elevation:        0,
          // Full height includes the system nav bar area on Android
          height:           tabBarHeight,
          // Push icons/labels above the system nav bar
          paddingBottom:    tabBarPadBottom,
          paddingTop:       4,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize:   11,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Call History',
          tabBarIcon: ({ color }) => <Feather name="phone" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color }) => <Feather name="bell" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} />,
        }}
      />
      {/* Hidden routes — not shown in tab bar */}
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}
