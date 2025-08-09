import { createSlice } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

let socket = null;
let isSocketActive = false;

// Getter so other modules can access current socket instance safely
export const getSocket = () => socket;

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    connected: false,
    error: null,
    notifications: [],
  },
  reducers: {
    setConnected: (state, action) => {
      state.connected = action.payload;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    connectSocket: (state) => {
      // Don't mutate state here, just set up socket
      if (!socket) {
        socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket'],
        });
        isSocketActive = true;
      }
    },
    
    disconnectSocket: (state) => {
      isSocketActive = false;
      if (socket) {
        // Remove all event listeners to prevent memory leaks
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }
      state.connected = false;
      state.error = null;
    },
    
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { 
  connectSocket, 
  disconnectSocket, 
  setConnected, 
  setError, 
  addNotification, 
  clearNotifications 
} = socketSlice.actions;

// Action creators for socket events
export const initializeSocket = () => (dispatch, getState) => {
  dispatch(connectSocket());
  
  if (socket && isSocketActive) {
    socket.on('connect', () => {
      // Check if socket is still active before dispatching
      if (!isSocketActive) return;
      try {
        dispatch(setConnected(true));
        dispatch(setError(null));
      } catch (error) {
        console.warn('Failed to update socket connection state:', error);
      }
    });
    
    socket.on('disconnect', () => {
      if (!isSocketActive) return;
      try {
        dispatch(setConnected(false));
      } catch (error) {
        console.warn('Failed to update socket disconnection state:', error);
      }
    });
    
    socket.on('error', (error) => {
      if (!isSocketActive) return;
      try {
        dispatch(setError(error.message));
      } catch (err) {
        console.warn('Failed to update socket error state:', err);
      }
    });
    
    // Add other socket event listeners here
    socket.on('notification', (notification) => {
      if (!isSocketActive) return;
      try {
        dispatch(addNotification(notification));
      } catch (error) {
        console.warn('Failed to add notification:', error);
      }
    });

    // Real-time parking lot availability updates (server should emit 'availability-update')
    socket.on('availability-update', (payload) => {
      if (!isSocketActive) return;
      // payload expected: { lotId, available, occupancyRate, status }
      try {
        const { parking } = getState();
        if (parking?.lots?.length) {
          // Soft update state shape inline to avoid circular import of parking slice
          const idx = parking.lots.findIndex(l => l._id === payload.lotId || l.id === payload.lotId);
          if (idx !== -1) {
            // Mutate via dispatch of a lightweight action (define locally?)
            // Simpler: create a custom event so components can respond without coupling
            window.dispatchEvent(new CustomEvent('parking-availability-update', { detail: payload }));
          }
        }
        // Always broadcast browser event for map hook listeners
        window.dispatchEvent(new CustomEvent('parking-availability-update', { detail: payload }));
      } catch (err) {
        console.warn('Failed handling availability-update:', err);
      }
    });
  }
};

export default socketSlice.reducer;
