import { getDbConnection } from '../database/database';

export const settingsRepository = {
  getSettings: async () => {
    const db = await getDbConnection();
    return await db.getFirstAsync('SELECT * FROM settings WHERE id = 1');
  },

  upsertSettings: async (settings) => {
    const db = await getDbConnection();
    const existing = await db.getFirstAsync('SELECT id FROM settings WHERE id = 1');
    
    if (existing) {
      const statement = await db.prepareAsync(
        `UPDATE settings SET 
          companyName = ?, gstNumber = ?, mobileNumber = ?, address = ?, 
          bankName = ?, accountNo = ?, branchName = ?, ifscCode = ?, 
          updated_at = CURRENT_TIMESTAMP 
         WHERE id = 1`
      );
      try {
        return await statement.executeAsync([
          settings.companyName || '', 
          settings.gstNumber || '', 
          settings.mobileNumber || '', 
          settings.address || '',
          settings.bankName || '', 
          settings.accountNo || '', 
          settings.branchName || '', 
          settings.ifscCode || ''
        ]);
      } finally {
        await statement.finalizeAsync();
      }
    } else {
      const statement = await db.prepareAsync(
        `INSERT INTO settings (
          id, companyName, gstNumber, mobileNumber, address, 
          bankName, accountNo, branchName, ifscCode
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      try {
        return await statement.executeAsync([
          settings.companyName || '', 
          settings.gstNumber || '', 
          settings.mobileNumber || '', 
          settings.address || '',
          settings.bankName || '', 
          settings.accountNo || '', 
          settings.branchName || '', 
          settings.ifscCode || ''
        ]);
      } finally {
        await statement.finalizeAsync();
      }
    }
  }
};
