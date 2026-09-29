import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List, useTheme, IconButton, Card, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { useEffect, useState } from 'react';
import { pdfService } from '../../services/pdfService';

export default function InvoiceHistory() {
  const router = useRouter();
  const theme = useTheme();
  const { invoices, fetchInvoices, deleteInvoice, loading } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(i => 
    i.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = async (filePath) => {
    if (filePath) {
      await pdfService.sharePDF(filePath);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => router.push(`/invoices/${item.id}`)}>
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall">{item.invoiceNo}</Text>
            <Text variant="bodyMedium">{item.customerName}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{item.invoiceDate}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>₹{item.grandTotal}</Text>
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="share-variant" size={20} onPress={() => handleShare(item.pdfPath)} />
              <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={() => deleteInvoice(item.id)} />
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search Invoices"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {filteredInvoices.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">No invoices found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={fetchInvoices}
          refreshing={loading}
        />
      )}
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
  card: {
    marginBottom: 12,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
