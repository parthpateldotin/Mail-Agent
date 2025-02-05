import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    loading: true,
    error: null,
  });

  const setAuthHeader = useCallback((token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  useEffect(() => {
    if (state.token) {
      setAuthHeader(state.token);
    }
  }, [state.token, setAuthHeader]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { data } = await axios.post<AuthResponse>('/api/auth/login', credentials);
      
      localStorage.setItem('token', data.token);
      setState({
        user: data.user,
        token: data.token,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Invalid credentials',
      }));
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await axios.post<AuthResponse>('/api/auth/register', data);
      
      localStorage.setItem('token', response.data.token);
      setState({
        user: response.data.user,
        token: response.data.token,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Registration failed',
      }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setState({
      user: null,
      token: null,
      loading: false,
      error: null,
    });
  };

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setAuthHeader(token);
      const { data } = await axios.get<User>('/api/auth/me');
      setState({
        user: data,
        token,
        loading: false,
        error: null,
      });
    } catch (error) {
      localStorage.removeItem('token');
      setState({
        user: null,
        token: null,
        loading: false,
        error: 'Session expired',
      });
    }
  }, [setAuthHeader]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    checkAuth,
  };
}; 