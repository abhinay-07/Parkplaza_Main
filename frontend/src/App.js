import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import ProfilePage from './pages/ProfilePage';
import LandlordDashboard from './pages/LandlordDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ParkingLotDetails from './pages/ParkingLotDetails';
import MyBookings from './pages/MyBookings';
import ServicesPage from './pages/ServicesPage';

// Redux actions
import { loadUser } from './store/slices/authSlice';
import { initializeSocket, disconnectSocket } from './store/slices/socketSlice';

function App() {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated } = useSelector((state) => state.auth);
  const hasLoadedUser = useRef(false);

  useEffect(() => {
    // Only load user once and if we have a token in localStorage
    if (!hasLoadedUser.current) {
      const token = localStorage.getItem('token');
      if (token) {
        dispatch(loadUser());
      }
      hasLoadedUser.current = true;
    }
  }, [dispatch]);

  useEffect(() => {
    // Connect to socket when authenticated
    if (isAuthenticated && user) {
      dispatch(initializeSocket());
    } else {
      dispatch(disconnectSocket());
    }

    // Cleanup socket on unmount
    return () => {
      dispatch(disconnectSocket());
    };
  }, [dispatch, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/auth" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
            } 
          />
          <Route path="/parking/:id" element={<ParkingLotDetails />} />
          <Route path="/services" element={<ServicesPage />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                {user?.role === 'admin' ? (
                  <AdminDashboard />
                ) : user?.role === 'landowner' ? (
                  <LandlordDashboard />
                ) : (
                  <Navigate to="/profile" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/booking/:id" 
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/my-bookings" 
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/landlord/*" 
            element={
              <ProtectedRoute requiredRole="landowner">
                <LandlordDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
