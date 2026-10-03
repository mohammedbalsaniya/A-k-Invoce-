import { getDbConnection } from '../database/database';

const monthRange = (year, month) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { from, next };
};

export const statementRepository = {
  getSourceData: async ({ customerId, year, month }) => {
    const db = await getDbConnection();
    const { from, next } = monthRange(year, month);
    const rawMaterials = await db.getAllAsync(
      `SELECT id, date, material_name, bag_weight, number_of_bags, total_weight
       FROM raw_material_entries
       WHERE customer_id = ? AND date >= ? AND date < ?
       ORDER BY date, id`,
      [customerId, from, next]
    );
    const production = await db.getAllAsync(
      `SELECT i.id AS invoice_id, i.invoiceNo, i.invoiceDate, ii.id AS item_id,
              ii.description, ii.qty, ii.weight_per_piece AS weightPerPiece,
              ii.rate, ii.amount
       FROM invoices i
       JOIN invoice_items ii ON ii.invoiceId = i.id
       WHERE i.customerId = ? AND i.include_in_statement = 1
         AND i.invoiceDate >= ? AND i.invoiceDate < ?
       ORDER BY i.invoiceDate, i.id, ii.id`,
      [customerId, from, next]
    );
    return { rawMaterials, production };
  },

  create: async statement => {
    const db = await getDbConnection();
    const result = await db.runAsync(
      `INSERT INTO statements (
        customer_id, customer_name, month, year, old_weight, new_weight,
        total_weight, used_weight, rejection_weight, balance_weight,
        previous_amount, current_amount, gst_amount, tds_amount, total_amount,
        snapshot_json, snapshot_version, pdf_uri, status, finalized_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'finalized', ?)`,
      [
        statement.customerId,
        statement.customerName,
        statement.month,
        statement.year,
        statement.balance.oldWeight,
        statement.balance.newWeight,
        statement.balance.totalWeight,
        statement.balance.usedWeight,
        statement.balance.rejectionWeight,
        statement.balance.balanceWeight,
        statement.amounts.previousAmount,
        statement.amounts.currentAmount,
        statement.amounts.gstAmount,
        statement.amounts.tdsAmount,
        statement.amounts.totalAmount,
        JSON.stringify(statement),
        1,
        statement.pdfUri,
        statement.finalizedAt,
      ]
    );
    return result.lastInsertRowId;
  },

  getAll: async ({ customerId, year, query = '', limit = 100, offset = 0 } = {}) => {
    const db = await getDbConnection();
    const filters = [];
    const params = [];
    if (customerId) {
      filters.push('customer_id = ?');
      params.push(customerId);
    }
    if (year) {
      filters.push('year = ?');
      params.push(year);
    }
    if (query.trim()) {
      filters.push(`(
        customer_name LIKE ? OR CAST(year AS TEXT) LIKE ? OR CAST(month AS TEXT) LIKE ?
        OR CASE month
          WHEN 1 THEN 'January' WHEN 2 THEN 'February' WHEN 3 THEN 'March'
          WHEN 4 THEN 'April' WHEN 5 THEN 'May' WHEN 6 THEN 'June'
          WHEN 7 THEN 'July' WHEN 8 THEN 'August' WHEN 9 THEN 'September'
          WHEN 10 THEN 'October' WHEN 11 THEN 'November' WHEN 12 THEN 'December'
        END LIKE ?
      )`);
      const term = `%${query.trim()}%`;
      params.push(term, term, term, term);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    return db.getAllAsync(
      `SELECT * FROM statements ${where} ORDER BY year DESC, month DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  },

  getById: async id => {
    const db = await getDbConnection();
    const statement = await db.getFirstAsync('SELECT * FROM statements WHERE id = ?', [id]);
    if (statement) statement.snapshot = JSON.parse(statement.snapshot_json);
    return statement;
  },

  updatePdfUri: async (id, pdfUri) => {
    const db = await getDbConnection();
    const row = await db.getFirstAsync('SELECT snapshot_json FROM statements WHERE id = ?', [id]);
    if (!row) throw new Error('Statement not found');
    const snapshot = JSON.parse(row.snapshot_json);
    snapshot.pdfUri = pdfUri;
    return db.runAsync(
      'UPDATE statements SET pdf_uri = ?, snapshot_json = ? WHERE id = ?',
      [pdfUri, JSON.stringify(snapshot), id]
    );
  },
};
