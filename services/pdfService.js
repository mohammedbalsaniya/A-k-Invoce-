import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { sanitizeFilename } from './statementCalculator';

const INVOICE_DIR = `${FileSystem.documentDirectory}invoices/`;

export const pdfService = {
  ensureDirectory: async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(INVOICE_DIR);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(INVOICE_DIR, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error('Error ensuring directory:', error);
      throw error;
    }
  },

  generateInvoicePDF: async (invoiceData, settingsData) => {
    try {
      await pdfService.ensureDirectory();

      // Load PDF template
      const asset = Asset.fromModule(
        require('../assets/pdf/invoice_template.pdf')
      );

      await asset.downloadAsync();

      if (!asset.localUri) {
        throw new Error('Failed to load PDF template');
      }

      const pdfBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const pdfDoc = await PDFDocument.load(pdfBase64);
      const form = pdfDoc.getForm();

      const fieldNames = form.getFields().map(field => field.getName());

      const safeFill = (fieldName, value) => {
        if (!fieldNames.includes(fieldName)) return;

        try {
          form.getTextField(fieldName).setText(
            value === undefined || value === null ? '' : String(value)
          );
        } catch (err) {
          console.warn(`Could not fill field "${fieldName}"`);
        }
      };

      // =====================================================
      // BASIC DETAILS
      // =====================================================

      const invoiceDate = invoiceData.invoiceDate || '';

      // New template has two date fields
      safeFill('date', invoiceDate);
      safeFill('Date', invoiceDate);

      safeFill('carrier', invoiceData.carrier);
      safeFill('station', invoiceData.station);

      safeFill('customerName', invoiceData.customerName);
      safeFill('customerAddress', invoiceData.customerAddress);
      safeFill('invoiceNo', invoiceData.invoiceNo);

      // =====================================================
      // ITEMS (MAX 6)
      // =====================================================

      const items = invoiceData.items || [];

      for (let i = 0; i < 6; i++) {
        const item = items[i];
        const row = i + 1;

        safeFill(
          `item${row}Description`,
          item ? item.description : ''
        );

        safeFill(
          `item${row}HSN`,
          item ? item.hsn : ''
        );

        safeFill(
          `item${row}Qty`,
          item ? item.qty : ''
        );

        safeFill(
          `item${row}Rate`,
          item ? item.rate : ''
        );

        safeFill(
          `item${row}Amount`,
          item ? item.amount : ''
        );
      }

      // =====================================================
      // TOTALS
      // =====================================================

      safeFill('subtotal', invoiceData.subtotal);
      safeFill('discount', invoiceData.discount);
      safeFill('taxableAmount', invoiceData.taxableAmount);

      // SGST
      safeFill('sgstPercent', invoiceData.sgstPercent);
      safeFill('sgstAmount', invoiceData.sgstAmount);

      // CGST
      safeFill('cgstPercent', invoiceData.cgstPercent);
      safeFill('cgstAmount', invoiceData.cgstAmount);

      // IGST
      safeFill('igstPercent', invoiceData.igstPercent);
      safeFill('igstAmount', invoiceData.igstAmount);

      safeFill('grandTotal', invoiceData.grandTotal);
      safeFill('amountInWords', invoiceData.amountInWords);

      // =====================================================
      // SAVE PDF
      // =====================================================

      form.flatten();

      const outputBase64 = await pdfDoc.saveAsBase64();

      const customer = sanitizeFilename(invoiceData.customerName);
      const number = sanitizeFilename(invoiceData.invoiceNo || String(Date.now()));
      const date = sanitizeFilename(String(invoiceData.invoiceDate || '').replace(/-/g, '_'));
      const fileName = `${customer}_Invoice_${number}_${date}.pdf`;
      let filePath = `${INVOICE_DIR}${fileName}`;
      if ((await FileSystem.getInfoAsync(filePath)).exists) {
        filePath = `${INVOICE_DIR}${customer}_Invoice_${number}_${date}_${Date.now()}.pdf`;
      }

      await FileSystem.writeAsStringAsync(filePath, outputBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return filePath;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw error;
    }
  },

  sharePDF: async (filePath) => {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) throw new Error('This PDF is missing and could not be opened.');
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('PDF sharing is not available on this device.');
    }

    await Sharing.shareAsync(filePath, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  },

  openPDF: async filePath => {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) throw new Error('This PDF is missing and could not be opened.');
    if (Platform.OS === 'android') {
      const IntentLauncher = await import('expo-intent-launcher');
      const contentUri = await FileSystem.getContentUriAsync(filePath);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/pdf',
      });
      return;
    }
    if (!(await Sharing.isAvailableAsync())) throw new Error('PDF opening is not available on this device.');
    await Sharing.shareAsync(filePath, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  },
};