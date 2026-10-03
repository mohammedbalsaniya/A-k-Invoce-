import { Alert, View, StyleSheet } from 'react-native';
import { Text, FAB, List, Searchbar, useTheme, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCustomerStore } from '../../stores/customerStore';
import { useState, useCallback } from 'react';
import { SafeAreaFlatList, useBottomSafeArea } from '../../components/SafeAreaContent';

export default function CustomerList() {
  const router = useRouter();
  const theme = useTheme();
  const bottomOffset = useBottomSafeArea();
  const { customers, fetchCustomers, searchCustomers, deleteCustomer, loading } = useCustomerStore();
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [fetchCustomers])
  );


  const onSearch = (query) => {
    setSearchQuery(query);
    searchCustomers(query);
  };

  const confirmDelete = customer => Alert.alert(
    'Delete customer?',
    `Deleting ${customer.name} also removes its invoices and raw-material entries.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCustomer(customer.id) },
    ]
  );

  const renderItem = ({ item }) => (
    <List.Item
      title={item.name}
      description={`${item.phone || 'No Phone'} | ${item.gstNumber || 'No GST'}`}
      left={props => <List.Icon {...props} icon="account" />}
      right={props => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="pencil" onPress={() => router.push({ pathname: '/customers/edit', params: { id: item.id } })} />
          <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => confirmDelete(item)} />
        </View>
      )}
      onPress={() => router.push({ pathname: '/customers/edit', params: { id: item.id } })}
      style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search Customers"
        onChangeText={onSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {customers.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">No customers found</Text>
        </View>
      ) : (
        <SafeAreaFlatList
          data={customers}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          bottomSpacing={88}
          onRefresh={fetchCustomers}
          refreshing={loading}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: bottomOffset }]}
        color="white"
        onPress={() => router.push('/customers/create')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
