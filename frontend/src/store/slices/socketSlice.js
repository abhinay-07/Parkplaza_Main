import { createSlice } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

let socket = null;
let isSocketActive = false;

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
  }
};

export default socketSlice.reducer;
