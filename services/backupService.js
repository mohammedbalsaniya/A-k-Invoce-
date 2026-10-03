import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDbConnection } from '../database/database';

const APP_ID = 'AK_PLASTIC';
const BACKUP_VERSION = 1;
const BACKUP_DIRECTORY = `${FileSystem.documentDirectory}backups/`;

const BACKUP_TABLES = {
  settings: ['id', 'companyName', 'gstNumber', 'mobileNumber', 'address', 'bankName', 'accountNo', 'branchName', 'ifscCode', 'created_at', 'updated_at'],
  customers: ['id', 'name', 'address', 'gstNumber', 'phone', 'created_at', 'updated_at'],
  invoices: ['id', 'invoiceNo', 'invoiceDate', 'carrier', 'station', 'customerId', 'subtotal', 'discount', 'taxableAmount', 'sgstPercent', 'sgstAmount', 'cgstPercent', 'cgstAmount', 'igstPercent', 'igstAmount', 'grandTotal', 'amountInWords', 'include_in_statement', 'created_at', 'updated_at'],
  invoice_items: ['id', 'invoiceId', 'description', 'hsn', 'qty', 'weight_per_piece', 'rate', 'amount', 'created_at', 'updated_at'],
  raw_material_entries: ['id', 'customer_id', 'date', 'material_name', 'bag_weight', 'number_of_bags', 'total_weight', 'created_at', 'updated_at'],
  statements: ['id', 'customer_id', 'customer_name', 'month', 'year', 'old_weight', 'new_weight', 'total_weight', 'used_weight', 'rejection_weight', 'balance_weight', 'previous_amount', 'current_amount', 'gst_amount', 'tds_amount', 'total_amount', 'snapshot_json', 'snapshot_version', 'status', 'created_at', 'finalized_at'],
  app_metadata: ['key', 'value'],
};

const requiredArrays = Object.keys(BACKUP_TABLES);
const asNumber = value => typeof value === 'number' && Number.isFinite(value);
const asString = value => typeof value === 'string';

const validatePayload = payload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('This file is not a valid backup.');
  }
  if (payload.app !== APP_ID) throw new Error('This backup is for a different app.');
  if (payload.backupVersion !== BACKUP_VERSION) {
    throw new Error(`Backup version ${payload.backupVersion} is not supported.`);
  }
  if (!payload.data || typeof payload.data !== 'object') throw new Error('Backup data is missing.');
  for (const table of requiredArrays) {
    if (!Array.isArray(payload.data[table])) throw new Error(`Backup data for ${table} is invalid.`);
  }
  if (!asString(payload.createdAt) || Number.isNaN(Date.parse(payload.createdAt))) {
    throw new Error('Backup creation date is invalid.');
  }
  const { settings, customers, invoices, invoice_items: items, raw_material_entries: raw, statements } = payload.data;
  if (!settings.every(row => row.id === 1 && asString(row.companyName)) ||
      !customers.every(row => asNumber(row.id) && asString(row.name)) ||
      !invoices.every(row => asNumber(row.id) && asNumber(row.customerId) && asString(row.invoiceNo) &&
        asString(row.invoiceDate) && asNumber(row.include_in_statement) && [0, 1].includes(row.include_in_statement)) ||
      !items.every(row => asNumber(row.id) && asNumber(row.invoiceId) && asString(row.description) &&
        asNumber(row.qty) && asNumber(row.weight_per_piece) && asNumber(row.rate) && asNumber(row.amount)) ||
      !raw.every(row => asNumber(row.id) && asNumber(row.customer_id) && asString(row.date) && asString(row.material_name) &&
        asNumber(row.bag_weight) && row.bag_weight >= 0 && asNumber(row.number_of_bags) && row.number_of_bags >= 0 &&
        asNumber(row.total_weight) && row.total_weight >= 0) ||
      !statements.every(row => asNumber(row.id) && asString(row.customer_name) && asString(row.snapshot_json) &&
        asNumber(row.month) && row.month >= 1 && row.month <= 12 && asNumber(row.year) &&
        ['old_weight', 'new_weight', 'total_weight', 'used_weight', 'rejection_weight', 'balance_weight',
          'previous_amount', 'current_amount', 'gst_amount', 'tds_amount', 'total_amount', 'snapshot_version']
          .every(field => asNumber(row[field])) && asString(row.finalized_at))) {
    throw new Error('Backup contains invalid business data.');
  }
  const customerIds = new Set(customers.map(row => row.id));
  const invoiceIds = new Set(invoices.map(row => row.id));
  if (invoices.some(row => !customerIds.has(row.customerId)) ||
      items.some(row => !invoiceIds.has(row.invoiceId)) ||
      raw.some(row => !customerIds.has(row.customer_id)) ||
      statements.some(row => row.customer_id !== null && row.customer_id !== undefined && !customerIds.has(row.customer_id))) {
    throw new Error('Backup contains business records without their related customer or invoice.');
  }
  for (const row of statements) {
    let snapshot;
    try {
      snapshot = JSON.parse(row.snapshot_json);
    } catch {
      throw new Error('A saved statement snapshot in this backup is corrupted.');
    }
    if (!snapshot || !Array.isArray(snapshot.rawMaterials) || !Array.isArray(snapshot.production) ||
        !snapshot.balance || !snapshot.amounts || !asString(snapshot.customerName) ||
        !['oldWeight', 'newWeight', 'totalWeight', 'usedWeight', 'rejectionWeight', 'balanceWeight']
          .every(field => asNumber(snapshot.balance[field])) ||
        !['previousAmount', 'currentAmount', 'gstAmount', 'tdsAmount', 'totalAmount']
          .every(field => asNumber(snapshot.amounts[field])) ||
        !snapshot.rawMaterials.every(entry => asString(entry.date) && asString(entry.material_name) &&
          asNumber(entry.bag_weight) && asNumber(entry.number_of_bags) && asNumber(entry.total_weight)) ||
        !snapshot.production.every(entry => asString(entry.description) && asString(entry.invoiceDate) &&
          asNumber(entry.qty) && asNumber(entry.weightPerPiece) && asNumber(entry.totalWeight) &&
          asNumber(entry.rate) && asNumber(entry.amount))) {
      throw new Error('A saved statement snapshot in this backup is incomplete.');
    }
  }
  return payload;
};

const removePdfUris = data => {
  const cleaned = { ...data };
  cleaned.invoices = cleaned.invoices.map(row => ({ ...row, pdfPath: null }));
  cleaned.statements = cleaned.statements.map(row => {
    const snapshot = JSON.parse(row.snapshot_json);
    snapshot.pdfUri = null;
    return { ...row, pdf_uri: null, snapshot_json: JSON.stringify(snapshot) };
  });
  return cleaned;
};

const readRows = async db => {
  const data = {};
  for (const [table, columns] of Object.entries(BACKUP_TABLES)) {
    const rows = await db.getAllAsync(`SELECT ${columns.join(', ')} FROM ${table}`);
    data[table] = rows;
  }
  return data;
};

const insertRows = async (db, table, columns, rows) => {
  for (const row of rows) {
    const values = columns.map(column => row[column] === undefined ? null : row[column]);
    await db.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
  }
};

export const backupService = {
  getLastBackup: async () => {
    const db = await getDbConnection();
    const row = await db.getFirstAsync("SELECT value FROM app_metadata WHERE key = 'last_backup_at'");
    return row?.value || null;
  },

  create: async () => {
    const db = await getDbConnection();
    const data = removePdfUris(await readRows(db));
    const createdAt = new Date().toISOString();
    const payload = { app: APP_ID, backupVersion: BACKUP_VERSION, createdAt, data };
    validatePayload(payload);
    await FileSystem.makeDirectoryAsync(BACKUP_DIRECTORY, { intermediates: true });
    const baseName = `AK_PLASTIC_Backup_${createdAt.slice(0, 10)}`;
    let filePath = `${BACKUP_DIRECTORY}${baseName}.akbackup`;
    if ((await FileSystem.getInfoAsync(filePath)).exists) {
      filePath = `${BACKUP_DIRECTORY}${baseName}_${Date.now()}.akbackup`;
    }
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(payload), { encoding: FileSystem.EncodingType.UTF8 });
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
    await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: 'Export AK PLASTIC backup' });
    await db.runAsync(
      `INSERT INTO app_metadata (key, value) VALUES ('last_backup_at', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [createdAt]
    );
    return createdAt;
  },

  selectAndValidate: async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    const text = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('The selected backup file is not valid JSON.');
    }
    validatePayload(payload);
    return {
      payload,
      preview: {
        createdAt: payload.createdAt,
        customers: payload.data.customers.length,
        invoices: payload.data.invoices.length,
        rawEntries: payload.data.raw_material_entries.length,
        statements: payload.data.statements.length,
      },
    };
  },

  restore: async payload => {
    validatePayload(payload);
    const db = await getDbConnection();
    const data = removePdfUris(payload.data);
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        DELETE FROM statements;
        DELETE FROM raw_material_entries;
        DELETE FROM invoice_items;
        DELETE FROM invoices;
        DELETE FROM customers;
        DELETE FROM settings;
        DELETE FROM app_metadata;
      `);
      for (const table of ['settings', 'customers', 'invoices', 'invoice_items', 'raw_material_entries', 'statements', 'app_metadata']) {
        await insertRows(db, table, BACKUP_TABLES[table], data[table]);
      }
    });
  },
};
