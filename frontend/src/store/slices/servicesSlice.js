import { createSlice } from '@reduxjs/toolkit';

const servicesSlice = createSlice({
  name: 'services',
  initialState: {
    services: [],
    selectedServices: [],
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {
    setServices: (state, action) => {
      state.services = action.payload;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    addSelectedService: (state, action) => {
      const exists = state.selectedServices.find(s => s._id === action.payload._id);
      if (!exists) {
        state.selectedServices.push(action.payload);
      }
    },
    removeSelectedService: (state, action) => {
      state.selectedServices = state.selectedServices.filter(
        s => s._id !== action.payload
      );
    },
    clearSelectedServices: (state) => {
      state.selectedServices = [];
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setServices,
  setCategories,
  addSelectedService,
  removeSelectedService,
  clearSelectedServices,
  setLoading,
  setError,
  clearError,
} = servicesSlice.actions;

export default servicesSlice.reducer;
