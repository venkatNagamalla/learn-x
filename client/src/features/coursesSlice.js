
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios.js';

// Fetch the course catalog.
export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/courses', { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch courses.'
      );
    }
  }
);

// Fetch one course and its backend-confirmed enrollment details.
export const fetchCourseById = createAsyncThunk(
  'courses/fetchCourseById',
  async (courseId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/courses/${courseId}`);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch course details.'
      );
    }
  }
);

const initialState = {
  items: [],
  total: 0,
  pages: 1,

  selectedCourse: null,
  sections: [],

  // Enrollment information returned by the backend.
  isEnrolled: false,
  lessonProgress: 0,
  quizProgress: 0,
  completedLessonIds: [],

  catalogStatus: 'idle',
  detailStatus: 'idle',
  error: null,
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,

  reducers: {
    clearSelectedCourse: (state) => {
      state.selectedCourse = null;
      state.sections = [];
      state.isEnrolled = false;
      state.lessonProgress = 0;
      state.quizProgress = 0;
      state.completedLessonIds = [];
      state.detailStatus = 'idle';
      state.error = null;
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
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.pages = action.payload.pages || 1;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.catalogStatus = 'failed';
        state.error = action.payload || 'Failed to fetch courses.';
      })

      // Individual course details and enrollment status
      .addCase(fetchCourseById.pending, (state) => {
        state.detailStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';

        state.selectedCourse = action.payload.course || null;
        state.sections = action.payload.sections || [];

        state.isEnrolled = Boolean(action.payload.isEnrolled);
        state.lessonProgress = action.payload.lessonProgress ?? 0;
        state.quizProgress = action.payload.quizProgress ?? 0;
        state.completedLessonIds =
          action.payload.completedLessonIds || [];
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.error =
          action.payload || 'Failed to fetch course details.';
      });
  },
});

export const { clearSelectedCourse } = coursesSlice.actions;

export default coursesSlice.reducer;
