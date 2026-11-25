import DecimalJs from 'decimal.js';

export const Decimal = DecimalJs.clone({
  precision: 50,
  rounding: DecimalJs.ROUND_HALF_EVEN,
});

export const decimal = value =>
  new Decimal(value === null || value === undefined || value === '' ? 0 : value);

export const decimalOrZero = value => {
  try {
    const parsed = decimal(value);
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
};

export const decimalToNumber = value => decimal(value).toNumber();

export const formatDecimal = value => decimal(value).toFixed();
