# ParkPlaza - Smart Parking Management System

A comprehensive MERN stack application for smart parking management with real-time features, location-based services, and integrated payment solutions.

## 🚀 Features

### For Users
- **Smart Parking Search** - Find parking spots by location with real-time availability
- **Interactive Map** - Leaflet (OpenStreetMap) with live navigation
- **Online Booking** - Reserve parking spots in advance
- **Real-time Updates** - Live availability and occupancy tracking
- **Service Add-ons** - Car wash, valet, EV charging, and more
- **Payment Integration** - Razorpay/Stripe for secure payments
- **QR Code Entry** - Digital entry/exit with QR codes
- **Booking History** - Track all your parking sessions

### For Landowners
- **List Properties** - Post your land as parking lots
- **Real-time Dashboard** - Monitor occupancy and revenue
- **Analytics** - Detailed insights and reporting
- **Pricing Management** - Dynamic pricing controls
- **Service Management** - Offer additional services

### For Admins
- **System Management** - Complete platform oversight
- **User Management** - Manage users and landowners
- **Analytics** - Platform-wide insights
- **Service Approval** - Verify and approve listings

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Socket.io** for real-time updates
- **JWT** for authentication
- **Cloudinary** for image storage
- **Stripe/Razorpay** for payments

### Frontend
- **React.js** with hooks
- **Redux Toolkit** for state management
- **Material-UI & Tailwind CSS** for styling
- **React Router** for navigation
- **Leaflet (OpenStreetMap)** for mapping
- **Socket.io Client** for real-time features

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Git

### Backend Setup

**For PowerShell (Windows):**
```powershell
cd backend
npm install
Copy-Item .env .env.local
# Configure your environment variables in .env
npm run dev
```

**For Bash (Linux/Mac):**
```bash
cd backend && npm install && cp .env .env.local && npm run dev
```

### Frontend Setup

**For PowerShell (Windows):**
```powershell
cd frontend
npm install
Copy-Item .env .env.local
# Configure your environment variables in .env.local
npm start
```

**For Bash (Linux/Mac):**
```bash
cd frontend && npm install && cp .env .env.local && npm start
```

## 🚀 Usage

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend Application**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Parking
- `GET /api/parking/all` - List all parking lots
- `GET /api/parking/:id` - Get parking lot details
- `POST /api/parking/create` - Create parking lot (landowner)
- `PUT /api/parking/:id/availability` - Update availability

### Booking
- `POST /api/booking/new` - Create new booking
- `GET /api/booking/my-bookings` - Get user bookings
- `PUT /api/booking/:id/status` - Update booking status
- `DELETE /api/booking/:id` - Cancel booking

### Services
- `GET /api/services/options` - Get available services
- `GET /api/services/category/:category` - Get services by category

**Made with ❤️ for urban mobility**

## 🛳 Deployment & Environment Notes

- Frontend reads `REACT_APP_API_URL` from the frontend `.env` at build/runtime. Make sure the value includes the `/api` prefix if your code expects it (example: `REACT_APP_API_URL=https://yourdomain.com/api`). The app's axios client uses this value as the baseURL.
- Backend optional PDF ticket generation requires additional packages. If you want server-generated PDF tickets, install the following in the `backend` folder before deploying:
      - `pdfkit`
      - `qrcode`

         Install example (PowerShell):

      ```powershell
      cd backend
      npm install pdfkit qrcode
      npm install
      npm run dev
      ```

- After changing environment variables, rebuild the frontend (if using a static host) and restart backend services so they pick up the new `.env` values.

If you'd like, I can add the backend PDF dependencies and push that change to your feature branch so deployment will include server-side tickets.
