
import { configureStore } from '@reduxjs/toolkit';

import authReducer from '../features/authSlice.js';
import coursesReducer from '../features/coursesSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courses: coursesReducer,
  },
});

export default store;
