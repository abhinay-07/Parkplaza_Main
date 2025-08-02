import React from 'react';
import { Link } from 'react-router-dom';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">ParkPlaza</h3>
            <p className="text-gray-400 mb-4">
              Revolutionizing urban mobility with our Smart Parking Management System.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <FacebookIcon />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <TwitterIcon />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <LinkedInIcon />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <InstagramIcon />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-white">Services</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
            </ul>
          </div>

          {/* For Users */}
          <div>
            <h4 className="text-lg font-semibold mb-4">For Users</h4>
            <ul className="space-y-2">
              <li><Link to="/my-bookings" className="text-gray-400 hover:text-white">My Bookings</Link></li>
              <li><Link to="/profile" className="text-gray-400 hover:text-white">Profile</Link></li>
              <li><Link to="/help" className="text-gray-400 hover:text-white">Help & Support</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* For Landowners */}
          <div>
            <h4 className="text-lg font-semibold mb-4">For Landowners</h4>
            <ul className="space-y-2">
              <li><Link to="/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link></li>
              <li><Link to="/list-property" className="text-gray-400 hover:text-white">List Your Property</Link></li>
              <li><Link to="/analytics" className="text-gray-400 hover:text-white">Analytics</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 ParkPlaza. All rights reserved. Built with ❤️ for urban mobility.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
