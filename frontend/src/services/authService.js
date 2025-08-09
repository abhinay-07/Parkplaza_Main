import { authAPI } from './api';

const authService = {
  // Register user
  register: async (userData) => {
  const { data } = await authAPI.register(userData);
  return data;
  },

  // Login user
  login: async (credentials) => {
  const { data } = await authAPI.login(credentials);
  return data;
  },

  // Get user profile
  getProfile: async () => {
  const { data } = await authAPI.me();
  return data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
  const { data } = await authAPI.updateProfile(profileData);
  return data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const { data } = await authAPI.changePassword(passwordData);
    return data;
  },

  // Logout
  logout: async () => {
    const { data } = await authAPI.logout();
    localStorage.removeItem('token');
    return data;
  },
  forgotPassword: async (email) => {
    const { data } = await authAPI.forgotPassword(email);
    return data;
  },
  resetPassword: async (token, password) => {
    const { data } = await authAPI.resetPassword(token, password);
    return data;
  }
};

export default authService;
