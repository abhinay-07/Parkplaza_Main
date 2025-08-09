const nodemailer = require('nodemailer');

// Create transporter (fixed createTransporter -> createTransport)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"ParkPlaza" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Welcome email template
const sendWelcomeEmail = async (userEmail, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Welcome to ParkPlaza!</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for joining ParkPlaza! Your account has been created successfully.</p>
      <p>You can now:</p>
      <ul>
        <li>Search and book parking spots</li>
        <li>List your own parking spaces</li>
        <li>Manage your bookings</li>
        <li>Enjoy real-time availability updates</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Happy parking!</p>
      <p><strong>The ParkPlaza Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Welcome to ParkPlaza!',
    html,
    text: `Welcome to ParkPlaza, ${userName}! Your account has been created successfully.`
  });
};

// Booking confirmation email (fixed field references)
const sendBookingConfirmation = async (userEmail, booking) => {
  try {
    const lotName = booking?.parkingLot?.name || 'Parking Lot';
    const addressObj = booking?.parkingLot?.location?.address || {};
    const start = booking?.bookingDetails?.startTime ? new Date(booking.bookingDetails.startTime) : null;
    const end = booking?.bookingDetails?.endTime ? new Date(booking.bookingDetails.endTime) : null;
    const durationHours = booking?.bookingDetails?.duration?.hours ?? '-';
    const totalAmount = booking?.pricing?.totalAmount ?? '-';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Booking Confirmation</h2>
        <p>Your parking booking has been confirmed!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details:</h3>
          <p><strong>Booking ID:</strong> ${booking?._id}</p>
          <p><strong>Parking Lot:</strong> ${lotName}</p>
          <p><strong>Address:</strong> ${[addressObj.street, addressObj.city, addressObj.state].filter(Boolean).join(', ')}</p>
          <p><strong>Date:</strong> ${start ? start.toLocaleDateString() : '-'}</p>
          <p><strong>Time:</strong> ${start ? start.toLocaleTimeString() : '-'} - ${end ? end.toLocaleTimeString() : '-'}</p>
          <p><strong>Duration:</strong> ${durationHours} hours</p>
          <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
          <p><strong>Status:</strong> ${booking?.status}</p>
        </div>
        <p>Please arrive on time and present this confirmation email if needed.</p>
        <p><strong>The ParkPlaza Team</strong></p>
      </div>
    `;

    return sendEmail({
      to: userEmail,
      subject: `Booking Confirmation - ${lotName}`,
      html,
      text: `Your booking at ${lotName} has been confirmed. Booking ID: ${booking?._id}`
    });
  } catch (err) {
    console.error('Error building booking confirmation email:', err);
    // Fail silently for email generation errors
  }
};

// Password reset email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Password Reset Request</h2>
      <p>You requested a password reset for your ParkPlaza account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p><strong>The ParkPlaza Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Password Reset - ParkPlaza',
    html,
    text: `Click this link to reset your password: ${resetUrl}`
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmation,
  sendPasswordResetEmail
};