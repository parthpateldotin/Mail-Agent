import { createSlice } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark';
  refreshInterval: number;
  notifications: boolean;
  emailSettings: {
    autoResponse: boolean;
    priority: 'high' | 'medium' | 'low';
  };
}

const initialState: SettingsState = {
  theme: 'dark',
  refreshInterval: 5000,
  notifications: true,
  emailSettings: {
    autoResponse: true,
    priority: 'medium',
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setRefreshInterval: (state, action) => {
      state.refreshInterval = action.payload;
    },
    toggleNotifications: (state) => {
      state.notifications = !state.notifications;
    },
    updateEmailSettings: (state, action) => {
      state.emailSettings = { ...state.emailSettings, ...action.payload };
    },
  },
});

export const {
  setTheme,
  setRefreshInterval,
  toggleNotifications,
  updateEmailSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer; 