import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BookingSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingId, bookingData, parkingLot, paymentMethod } = location.state || {};

  useEffect(() => {
    if (!bookingId || !bookingData) {
      navigate('/');
    }
  }, [bookingId, bookingData, navigate]);

  if (!bookingId || !bookingData) {
    return null;
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startTime = formatDateTime(bookingData.startDateTime);
  const endTime = formatDateTime(bookingData.endDateTime);
  const duration = Math.ceil((new Date(bookingData.endDateTime) - new Date(bookingData.startDateTime)) / (1000 * 60 * 60));

  const handleDownloadTicket = () => {
    // Generate QR code data
    const qrData = {
      bookingId,
      parkingLot: parkingLot.name,
      startTime: bookingData.startDateTime,
      endTime: bookingData.endDateTime,
      slotType: bookingData.slotType
    };
    
    console.log('Download ticket:', qrData);
    alert('Ticket download functionality would be implemented here with QR code generation.');
  };

  const handleViewBookings = () => {
    navigate('/my-bookings');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Your parking spot has been successfully reserved
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Booking Confirmation</h2>
                <p className="text-green-100">Booking ID: {bookingId}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">₹{bookingData.totalAmount}</div>
                <div className="text-green-100 text-sm">Paid via {paymentMethod}</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Parking Lot Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Parking Location</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{parkingLot.name}</h4>
                <p className="text-gray-600">{parkingLot.address}</p>
                <div className="flex items-center mt-2">
                  <div className="flex items-center text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(parkingLot.rating) ? 'fill-current' : 'text-gray-300'}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L0 6.91l6.564-.954L10 0l3.436 5.956L20 6.91l-5.245 4.635L15.878 18z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">{parkingLot.rating} rating</span>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slot Type:</span>
                    <span className="font-medium capitalize">{bookingData.slotType} Parking</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{duration} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Schedule</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Check-in</div>
                    <div className="font-medium">{startTime.date}</div>
                    <div className="text-sm text-gray-700">at {startTime.time}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Check-out</div>
                    <div className="font-medium">{endTime.date}</div>
                    <div className="text-sm text-gray-700">at {endTime.time}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services */}
            {bookingData.services && bookingData.services.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Services</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {bookingData.services.map((serviceId, index) => (
                      <div key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-blue-900">Service {serviceId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Placeholder */}
            <div className="mb-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Entry QR Code</h3>
              <div className="inline-block bg-white border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v4h1m1 0h.01" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">Show this QR code at the parking entrance</p>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Information</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Please arrive within 15 minutes of your scheduled time</li>
                <li>• Keep your booking confirmation and QR code ready</li>
                <li>• Contact parking staff if you need assistance</li>
                <li>• Cancellation is allowed up to 2 hours before check-in</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDownloadTicket}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Ticket
          </button>

          <button
            onClick={handleViewBookings}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            View All Bookings
          </button>

          <button
            onClick={() => navigate('/')}
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </button>
        </div>

        {/* Contact Support */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Need help? Contact us at{' '}
            <a href="tel:+91-9876543210" className="text-blue-600 hover:text-blue-700 font-medium">
              +91-9876543210
            </a>
            {' '}or{' '}
            <a href="mailto:support@parkplaza.com" className="text-blue-600 hover:text-blue-700 font-medium">
              support@parkplaza.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
