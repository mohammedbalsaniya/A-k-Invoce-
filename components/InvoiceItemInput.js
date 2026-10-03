import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton, Text, useTheme } from 'react-native-paper';

export default function InvoiceItemInput({ item, index, onChange, onRemove }) {
  const theme = useTheme();
  const inputStyle = [styles.input, theme.dark && styles.darkInput];
  const inputTextColor = theme.dark ? '#ffffff' : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.dark ? '#292f38' : theme.colors.surfaceVariant }]}>
      <View style={styles.header}>
        <Text variant="titleSmall">Item #{index + 1}</Text>
        <IconButton icon="close-circle" iconColor={theme.colors.error} onPress={() => onRemove(index)} size={20} />
      </View>
      
      <TextInput
        label="Description"
        value={item.description}
        onChangeText={(val) => onChange(index, 'description', val)}
        mode="outlined"
        style={inputStyle}
        textColor={inputTextColor}
      />
      
      <View style={styles.row}>
        <TextInput
          label="HSN"
          value={item.hsn}
          onChangeText={(val) => onChange(index, 'hsn', val)}
          mode="outlined"
          style={[inputStyle, { flex: 1, marginRight: 8 }]}
          textColor={inputTextColor}
        />
        <TextInput
          label="Qty"
          value={item.qty.toString()}
          onChangeText={(val) => onChange(index, 'qty', val)}
          mode="outlined"
          style={[inputStyle, { flex: 1, marginRight: 8 }]}
          textColor={inputTextColor}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.row}>
        <TextInput
          label="Wt / Piece"
          value={item.weightPerPiece.toString()}
          onChangeText={(val) => onChange(index, 'weightPerPiece', val)}
          mode="outlined"
          style={[inputStyle, { flex: 1, marginRight: 8 }]}
          textColor={inputTextColor}
          keyboardType="decimal-pad"
        />
        <TextInput
          label="Rate"
          value={item.rate.toString()}
          onChangeText={(val) => onChange(index, 'rate', val)}
          mode="outlined"
          style={[inputStyle, { flex: 1 }]}
          textColor={inputTextColor}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  input: {
    marginBottom: 8,
    backgroundColor: 'black',
  },
  darkInput: {
    backgroundColor: '#000000',
  },
  row: {
    flexDirection: 'row',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  }
});
