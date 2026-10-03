import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import { statementRepository } from '../../repositories/statementRepository';
import { pdfOpenService } from '../../services/pdfOpenService';
import { pdfService } from '../../services/pdfService';
import { SafeAreaFlatList, useBottomSafeArea } from '../../components/SafeAreaContent';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PAGE_SIZE = 100;

export default function StatementHistory() {
  const theme = useTheme();
  const bottomOffset = useBottomSafeArea();
  const router = useRouter();
  const [statements, setStatements] = useState([]);
  const [query, setQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const offset = useRef(0);
  const loadingRef = useRef(false);

  const load = useCallback(async (reset = false, search = '') => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const start = reset ? 0 : offset.current;
    try {
      const rows = await statementRepository.getAll({ query: search, limit: PAGE_SIZE, offset: start });
      setStatements(current => reset ? rows : [...current, ...rows]);
      offset.current = start + rows.length;
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      Alert.alert('Could not load statements', error.message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load(true, query);
  }, [load, query]));

  const search = value => {
    setQuery(value);
    load(true, value);
  };

  const openPdf = async (id, open) => {
    try {
      const path = await pdfOpenService.ensureStatementPdf(id);
      if (open) await pdfService.openPDF(path);
      else await pdfService.sharePDF(path);
    } catch (error) {
      Alert.alert(open ? 'Could not open PDF' : 'Could not share PDF', error.message);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => router.push({ pathname: '/statements/[id]', params: { id: item.id } })}>
      <Card.Content>
        <Text variant="titleMedium">{item.customer_name}</Text>
        <Text>{MONTHS[item.month - 1]} {item.year}</Text>
        <Text variant="titleLarge" style={styles.total}>INR {Number(item.total_amount).toFixed(2)}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Generated {new Date(item.finalized_at).toLocaleDateString()}</Text>
      </Card.Content>
      <Card.Actions>
        <Button icon="file-pdf-box" onPress={() => openPdf(item.id, true)}>Open PDF</Button>
        <Button icon="share-variant" onPress={() => openPdf(item.id, false)}>Share PDF</Button>
        <Button onPress={() => router.push({ pathname: '/statements/[id]', params: { id: item.id } })}>Details</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar placeholder="Search customer, month, or year" value={query} onChangeText={search} style={styles.search} />
      <SafeAreaFlatList
        data={statements}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        bottomSpacing={88}
        onRefresh={() => load(true, query)}
        refreshing={loading}
        onEndReached={() => hasMore && load(false, query)}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No statements found.</Text> : null}
        ListFooterComponent={hasMore && statements.length ? <Button onPress={() => load(false, query)} loading={loading}>Load more</Button> : null}
      />
      <FAB icon="plus" label="New Statement" style={[styles.fab, { bottom: bottomOffset }]} onPress={() => router.push('/statements/create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 16 },
  list: { paddingHorizontal: 16 },
  card: { marginBottom: 12 },
  total: { marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 16 },
});
