import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton, Text, useTheme } from 'react-native-paper';

export default function InvoiceItemInput({ item, index, onChange, onRemove }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleSmall">Item #{index + 1}</Text>
        <IconButton icon="close-circle" iconColor={theme.colors.error} onPress={() => onRemove(index)} size={20} />
      </View>
      
      <TextInput
        label="Description"
        value={item.description}
        onChangeText={(val) => onChange(index, 'description', val)}
        mode="outlined"
        style={styles.input}
      />
      
      <View style={styles.row}>
        <TextInput
          label="HSN"
          value={item.hsn}
          onChangeText={(val) => onChange(index, 'hsn', val)}
          mode="outlined"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
        />
        <TextInput
          label="Qty"
          value={item.qty.toString()}
          onChangeText={(val) => onChange(index, 'qty', val)}
          mode="outlined"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          keyboardType="numeric"
        />
        <TextInput
          label="Rate"
          value={item.rate.toString()}
          onChangeText={(val) => onChange(index, 'rate', val)}
          mode="outlined"
          style={[styles.input, { flex: 1 }]}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.amountContainer}>
        <Text variant="labelLarge">Amount: ₹{item.amount.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  }
});
