import { create } from 'zustand';
import { settingsRepository } from '../repositories/settingsRepository';

export const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const data = await settingsRepository.getSettings();
      set({ settings: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  updateSettings: async (settings) => {
    set({ loading: true, error: null });
    try {
      await settingsRepository.upsertSettings(settings);
      await get().fetchSettings();
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  }
}));
