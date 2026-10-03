import * as FileSystem from 'expo-file-system/legacy';
import { invoiceRepository } from '../repositories/invoiceRepository';
import { statementRepository } from '../repositories/statementRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import { pdfService } from './pdfService';
import { statementPdfService } from './statementPdfService';

const fileExists = async uri => Boolean(uri && (await FileSystem.getInfoAsync(uri)).exists);

export const pdfOpenService = {
  ensureInvoicePdf: async id => {
    const invoice = await invoiceRepository.getById(id);
    if (!invoice) throw new Error('Invoice was not found.');
    if (await fileExists(invoice.pdfPath)) return invoice.pdfPath;
    const settings = await settingsRepository.getSettings();
    const pdfPath = await pdfService.generateInvoicePDF({
      ...invoice,
      items: invoice.items || [],
    }, settings);
    await invoiceRepository.updatePdfPath(id, pdfPath);
    return pdfPath;
  },

  ensureStatementPdf: async id => {
    const row = await statementRepository.getById(id);
    if (!row) throw new Error('Statement was not found.');
    if (await fileExists(row.pdf_uri)) return row.pdf_uri;
    if (!row.snapshot) throw new Error('This statement has no saved data to recreate its PDF.');
    const pdfUri = await statementPdfService.generate(row.snapshot);
    await statementRepository.updatePdfUri(id, pdfUri);
    return pdfUri;
  },
};
