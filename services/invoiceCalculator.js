import { Decimal, decimal, decimalToNumber } from '../utils/decimal.js';

const amountOrZero = value => {
  try {
    const parsed = decimal(value);
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
};

export const calculateItemAmount = (qty, rate) => {
  return decimalToNumber(amountOrZero(qty).times(amountOrZero(rate)));
};

export const calculateTotals = (items, discountPercent = 0, sgstPercent = 0, cgstPercent = 0, igstPercent = 0) => {
  const subtotal = items.reduce((sum, item) => sum.plus(amountOrZero(item.amount)), new Decimal(0));
  const discountAmount = subtotal.times(amountOrZero(discountPercent)).div(100);
  const taxableAmount = subtotal.minus(discountAmount);

  const sgstAmount = taxableAmount.times(amountOrZero(sgstPercent)).div(100);
  const cgstAmount = taxableAmount.times(amountOrZero(cgstPercent)).div(100);
  const igstAmount = taxableAmount.times(amountOrZero(igstPercent)).div(100);

  const netTaxableAmount = subtotal.minus(discountAmount);
  const grandTotal = netTaxableAmount.plus(sgstAmount).plus(cgstAmount).plus(igstAmount);

  return {
    subtotal: decimalToNumber(subtotal),
    discount: decimalToNumber(discountAmount),
    taxableAmount: decimalToNumber(netTaxableAmount),
    sgstAmount: decimalToNumber(sgstAmount),
    cgstAmount: decimalToNumber(cgstAmount),
    igstAmount: decimalToNumber(igstAmount),
    grandTotal: decimalToNumber(grandTotal),
  };
};

export const numberToWords = (num) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  };

  const value = decimal(num);
  const whole = value.abs().trunc();
  const fractionalDigits = value.abs().minus(whole).toFixed().split('.')[1] || '';
  let words = convert(whole.toNumber()) + ' Rupees';

  if (fractionalDigits) {
    if (fractionalDigits.length <= 2) {
      words += ' and ' + convert(Number(fractionalDigits.padEnd(2, '0'))) + ' Paise';
    } else {
      words += ` and ${fractionalDigits.split('').map(digit => a[Number(digit)] || 'Zero').join(' ')} decimal digits`;
    }
  }

  return words + ' Only';
};
