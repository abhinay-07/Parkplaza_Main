import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import bookingService from '../../services/bookingService';

// Async thunks
export const fetchMyBookings = createAsyncThunk(
  'booking/fetchMyBookings',
  async (params, { rejectWithValue }) => {
    try {
      const data = await bookingService.myBookings(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createBookingAsync = createAsyncThunk(
  'booking/createBooking',
  async (payload, { rejectWithValue }) => {
    try {
      const booking = await bookingService.create(payload);
      return booking;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const getBookingDetails = createAsyncThunk(
  'booking/getDetails',
  async (id, { rejectWithValue }) => {
    try {
      const booking = await bookingService.getDetails(id);
      return booking;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateBookingStatusAsync = createAsyncThunk(
  'booking/updateStatus',
  async ({ id, status, reason }, { rejectWithValue }) => {
    try {
      const booking = await bookingService.updateStatus(id, status, reason);
      return booking;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const cancelBookingAsync = createAsyncThunk(
  'booking/cancel',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const booking = await bookingService.cancel(id, reason);
      return booking;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const extendBookingAsync = createAsyncThunk(
  'booking/extend',
  async ({ id, additionalHours }, { rejectWithValue }) => {
    try {
      const booking = await bookingService.extend(id, additionalHours);
      return booking;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    bookings: [],
    selectedBooking: null,
    loading: false,
    error: null,
    currentBooking: null, // For active booking process
  pagination: null,
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
  extraReducers: (builder) => {
    // Fetch my bookings
    builder.addCase(fetchMyBookings.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMyBookings.fulfilled, (state, action) => {
      state.loading = false;
      state.bookings = action.payload.bookings || action.payload;
      state.pagination = action.payload.pagination || null;
    });
    builder.addCase(fetchMyBookings.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to load bookings';
    });

    // Create booking
    builder.addCase(createBookingAsync.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createBookingAsync.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload) {
        state.bookings.unshift(action.payload);
        state.currentBooking = action.payload;
      }
    });
    builder.addCase(createBookingAsync.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to create booking';
    });

    // Get details
    builder.addCase(getBookingDetails.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getBookingDetails.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedBooking = action.payload;
    });
    builder.addCase(getBookingDetails.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch booking details';
    });

    // Update status
    builder.addCase(updateBookingStatusAsync.fulfilled, (state, action) => {
      const idx = state.bookings.findIndex(b => b._id === action.payload._id);
      if (idx !== -1) state.bookings[idx] = action.payload;
      if (state.selectedBooking && state.selectedBooking._id === action.payload._id) {
        state.selectedBooking = action.payload;
      }
    });
    builder.addCase(updateBookingStatusAsync.rejected, (state, action) => {
      state.error = action.payload || 'Failed to update booking status';
    });

    // Cancel
    builder.addCase(cancelBookingAsync.fulfilled, (state, action) => {
      const idx = state.bookings.findIndex(b => b._id === action.payload._id);
      if (idx !== -1) state.bookings[idx] = action.payload;
      if (state.selectedBooking && state.selectedBooking._id === action.payload._id) {
        state.selectedBooking = action.payload;
      }
    });
    builder.addCase(cancelBookingAsync.rejected, (state, action) => {
      state.error = action.payload || 'Failed to cancel booking';
    });

    // Extend
    builder.addCase(extendBookingAsync.fulfilled, (state, action) => {
      const idx = state.bookings.findIndex(b => b._id === action.payload._id);
      if (idx !== -1) state.bookings[idx] = action.payload;
      if (state.selectedBooking && state.selectedBooking._id === action.payload._id) {
        state.selectedBooking = action.payload;
      }
    });
    builder.addCase(extendBookingAsync.rejected, (state, action) => {
      state.error = action.payload || 'Failed to extend booking';
    });
  }
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
