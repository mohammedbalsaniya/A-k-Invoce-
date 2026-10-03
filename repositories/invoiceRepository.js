import { getDbConnection } from '../database/database';

export const invoiceRepository = {
  getAll: async () => {
    const db = await getDbConnection();
    return await db.getAllAsync(`
      SELECT i.*, c.name as customerName 
      FROM invoices i 
      JOIN customers c ON i.customerId = c.id 
      ORDER BY i.created_at DESC
    `);
  },

  getById: async (id) => {
    const db = await getDbConnection();
    const invoice = await db.getFirstAsync(`
      SELECT i.*, c.name as customerName, c.address as customerAddress, c.gstNumber as customerGST, c.phone as customerPhone
      FROM invoices i 
      JOIN customers c ON i.customerId = c.id 
      WHERE i.id = ?
    `, [id]);

    if (invoice) {
      invoice.items = await db.getAllAsync('SELECT * FROM invoice_items WHERE invoiceId = ?', [id]);
    }
    return invoice;
  },

  create: async (invoice, items) => {
    const db = await getDbConnection();

    return await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT INTO invoices (
        invoiceNo,
        invoiceDate,
        carrier,
        station,
        customerId,
        subtotal,
        discount,
        taxableAmount,
        sgstPercent,
        sgstAmount,
        cgstPercent,
        cgstAmount,
        igstPercent,
        igstAmount,
        grandTotal,
        amountInWords,
        pdfPath
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice.invoiceNo,
          invoice.invoiceDate,
          invoice.carrier,
          invoice.station,
          invoice.customerId,
          invoice.subtotal,
          invoice.discount,
          invoice.taxableAmount,
          invoice.sgstPercent,
          invoice.sgstAmount,
          invoice.cgstPercent,
          invoice.cgstAmount,
          invoice.igstPercent,
          invoice.igstAmount,
          invoice.grandTotal,
          invoice.amountInWords,
          invoice.pdfPath
        ]
      );

      const invoiceId = result.lastInsertRowId;

      for (const item of items) {
        await db.runAsync(
          `INSERT INTO invoice_items (
          invoiceId,
          description,
          hsn,
          qty,
          weight_per_piece,
          rate,
          amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            item.description,
            item.hsn,
            item.qty,
            item.weightPerPiece || 0,
            item.rate,
            item.amount
          ]
        );
      }

      return invoiceId;
    });
  },

  updatePdfPath: async (id, path) => {
    const db = await getDbConnection();
    return await db.runAsync('UPDATE invoices SET pdfPath = ? WHERE id = ?', [path, id]);
  },

  setStatementInclusion: async (id, included) => {
    const db = await getDbConnection();
    return await db.runAsync(
      'UPDATE invoices SET include_in_statement = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [included ? 1 : 0, id]
    );
  },

  delete: async (id) => {
    const db = await getDbConnection();
    return await db.runAsync('DELETE FROM invoices WHERE id = ?', [id]);
  },

  getNextInvoiceNo: async () => {
    const db = await getDbConnection();
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM invoices');
    const count = result ? result.count : 0;
    return `INV-${String(count + 1).padStart(4, '0')}`;
  }
};
