import { Alert, View, StyleSheet } from 'react-native';
import { Text, useTheme, IconButton, Card, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { useEffect, useState } from 'react';
import { pdfService } from '../../services/pdfService';
import { pdfOpenService } from '../../services/pdfOpenService';
import { SafeAreaFlatList } from '../../components/SafeAreaContent';

export default function InvoiceHistory() {
  const router = useRouter();
  const theme = useTheme();
  const { invoices, fetchInvoices, deleteInvoice, loading } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter(i => 
    i.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePdfAction = async (id, open) => {
    try {
      const path = await pdfOpenService.ensureInvoicePdf(id);
      if (open) await pdfService.openPDF(path);
      else await pdfService.sharePDF(path);
    } catch (error) {
      Alert.alert(open ? 'Could not open PDF' : 'Could not share PDF', error.message);
    }
  };

  const confirmDelete = item => Alert.alert(
    'Delete invoice?',
    `This permanently removes ${item.invoiceNo} and its items. To keep it in history but leave it out of a statement, switch off Include in Statement instead.`,
    [
      { text: 'Keep Invoice', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteInvoice(item.id) },
    ]
  );

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => router.push(`/invoices/${item.id}`)}>
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall">{item.invoiceNo}</Text>
            <Text variant="bodyMedium">{item.customerName}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{item.invoiceDate}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
              {item.include_in_statement === 0 ? 'Not Included' : 'Included'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>₹{item.grandTotal}</Text>
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="file-pdf-box" size={20} onPress={() => handlePdfAction(item.id, true)} />
              <IconButton icon="share-variant" size={20} onPress={() => handlePdfAction(item.id, false)} />
              <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={() => confirmDelete(item)} />
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
        <SafeAreaFlatList
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
