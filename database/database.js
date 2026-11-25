import * as SQLite from 'expo-sqlite';
import { calculateMaterialBalance, normalizeRawMaterialEntry } from '../services/statementCalculator';
import { normalizeLegacyRawMaterialEntry } from '../utils/legacyRawMaterial';

const DATABASE_NAME = 'invoice_app.db';
const CURRENT_SCHEMA_VERSION = 6;
let dbInstance = null;

const hasColumn = async (db, table, column) => {
  const columns = await db.getAllAsync(`PRAGMA table_info(${table})`);
  return columns.some(item => item.name === column);
};

export const initDatabase = async () => {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_version INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      companyName TEXT NOT NULL,
      gstNumber TEXT,
      mobileNumber TEXT,
      address TEXT,
      bankName TEXT,
      accountNo TEXT,
      branchName TEXT,
      ifscCode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      gstNumber TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNo TEXT NOT NULL UNIQUE,
      invoiceDate TEXT NOT NULL,
      carrier TEXT,
      station TEXT,
      customerId INTEGER NOT NULL,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      taxableAmount REAL DEFAULT 0,
      sgstPercent REAL DEFAULT 0,
      sgstAmount REAL DEFAULT 0,
      cgstPercent REAL DEFAULT 0,
      cgstAmount REAL DEFAULT 0,
      igstPercent REAL DEFAULT 0,
      igstAmount REAL DEFAULT 0,
      grandTotal REAL DEFAULT 0,
      amountInWords TEXT,
      customerAddress TEXT,
      pdfPath TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customerId) REFERENCES customers (id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      description TEXT NOT NULL,
      hsn TEXT,
      qty REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
    );
  `);

  const versionInfo = await db.getFirstAsync('SELECT current_version FROM version WHERE id = 1');
  if (!versionInfo) await db.runAsync('INSERT INTO version (id, current_version) VALUES (1, 1)');

  try {
    await db.withTransactionAsync(async () => {
      const current = await db.getFirstAsync('SELECT current_version FROM version WHERE id = 1');
      if (current.current_version < 2) {
        if (!(await hasColumn(db, 'invoices', 'include_in_statement'))) {
          await db.execAsync('ALTER TABLE invoices ADD COLUMN include_in_statement INTEGER NOT NULL DEFAULT 1 CHECK (include_in_statement IN (0, 1))');
        }
        if (!(await hasColumn(db, 'invoice_items', 'weight_per_piece'))) {
          await db.execAsync('ALTER TABLE invoice_items ADD COLUMN weight_per_piece REAL NOT NULL DEFAULT 0 CHECK (weight_per_piece >= 0)');
        }

        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS raw_material_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            material_name TEXT NOT NULL,
            bag_weight REAL NOT NULL,
            number_of_bags REAL NOT NULL,
            total_weight REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_raw_material_customer_date ON raw_material_entries(customer_id, date);
          CREATE INDEX IF NOT EXISTS idx_invoices_statement_customer_date ON invoices(customerId, invoiceDate, include_in_statement);
          CREATE TABLE IF NOT EXISTS statements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            customer_name TEXT NOT NULL,
            month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
            year INTEGER NOT NULL,
            old_weight REAL NOT NULL,
            new_weight REAL NOT NULL,
            total_weight REAL NOT NULL,
            used_weight REAL NOT NULL,
            rejection_weight REAL NOT NULL,
            balance_weight REAL NOT NULL,
            previous_amount REAL NOT NULL,
            current_amount REAL NOT NULL,
            gst_amount REAL NOT NULL,
            tds_amount REAL NOT NULL,
            total_amount REAL NOT NULL,
            snapshot_json TEXT NOT NULL,
            snapshot_version INTEGER NOT NULL DEFAULT 1,
            pdf_uri TEXT,
            status TEXT NOT NULL DEFAULT 'finalized',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            finalized_at TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
          );
          CREATE INDEX IF NOT EXISTS idx_statements_customer_period ON statements(customer_id, year, month);
        `);
        await db.runAsync('UPDATE version SET current_version = 2 WHERE id = 1');
      }
      const latest = await db.getFirstAsync('SELECT current_version FROM version WHERE id = 1');
      if (latest.current_version < 3) {
        await db.runAsync('UPDATE version SET current_version = 3 WHERE id = 1');
      }
      const signedWeightVersion = await db.getFirstAsync('SELECT current_version FROM version WHERE id = 1');
      if (signedWeightVersion.current_version < 4) {
        const hasReturnFlag = await hasColumn(db, 'raw_material_entries', 'is_return');
        await db.execAsync(`
          CREATE TABLE raw_material_entries_signed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            material_name TEXT NOT NULL,
            bag_weight REAL NOT NULL,
            number_of_bags REAL NOT NULL,
            total_weight REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
          );
        `);
        await db.execAsync(hasReturnFlag
          ? `INSERT INTO raw_material_entries_signed
               (id, customer_id, date, material_name, bag_weight, number_of_bags, total_weight, created_at, updated_at)
             SELECT id, customer_id, date, material_name, bag_weight,
                    CASE WHEN is_return = 1 THEN -ABS(number_of_bags) ELSE number_of_bags END,
                    CASE WHEN is_return = 1 THEN -ABS(total_weight) ELSE total_weight END,
                    created_at, updated_at
             FROM raw_material_entries;`
          : `INSERT INTO raw_material_entries_signed
               (id, customer_id, date, material_name, bag_weight, number_of_bags, total_weight, created_at, updated_at)
             SELECT id, customer_id, date, material_name, bag_weight, number_of_bags, total_weight, created_at, updated_at
             FROM raw_material_entries;`);
        await db.execAsync(`
          DROP TABLE raw_material_entries;
          ALTER TABLE raw_material_entries_signed RENAME TO raw_material_entries;
          CREATE INDEX idx_raw_material_customer_date ON raw_material_entries(customer_id, date);
        `);

        const statements = await db.getAllAsync('SELECT id, snapshot_json FROM statements');
        for (const statement of statements) {
          const snapshot = JSON.parse(statement.snapshot_json);
          if (Array.isArray(snapshot.rawMaterials)) {
            const hadLegacyReturn = snapshot.rawMaterials.some(entry => entry.is_return !== undefined);
            snapshot.rawMaterials = snapshot.rawMaterials.map(entry => {
              return normalizeLegacyRawMaterialEntry(entry);
            });
            if (hadLegacyReturn) snapshot.pdfUri = null;
            await db.runAsync(
              `UPDATE statements SET snapshot_json = ?, pdf_uri = CASE WHEN ? THEN NULL ELSE pdf_uri END
               WHERE id = ?`,
              [
                JSON.stringify(snapshot),
                hadLegacyReturn ? 1 : 0,
                statement.id,
              ]
            );
          }
        }
        await db.runAsync('UPDATE version SET current_version = 4 WHERE id = 1');
      }
      const normalizedWeightVersion = await db.getFirstAsync('SELECT current_version FROM version WHERE id = 1');
      if (normalizedWeightVersion.current_version < 5) {
        const rawMaterials = await db.getAllAsync(
          'SELECT id, bag_weight, number_of_bags, total_weight FROM raw_material_entries'
        );
        for (const entry of rawMaterials) {
          const normalized = normalizeRawMaterialEntry(entry);
          if (Number(entry.total_weight) !== normalized.total_weight) {
            await db.runAsync('UPDATE raw_material_entries SET total_weight = ? WHERE id = ?', [
              normalized.total_weight,
              entry.id,
            ]);
          }
        }

        const statements = await db.getAllAsync('SELECT * FROM statements');
        for (const statement of statements) {
          const snapshot = JSON.parse(statement.snapshot_json);
          if (!Array.isArray(snapshot.rawMaterials)) continue;
          const legacyEntries = snapshot.rawMaterials.map(normalizeLegacyRawMaterialEntry);
          const normalizedEntries = legacyEntries.map(normalizeRawMaterialEntry);
          const netNewWeight = normalizedEntries.reduce((sum, entry) => sum + entry.total_weight, 0);
          const correctedBalance = calculateMaterialBalance(
            snapshot.balance.oldWeight,
            netNewWeight,
            snapshot.balance.usedWeight
          );
          const needsCorrection = snapshot.rawMaterials.some((entry, index) =>
            Number(entry.total_weight) !== normalizedEntries[index].total_weight ||
            entry.is_return !== undefined
          ) || snapshot.balance.newWeight !== correctedBalance.newWeight ||
            snapshot.balance.totalWeight !== correctedBalance.totalWeight ||
            snapshot.balance.balanceWeight !== correctedBalance.balanceWeight;

          if (needsCorrection) {
            snapshot.rawMaterials = normalizedEntries;
            snapshot.balance = {
              ...snapshot.balance,
              ...correctedBalance,
            };
            snapshot.pdfUri = null;
            await db.runAsync(
              `UPDATE statements SET old_weight = ?, new_weight = ?, total_weight = ?,
                 used_weight = ?, rejection_weight = ?, balance_weight = ?,
                 pdf_uri = NULL, snapshot_json = ? WHERE id = ?`,
              [
                correctedBalance.oldWeight,
                correctedBalance.newWeight,
                correctedBalance.totalWeight,
                snapshot.balance.usedWeight,
                snapshot.balance.rejectionWeight,
                correctedBalance.balanceWeight,
                JSON.stringify(snapshot),
                statement.id,
              ]
            );
          }
        }
        await db.runAsync('UPDATE version SET current_version = 5 WHERE id = 1');
      }
      const invoiceAddressVersion = await db.getFirstAsync('SELECT current_version FROM version WHERE id = 1');
      if (invoiceAddressVersion.current_version < 6) {
        if (!(await hasColumn(db, 'invoices', 'customerAddress'))) {
          await db.execAsync('ALTER TABLE invoices ADD COLUMN customerAddress TEXT');
        }
        await db.execAsync(`
          UPDATE invoices
          SET customerAddress = (
            SELECT address FROM customers WHERE customers.id = invoices.customerId
          )
          WHERE customerAddress IS NULL;
        `);
        await db.runAsync('UPDATE version SET current_version = 6 WHERE id = 1');
      }
    });
  } catch (error) {
    dbInstance = null;
    throw new Error(`Database migration to version ${CURRENT_SCHEMA_VERSION} failed: ${error.message}`);
  }

  dbInstance = db;
  return db;
};

export const getDbConnection = async () => {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
};
