import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Dialog, List, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { customerRepository } from '../../repositories/customerRepository';
import { settingsRepository } from '../../repositories/settingsRepository';
import { statementRepository } from '../../repositories/statementRepository';
import { calculateMaterialBalance, calculateProductionWeight, formatWeight } from '../../services/statementCalculator';
import { statementPdfService } from '../../services/statementPdfService';
import { SafeAreaScrollView } from '../../components/SafeAreaContent';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const emptyAmounts = { previousAmount: '0', currentAmount: '0', gstAmount: '0', tdsAmount: '0', totalAmount: '0' };

export default function CreateStatement() {
  const theme = useTheme();
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [oldWeight, setOldWeight] = useState('0');
  const [amounts, setAmounts] = useState(emptyAmounts);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);

  const numericMonth = Number(month);
  const numericYear = Number(year);
  const balance = useMemo(() => {
    const used = source?.production.reduce((sum, row) => sum + row.totalWeight, 0) || 0;
    const added = source?.rawMaterials.reduce((sum, row) => sum + Number(row.total_weight), 0) || 0;
    return calculateMaterialBalance(Number(oldWeight) || 0, added, used);
  }, [oldWeight, source]);

  const getCustomers = async () => {
    setCustomerLoading(true);
    try {
      setCustomers(await customerRepository.getAll());
      setPickerVisible(true);
    } catch (error) {
      Alert.alert('Could not load customers', error.message);
    } finally {
      setCustomerLoading(false);
    }
  };

  const prepare = async () => {
    if (!customer) {
      Alert.alert('Customer required', 'Select a customer first.');
      return;
    }
    if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 ||
        !Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 9999) {
      Alert.alert('Invalid period', 'Enter a month from 1 to 12 and a valid four-digit year.');
      return;
    }
    setLoading(true);
    try {
      const rows = await statementRepository.getSourceData({ customerId: customer.id, year: numericYear, month: numericMonth });
      const production = rows.production.map(row => ({
        ...row,
        weightPerPiece: Number(row.weightPerPiece || 0),
        totalWeight: calculateProductionWeight(Number(row.qty || 0), Number(row.weightPerPiece || 0)),
      }));
      const currentAmount = production.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      setSource({ rawMaterials: rows.rawMaterials, production });
      setAmounts(current => ({ ...current, currentAmount: current.currentAmount === '0' ? currentAmount.toFixed(2) : current.currentAmount }));
    } catch (error) {
      Alert.alert('Could not prepare statement', error.message);
    } finally {
      setLoading(false);
    }
  };

  const setAmount = (key, value) => setAmounts(current => ({ ...current, [key]: value }));
  const resetPeriodSuggestions = () => {
    setSource(null);
    setAmounts(current => ({ ...current, currentAmount: '0', totalAmount: '0' }));
  };
  const amountValue = key => Number(amounts[key]);
  const suggestedTotal = (amountValue('previousAmount') || 0) +
    (amountValue('currentAmount') || 0) +
    (amountValue('gstAmount') || 0) -
    (amountValue('tdsAmount') || 0);

  const generate = async () => {
    if (!source) {
      Alert.alert('Prepare statement', 'Load the selected month’s data before generating a statement.');
      return;
    }
    if (!source.rawMaterials.length && !source.production.length) {
      Alert.alert('No statement data', 'There are no raw-material entries or included invoices for this customer and month.');
      return;
    }
    const values = [oldWeight, ...Object.values(amounts)].map(Number);
    if (values.some(value => !Number.isFinite(value) || value < 0)) {
      Alert.alert('Invalid amount', 'Enter valid non-negative numbers for all weights and amount fields.');
      return;
    }
    if (!customer || !Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 ||
        !Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 9999) {
      Alert.alert('Invalid statement', 'Select a customer and enter a valid month and year.');
      return;
    }
    setLoading(true);
    try {
      const settings = await settingsRepository.getSettings();
      const statement = {
        customerId: customer.id,
        customerName: customer.name,
        companyName: settings?.companyName || 'A K PLASTIC',
        month: numericMonth,
        year: numericYear,
        rawMaterials: source.rawMaterials,
        production: source.production,
        balance: calculateMaterialBalance(Number(oldWeight), balance.newWeight, balance.usedWeight),
        amounts: {
          previousAmount: amountValue('previousAmount'),
          currentAmount: amountValue('currentAmount'),
          gstAmount: amountValue('gstAmount'),
          tdsAmount: amountValue('tdsAmount'),
          totalAmount: amountValue('totalAmount'),
        },
        finalizedAt: new Date().toISOString(),
        snapshotVersion: 1,
      };
      statement.pdfUri = await statementPdfService.generate(statement);
      await statementRepository.create(statement);
      Alert.alert('Statement saved', 'The statement and its snapshot have been saved.', [
        { text: 'OK', onPress: () => router.replace('/statements') },
      ]);
    } catch (error) {
      Alert.alert('Could not generate statement', error.message);
    } finally {
      setLoading(false);
    }
  };

  const editAmountFields = [
    ['previousAmount', 'Previous Amount'],
    ['currentAmount', 'Current Month'],
    ['gstAmount', 'GST'],
    ['tdsAmount', 'TDS - 1%'],
    ['totalAmount', 'Total'],
  ];

  return (
    <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.section}>Statement Period</Text>
          <Button mode="outlined" icon="account-search" onPress={getCustomers} loading={customerLoading} style={styles.input}>
            {customer?.name || 'Select Customer'}
          </Button>
          <View style={styles.row}>
            <TextInput label="Month (1-12)" value={month} onChangeText={value => { setMonth(value); resetPeriodSuggestions(); }} keyboardType="number-pad" mode="outlined" style={[styles.input, styles.flex]} />
            <TextInput label="Year" value={year} onChangeText={value => { setYear(value); resetPeriodSuggestions(); }} keyboardType="number-pad" mode="outlined" style={[styles.input, styles.flex]} />
          </View>
          <TextInput label="Opening Balance (KG)" value={oldWeight} onChangeText={setOldWeight} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
          <Button mode="contained-tonal" icon="refresh" onPress={prepare} loading={loading && !source}>Prepare Statement Data</Button>
        </Card.Content>
      </Card>

      {source && (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.section}>Statement Preview</Text>
              <Text>{MONTHS[numericMonth - 1]} {numericYear} · {source.rawMaterials.length} raw-material entries · {source.production.length} production rows</Text>
              <View style={styles.balanceRow}><Text>OLD</Text><Text>{formatWeight(balance.oldWeight)} KG</Text></View>
              <View style={styles.balanceRow}><Text>NEW</Text><Text>{formatWeight(balance.newWeight)} KG</Text></View>
              <View style={styles.balanceRow}><Text>TOTAL</Text><Text>{formatWeight(balance.totalWeight)} KG</Text></View>
              <View style={styles.balanceRow}><Text>USED</Text><Text>{formatWeight(balance.usedWeight)} KG</Text></View>
              <View style={styles.balanceRow}><Text>1%</Text><Text>{formatWeight(balance.rejectionWeight)} KG</Text></View>
              <View style={styles.balanceRow}><Text>BALANCE</Text><Text>{formatWeight(balance.balanceWeight)} KG</Text></View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.section}>Amounts</Text>
              <Text variant="bodySmall" style={styles.hint}>All amounts can be changed before this statement is finalized.</Text>
              {editAmountFields.map(([key, label]) => (
                <TextInput key={key} label={label} value={amounts[key]} onChangeText={value => setAmount(key, value)} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
              ))}
              <Button mode="text" onPress={() => setAmount('totalAmount', suggestedTotal.toFixed(2))}>
                Use suggested total: {suggestedTotal.toFixed(2)}
              </Button>
            </Card.Content>
          </Card>
          <Button mode="contained" icon="file-pdf-box" onPress={generate} loading={loading} disabled={loading} style={styles.generate}>
            Generate Statement PDF
          </Button>
        </>
      )}

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)}>
          <Dialog.Title>Select Customer</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 360, paddingHorizontal: 0 }}>
            <ScrollView>{customers.map(item => <List.Item key={item.id} title={item.name} onPress={() => {
              setCustomer(item);
              resetPeriodSuggestions();
              setPickerVisible(false);
            }} />)}</ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setPickerVisible(false)}>Cancel</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { marginBottom: 16 },
  section: { marginBottom: 12, fontWeight: 'bold' },
  input: { marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  hint: { marginBottom: 12 },
  generate: { marginVertical: 4, paddingVertical: 6 },
});
