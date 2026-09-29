import { getDbConnection } from '../database/database';

export const customerRepository = {
  getAll: async () => {
    const db = await getDbConnection();
    return await db.getAllAsync('SELECT * FROM customers ORDER BY name ASC');
  },

  getById: async (id) => {
    const db = await getDbConnection();
    return await db.getFirstAsync('SELECT * FROM customers WHERE id = ?', [id]);
  },

  create: async (customer) => {
    console.log('Attempting to create customer:', customer);
    const db = await getDbConnection();
    
    // Using prepareAsync for better reliability on some Android versions
    const statement = await db.prepareAsync(
      'INSERT INTO customers (name, address, gstNumber, phone) VALUES (?, ?, ?, ?)'
    );
    
    try {
      const result = await statement.executeAsync([
        customer.name || '',
        customer.address || '',
        customer.gstNumber || '',
        customer.phone || ''
      ]);
      console.log('Customer creation success:', result);
      return result;
    } catch (error) {
      console.error('Customer repository create error:', error);
      throw error;
    } finally {
      await statement.finalizeAsync();
    }
  },

  update: async (id, customer) => {
    const db = await getDbConnection();
    const statement = await db.prepareAsync(
      'UPDATE customers SET name = ?, address = ?, gstNumber = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    try {
      return await statement.executeAsync([
        customer.name || '',
        customer.address || '',
        customer.gstNumber || '',
        customer.phone || '',
        id
      ]);
    } finally {
      await statement.finalizeAsync();
    }
  },

  delete: async (id) => {
    const db = await getDbConnection();
    return await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
  },

  search: async (query) => {
    const db = await getDbConnection();
    const searchTerm = `%${query}%`;
    return await db.getAllAsync(
      'SELECT * FROM customers WHERE name LIKE ? OR gstNumber LIKE ? OR phone LIKE ? ORDER BY name ASC',
      [searchTerm, searchTerm, searchTerm]
    );
  }
};
