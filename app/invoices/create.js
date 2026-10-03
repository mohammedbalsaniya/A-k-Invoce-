import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme, List, Card, Divider, Portal, Dialog } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useCustomerStore } from '../../stores/customerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { calculateItemAmount, calculateTotals, numberToWords } from '../../services/invoiceCalculator';
import { pdfService } from '../../services/pdfService';
import InvoiceItemInput from '../../components/InvoiceItemInput';
import { isValidIsoDate } from '../../services/statementCalculator';
import { SafeAreaScrollView } from '../../components/SafeAreaContent';

export default function CreateInvoice() {
  const theme = useTheme();
  const router = useRouter();
  const taxInputStyle = [styles.taxInput, theme.dark && styles.darkTaxInput];
  const taxInputTextColor = theme.dark ? '#ffffff' : undefined;
  const { customers, fetchCustomers } = useCustomerStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { createInvoice, getNextInvoiceNo } = useInvoiceStore();

  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [carrier, setCarrier] = useState('');
  const [station, setStation] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const [sgstPercent, setSgstPercent] = useState('0');
  const [cgstPercent, setCgstPercent] = useState('0');
  const [igstPercent, setIgstPercent] = useState('0');
  const [taxType, setTaxType] = useState('gst'); // 'gst' or 'igst' (CST)

  const [items, setItems] = useState([{ description: '', hsn: '', qty: '', weightPerPiece: '', rate: '', amount: 0 }]);
  const totals = useMemo(() => calculateTotals(
    items,
    0,
    taxType === 'gst' ? sgstPercent : 0,
    taxType === 'gst' ? cgstPercent : 0,
    taxType === 'igst' ? igstPercent : 0
  ), [items, sgstPercent, cgstPercent, igstPercent, taxType]);

  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
      fetchSettings();
      getNextInvoiceNo().then(setInvoiceNo);
    }, [fetchCustomers, fetchSettings, getNextInvoiceNo])
  );

  const addItem = () => {
    if (items.length >= 6) {
      Alert.alert('Limit Reached', 'Maximum 6 items allowed per invoice.');
      return;
    }
    setItems([...items, { description: '', hsn: '', qty: '', weightPerPiece: '', rate: '', amount: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = calculateItemAmount(newItems[index].qty, newItems[index].rate);
    }
    setItems(newItems);
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (!isValidIsoDate(invoiceDate)) {
      Alert.alert('Invalid date', 'Enter the invoice date as YYYY-MM-DD.');
      return;
    }

    if (!items.every(i =>
      i.description.trim() &&
      Number.isFinite(Number(i.qty)) && Number(i.qty) > 0 &&
      Number.isFinite(Number(i.weightPerPiece)) && Number(i.weightPerPiece) > 0 &&
      Number.isFinite(Number(i.rate)) && Number(i.rate) > 0
    )) {
      Alert.alert('Error', 'Enter a description and positive quantity, weight per piece, and rate for each item.');
      return;
    }

    setLoading(true);
    try {
      const amountInWords = numberToWords(totals.grandTotal);
      
      const invoiceData = {
        invoiceNo,
        invoiceDate,
        carrier,
        station,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerAddress: customerAddress, // Use the editable address
        ...totals,
        sgstPercent: taxType === 'gst' ? (parseFloat(sgstPercent) || 0) : 0,
        cgstPercent: taxType === 'gst' ? (parseFloat(cgstPercent) || 0) : 0,
        igstPercent: taxType === 'igst' ? (parseFloat(igstPercent) || 0) : 0,
        amountInWords,
        items: items.map(item => ({
          ...item,
          qty: Number(item.qty),
          weightPerPiece: Number(item.weightPerPiece),
          rate: Number(item.rate),
          amount: Number(item.amount),
        }))
      };

      // 1. Generate PDF
      const pdfPath = await pdfService.generateInvoicePDF(invoiceData, settings);

      // 2. Save to Database
      await createInvoice({ ...invoiceData, pdfPath }, invoiceData.items);

      Alert.alert('Success', 'Invoice generated and saved successfully!', [
        { text: 'OK', onPress: () => router.push('/invoices/history') }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to generate invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionLabel}>Customer Information</Text>
            <Button 
              mode="contained-tonal" 
              onPress={() => setShowCustomerPicker(true)}
              style={styles.customerButton}
              icon="account-search"
            >
              {selectedCustomer ? `Change: ${selectedCustomer.name}` : 'Select Customer'}
            </Button>
            
            {selectedCustomer && (
              <TextInput
                label="Customer Name"
                value={selectedCustomer.name}
                editable={false}
                mode="outlined"
                style={styles.input}
              />
            )}
            
            <TextInput
              label="Customer Address"
              value={customerAddress}
              onChangeText={setCustomerAddress}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionLabel}>Invoice Info</Text>
            <View style={styles.row}>
              <TextInput label="Invoice No" value={invoiceNo} onChangeText={setInvoiceNo} mode="outlined" style={[styles.flex1, { marginRight: 8 }]} />
              <TextInput label="Date" value={invoiceDate} onChangeText={setInvoiceDate} mode="outlined" style={styles.flex1} />
            </View>
            <View style={styles.row}>
              <TextInput label="Carrier" value={carrier} onChangeText={setCarrier} mode="outlined" style={[styles.flex1, { marginRight: 8 }]} />
              <TextInput label="Station" value={station} onChangeText={setStation} mode="outlined" style={styles.flex1} />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.itemsHeader}>
          <Text variant="titleLarge">Invoice Items</Text>
          <Button icon="plus" onPress={addItem} mode="contained-tonal" compact disabled={items.length >= 6}>
            Add Item
          </Button>
        </View>

        {items.map((item, index) => (
          <InvoiceItemInput 
            key={index} 
            index={index} 
            item={item} 
            onChange={updateItem} 
            onRemove={removeItem} 
          />
        ))}

        <Card style={styles.totalsCard}>
          <Card.Content>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>₹{totals.subtotal.toFixed(2)}</Text>
            </View>
            
            <View style={styles.taxSelector}>
              <Button 
                mode={taxType === 'gst' ? 'contained' : 'outlined'} 
                onPress={() => setTaxType('gst')}
                style={styles.taxTypeButton}
                compact
              >
                GST (SGST/CGST)
              </Button>
              <Button 
                mode={taxType === 'igst' ? 'contained' : 'outlined'} 
                onPress={() => setTaxType('igst')}
                style={styles.taxTypeButton}
                compact
              >
                IGST
              </Button>
            </View>

            {taxType === 'gst' ? (
              <>
                <View style={styles.taxRow}>
                  <View style={styles.taxInputContainer}>
                    <Text style={styles.taxLabel}>SGST (%)</Text>
                    <TextInput
                      value={sgstPercent}
                      onChangeText={setSgstPercent}
                      keyboardType="numeric"
                      mode="outlined"
                      dense
                      style={taxInputStyle}
                      textColor={taxInputTextColor}
                    />
                  </View>
                  <Text>₹{totals.sgstAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.taxRow}>
                  <View style={styles.taxInputContainer}>
                    <Text style={styles.taxLabel}>CGST (%)</Text>
                    <TextInput
                      value={cgstPercent}
                      onChangeText={setCgstPercent}
                      keyboardType="numeric"
                      mode="outlined"
                      dense
                      style={taxInputStyle}
                      textColor={taxInputTextColor}
                    />
                  </View>
                  <Text>₹{totals.cgstAmount.toFixed(2)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.taxRow}>
                <View style={styles.taxInputContainer}>
                  <Text style={styles.taxLabel}>IGST (%)</Text>
                  <TextInput
                    value={igstPercent}
                    onChangeText={setIgstPercent}
                    keyboardType="numeric"
                    mode="outlined"
                    dense
                    style={taxInputStyle}
                    textColor={taxInputTextColor}
                  />
                </View>
                <Text>₹{totals.igstAmount.toFixed(2)}</Text>
              </View>
            )}

            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.totalRow}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Grand Total</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>₹{totals.grandTotal}</Text>
            </View>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          style={styles.submitButton} 
          onPress={handleCreateInvoice}
          loading={loading}
          disabled={loading}
        >
          Generate PDF & Save
        </Button>
        
        <View style={{ height: 40 }} />
      </SafeAreaScrollView>

      <Portal>
        <Dialog visible={showCustomerPicker} onDismiss={() => setShowCustomerPicker(false)}>
          <Dialog.Title>Select Customer</Dialog.Title>
          <Dialog.ScrollArea style={{ height: 300, paddingHorizontal: 0 }}>
            <ScrollView>
              {customers.map((c) => (
                <List.Item
                  key={c.id}
                  title={c.name}
                  description={c.phone}
                  onPress={() => {
                    setSelectedCustomer(c);
                    setCustomerAddress(c.address || ''); // Set address from selected customer
                    setShowCustomerPicker(false);
                  }}
                  left={props => <List.Icon {...props} icon="account" />}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCustomerPicker(false)}>Cancel</Button>
            <Button onPress={() => router.push('/customers/create')}>Add New</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
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
  sectionLabel: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  customerButton: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  totalsCard: {
    marginTop: 16,
    backgroundColor: 'rgba(26, 115, 232, 0.05)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  taxTypeButton: {
    flex: 0.45,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taxLabel: {
    marginRight: 8,
    fontSize: 14,
  },
  taxInput: {
    width: 60,
    height: 40,
    backgroundColor: 'white',
  },
  darkTaxInput: {
    backgroundColor: '#000000',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
  }
});
