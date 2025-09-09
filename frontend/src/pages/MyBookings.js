import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useBookings } from '../hooks/useAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import bookingService from '../services/bookingService';

const MyBookings = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState('all');
  
  const { bookings, loading, error, refetch } = useBookings(isAuthenticated);
  const bookingsWithDemo = bookings;

  useEffect(() => {
    if (!isAuthenticated) {
      // Show login prompt and redirect to auth page
      const shouldLogin = window.confirm(
        'You need to be logged in to view your bookings. Would you like to login now?'
      );
      
      if (shouldLogin) {
        navigate('/auth', { state: { from: location } });
      } else {
        navigate('/');
      }
  // no further action needed after redirect
    }
    
  }, [isAuthenticated, navigate]);

  const handleExtendBooking = () => alert('Extension API not implemented yet');

  const [cancellingId, setCancellingId] = useState(null);

  const handleCancelBooking = async (booking) => {
    const ok = window.confirm('Are you sure you want to cancel this booking and refund the payment if eligible?');
    if (!ok) return;

    // If this is a demo booking stored locally, remove it directly
    if (booking.id === 'demo123' || booking.id === 'demo-payment') {
      try {
        if (booking.id === 'demo-payment') {
          localStorage.removeItem('demoPaymentBooking');
        }
        alert('Demo booking removed locally.');
      } catch (e) {
        console.warn('Failed to remove demo booking from localStorage', e);
      }
      // Refresh view
      refetch?.();
      return;
    }

    try {
      setCancellingId(booking.id);
      // call booking service which wraps API and handles auth headers
      await bookingService.cancelPayment(booking.id, 'Cancelled by user via UI');
      alert('Cancellation successful. Refreshing bookings...');
      refetch?.();
    } catch (err) {
      console.error('Cancel booking error:', err);
      alert(err?.message || 'Failed to cancel booking. Please try again.');
      refetch?.();
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadTicket = (booking) => {
    // Demo bookings: fallback to JSON download
    if (booking.id === 'demo123' || booking.id === 'demo-payment') {
      const ticket = {
        bookingId: booking.id,
        parkingLot: booking.lotName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        slotType: booking.slotType,
        slotNumber: booking.slotNumber,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        paymentId: booking.paymentId || booking.transactionId || booking.payment?.paymentId || booking.payment?.transactionId || null
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ticket, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `ticket_${ticket.bookingId || 'unknown'}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      return;
    }

    // For real bookings, download PDF from server
    (async () => {
      try {
        const res = await bookingService.getTicket(booking.id);
        const contentType = res.headers['content-type'];
        if (contentType && contentType.includes('application/pdf')) {
          const blob = new Blob([res.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket_${booking.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else {
          // If server returned JSON (e.g., missing PDF deps or error), render a printable HTML ticket
          const payload = res.data;
          const ticketObj = (typeof payload === 'string') ? (() => {
            try { return JSON.parse(payload); } catch(e) { return { message: payload }; }
          })() : payload;

          // Build simple printable HTML
          const html = `
            <html>
              <head>
                <title>Ticket - ${booking.id}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 40px; }
                  .ticket { max-width: 700px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
                  h1 { text-align: center; }
                  .row { display:flex; justify-content:space-between; margin:8px 0; }
                  .label { color: #555; }
                </style>
              </head>
              <body>
                <div class="ticket">
                  <h1>ParkPlaza - Booking Ticket</h1>
                  <div class="row"><div class="label">Booking ID</div><div>${booking.id}</div></div>
                  <div class="row"><div class="label">Parking Lot</div><div>${booking.lotName || ''}</div></div>
                  <div class="row"><div class="label">Slot</div><div>${booking.slotNumber || booking.slotType || '—'}</div></div>
                  <div class="row"><div class="label">Start</div><div>${booking.startTime || ''}</div></div>
                  <div class="row"><div class="label">End</div><div>${booking.endTime || ''}</div></div>
                  <div class="row"><div class="label">Amount</div><div>₹${booking.totalAmount || ''}</div></div>
                  <hr />
                  <pre style="white-space:pre-wrap;margin-top:12px">${JSON.stringify(ticketObj, null, 2)}</pre>
                </div>
                <script>
                  window.onload = function() { setTimeout(() => { window.print(); }, 250); };
                </script>
              </body>
            </html>
          `;

          const w = window.open('', '_blank');
          if (!w) {
            // Fallback: download JSON file
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ticketObj, null, 2));
            const dl = document.createElement('a');
            dl.href = dataStr;
            dl.download = `ticket_${booking.id}.json`;
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
          } else {
            w.document.write(html);
            w.document.close();
          }
        }
        // refresh bookings to pick up any updated payment/refund ids persisted by server
        refetch?.();
      } catch (err) {
        console.error('Failed to download ticket PDF', err);
        alert('Unable to download ticket. Please try again.');
      }
    })();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-orange-600';
      case 'failed':
        return 'text-red-600';
      case 'refunded':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Use bookingsWithDemo for filtering and display
  const filteredBookings = filter === 'all'
    ? bookingsWithDemo
    : bookingsWithDemo.filter(b => b.status === filter);

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to view your bookings.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {location.state?.highlightBookingId && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            Booking created successfully. You can download your ticket below.
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your parking bookings and view history</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Bookings' },
              { key: 'active', label: 'Active' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.key !== 'all' && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs">
                    {bookings.filter(b => b.status === tab.key).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-red-600 hover:text-red-500 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🅿️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? "You haven't made any parking bookings yet."
                : `You don't have any ${filter} bookings at the moment.`
              }
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Find Parking
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {booking.lotName}
                        </h3>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                          <span className={`text-sm font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                            Payment: {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="text-sm text-gray-900">{booking.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Slot</p>
                          <p className="text-sm text-gray-900">
                            {booking.slotType.toUpperCase()} - {booking.slotNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Start Time</p>
                          <p className="text-sm text-gray-900">{formatDateTime(booking.startTime)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">End Time</p>
                          <p className="text-sm text-gray-900">{formatDateTime(booking.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">QR Code</p>
                          <p className="text-sm font-mono text-gray-900">{booking.qrCode}</p>
                          {booking.paymentId && (
                            <p className="text-xs text-gray-500 mt-1">Payment ID: {booking.paymentId}</p>
                          )}
                          {booking.transactionId && (
                            <p className="text-xs text-gray-500">Txn: {booking.transactionId}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                          <p className="text-sm font-semibold text-gray-900">₹{booking.totalAmount}</p>
                        </div>
                      </div>

                      {booking.services && booking.services.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-2">Services</p>
                          <div className="flex flex-wrap gap-2">
                            {booking.services.map((serviceId) => (
                              <span key={serviceId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {serviceId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-4">
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking)}
                          disabled={cancellingId === booking.id}
                          className={`text-sm font-medium ${cancellingId === booking.id ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-500'}`}
                        >
                          {cancellingId === booking.id ? 'Cancelling…' : 'Cancel Booking'}
                        </button>
                      )}
                      
                      {booking.status === 'active' && (
                        <button
                          onClick={handleExtendBooking}
                          className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                        >
                          Extend (2 hours)
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadTicket(booking)}
                        className="text-sm text-green-700 hover:text-green-600 font-medium"
                      >
                        Download Ticket
                      </button>
                      
                      <Link
                        to={`/parking/${booking.lotId}`}
                        className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        View Parking Lot
                      </Link>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Booked on {formatDateTime(booking.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

}

export default MyBookings;
