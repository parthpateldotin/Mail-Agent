import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import reducers
import authReducer from '../../features/auth/authSlice';
import settingsReducer from '../../features/settings/settingsSlice';
// import emailReducer from '../../features/email/emailSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    // email: emailReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store; 