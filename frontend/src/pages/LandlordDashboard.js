import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  LinearProgress,
  Fab,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  LocalParking as ParkingIcon,
  BookOnline as BookingIcon,
  Analytics as AnalyticsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  TrendingUp,
  AttachMoney,
  DirectionsCar,
  People
} from '@mui/icons-material';

// Mock API calls - Replace with actual API calls
const mockAPI = {
  getLandlordStats: async () => ({
    totalRevenue: 25000,
    totalBookings: 150,
    activeLots: 5,
    occupancyRate: 78
  }),
  getParkingLots: async () => ([
    {
      id: '1',
      name: 'Downtown Plaza Parking',
      address: 'Main Street, Downtown',
      capacity: 100,
      occupied: 78,
      revenue: 5000,
      status: 'active'
    },
    {
      id: '2',
      name: 'Mall Parking Complex',
      address: 'Shopping Mall, East Side',
      capacity: 200,
      occupied: 156,
      revenue: 8000,
      status: 'active'
    },
    {
      id: '3',
      name: 'Airport Parking Zone',
      address: 'Airport Terminal 2',
      capacity: 300,
      occupied: 89,
      revenue: 12000,
      status: 'maintenance'
    }
  ]),
  getRecentBookings: async () => ([
    {
      id: 'B001',
      customerName: 'John Doe',
      lotName: 'Downtown Plaza',
      checkIn: '2024-08-07 09:00',
      checkOut: '2024-08-07 17:00',
      amount: 120,
      status: 'active'
    },
    {
      id: 'B002',
      customerName: 'Jane Smith',
      lotName: 'Mall Parking',
      checkIn: '2024-08-06 14:00',
      checkOut: '2024-08-06 18:00',
      amount: 80,
      status: 'completed'
    }
  ])
};

const LandlordDashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, lotsData, bookingsData] = await Promise.all([
          mockAPI.getLandlordStats(),
          mockAPI.getParkingLots(),
          mockAPI.getRecentBookings()
        ]);
        
        setStats(statsData);
        setParkingLots(lotsData);
        setRecentBookings(bookingsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setSnackbar({
          open: true,
          message: 'Error loading dashboard data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleAddLot = () => {
    setSelectedLot(null);
    setOpenDialog(true);
  };

  const handleEditLot = (lot) => {
    setSelectedLot(lot);
    setOpenDialog(true);
  };

  const handleDeleteLot = async (lotId) => {
    if (window.confirm('Are you sure you want to delete this parking lot?')) {
      try {
        // API call to delete lot
        setParkingLots(parkingLots.filter(lot => lot.id !== lotId));
        setSnackbar({
          open: true,
          message: 'Parking lot deleted successfully',
          severity: 'success'
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Error deleting parking lot',
          severity: 'error'
        });
      }
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ paddingTop: 24 }}>
      {value === index && children}
    </div>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
          <LinearProgress sx={{ width: '100%', mb: 2 }} />
          <Typography>Loading your dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Landlord Dashboard
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Welcome back, {user?.name}! Here's your parking business overview.
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={`₹${stats.totalRevenue.toLocaleString()}`}
              icon={<AttachMoney />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Bookings"
              value={stats.totalBookings}
              icon={<BookingIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Lots"
              value={stats.activeLots}
              icon={<ParkingIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Occupancy Rate"
              value={`${stats.occupancyRate}%`}
              icon={<TrendingUp />}
              color="warning"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<DashboardIcon />} label="Overview" />
          <Tab icon={<ParkingIcon />} label="Parking Lots" />
          <Tab icon={<BookingIcon />} label="Bookings" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Your parking lots performance overview for the last 30 days.
                </Typography>
                {/* Add charts/graphs here */}
                <Box mt={3} p={3} bgcolor="grey.50" borderRadius={2}>
                  <Typography align="center" color="textSecondary">
                    📊 Analytics charts will be displayed here
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddLot}
                    fullWidth
                  >
                    Add New Parking Lot
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AnalyticsIcon />}
                    fullWidth
                  >
                    View Full Analytics
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    fullWidth
                  >
                    Account Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Your Parking Lots</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddLot}
          >
            Add New Lot
          </Button>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align="center">Capacity</TableCell>
                <TableCell align="center">Occupied</TableCell>
                <TableCell align="center">Revenue</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parkingLots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>{lot.name}</TableCell>
                  <TableCell>{lot.address}</TableCell>
                  <TableCell align="center">{lot.capacity}</TableCell>
                  <TableCell align="center">{lot.occupied}</TableCell>
                  <TableCell align="center">₹{lot.revenue.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={lot.status}
                      color={lot.status === 'active' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleEditLot(lot)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteLot(lot.id)} 
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Typography variant="h5" gutterBottom>Recent Bookings</Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Parking Lot</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell align="center">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.id}</TableCell>
                  <TableCell>{booking.customerName}</TableCell>
                  <TableCell>{booking.lotName}</TableCell>
                  <TableCell>{booking.checkIn}</TableCell>
                  <TableCell>{booking.checkOut}</TableCell>
                  <TableCell align="center">₹{booking.amount}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={booking.status}
                      color={booking.status === 'completed' ? 'success' : 'info'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Typography variant="h5" gutterBottom>Analytics & Reports</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue Analytics
                </Typography>
                <Box mt={3} p={4} bgcolor="grey.50" borderRadius={2} textAlign="center">
                  <Typography color="textSecondary">
                    📈 Detailed analytics charts and reports will be displayed here
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Including revenue trends, occupancy rates, peak hours, and more
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={handleAddLot}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Lot Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedLot ? 'Edit Parking Lot' : 'Add New Parking Lot'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Parking Lot Name"
                  defaultValue={selectedLot?.name}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  defaultValue={selectedLot?.address}
                  multiline
                  rows={3}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Total Capacity"
                  type="number"
                  defaultValue={selectedLot?.capacity}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Hourly Rate (₹)"
                  type="number"
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained">
            {selectedLot ? 'Update' : 'Add'} Parking Lot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LandlordDashboard;
