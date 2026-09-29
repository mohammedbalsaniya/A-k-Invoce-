import { Stack } from 'expo-router';
import { MD3LightTheme, MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

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
  const colorScheme = useColorScheme();
  const activeTheme = colorScheme === 'dark' ? darkTheme : theme;
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch(err => console.error('Database Init Error:', err));
  }, []);

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
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </PaperProvider>
  );
}
