
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

// Fetch public course catalog
export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/courses', { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch courses'
      );
    }
  }
);

// Fetch individual course details and curriculum
export const fetchCourseById = createAsyncThunk(
  'courses/fetchCourseById',
  async (courseId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/courses/${courseId}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch course details'
      );
    }
  }
);

const coursesSlice = createSlice({
  name: 'courses',

  initialState: {
    items: [],
    total: 0,
    pages: 1,
    selectedCourse: null,
    sections: [],
    catalogStatus: 'idle',
    detailStatus: 'idle',
    error: null,
  },

  reducers: {
    clearSelectedCourse: (state) => {
      state.selectedCourse = null;
      state.sections = [];
      state.detailStatus = 'idle';
    },
  },

  extraReducers: (builder) => {
    builder
      // Course catalog
      .addCase(fetchCourses.pending, (state) => {
        state.catalogStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.catalogStatus = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.pages = action.payload.pages;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.catalogStatus = 'failed';
        state.error = action.payload;
      })

      // Course details
      .addCase(fetchCourseById.pending, (state) => {
        state.detailStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selectedCourse = action.payload.course;
        state.sections = action.payload.sections;
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearSelectedCourse } = coursesSlice.actions;

export default coursesSlice.reducer;
