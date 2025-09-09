# ParkPlaza - Smart Parking Management System

A comprehensive MERN stack parking management system with real-time features, payment integration, and geospatial search.

## 🚀 Features

- **Real-time Parking Availability**: Live updates using Socket.io
- **Geospatial Search**: Find parking lots by location with MongoDB geospatial queries
- **Multi-payment Gateway**: Stripe and Razorpay integration
- **Image Management**: Cloudinary integration for parking lot images
- **Email Notifications**: Welcome emails, booking confirmations, password reset
- **Role-based Access**: User, Landowner, and Admin roles
- **Responsive Design**: Material-UI with mobile-first approach
- **Real-time Analytics**: Dashboard with booking statistics
- **Google Maps Integration**: Interactive maps for location services

## 🛠️ Tech Stack

### Backend
- **Node.js** & **Express.js** - Server framework
- **MongoDB** & **Mongoose** - Database with geospatial indexing
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Cloudinary** - Image storage and optimization
- **Nodemailer** - Email services
- **Stripe & Razorpay** - Payment processing

### Frontend
- **React.js** - UI framework
- **Redux Toolkit** - State management
- **Material-UI** - Component library
- **Socket.io Client** - Real-time updates
- **Google Maps API** - Location services

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v5 or higher)
- **Git**

### API Keys Required
- Cloudinary (for image uploads)
- Stripe (for payments)
- Razorpay (for payments)
- Google Maps API (for location services)
- Email provider (Gmail recommended)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/abhinay-07/Parkplaza_Main.git
cd Parkplaza_Main
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup  
```bash
cd ../frontend
npm install
```

### 4. Environment Configuration

#### Backend (.env)
Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/parkplaza

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

#### Frontend (.env)
Copy `frontend/.env.example` to `frontend/.env` and configure:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
REACT_APP_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

### 5. Start MongoDB
Ensure MongoDB is running on your system:

**Windows:**
```bash
net start MongoDB
```

**macOS/Linux:**
```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 6. Run the Application

#### Development Mode
Use the provided scripts for cross-platform compatibility:

**Windows:**
```bash
# From project root
.\start-dev.bat
```

**macOS/Linux:**
```bash
# From project root
chmod +x start-dev.sh
./start-dev.sh
```

#### Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 7. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs (if implemented)

## 🚀 Deployment

### Production Environment Setup

#### Backend Production
1. Set up MongoDB Atlas or production MongoDB
2. Configure production environment variables in `.env.production`
3. Use production API keys (Stripe Live, Razorpay Live)
4. Deploy to platforms like:
   - **Rendar**: Connect GitHub repository

#### Frontend Production
1. Update API URLs in `.env.production`
2. Build the application: `npm run build`
3. Deploy to platforms like:
   - **Vercel**: `vercel --prod`


### Environment Variables for Production

#### Backend Production Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/parkplaza
JWT_SECRET=your-strong-production-jwt-secret
FRONTEND_URL=https://your-frontend-domain.com
# Add all other production API keys
```

#### Frontend Production Variables
```env
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_SOCKET_URL=https://your-api-domain.com
# Add all other production keys
```

## 🗂️ Project Structure

```
Parkplaza_Main/
├── backend/
│   ├── config/
│   │   └── cloudinary.js          # Cloudinary configuration
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT authentication
│   ├── models/
│   │   ├── User.js                 # User model
│   │   ├── ParkingLot.js          # Parking lot model
│   │   ├── Booking.js             # Booking model
│   │   └── Service.js             # Additional services model
│   ├── routes/
│   │   ├── auth.js                # Authentication routes
│   │   ├── parking.js             # Parking lot CRUD
│   │   ├── booking.js             # Booking management
│   │   └── services.js            # Additional services
│   ├── services/
│   │   ├── emailService.js        # Email notifications
│   │   ├── stripeService.js       # Stripe payments
│   │   └── razorpayService.js     # Razorpay payments
│   ├── .env                       # Environment variables
│   ├── .env.example               # Environment template
│   ├── .env.production            # Production environment
│   ├── package.json               # Backend dependencies
│   └── server.js                  # Express server
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # Authentication components
│   │   │   ├── layout/            # Layout components
│   │   │   ├── parking/           # Parking-related components
│   │   │   └── ui/                # Reusable UI components
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API services
│   │   ├── store/                 # Redux store and slices
│   │   ├── App.js                 # Main App component
│   │   └── index.js               # Entry point
│   ├── .env                       # Frontend environment variables
│   ├── .env.example               # Frontend environment template
│   ├── .env.production            # Production frontend env
│   ├── package.json               # Frontend dependencies
│   └── tailwind.config.js         # Tailwind configuration
├── start-dev.bat                  # Windows development script
├── start-dev.sh                   # Unix development script
└── README.md                      # This file
```

## 🔐 Authentication & Authorization

The system implements JWT-based authentication with three user roles:

- **User**: Can search and book parking spots
- **Landowner**: Can list and manage parking lots  
- **Admin**: Full system access and user management

## 💳 Payment Integration

### Stripe Integration
- Credit/Debit card payments
- International payment support
- Webhook handling for payment confirmations
- Refund management

### Razorpay Integration  
- UPI, cards, net banking, wallets
- India-focused payment gateway
- Real-time payment verification
- Instant refunds

## 📧 Email Services

Automated email notifications for:
- Welcome emails on registration
- Booking confirmations
- Payment receipts  
- Password reset links
- Booking reminders

## 🗺️ Geospatial Features

- **Location-based search**: Find parking within radius
- **Distance calculation**: Sort by proximity
- **Real-time availability**: Live spot updates
- **Interactive maps**: Google Maps integration

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password/:token` - Reset password

### Parking Lots
- `GET /api/parking/all` - Get all parking lots (with filters)
- `POST /api/parking/new` - Create parking lot (Landowners)
- `PUT /api/parking/:id` - Update parking lot
- `DELETE /api/parking/:id` - Delete parking lot

### Bookings
- `POST /api/booking/new` - Create booking
- `GET /api/booking/my-bookings` - User's bookings
- `PUT /api/booking/:id/cancel` - Cancel booking
- `POST /api/booking/create-payment-intent` - Stripe payment
- `POST /api/booking/create-razorpay-order` - Razorpay payment

## 🚨 Error Handling

The application includes comprehensive error handling:
- Input validation using express-validator
- Global error middleware
- Graceful error responses
- Logging for debugging

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate limiting**: API request throttling  
- **Input validation**: Sanitization and validation
- **JWT tokens**: Secure authentication
- **Password hashing**: bcrypt encryption

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in .env

2. **CORS Issues**
   - Verify frontend URL in backend CORS config
   - Check API URLs in frontend .env

3. **Payment Integration Issues**
   - Verify API keys are correct
   - Check webhook endpoints for live payments

4. **Image Upload Issues**  
   - Verify Cloudinary credentials
   - Check file size limits

### Getting Help

- Create an issue on GitHub
- Check existing issues for solutions
- Review the documentation

## 🎯 Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with parking sensors
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Advanced booking features (recurring bookings)
- [ ] Integration with navigation apps

---

Built with ❤️ using the MERN stack
