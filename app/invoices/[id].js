import { Alert, View, StyleSheet } from 'react-native';
import { Text, Card, useTheme, Button, Divider, DataTable, Switch } from 'react-native-paper';
import { useLocalSearchParams, } from 'expo-router';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { useEffect } from 'react';
import { pdfService } from '../../services/pdfService';
import { pdfOpenService } from '../../services/pdfOpenService';
import { invoiceRepository } from '../../repositories/invoiceRepository';
import { SafeAreaScrollView } from '../../components/SafeAreaContent';

export default function InvoiceDetails() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();

const { currentInvoice, fetchInvoiceById } = useInvoiceStore();

  useEffect(() => {
    fetchInvoiceById(id);
  }, [fetchInvoiceById, id]);

  if (!currentInvoice) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      const path = await pdfOpenService.ensureInvoicePdf(Number(id));
      await pdfService.sharePDF(path);
    } catch (error) {
      Alert.alert('Could not share PDF', error.message);
    }
  };

  const handleOpen = async () => {
    try {
      const path = await pdfOpenService.ensureInvoicePdf(Number(id));
      await pdfService.openPDF(path);
    } catch (error) {
      Alert.alert('Could not open PDF', `No compatible PDF viewer may be installed. ${error.message}`);
    }
  };

  const saveInclusion = async include => {
    try {
      await invoiceRepository.setStatementInclusion(Number(id), include);
      await fetchInvoiceById(id);
    } catch (error) {
      Alert.alert('Could not update invoice', error.message);
    }
  };

  const handleInclusionChange = include => {
    if (!include) {
      Alert.alert('Exclude invoice?', `Exclude ${currentInvoice.invoiceNo} from monthly statement?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exclude', onPress: () => saveInclusion(false) },
      ]);
    } else {
      saveInclusion(true);
    }
  };

  return (
    <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Title title={`Invoice: ${currentInvoice.invoiceNo}`} subtitle={`Date: ${currentInvoice.invoiceDate}`} />
        <Card.Content>
          <Text variant="titleMedium">Customer</Text>
          <Text>{currentInvoice.customerName}</Text>
          <Text>{currentInvoice.customerAddress}</Text>
          <Text>GST: {currentInvoice.customerGST || 'N/A'}</Text>
          <View style={styles.inclusionRow}>
            <View style={styles.flex1}>
              <Text variant="titleSmall">Include in Statement</Text>
              <Text variant="bodySmall">{currentInvoice.include_in_statement === 0 ? 'Not Included' : 'Included'}</Text>
            </View>
            <Switch value={currentInvoice.include_in_statement !== 0} onValueChange={handleInclusionChange} />
          </View>
          <Divider style={{ marginVertical: 12 }} />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text variant="labelMedium">Date</Text>
              <Text>{currentInvoice.invoiceDate}</Text>
            </View>

            <View style={styles.flex1}>
              <Text variant="labelMedium">Station</Text>
              <Text>{currentInvoice.station || '-'}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={styles.flex1}>
              <Text variant="labelMedium">Carrier</Text>
              <Text>{currentInvoice.carrier || '-'}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={{ padding: 0 }}>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Item</DataTable.Title>
              <DataTable.Title numeric>Qty</DataTable.Title>
              <DataTable.Title numeric>Wt/Pc</DataTable.Title>
              <DataTable.Title numeric>Amount</DataTable.Title>
            </DataTable.Header>

            {(currentInvoice.items || []).map((item, index) => (
              <DataTable.Row key={index}>
                <DataTable.Cell>{item.description}</DataTable.Cell>
                <DataTable.Cell numeric>{item.qty}</DataTable.Cell>
                <DataTable.Cell numeric>{item.weight_per_piece || 0}</DataTable.Cell>
                <DataTable.Cell numeric>₹{item.amount}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.totalRow}>
            <Text>Taxable Amount</Text>
            <Text>₹{currentInvoice.taxableAmount}</Text>
          </View>
          {currentInvoice.sgstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>SGST ({currentInvoice.sgstPercent}%)</Text>
              <Text>₹{currentInvoice.sgstAmount}</Text>
            </View>
          )}
          {currentInvoice.cgstAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>CGST ({currentInvoice.cgstPercent}%)</Text>
              <Text>₹{currentInvoice.cgstAmount}</Text>
            </View>
          )}
          {currentInvoice.igstAmount > 0 && (
            <View style={styles.totalRow}>
         <Text>IGST ({currentInvoice.igstPercent}%)</Text>
              <Text>₹{currentInvoice.igstAmount}</Text>
            </View>
          )}
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.totalRow}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Grand Total</Text>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>₹{currentInvoice.grandTotal}</Text>
          </View>
          <Text variant="bodySmall" style={{ marginTop: 8, fontStyle: 'italic' }}>
            Amount in words: {currentInvoice.amountInWords}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" icon="share-variant" onPress={handleShare} style={styles.flex1}>
          Share PDF
        </Button>
        <View style={{ width: 16 }} />
        <Button mode="outlined" icon="file-pdf-box" onPress={handleOpen} style={styles.flex1}>
          Open PDF
        </Button>
      </View>
      <View style={{ height: 40 }} />
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
});
