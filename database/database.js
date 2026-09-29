import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'invoice_app.db';
let dbInstance = null;

export const initDatabase = async () => {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  dbInstance = db;

  // Enable foreign keys
  console.log('Initializing database schema...');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables if they don't exist
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

  // Initial versioning if not present
  const versionInfo = await db.getFirstAsync('SELECT current_version FROM version');
  if (!versionInfo) {
    await db.runAsync('INSERT INTO version (id, current_version) VALUES (1, 1)');
  }

  return db;
};

export const getDbConnection = async () => {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
};
