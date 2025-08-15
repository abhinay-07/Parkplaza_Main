import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

// Lazy-loaded Pages
const HomePage = lazy(() => import('./pages/HomePageNew'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LandlordDashboard = lazy(() => import('./pages/LandlordDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ParkingLotDetails = lazy(() => import('./pages/ParkingLotDetails'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ParkingMapDemo = lazy(() => import('./components/maps/ParkingMap'));
// Removed separate OSM Explore page; Home uses OSM/Leaflet now

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
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-1">
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/parking-lot/:lotId" element={<ParkingLotDetails />} />
              <Route path="/services" element={<ServicesPage />} />
              {/* Demo: standalone ParkingMap using Places API */}
              <Route path="/demo/parking-map" element={<ParkingMapDemo />} />
              {/* OSM explorer removed; Home contains free map */}
              
              {/* Booking Flow Routes */}
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/booking-success" element={<BookingSuccessPage />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    {(() => {
                      if (user?.role === 'admin') {
                        return <AdminDashboard />;
                      } else if (user?.role === 'landowner') {
                        return <LandlordDashboard />;
                      } else {
                        return <Navigate to="/profile" replace />;
                      }
                    })()}
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
          </Suspense>
        </main>
        
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
