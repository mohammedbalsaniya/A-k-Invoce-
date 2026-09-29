import { create } from 'zustand';
import { invoiceRepository } from '../repositories/invoiceRepository';

export const useInvoiceStore = create((set, get) => ({
  invoices: [],
  currentInvoice: null,
  totalInvoices: 0,
  totalRevenue: 0,
  loading: false,
  error: null,

fetchInvoices: async () => {
  set({ loading: true, error: null });

  try {
    const data = await invoiceRepository.getAll();

    const totalRevenue = data.reduce(
      (sum, invoice) => sum + Number(invoice.grandTotal || 0),
      0
    );

    set({
      invoices: data,
      totalInvoices: data.length,
      totalRevenue,
      loading: false,
    });
  } catch (err) {
    set({
      error: err.message,
      loading: false,
    });
  }
},

  fetchInvoiceById: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await invoiceRepository.getById(id);
      set({ currentInvoice: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createInvoice: async (invoice, items) => {
    set({ loading: true });
    try {
      const id = await invoiceRepository.create(invoice, items);
      await get().fetchInvoices();
      set({ loading: false });
      return id;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteInvoice: async (id) => {
    try {
      await invoiceRepository.delete(id);
      await get().fetchInvoices();
    } catch (err) {
      set({ error: err.message });
    }
  },

  getNextInvoiceNo: async () => {
    try {
      return await invoiceRepository.getNextInvoiceNo();
    } catch (err) {
      console.error('Error getting next invoice no:', err);
      return 'INV-0001';
    }
  }
}));
