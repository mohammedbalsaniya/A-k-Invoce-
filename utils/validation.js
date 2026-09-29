import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional().or(z.literal('')),
  gstNumber: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

export const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  gstNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  branchName: z.string().optional(),
  ifscCode: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  hsn: z.string().optional(),
  qty: z.number().positive('Quantity must be > 0'),
  rate: z.number().positive('Rate must be > 0'),
  amount: z.number(),
});

export const invoiceSchema = z.object({
  invoiceNo: z.string().min(1, 'Invoice No is required'),
  invoiceDate: z.string().min(1, 'Date is required'),

  carrier: z.string().optional(),
  station: z.string().optional(),

  customerId: z.number({
    required_error: 'Customer is required',
  }),

  items: z
    .array(invoiceItemSchema)
    .min(1, 'At least one item is required')
    .max(6, 'Maximum 6 items allowed'),

  subtotal: z.number(),
  discount: z.number().optional().default(0),
  taxableAmount: z.number(),

  sgstPercent: z.number().optional().default(9),
  sgstAmount: z.number(),

  cgstPercent: z.number().optional().default(9),
  cgstAmount: z.number(),

  igstPercent: z.number().optional().default(0),
  igstAmount: z.number().optional().default(0),

  grandTotal: z.number(),
  amountInWords: z.string(),
});