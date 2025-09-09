import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import bookingService from '../services/bookingService';
import { useParkingLotDetails } from '../hooks/useAPI';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingData, parkingLot: incomingParkingLot } = location.state || {};
  // Create a fallback parkingLot if caller only passed bookingData
  const parkingLot = incomingParkingLot || {
    id: bookingData?.lotId || 'local-lot',
    name: bookingData?.lotName || 'Selected Parking Lot',
    address: bookingData?.address || ''
  };

  // If incomingParkingLot is incomplete (from previous pages) try to fetch full details
  const shouldFetchDetails = !incomingParkingLot || (!incomingParkingLot.vehicleTypes && !incomingParkingLot.slots);
  const { parkingLot: fetchedLot, loading: fetchedLotLoading } = useParkingLotDetails(shouldFetchDetails ? parkingLot.id : null);
  // Prefer fetched lot when available
  const fullParkingLot = fetchedLot || incomingParkingLot || parkingLot;

  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [finalBookingData, setFinalBookingData] = useState(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    holderName: '',
    upiId: '',
    walletProvider: 'paytm'
  });

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Invalid Payment Request</h2>
            <p className="text-red-600 mb-4">No booking data found. Please start over.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auto-open payment selection if bookingData is present
  React.useEffect(() => {
    if (bookingData && !showConfirmation) {
      // keep the user on payment selection; no-op here but ensures hooks sync
    }
  }, [bookingData, showConfirmation]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayment = async () => {
    setPaymentLoading(true);

    try {
      // Validate form data based on payment method
      if (paymentMethod === 'credit-card') {
        if (!formData.holderName || !formData.cardNumber || !formData.expiryDate || !formData.cvv) {
          alert('Please fill in all card details');
          setPaymentLoading(false);
          return;
        }
      } else if (paymentMethod === 'upi') {
        if (!formData.upiId) {
          alert('Please enter your UPI ID');
          setPaymentLoading(false);
          return;
        }
      }

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare the booking data to confirm before creating backend booking
      const stubBookingData = {
        lotId: parkingLot.id,
        lotName: parkingLot.name,
        address: parkingLot.address,
        startTime: bookingData.startDateTime,
        endTime: bookingData.endDateTime,
        slotType: bookingData.slotType,
        services: bookingData.services || [],
        totalAmount: bookingData.totalAmount,
        paymentMethod: paymentMethod,
        paymentDetails: paymentMethod === 'credit-card' ? {
          cardLast4: formData.cardNumber.slice(-4),
          cardType: 'Credit Card'
        } : paymentMethod === 'upi' ? {
          upiId: formData.upiId
        } : {
          wallet: formData.walletProvider
        }
      };

      // Simulate payment processed. Next, show confirmation step before creating booking.
      console.log('Payment processed. Showing confirmation before booking creation.');
      setFinalBookingData(stubBookingData);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!finalBookingData) return;
    setConfirmError('');
    // Accept any provided license plate; if missing, auto-generate a placeholder
    let finalLicense = (licensePlate || '').trim().toUpperCase();
    if (!finalLicense) {
      finalLicense = `GEN-${Date.now().toString().slice(-6)}`;
    }
    setConfirming(true);
    try {
      // Re-validate booking times to avoid sending a startTime in the past
      const now = new Date();
      const minStart = new Date(now.getTime() + 60 * 1000); // at least 1 minute in future
      let start = new Date(finalBookingData.startTime);
      let end = new Date(finalBookingData.endTime);
      if (start < minStart) {
        // bump start forward and keep duration same
        const durationMs = end.getTime() - start.getTime();
        start = minStart;
        end = new Date(start.getTime() + durationMs);
        // update payload we're about to send so backend sees valid times
        finalBookingData.startTime = start.toISOString();
        finalBookingData.endTime = end.toISOString();
        console.log('Adjusted booking times to avoid past start time:', finalBookingData.startTime, finalBookingData.endTime);
      }

      // Map UI data to backend payload
      // Ensure vehicle type is supported by the parking lot; fall back if necessary
  const supportedTypes = fullParkingLot?.vehicleTypes || [];
  let selectedVehicleType = bookingData.slotType || '';
  if (selectedVehicleType && supportedTypes.length > 0 && !supportedTypes.includes(selectedVehicleType)) {
        // fallback to first supported type
        const fallbackType = supportedTypes[0];
        alert(`Selected vehicle type "${selectedVehicleType}" is not supported at ${parkingLot.name}. Using "${fallbackType}" instead.`);
        selectedVehicleType = fallbackType;
      }
  if (!selectedVehicleType) selectedVehicleType = supportedTypes[0] || 'car';

      const payload = {
        parkingLot: finalBookingData.lotId,
          vehicle: {
          type: selectedVehicleType,
          licensePlate: finalLicense
        },
        bookingDetails: {
          startTime: finalBookingData.startTime,
          endTime: finalBookingData.endTime,
          spotNumber: bookingData.slotCode || undefined
        },
        services: finalBookingData.services || [],
        payment: {
          method: (finalBookingData.paymentMethod === 'credit-card') ? 'card' : finalBookingData.paymentMethod,
          simulate: true,
          // include dev-simulated payment identifiers so backend can persist them
          paymentId: `devpay_${Date.now()}`,
          transactionId: `devtxn_${Math.floor(Math.random()*1000000)}`
        }
      };

      try {
        console.log('Creating booking with payload:', payload);
        const created = await bookingService.create(payload);
        const createdId = created?.booking?._id || created?._id || created?.id;
        // Redirect to My Bookings page; UI there will fetch and show the new booking
        navigate('/my-bookings', { state: { highlightBookingId: createdId } });
        return;
      } catch (err) {
  console.error('Booking confirmation failed:', err);
  // Prefer server error message when available for decision-making
  const msg = err?.response?.data?.message || err?.message || '';
        // If requested slot is not available, retry without spotNumber so backend can pick any available
        if (msg.includes('Requested slot not found') || msg.includes('not available')) {
          try {
            const payloadNoSpot = { ...payload, bookingDetails: { ...payload.bookingDetails } };
            delete payloadNoSpot.bookingDetails.spotNumber;
            const created2 = await bookingService.create(payloadNoSpot);
            const createdId2 = created2?.booking?._id || created2?._id || created2?.id;
            navigate('/my-bookings', { state: { highlightBookingId: createdId2 } });
            return;
            } catch (err2) {
            console.error('Retry without spot failed:', err2);
          }
        }

        // If backend says vehicle type not supported, retry with a supported type
  if (msg.includes('Vehicle type') && fullParkingLot?.vehicleTypes?.length > 0) {
          try {
            const fallback = parkingLot.vehicleTypes[0];
            console.log(`Retrying booking with fallback vehicle type: ${fallback}`);
            const payloadFallback = { ...payload, vehicle: { ...payload.vehicle, type: fallback } };
            const createdF = await bookingService.create(payloadFallback);
            const createdIdF = createdF?.booking?._id || createdF?._id || createdF?.id;
            navigate('/my-bookings', { state: { highlightBookingId: createdIdF } });
            return;
          } catch (err3) {
            console.error('Retry with fallback vehicle type failed:', err3);
          }
        }

        // Surface error to user
        alert('Failed to create booking. Please try again later.');
      }
    } finally {
      setConfirming(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const startTime = formatDateTime(bookingData.startDateTime);
  const endTime = formatDateTime(bookingData.endDateTime);
  const duration = Math.ceil((new Date(bookingData.endDateTime) - new Date(bookingData.startDateTime)) / (1000 * 60 * 60));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
          <p className="text-lg text-gray-600">Secure your parking spot</p>
        </div>

        {/* Confirmation step after payment */}
        {showConfirmation ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Booking Details</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Parking Lot</div>
                      <div className="font-medium">{parkingLot.name}</div>
                      <div className="text-sm text-gray-600">{parkingLot.address}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Slot Type</div>
                      <div className="font-medium capitalize">{bookingData.slotType}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Check-in</div>
                      <div className="font-medium">{startTime.date} at {startTime.time}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Check-out</div>
                      <div className="font-medium">{endTime.date} at {endTime.time}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle License Plate</label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder="e.g. KA01AB1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {confirmError && (
                      <p className="text-sm text-red-600 mt-2">{confirmError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Back to Payment
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={confirming}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                >
                  {confirming ? 'Confirming…' : 'Confirm & Create Booking'}
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{duration} hours</span>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-lg font-semibold text-gray-900">
                    <span>Total Amount:</span>
                    <span>₹{bookingData.totalAmount}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Your payment is processed. Confirm to create the booking and view it in My Bookings.</p>
              </div>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Methods */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { id: 'credit-card', label: 'Credit/Debit Card', icon: '💳' },
                  { id: 'upi', label: 'UPI', icon: '📱' },
                  { id: 'wallet', label: 'Digital Wallet', icon: '💰' }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`border-2 rounded-lg p-4 text-center transition-colors ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-2">{method.icon}</div>
                    <div className="text-sm font-medium">{method.label}</div>
                  </button>
                ))}
              </div>

              {/* Credit Card Form */}
              {paymentMethod === 'credit-card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Holder Name
                    </label>
                    <input
                      type="text"
                      name="holderName"
                      value={formData.holderName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                        placeholder="MM/YY"
                        maxLength="5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        value={formData.cvv}
                        onChange={handleInputChange}
                        placeholder="123"
                        maxLength="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI Form */}
              {paymentMethod === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    name="upiId"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    placeholder="username@paytm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Wallet Form */}
              {paymentMethod === 'wallet' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Wallet
                  </label>
                  <select
                    name="walletProvider"
                    value={formData.walletProvider}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="paytm">Paytm</option>
                    <option value="phonepe">PhonePe</option>
                    <option value="gpay">Google Pay</option>
                    <option value="amazon-pay">Amazon Pay</option>
                  </select>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800">Secure Payment</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Your payment information is encrypted and secure. We do not store your card details.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              {/* Parking Lot Info */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">{parkingLot.name}</h3>
                <p className="text-sm text-gray-600">{parkingLot.address}</p>
              </div>

              {/* Booking Details */}
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Slot Type:</span>
                  <span className="font-medium capitalize">{bookingData.slotType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{duration} hours</span>
                </div>
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Check-in:</span>
                    <span className="font-medium">
                      {startTime.date} at {startTime.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out:</span>
                    <span className="font-medium">
                      {endTime.date} at {endTime.time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Services */}
              {bookingData.services && bookingData.services.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Additional Services</h4>
                  <div className="space-y-1">
                    {bookingData.services.map((serviceId, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        Service {serviceId}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="mb-6">
                <div className="flex justify-between text-lg font-semibold text-gray-900">
                  <span>Total Amount:</span>
                  <span>₹{bookingData.totalAmount}</span>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                {paymentLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Pay ₹{bookingData.totalAmount} Now
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                By proceeding, you agree to our{' '}
                <span className="text-blue-600 hover:text-blue-700 cursor-pointer">terms and conditions</span>{' '}
                and{' '}
                <span className="text-blue-600 hover:text-blue-700 cursor-pointer">privacy policy</span>
              </p>
              
              {/* Security badges */}
              <div className="flex items-center justify-center space-x-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  SSL Secured
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  PCI Compliant
                </div>
              </div>
            </div>
          </div>
  </div>
  )}
      </div>
    </div>
  );
};

export default PaymentPage;
