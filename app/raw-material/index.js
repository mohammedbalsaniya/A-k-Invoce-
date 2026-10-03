import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, FAB, IconButton, Searchbar, Text, useTheme } from 'react-native-paper';
import { rawMaterialRepository } from '../../repositories/rawMaterialRepository';
import { formatIsoDate, formatWeight } from '../../services/statementCalculator';
import { SafeAreaFlatList, useBottomSafeArea } from '../../components/SafeAreaContent';

const PAGE_SIZE = 100;

export default function RawMaterialHistory() {
  const router = useRouter();
  const theme = useTheme();
  const bottomOffset = useBottomSafeArea();
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offset = useRef(0);
  const loadingRef = useRef(false);

  const load = useCallback(async (reset = false, search = '') => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const start = reset ? 0 : offset.current;
    try {
      const rows = await rawMaterialRepository.getAll({ query: search, limit: PAGE_SIZE, offset: start });
      setEntries(current => reset ? rows : [...current, ...rows]);
      offset.current = start + rows.length;
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      Alert.alert('Could not load raw-material history', error.message);
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

  const confirmDelete = entry => Alert.alert(
    'Delete entry?',
    `Delete the ${entry.material_name} entry for ${formatIsoDate(entry.date)}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await rawMaterialRepository.delete(entry.id);
          setEntries(current => current.filter(item => item.id !== entry.id));
        } catch (error) {
          Alert.alert('Could not delete entry', error.message);
        }
      } },
    ]
  );

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={styles.details}>
          <Text variant="titleMedium">{item.material_name}</Text>
          <Text>{item.customer_name} · {formatIsoDate(item.date)}</Text>
          <Text variant="bodySmall">{formatWeight(item.bag_weight)} KG × {item.number_of_bags} bags = {formatWeight(item.total_weight)} KG</Text>
        </View>
        <View>
          <IconButton icon="pencil" onPress={() => router.push({ pathname: '/raw-material/create', params: { id: item.id } })} />
          <IconButton icon="delete" iconColor={theme.colors.error} onPress={() => confirmDelete(item)} />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar placeholder="Search material, customer, or date" value={query} onChangeText={search} style={styles.search} />
      <SafeAreaFlatList
        data={entries}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        bottomSpacing={88}
        onRefresh={() => load(true, query)}
        refreshing={loading}
        onEndReached={() => hasMore && load(false, query)}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No raw-material entries found.</Text> : null}
        ListFooterComponent={hasMore && entries.length ? <Button onPress={() => load(false, query)} loading={loading}>Load more</Button> : null}
      />
      <FAB icon="plus" label="Add Entry" style={[styles.fab, { bottom: bottomOffset }]} onPress={() => router.push('/raw-material/create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 16 },
  list: { paddingHorizontal: 16 },
  card: { marginBottom: 10 },
  content: { flexDirection: 'row', alignItems: 'center' },
  details: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 16 },
});
