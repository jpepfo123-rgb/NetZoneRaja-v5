import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CRMProvider } from '@/contexts/CRMContext';
import { AfterCallModal } from '@/components/AfterCallModal';
import { OverlayPermissionScreen } from '@/components/OverlayPermissionScreen';
import { useAfterCallPopup } from '@/hooks/useAfterCallPopup';
import { useOverlayPermission } from '@/hooks/useOverlayPermission';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(auth)"              options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"              options={{ headerShown: false }} />
      <Stack.Screen name="customers/add"       options={{ title: 'Add Customer',      headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
      <Stack.Screen name="customers/[id]"      options={{ title: 'Customer Details',  headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
      <Stack.Screen name="customers/edit/[id]" options={{ title: 'Edit Customer',     headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
      <Stack.Screen name="categories"          options={{ title: 'Categories',        headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
      <Stack.Screen name="dialer"              options={{ title: 'Auto Dialer',       headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
      <Stack.Screen name="reports"             options={{ title: 'Reports',           headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
      <Stack.Screen name="admin"               options={{ title: 'Admin Panel',       headerStyle: { backgroundColor: '#1565C0' }, headerTintColor: '#fff', headerTitleStyle: { fontFamily: 'Inter_600SemiBold' } }} />
    </Stack>
  );
}

/** After-call popup wrapper */
function AppWithAfterCallPopup({ children }: { children: React.ReactNode }) {
  const { visible, callData, dismiss } = useAfterCallPopup();
  return (
    <>
      {children}
      <AfterCallModal visible={visible} data={callData} onClose={dismiss} />
    </>
  );
}

/**
 * Android overlay permission gate.
 *
 * Rules:
 *  - Only runs on Android.
 *  - Only shown to authenticated users (not on the login screen).
 *  - Shown exactly once; decision stored in AsyncStorage.
 *  - If user grants → continues automatically (AppState listener re-checks).
 *  - If user skips → app works normally; overlay popup features disabled.
 *  - Never calls PermissionsAndroid or forces the system dialog directly.
 */
function OverlayPermissionGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { status, requestPermission, skipPermission } = useOverlayPermission();

  // Non-Android or not logged in → pass through
  if (Platform.OS !== 'android' || !user) return <>{children}</>;

  // Still checking (brief async storage + native call) → don't flash a screen
  if (status === 'checking') return <>{children}</>;

  // Needs permission → show explanation screen
  if (status === 'needs_permission') {
    return (
      <OverlayPermissionScreen
        onGrant={requestPermission}
        onSkip={skipPermission}
      />
    );
  }

  // granted | skipped → proceed normally
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <CRMProvider>
                <AppWithAfterCallPopup>
                  <OverlayPermissionGate>
                    <RootLayoutNav />
                  </OverlayPermissionGate>
                </AppWithAfterCallPopup>
              </CRMProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
