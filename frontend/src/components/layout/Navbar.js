import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { logout } from '../../store/slices/authSlice';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
  };

  return (
    <AppBar position="sticky" className="bg-white shadow-sm" elevation={1}>
      <Toolbar className="container mx-auto">
        <Typography variant="h6" component={Link} to="/" className="flex-grow text-primary-600 no-underline font-bold">
          ParkPlaza
        </Typography>

        <div className="flex items-center gap-4">
          <Button component={Link} to="/" color="inherit" className="text-gray-700">
            Home
          </Button>
          <Button component={Link} to="/services" color="inherit" className="text-gray-700">
            Services
          </Button>

          {isAuthenticated ? (
            <>
              <Button component={Link} to="/my-bookings" color="inherit" className="text-gray-700">
                My Bookings
              </Button>
              
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleClose} component={Link} to="/profile">
                  <AccountCircleOutlinedIcon className="mr-2" />
                  Profile
                </MenuItem>
                
                {(user?.role === 'landowner' || user?.role === 'admin') && (
                  <MenuItem onClick={handleClose} component={Link} to="/dashboard">
                    <DashboardOutlinedIcon className="mr-2" />
                    Dashboard
                  </MenuItem>
                )}
                
                <MenuItem onClick={handleLogout}>
                  <LogoutOutlinedIcon className="mr-2" />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button component={Link} to="/auth" variant="contained" color="primary">
              Sign In
            </Button>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
