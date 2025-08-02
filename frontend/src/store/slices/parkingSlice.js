import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import parkingService from '../../services/parkingService';

// Async thunks
export const fetchParkingLots = createAsyncThunk(
  'parking/fetchParkingLots',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await parkingService.getAllParkingLots(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch parking lots');
    }
  }
);

export const fetchParkingLotDetails = createAsyncThunk(
  'parking/fetchParkingLotDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await parkingService.getParkingLotDetails(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch parking lot details');
    }
  }
);

export const createParkingLot = createAsyncThunk(
  'parking/createParkingLot',
  async (lotData, { rejectWithValue }) => {
    try {
      const response = await parkingService.createParkingLot(lotData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create parking lot');
    }
  }
);

export const updateParkingLot = createAsyncThunk(
  'parking/updateParkingLot',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await parkingService.updateParkingLot(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update parking lot');
    }
  }
);

export const fetchMyParkingLots = createAsyncThunk(
  'parking/fetchMyParkingLots',
  async (pagination, { rejectWithValue }) => {
    try {
      const response = await parkingService.getMyParkingLots(pagination);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch your parking lots');
    }
  }
);

export const updateAvailability = createAsyncThunk(
  'parking/updateAvailability',
  async ({ id, availabilityData }, { rejectWithValue }) => {
    try {
      const response = await parkingService.updateAvailability(id, availabilityData);
      return { id, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update availability');
    }
  }
);

const initialState = {
  lots: [],
  selectedLot: null,
  myLots: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    total: 0,
    totalLots: 0,
    hasNext: false,
    hasPrev: false,
  },
  filters: {
    lat: null,
    lng: null,
    radius: 10,
    vehicleType: '',
    minPrice: '',
    maxPrice: '',
    amenities: [],
    search: '',
  },
  realTimeUpdates: {},
};

const parkingSlice = createSlice({
  name: 'parking',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedLot: (state, action) => {
      state.selectedLot = action.payload;
    },
    clearSelectedLot: (state) => {
      state.selectedLot = null;
    },
    updateLotAvailability: (state, action) => {
      const { lotId, available, occupancyRate, status } = action.payload;
      
      // Update in lots array
      const lotIndex = state.lots.findIndex(lot => lot._id === lotId);
      if (lotIndex !== -1) {
        state.lots[lotIndex].capacity.available = available;
        state.lots[lotIndex].liveStatus.occupancyRate = occupancyRate;
        if (status) state.lots[lotIndex].status = status;
        state.lots[lotIndex].liveStatus.lastUpdated = new Date().toISOString();
      }
      
      // Update selected lot if it matches
      if (state.selectedLot && state.selectedLot._id === lotId) {
        state.selectedLot.capacity.available = available;
        state.selectedLot.liveStatus.occupancyRate = occupancyRate;
        if (status) state.selectedLot.status = status;
        state.selectedLot.liveStatus.lastUpdated = new Date().toISOString();
      }
      
      // Update my lots if it matches
      const myLotIndex = state.myLots.findIndex(lot => lot._id === lotId);
      if (myLotIndex !== -1) {
        state.myLots[myLotIndex].capacity.available = available;
        state.myLots[myLotIndex].liveStatus.occupancyRate = occupancyRate;
        if (status) state.myLots[myLotIndex].status = status;
        state.myLots[myLotIndex].liveStatus.lastUpdated = new Date().toISOString();
      }
      
      // Store real-time update
      state.realTimeUpdates[lotId] = {
        available,
        occupancyRate,
        status,
        timestamp: new Date().toISOString(),
      };
    },
    bookingCreated: (state, action) => {
      const { lotId, availableSpots } = action.payload;
      
      // Update available spots after booking
      const lotIndex = state.lots.findIndex(lot => lot._id === lotId);
      if (lotIndex !== -1) {
        state.lots[lotIndex].capacity.available = availableSpots;
        state.lots[lotIndex].liveStatus.lastUpdated = new Date().toISOString();
      }
      
      if (state.selectedLot && state.selectedLot._id === lotId) {
        state.selectedLot.capacity.available = availableSpots;
        state.selectedLot.liveStatus.lastUpdated = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Parking Lots
      .addCase(fetchParkingLots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParkingLots.fulfilled, (state, action) => {
        state.loading = false;
        state.lots = action.payload.lots;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchParkingLots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch Parking Lot Details
      .addCase(fetchParkingLotDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParkingLotDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedLot = action.payload.lot;
      })
      .addCase(fetchParkingLotDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create Parking Lot
      .addCase(createParkingLot.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createParkingLot.fulfilled, (state, action) => {
        state.loading = false;
        state.myLots.unshift(action.payload.lot);
      })
      .addCase(createParkingLot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Parking Lot
      .addCase(updateParkingLot.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateParkingLot.fulfilled, (state, action) => {
        state.loading = false;
        const updatedLot = action.payload.lot;
        
        // Update in myLots
        const myLotIndex = state.myLots.findIndex(lot => lot._id === updatedLot._id);
        if (myLotIndex !== -1) {
          state.myLots[myLotIndex] = updatedLot;
        }
        
        // Update selected lot if it matches
        if (state.selectedLot && state.selectedLot._id === updatedLot._id) {
          state.selectedLot = updatedLot;
        }
      })
      .addCase(updateParkingLot.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch My Parking Lots
      .addCase(fetchMyParkingLots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyParkingLots.fulfilled, (state, action) => {
        state.loading = false;
        state.myLots = action.payload.lots;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMyParkingLots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Availability
      .addCase(updateAvailability.pending, (state) => {
        state.error = null;
      })
      .addCase(updateAvailability.fulfilled, (state, action) => {
        const { id, available, occupancyRate, status } = action.payload;
        
        // Update in myLots
        const myLotIndex = state.myLots.findIndex(lot => lot._id === id);
        if (myLotIndex !== -1) {
          state.myLots[myLotIndex].capacity.available = available;
          state.myLots[myLotIndex].liveStatus.occupancyRate = occupancyRate;
          if (status) state.myLots[myLotIndex].status = status;
        }
      })
      .addCase(updateAvailability.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  clearError,
  setSelectedLot,
  clearSelectedLot,
  updateLotAvailability,
  bookingCreated,
} = parkingSlice.actions;

export default parkingSlice.reducer;
