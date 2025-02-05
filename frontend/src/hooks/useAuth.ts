import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    loading: true,
    error: null
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const user = await response.json();
            setState(prev => ({
              ...prev,
              user,
              loading: false
            }));
          } else {
            localStorage.removeItem('token');
            setState(prev => ({
              ...prev,
              token: null,
              loading: false
            }));
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            error: 'Failed to authenticate',
            loading: false
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          loading: false
        }));
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      
      setState(prev => ({
        ...prev,
        user: data.user,
        token: data.token,
        error: null
      }));

      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to login'
      }));
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const result = await response.json();
      localStorage.setItem('token', result.token);
      
      setState(prev => ({
        ...prev,
        user: result.user,
        token: result.token,
        error: null
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to register'
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
      error: null
    });
    navigate('/login');
  };

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout
  };
}; 