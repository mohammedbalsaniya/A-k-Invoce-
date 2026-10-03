import { Stack } from 'expo-router';
import { MD3LightTheme, MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { initDatabase } from '../database/database';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1a73e8',
    secondary: '#5f6368',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8ab4f8',
    secondary: '#bdc1c6',
  },
};

export default function Layout() {
  return (
    <SafeAreaProvider>
      <LayoutContent />
    </SafeAreaProvider>
  );
}

function LayoutContent() {
  const colorScheme = useColorScheme();
  const activeTheme = colorScheme === 'dark' ? darkTheme : theme;
  const insets = useSafeAreaInsets();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);

  const retryInitialize = () => {
    setDbError(false);
    initDatabase()
      .then(() => setDbReady(true))
      .catch(err => {
        console.error('Database Init Error:', err);
        setDbError(true);
      });
  };

  useEffect(() => {
    let mounted = true;
    initDatabase()
      .then(() => {
        if (mounted) setDbReady(true);
      })
      .catch(err => {
        console.error('Database Init Error:', err);
        if (mounted) setDbError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!dbReady && dbError) {
    return (
      <View style={[styles.error, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.errorTitle}>Could not open local business data</Text>
        <Text style={styles.errorText}>Your data was not intentionally deleted. Retry setup or restart the app.</Text>
        <Pressable onPress={retryInitialize} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable>
      </View>
    );
  }
  if (!dbReady) return null;


  return (
    <PaperProvider theme={activeTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: activeTheme.colors.surface,
          },
          headerTintColor: activeTheme.colors.onSurface,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="customers/index" options={{ title: 'Customers' }} />
        <Stack.Screen name="customers/create" options={{ title: 'Add Customer' }} />
        <Stack.Screen name="customers/edit" options={{ title: 'Edit Customer' }} />
        <Stack.Screen name="invoices/create" options={{ title: 'New Invoice' }} />
        <Stack.Screen name="invoices/history" options={{ title: 'Invoice History' }} />
        <Stack.Screen name="invoices/[id]" options={{ title: 'Invoice Details' }} />
        <Stack.Screen name="raw-material/index" options={{ title: 'Raw Material' }} />
        <Stack.Screen name="raw-material/create" options={{ title: 'Raw Material Entry' }} />
        <Stack.Screen name="statements/index" options={{ title: 'Statements' }} />
        <Stack.Screen name="statements/create" options={{ title: 'New Statement' }} />
        <Stack.Screen name="statements/[id]" options={{ title: 'Statement Details' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  errorText: { textAlign: 'center' },
  retry: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#1a73e8', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
});
