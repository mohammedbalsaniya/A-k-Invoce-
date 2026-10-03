import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { formatIsoDate, formatWeight, sanitizeFilename } from './statementCalculator';

const DIRECTORY = `${FileSystem.documentDirectory}statements/`;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 38;
const RIGHT = PAGE_WIDTH - LEFT;
const COLOR = rgb(0.12, 0.18, 0.27);
const MUTED = rgb(0.38, 0.43, 0.5);
const LINE = rgb(0.81, 0.84, 0.88);

const money = value => `INR ${Number(value || 0).toFixed(2)}`;
const monthName = month => new Date(2000, month - 1, 1).toLocaleString('en', { month: 'long' });

const truncate = (text, font, size, maxWidth) => {
  let value = String(text ?? '');
  while (value.length && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = `${value.slice(0, -2)}...`;
  }
  return value;
};

export const statementPdfService = {
  generate: async statement => {
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
    const table = (headers, widths, rows, render, totalLabel, totalValue) => {
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
      rows.forEach(row => {
        if (y < 48) {
          addPage();
          drawHeader();
        }
        const values = render(row);
        values.forEach((value, index) => {
          text(truncate(value, font, 8.5, widths[index] - 5), xPositions[index], y, 8.5);
        });
        y -= 14;
        line(y, LEFT, tableRight);
        y -= 2;
      });
      ensureSpace(22);
      if (totalLabel) {
        text(totalLabel, LEFT, y, 8, bold);
        text(totalValue, RIGHT - 86, y, 8, bold);
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
    table(
      ['DATE', 'RAW MATERIAL', 'BAG W.T', 'NO. OF BAG', 'TOTAL W.T (KG)'],
      [70, 210, 72, 76, 91],
      statement.rawMaterials,
      row => [formatIsoDate(row.date), row.material_name, formatWeight(row.bag_weight), row.number_of_bags, formatWeight(row.total_weight)],
      'TOTAL RAW MATERIAL (KG)',
      formatWeight(statement.rawMaterials.reduce((sum, row) => sum + Number(row.total_weight || 0), 0))
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
    table(['DESCRIPTION', 'WEIGHT (KG)'], [170, 110], balanceRows, row => [row[0], formatWeight(row[1])]);

    section('PRODUCTION');
    table(
      ['DATE', 'ITEM NAME', 'QTY OF PC.', 'W.T PER PC.', 'TOTAL W.T', 'RATE', 'AMOUNT'],
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
    table(['DESCRIPTION', 'AMOUNT'], [170, 110], amountRows, row => [row[0], money(row[1])]);

    const bytes = await pdf.saveAsBase64();
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
    const base = `${sanitizeFilename(statement.customerName)}_Statement_${monthName(statement.month)}_${statement.year}`;
    let path = `${DIRECTORY}${base}.pdf`;
    const exists = await FileSystem.getInfoAsync(path);
    if (exists.exists) path = `${DIRECTORY}${base}_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(path, bytes, { encoding: FileSystem.EncodingType.Base64 });
    return path;
  },
};
