import { createSlice } from '@reduxjs/toolkit';

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    bookings: [],
    selectedBooking: null,
    loading: false,
    error: null,
    currentBooking: null, // For active booking process
  },
  reducers: {
    setBookings: (state, action) => {
      state.bookings = action.payload;
    },
    addBooking: (state, action) => {
      state.bookings.unshift(action.payload);
    },
    updateBooking: (state, action) => {
      const index = state.bookings.findIndex(b => b._id === action.payload._id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
    },
    setSelectedBooking: (state, action) => {
      state.selectedBooking = action.payload;
    },
    setCurrentBooking: (state, action) => {
      state.currentBooking = action.payload;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
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
  setBookings,
  addBooking,
  updateBooking,
  setSelectedBooking,
  setCurrentBooking,
  clearCurrentBooking,
  setLoading,
  setError,
  clearError,
} = bookingSlice.actions;

export default bookingSlice.reducer;
