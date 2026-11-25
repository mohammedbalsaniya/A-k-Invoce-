import { PDFDocument, StandardFonts } from 'pdf-lib';

export const createBackupPdf = async payload => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 7;
  const lineHeight = 9;
  const left = 36;
  const maxWidth = 523;
  const pageHeight = 842;
  let page;
  let y;

  const addPage = () => {
    page = pdf.addPage([595, pageHeight]);
    y = pageHeight - 36;
  };
  const drawLine = (line, selectedFont = font, size = fontSize) => {
    if (!page || y < 36) addPage();
    page.drawText(line, { x: left, y, size, font: selectedFont });
    y -= lineHeight;
  };
  const ascii = value => Array.from(value, character => {
    const codePoint = character.codePointAt(0);
    return codePoint > 0x7e || codePoint < 0x20
      ? `\\u{${codePoint.toString(16)}}`
      : character;
  }).join('');
  const wrapLine = line => {
    const remaining = Array.from(ascii(line));
    let segment = '';
    const segments = [];
    while (remaining.length) {
      const character = remaining.shift();
      if (font.widthOfTextAtSize(segment + character, fontSize) > maxWidth && segment) {
        segments.push(segment);
        segment = character;
      } else {
        segment += character;
      }
    }
    segments.push(segment);
    return segments;
  };

  addPage();
  drawLine('AK PLASTIC DATA BACKUP (PDF COPY - NOT RESTORABLE)', bold, 10);
  drawLine(`Created: ${payload.createdAt}`, bold, 8);
  drawLine('');
  for (const line of JSON.stringify(payload, null, 2).split('\n')) {
    for (const segment of wrapLine(line)) drawLine(segment);
  }
  return pdf.saveAsBase64();
};
