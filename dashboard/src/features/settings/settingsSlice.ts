import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../services/store';
import axiosInstance from '../../services/api/axios';

interface VacationResponder {
  enabled: boolean;
  message: string;
  startDate: string;
  endDate: string;
}

interface SettingsState {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  darkMode: boolean;
  signature: string;
  vacationResponder: VacationResponder;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  emailNotifications: true,
  desktopNotifications: false,
  darkMode: false,
  signature: '',
  vacationResponder: {
    enabled: false,
    message: '',
    startDate: '',
    endDate: '',
  },
  isLoading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/settings');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings: Partial<Omit<SettingsState, 'isLoading' | 'error'>>, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/settings', settings);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Settings
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        return { ...state, ...action.payload };
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Settings
      .addCase(updateSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        return { ...state, ...action.payload };
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { toggleDarkMode, resetError } = settingsSlice.actions;

export const selectSettings = (state: RootState) => state.settings;
export const selectDarkMode = (state: RootState) => state.settings.darkMode;
export const selectIsLoading = (state: RootState) => state.settings.isLoading;
export const selectError = (state: RootState) => state.settings.error;

export default settingsSlice.reducer; 