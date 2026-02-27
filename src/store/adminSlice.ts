import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AdminAnalyticsData } from '../types';
import { api } from '../services/api';

interface AdminState {
  studentData: AdminAnalyticsData[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AdminState = {
  studentData: [],
  status: 'idle',
  error: null
};

export const fetchAdminData = createAsyncThunk('admin/fetchData', async () => {
    const response = await api.getAdminData();
    if (response.success) {
        return response.data;
    }
    throw new Error("Failed to fetch admin data");
});

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
      builder
        .addCase(fetchAdminData.pending, (state) => {
            state.status = 'loading';
        })
        .addCase(fetchAdminData.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.studentData = action.payload;
        })
        .addCase(fetchAdminData.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.error.message || 'Failed to load data';
        });
  }
});

export default adminSlice.reducer;