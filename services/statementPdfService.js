import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import {
  calculateRawMaterialNetWeight,
  formatIsoDate,
  formatWeight,
  isNegativeRawMaterialEntry,
  normalizeRawMaterialEntry,
  sanitizeFilename,
} from './statementCalculator';
import { encodeBytesToBase64 } from '../utils/encodeBase64';
import { processInBatches } from '../utils/processInBatches';
import { formatDecimal } from '../utils/decimal';

const DIRECTORY = `${FileSystem.documentDirectory}statements/`;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 38;
const RIGHT = PAGE_WIDTH - LEFT;
const COLOR = rgb(0.12, 0.18, 0.27);
const MUTED = rgb(0.38, 0.43, 0.5);
const LINE = rgb(0.81, 0.84, 0.88);
const NEGATIVE = rgb(0.8, 0, 0);

const money = value => `INR ${formatDecimal(value)}`;
const monthName = month => new Date(2000, month - 1, 1).toLocaleString('en', { month: 'long' });

const truncate = (text, font, size, maxWidth) => {
  const value = String(text ?? '');
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;

  const characters = Array.from(value);
  const suffix = '...';
  if (font.widthOfTextAtSize(suffix, size) > maxWidth) return '';

  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (font.widthOfTextAtSize(`${characters.slice(0, middle).join('')}${suffix}`, size) <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return `${characters.slice(0, low).join('')}${suffix}`;
};

export const statementPdfService = {
  generate: async (statement, { onProgress = () => {} } = {}) => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page;
    let y;

    const addPage = () => {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 40;
      return page;
    };
    const ensureSpace = (height = 24) => {
      if (!page || y < height + 42) addPage();
    };
    const text = (value, x, top, size = 8, selectedFont = font, color = COLOR) => {
      page.drawText(String(value ?? ''), { x, y: top - size, size, font: selectedFont, color });
    };
    const line = (top, x1 = LEFT, x2 = RIGHT) => {
      page.drawLine({ start: { x: x1, y: top }, end: { x: x2, y: top }, thickness: 0.5, color: LINE });
    };
    const section = title => {
      ensureSpace(35);
      y -= 8;
      text(title, LEFT, y, 11, bold);
      y -= 8;
      line(y);
      y -= 16;
    };
    const table = async (headers, widths, rows, render, totalLabel, totalValue, rowColor, totalColor = COLOR) => {
      const tableRight = LEFT + widths.reduce((total, width) => total + width, 0);
      const xPositions = widths.reduce((positions, width, index) => {
        positions.push(index ? positions[index - 1] + widths[index - 1] : LEFT);
        return positions;
      }, []);
      const drawHeader = () => {
        ensureSpace(40);
        headers.forEach((header, index) => text(header, xPositions[index], y, 8, bold, MUTED));
        y -= 6;
        line(y, LEFT, tableRight);
        y -= 15;
      };
      drawHeader();
      await processInBatches(rows, row => {
        if (y < 48) {
          addPage();
          drawHeader();
        }
        const values = render(row);
        const color = rowColor ? rowColor(row) : COLOR;
        values.forEach((value, index) => {
          text(truncate(value, font, 8.5, widths[index] - 5), xPositions[index], y, 8.5, font, color);
        });
        y -= 14;
        line(y, LEFT, tableRight);
        y -= 2;
      }, onProgress);
      ensureSpace(22);
      if (totalLabel) {
        text(totalLabel, LEFT, y, 8, bold);
        text(totalValue, RIGHT - 86, y, 8, bold, totalColor);
        y -= 18;
      }
    };

    addPage();
    text(`${monthName(statement.month).toUpperCase()} STATEMENT - ${statement.year}`, LEFT, y, 16, bold);
    y -= 24;
    text(`FROM ${statement.companyName || 'A K PLASTIC'}`, LEFT, y, 10, bold);
    y -= 15;
    text(`TO ${statement.customerName}`, LEFT, y, 10, bold);
    y -= 10;
    line(y);
    y -= 18;

    section('RAW MATERIAL');
    const rawMaterials = statement.rawMaterials.map(normalizeRawMaterialEntry);
    const rawMaterialTotal = calculateRawMaterialNetWeight(rawMaterials);
    onProgress({ stage: 'raw-materials' });
    await table(
      ['DATE', 'RAW MATERIAL', 'BAG W.T', 'NO. OF BAG', 'TOTAL W.T (KG)'],
      [70, 210, 72, 76, 91],
      rawMaterials,
      row => [formatIsoDate(row.date), row.material_name, formatWeight(row.bag_weight), row.number_of_bags, formatWeight(row.total_weight)],
      'TOTAL RAW MATERIAL (KG)',
      formatWeight(rawMaterialTotal),
      row => isNegativeRawMaterialEntry(row) ? NEGATIVE : COLOR,
      rawMaterialTotal < 0 ? NEGATIVE : COLOR
    );

    section('RAW MATERIAL BALANCE (KG)');
    const balanceRows = [
      ['OLD', statement.balance.oldWeight],
      ['NEW', statement.balance.newWeight],
      ['TOTAL', statement.balance.totalWeight],
      ['USED', statement.balance.usedWeight],
      ['1%', statement.balance.rejectionWeight],
      ['BALANCE', statement.balance.balanceWeight],
    ];
    onProgress({ stage: 'balance' });
    await table(['DESCRIPTION', 'WEIGHT (KG)'], [170, 110], balanceRows, row => [row[0], formatWeight(row[1])]);

    section('PRODUCTION');
    onProgress({ stage: 'production' });
    await table(
      [
        'DATE',
        'ITEM NAME',
        'QTY OF PC.',
        Number(statement.snapshotVersion || 1) >= 2 ? 'WT/PC (G)' : 'WT/PC',
        'TOTAL WT (KG)',
        'RATE',
        'AMOUNT',
      ],
      [57, 125, 61, 68, 66, 60, 82],
      statement.production,
      row => [
        formatIsoDate(row.invoiceDate),
        row.description,
        row.qty,
        formatWeight(row.weightPerPiece),
        formatWeight(row.totalWeight),
        money(row.rate),
        money(row.amount),
      ],
      'TOTAL PRODUCTION WEIGHT (KG)',
      formatWeight(statement.balance.usedWeight)
    );

    section('AMOUNT');
    const amountRows = [
      ['Previous Amount', statement.amounts.previousAmount],
      ['Current Month', statement.amounts.currentAmount],
      ['GST', statement.amounts.gstAmount],
      ['TDS - 1%', statement.amounts.tdsAmount],
      ['Total', statement.amounts.totalAmount],
    ];
    onProgress({ stage: 'amounts' });
    await table(['DESCRIPTION', 'AMOUNT'], [170, 110], amountRows, row => [row[0], money(row[1])]);

    onProgress({ stage: 'saving' });
    await new Promise(resolve => setTimeout(resolve, 0));
    const bytes = await pdf.save();
    onProgress({ stage: 'encoding' });
    const base64 = await encodeBytesToBase64(bytes, progress => {
      onProgress({ ...progress, stage: 'encoding' });
    });
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
    const base = `${sanitizeFilename(statement.customerName)}_Statement_${monthName(statement.month)}_${statement.year}`;
    let path = `${DIRECTORY}${base}.pdf`;
    const exists = await FileSystem.getInfoAsync(path);
    if (exists.exists) path = `${DIRECTORY}${base}_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    return path;
  },
};
