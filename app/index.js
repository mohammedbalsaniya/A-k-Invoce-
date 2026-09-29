import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useInvoiceStore } from '../stores/invoiceStore';
export default function Dashboard() {
  const router = useRouter();
  const theme = useTheme();
  const {
    fetchInvoices,
    totalInvoices,
    totalRevenue,
  } = useInvoiceStore();

  useEffect(() => {
    fetchInvoices();
  }, []);
  const menuItems = [
    { title: 'New Invoice', icon: 'file-plus', route: '/invoices/create', color: '#1a73e8' },
    { title: 'Customers', icon: 'account-group', route: '/customers', color: '#34a853' },
    { title: 'Invoice History', icon: 'file-clock', route: '/invoices/history', color: '#fbbc04' },
    { title: 'Settings', icon: 'cog', route: '/settings', color: '#ea4335' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Invoice Pro</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>Offline Billing Solution</Text>
      </View>

      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <Card
            key={index}
            style={styles.card}
            onPress={() => router.push(item.route)}
          >
            <Card.Content style={styles.cardContent}>
              <IconButton
                icon={item.icon}
                size={40}
                iconColor={item.color}
              />
              <Text variant="titleMedium" style={{ marginTop: 8 }}>{item.title}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Card style={styles.statsCard}>
        <Card.Title title="Quick Stats" subtitle="Current Month" />
        <Card.Content>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Total Invoices</Text>
            <Text variant="titleLarge">{totalInvoices}</Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Total Revenue</Text>
            <Text variant="titleLarge">₹{Number(totalRevenue).toFixed(2)} </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  statsCard: {
    marginTop: 8,
    marginBottom: 32,
    elevation: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  }
});
