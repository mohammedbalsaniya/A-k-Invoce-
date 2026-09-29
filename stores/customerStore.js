import { create } from 'zustand';
import { customerRepository } from '../repositories/customerRepository';

export const useCustomerStore = create((set, get) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const data = await customerRepository.getAll();
      set({ customers: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addCustomer: async (customer) => {
    try {
      await customerRepository.create(customer);
      await get().fetchCustomers();
    } catch (err) {
      set({ error: err.message });
    }
  },

  updateCustomer: async (id, customer) => {
    try {
      await customerRepository.update(id, customer);
      await get().fetchCustomers();
    } catch (err) {
      set({ error: err.message });
    }
  },

  deleteCustomer: async (id) => {
    try {
      await customerRepository.delete(id);
      await get().fetchCustomers();
    } catch (err) {
      set({ error: err.message });
    }
  },

  searchCustomers: async (query) => {
    set({ loading: true });
    try {
      const data = await customerRepository.search(query);
      set({ customers: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  }
}));
