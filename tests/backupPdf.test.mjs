import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createBackupPdf } from '../utils/backupPdf.js';

test('creates a paginated, readable PDF backup document', async () => {
  const payload = {
    app: 'AK_PLASTIC',
    backupVersion: 1,
    createdAt: '2026-11-25T10:00:00.000Z',
    data: {
      customers: [{ id: 1, name: 'Customer' }],
      invoices: [],
      note: 'Names with accents and non-Latin text are represented safely: café हिंदी',
      details: Array.from({ length: 180 }, (_, index) => ({
        index,
        content: `Backup record ${index} `.repeat(8),
      })),
    },
  };
  const base64 = await createBackupPdf(payload);
  const bytes = Buffer.from(base64, 'base64');
  assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-');

  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() > 1);
});
