import { getDbConnection } from '../database/database';

export const rawMaterialRepository = {
  getAll: async ({ customerId, fromDate, toDate, query = '', limit = 100, offset = 0 } = {}) => {
    const db = await getDbConnection();
    const filters = [];
    const params = [];
    if (customerId) {
      filters.push('r.customer_id = ?');
      params.push(customerId);
    }
    if (fromDate) {
      filters.push('r.date >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      filters.push('r.date < ?');
      params.push(toDate);
    }
    if (query.trim()) {
      filters.push('(r.material_name LIKE ? OR c.name LIKE ? OR r.date LIKE ?)');
      const term = `%${query.trim()}%`;
      params.push(term, term, term);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    return db.getAllAsync(
      `SELECT r.*, c.name AS customer_name
       FROM raw_material_entries r
       JOIN customers c ON c.id = r.customer_id
       ${where}
       ORDER BY r.date DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  },

  getById: async id => {
    const db = await getDbConnection();
    return db.getFirstAsync(
      `SELECT r.*, c.name AS customer_name
       FROM raw_material_entries r
       JOIN customers c ON c.id = r.customer_id
       WHERE r.id = ?`,
      [id]
    );
  },

  save: async entry => {
    const db = await getDbConnection();
    const values = [
      entry.customer_id,
      entry.date,
      entry.material_name.trim(),
      entry.bag_weight,
      entry.number_of_bags,
      entry.total_weight,
    ];
    if (entry.id) {
      return db.runAsync(
        `UPDATE raw_material_entries
         SET customer_id = ?, date = ?, material_name = ?, bag_weight = ?,
             number_of_bags = ?, total_weight = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [...values, entry.id]
      );
    }
    return db.runAsync(
      `INSERT INTO raw_material_entries
       (customer_id, date, material_name, bag_weight, number_of_bags, total_weight)
       VALUES (?, ?, ?, ?, ?, ?)`,
      values
    );
  },

  delete: async id => {
    const db = await getDbConnection();
    return db.runAsync('DELETE FROM raw_material_entries WHERE id = ?', [id]);
  },
};
