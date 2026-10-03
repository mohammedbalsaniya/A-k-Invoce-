import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Button, Card, Divider, Text, useTheme } from 'react-native-paper';
import { statementRepository } from '../../repositories/statementRepository';
import { pdfOpenService } from '../../services/pdfOpenService';
import { pdfService } from '../../services/pdfService';
import { formatIsoDate, formatWeight } from '../../services/statementCalculator';
import { SafeAreaScrollView } from '../../components/SafeAreaContent';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function StatementDetails() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const [statement, setStatement] = useState(null);

  useEffect(() => {
    statementRepository.getById(Number(id)).then(setStatement).catch(error => {
      Alert.alert('Could not load statement', error.message);
    });
  }, [id]);

  const pdfAction = async open => {
    try {
      const path = await pdfOpenService.ensureStatementPdf(Number(id));
      if (open) await pdfService.openPDF(path);
      else await pdfService.sharePDF(path);
    } catch (error) {
      Alert.alert(open ? 'Could not open PDF' : 'Could not share PDF', error.message);
    }
  };

  if (!statement) {
    return <View style={styles.loading}><ActivityIndicator /><Text style={styles.loadingText}>Loading statement…</Text></View>;
  }
  const snapshot = statement.snapshot;
  const money = value => `INR ${Number(value || 0).toFixed(2)}`;

  return (
    <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall">{MONTHS[statement.month - 1]} {statement.year} Statement</Text>
          <Text variant="titleMedium" style={styles.customer}>{statement.customer_name}</Text>
          <Text variant="bodySmall">Generated {new Date(statement.finalized_at).toLocaleString()}</Text>
          <Divider style={styles.divider} />
          <View style={styles.row}><Text>OLD</Text><Text>{formatWeight(snapshot.balance.oldWeight)} KG</Text></View>
          <View style={styles.row}><Text>NEW</Text><Text>{formatWeight(snapshot.balance.newWeight)} KG</Text></View>
          <View style={styles.row}><Text>TOTAL</Text><Text>{formatWeight(snapshot.balance.totalWeight)} KG</Text></View>
          <View style={styles.row}><Text>USED</Text><Text>{formatWeight(snapshot.balance.usedWeight)} KG</Text></View>
          <View style={styles.row}><Text>1%</Text><Text>{formatWeight(snapshot.balance.rejectionWeight)} KG</Text></View>
          <View style={styles.row}><Text>BALANCE</Text><Text>{formatWeight(snapshot.balance.balanceWeight)} KG</Text></View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title={`Raw Material (${snapshot.rawMaterials.length})`} />
        <Card.Content>
          {snapshot.rawMaterials.map((row, index) => (
            <View key={`${row.id}-${index}`} style={styles.entry}>
              <Text style={styles.flex}>{formatIsoDate(row.date)} · {row.material_name}</Text>
              <Text>{formatWeight(row.total_weight)} KG</Text>
            </View>
          ))}
          {!snapshot.rawMaterials.length && <Text>No raw-material rows</Text>}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title={`Production (${snapshot.production.length})`} />
        <Card.Content>
          {snapshot.production.map((row, index) => (
            <View key={`${row.item_id}-${index}`} style={styles.production}>
              <Text variant="titleSmall">{row.description}</Text>
              <Text>{formatIsoDate(row.invoiceDate)} · Qty {row.qty} · {formatWeight(row.weightPerPiece)} KG/pc · {formatWeight(row.totalWeight)} KG</Text>
              <Text>{money(row.amount)}</Text>
            </View>
          ))}
          {!snapshot.production.length && <Text>No production rows</Text>}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Amounts" />
        <Card.Content>
          {[
            ['Previous Amount', snapshot.amounts.previousAmount],
            ['Current Month', snapshot.amounts.currentAmount],
            ['GST', snapshot.amounts.gstAmount],
            ['TDS - 1%', snapshot.amounts.tdsAmount],
            ['Total', snapshot.amounts.totalAmount],
          ].map(([label, amount]) => <View key={label} style={styles.row}><Text>{label}</Text><Text>{money(amount)}</Text></View>)}
        </Card.Content>
      </Card>
      <View style={styles.actions}>
        <Button mode="contained" icon="file-pdf-box" onPress={() => pdfAction(true)} style={styles.flex}>Open PDF</Button>
        <Button mode="outlined" icon="share-variant" onPress={() => pdfAction(false)} style={styles.flex}>Share PDF</Button>
      </View>
      <View style={{ height: 24 }} />
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8 },
  card: { marginBottom: 14 },
  customer: { marginTop: 10 },
  divider: { marginVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  entry: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  production: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#888', paddingVertical: 8 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginVertical: 8 },
});
