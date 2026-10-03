import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Dialog, List, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { customerRepository } from '../../repositories/customerRepository';
import { rawMaterialRepository } from '../../repositories/rawMaterialRepository';
import { calculateRawTotal, formatWeight, isValidIsoDate } from '../../services/statementCalculator';
import { SafeAreaScrollView } from '../../components/SafeAreaContent';

export default function RawMaterialForm() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [materialName, setMaterialName] = useState('');
  const [bagWeight, setBagWeight] = useState('');
  const [bags, setBags] = useState('');
  const [loading, setLoading] = useState(false);

  const totalWeight = useMemo(
    () => Number.isFinite(Number(bagWeight) * Number(bags)) ? calculateRawTotal(Number(bagWeight) || 0, Number(bags) || 0) : 0,
    [bagWeight, bags]
  );

  useFocusEffect(useCallback(() => {
    customerRepository.getAll().then(setCustomers).catch(error => {
      Alert.alert('Could not load customers', error.message);
    });
  }, []));

  useEffect(() => {
    if (!id) return;
    rawMaterialRepository.getById(Number(id)).then(entry => {
      if (!entry) {
        Alert.alert('Entry not found', 'This raw-material entry is no longer available.');
        router.back();
        return;
      }
      setDate(entry.date);
      setMaterialName(entry.material_name);
      setBagWeight(String(entry.bag_weight));
      setBags(String(entry.number_of_bags));
      setSelectedCustomer({ id: entry.customer_id, name: entry.customer_name });
    }).catch(error => Alert.alert('Could not load entry', error.message));
  }, [id, router]);

  const save = async () => {
    const weight = Number(bagWeight);
    const count = Number(bags);
    if (!selectedCustomer) {
      Alert.alert('Customer required', 'Select a customer for this entry.');
      return;
    }
    if (!isValidIsoDate(date)) {
      Alert.alert('Invalid date', 'Enter the date as YYYY-MM-DD.');
      return;
    }
    if (!materialName.trim()) {
      Alert.alert('Material required', 'Enter the raw-material name.');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) {
      Alert.alert('Invalid amount', 'Bag weight and number of bags must be positive numbers. Number of bags must be a whole number.');
      return;
    }
    setLoading(true);
    try {
      await rawMaterialRepository.save({
        id: id ? Number(id) : undefined,
        customer_id: selectedCustomer.id,
        date,
        material_name: materialName,
        bag_weight: weight,
        number_of_bags: count,
        total_weight: calculateRawTotal(weight, count),
      });
      router.back();
    } catch (error) {
      Alert.alert('Could not save entry', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
      <Text variant="titleLarge" style={styles.title}>{id ? 'Edit Raw Material' : 'Raw Material Entry'}</Text>
      <Button mode="outlined" icon="account-search" onPress={() => setPickerVisible(true)} style={styles.input}>
        {selectedCustomer?.name || 'Select Customer'}
      </Button>
      <TextInput label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} mode="outlined" style={styles.input} />
      <TextInput label="Raw Material" value={materialName} onChangeText={setMaterialName} mode="outlined" style={styles.input} />
      <View style={styles.row}>
        <TextInput label="Bag Weight (KG)" value={bagWeight} onChangeText={setBagWeight} keyboardType="decimal-pad" mode="outlined" style={[styles.input, styles.flex]} />
        <TextInput label="Number of Bags" value={bags} onChangeText={setBags} keyboardType="number-pad" mode="outlined" style={[styles.input, styles.flex]} />
      </View>
      <Text variant="titleMedium" style={styles.total}>Total Weight: {formatWeight(totalWeight)} KG</Text>
      <Button mode="contained" onPress={save} loading={loading} disabled={loading} style={styles.submit}>
        {id ? 'Save Changes' : 'Save Entry'}
      </Button>

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)}>
          <Dialog.Title>Select Customer</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 360, paddingHorizontal: 0 }}>
            <ScrollView>
              {customers.map(customer => (
                <List.Item key={customer.id} title={customer.name} onPress={() => {
                  setSelectedCustomer(customer);
                  setPickerVisible(false);
                }} />
              ))}
              {customers.length === 0 && <Dialog.Content><Text>Add a customer before recording material.</Text></Dialog.Content>}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setPickerVisible(false)}>Done</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 16, fontWeight: 'bold' },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  total: { marginVertical: 8, textAlign: 'right' },
  submit: { marginVertical: 16 },
});
