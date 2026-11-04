import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

// Login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

// Register
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed'
      );
    }
  }
);

// Restore session after page refresh
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const { data: tokenData } = await api.post('/auth/refresh');

      const { data: userData } = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
        },
      });

      return {
        accessToken: tokenData.accessToken,
        user: userData.user,
      };
    } catch {
      return rejectWithValue('Session expired');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',

  initialState: {
    user: null,
    token: null,
    status: 'loading',
    error: null,
  },

  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Register
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Restore session
      .addCase(restoreSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'idle';
        state.user = null;
        state.token = null;
      });
  },
});

export const { setToken, logout } = authSlice.actions;

export default authSlice.reducer;