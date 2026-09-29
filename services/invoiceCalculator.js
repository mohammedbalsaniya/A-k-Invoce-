export const calculateItemAmount = (qty, rate) => {
  const q = parseFloat(qty) || 0;
  const r = parseFloat(rate) || 0;
  return parseFloat((q * r).toFixed(2));
};

export const calculateTotals = (items, discountPercent = 0, sgstPercent = 0, cgstPercent = 0, igstPercent = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const discountAmount = (subtotal * (parseFloat(discountPercent) || 0)) / 100;
  const taxableAmount = subtotal - discountAmount;
  
  const sgstAmount = (taxableAmount * (parseFloat(sgstPercent) || 0)) / 100;
  const cgstAmount = (taxableAmount * (parseFloat(cgstPercent) || 0)) / 100;
  const igstAmount = (taxableAmount * (parseFloat(igstPercent) || 0)) / 100;
  
  const grandTotal = taxableAmount + sgstAmount + cgstAmount + igstAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discountAmount.toFixed(2)),
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    sgstAmount: parseFloat(sgstAmount.toFixed(2)),
    cgstAmount: parseFloat(cgstAmount.toFixed(2)),
    igstAmount: parseFloat(igstAmount.toFixed(2)),
    grandTotal: Math.round(grandTotal) // Rounding off to nearest integer
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

  const [whole, decimal] = num.toString().split('.');
  let words = convert(parseInt(whole)) + ' Rupees';
  
  if (decimal && parseInt(decimal) > 0) {
    const d = parseInt(decimal.substring(0, 2).padEnd(2, '0'));
    words += ' and ' + convert(d) + ' Paise';
  }
  
  return words + ' Only';
};
