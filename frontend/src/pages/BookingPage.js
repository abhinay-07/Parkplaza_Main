import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useParkingLotDetails } from '../hooks/useAPI';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Simple booking page component (self-contained UI). This version focuses on the
// front-end booking form: vehicle selection, floor/slot grid, time selection,
// optional services, and a right-side payment summary which updates automatically.

const TAX_RATE = 0.18; // 18% tax

// Example parking lot services and layout — in a real app these come from API/props
const MOCK_PARKING_LOT = {
  id: 'lot_demo',
  name: 'Demo Plaza Parking',
  address: '123 Demo Street, Test City',
  floors: 3,
  rowsPerFloor: 4,
  colsPerFloor: 6,
  baseRates: { car: 50, van: 80, bike: 20 }, // per hour
  services: [
    { id: 'carwash', name: 'Car Wash', price: 150 },
    { id: 'ev', name: 'EV Charging', price: 120 },
    { id: 'vacuum', name: 'Vacuum', price: 80 }
  ]
};

const BookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // If opened with ?lotId=..., fetch lot details so we can prefill the booking form
  const urlParams = new URLSearchParams(location.search);
  const lotIdFromQuery = urlParams.get('lotId');
  const { parkingLot: queriedLot, loading: queriedLotLoading } = useParkingLotDetails(lotIdFromQuery);

  // show loader while parking lot details load
  if (queriedLotLoading) return <LoadingSpinner />;

  const [initializedFromLot, setInitializedFromLot] = React.useState(false);
  useEffect(() => {
    if (!lotIdFromQuery) return;
    if (queriedLotLoading) return;
    if (!queriedLot) return;
    if (initializedFromLot) return;

    // Prefill booking form fields from the queried lot but DO NOT auto-navigate to payment.
    const now = new Date();
    const roundToMinutes = (date, minutes = 5) => {
      const ms = 1000 * 60 * minutes;
      return new Date(Math.ceil(date.getTime() / ms) * ms);
    };
    const defaultStart = roundToMinutes(new Date(now.getTime() + 5 * 60 * 1000));
    const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

    const defaultSlotType = (queriedLot.slotTypes && queriedLot.slotTypes[0] && (queriedLot.slotTypes[0].type || queriedLot.slotTypes[0].name)) || 'car';

    // Apply prefills
    setVehicleType(defaultSlotType);
    setStartDateTime(toLocalDateTimeInput(defaultStart));
    setEndDateTime(toLocalDateTimeInput(defaultEnd));
    setSelectedServices([]);
    setInitializedFromLot(true);
  }, [lotIdFromQuery, queriedLotLoading, queriedLot, initializedFromLot]);

  // Form state
  const [vehicleType, setVehicleType] = useState('car');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null); // e.g. "F1-R2-C3"
  // Replace previous hours slider with explicit start/end datetimes
  const now = new Date();
  const defaultStart = new Date(now.getTime());
  const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const toLocalDateTimeInput = (d) => {
    // format for input[type=datetime-local]
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [startDateTime, setStartDateTime] = useState(toLocalDateTimeInput(defaultStart));
  const [endDateTime, setEndDateTime] = useState(toLocalDateTimeInput(defaultEnd));
  const [selectedServices, setSelectedServices] = useState([]);

  // Effective lot: use queried API lot when available, otherwise fallback to MOCK
  const effectiveLot = queriedLot || MOCK_PARKING_LOT;

  // Simple price calculation - prefer effectiveLot rates/services when available
  const baseRate = (effectiveLot.baseRates && effectiveLot.baseRates[vehicleType]) || effectiveLot.baseRate || MOCK_PARKING_LOT.baseRates[vehicleType] || MOCK_PARKING_LOT.baseRates.car;

  const servicesTotal = useMemo(() => {
    const list = effectiveLot.services || MOCK_PARKING_LOT.services;
    return selectedServices.reduce((sum, id) => {
      const s = list.find(x => x.id === id);
      return sum + (s ? s.price : 0);
    }, 0);
  }, [selectedServices, effectiveLot]);

  // compute duration from start/end datetimes (in hours, rounded up)
  const durationHours = useMemo(() => {
    const s = new Date(startDateTime);
    const e = new Date(endDateTime);
    const diffMs = e - s;
    if (isNaN(diffMs) || diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }, [startDateTime, endDateTime]);

  const subtotal = useMemo(() => baseRate * Math.max(1, durationHours) + servicesTotal, [baseRate, durationHours, servicesTotal]);
  const tax = useMemo(() => +(subtotal * TAX_RATE).toFixed(2), [subtotal]);
  const total = useMemo(() => +(subtotal + tax).toFixed(2), [subtotal, tax]);

  const toggleService = (id) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSelectSlot = (floor, row, col) => {
    setSelectedFloor(floor);
    setSelectedSlot(`F${floor}-R${row}-C${col}`);
  };

  const proceedToPayment = () => {
    // Build bookingData in the shape PaymentPage expects
    const bookingDraft = {
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      slotType: vehicleType,
      services: selectedServices,
      totalAmount: total,
      slotCode: selectedSlot
    };

    // Store demo booking for MyBookings demo preview
    localStorage.setItem('demoPaymentBooking', JSON.stringify({ id: 'demo-payment', ...bookingDraft, lotName: effectiveLot.name }));

    // If not authenticated, send user to auth first (they'll return to booking page)
    if (!isAuthenticated) {
      try { sessionStorage.setItem('postLoginRedirect', location.pathname + location.search); } catch {}
      navigate('/auth', { state: { from: location.pathname + location.search } });
      return;
    }

    // Navigate to PaymentPage with the exact state shape it expects
    navigate('/payment', { state: { bookingData: bookingDraft, parkingLot: effectiveLot } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Book a Parking Slot</h1>
              <p className="text-sm text-gray-600 mt-1">Reserve your spot and secure payment on the next step.</p>
            </div>
            <div className="text-right">
              <Link to={`/parking/${effectiveLot.id || effectiveLot._id || MOCK_PARKING_LOT.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm">View Parking Lot Details</Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Reservation Details</h2>

              {/* Vehicle Type */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Vehicle Type</p>
                <div className="flex gap-3">
                  {['car', 'van', 'bike'].map((vt) => (
                    <button
                      key={vt}
                      onClick={() => setVehicleType(vt)}
                      className={`px-4 py-2 rounded border ${vehicleType === vt ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>
                      {vt.charAt(0).toUpperCase() + vt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot selection */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Select Floor & Slot</p>
                <div className="flex gap-2 mb-3">
                  {Array.from({ length: MOCK_PARKING_LOT.floors }).map((_, idx) => {
                    const f = idx + 1;
                    return (
                      <button key={f} onClick={() => setSelectedFloor(f)} className={`px-3 py-1 rounded border ${selectedFloor === f ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                        Floor {f}
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-auto border rounded p-3 bg-gray-50">
                  <div className="space-y-3">
                    {Array.from({ length: MOCK_PARKING_LOT.rowsPerFloor }).map((_, rIdx) => (
                      <div key={rIdx} className="flex gap-2">
                        {Array.from({ length: MOCK_PARKING_LOT.colsPerFloor }).map((_, cIdx) => {
                          const row = rIdx + 1;
                          const col = cIdx + 1;
                          const id = `F${selectedFloor}-R${row}-C${col}`;
                          const isSelected = selectedSlot === id;
                          return (
                            <button
                              key={cIdx}
                              onClick={() => handleSelectSlot(selectedFloor, row, col)}
                              className={`w-14 h-10 text-xs rounded border flex items-center justify-center ${isSelected ? 'bg-green-600 text-white' : 'bg-white'}`}>
                              {row}-{col}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Selected Slot: <span className="font-medium text-gray-900">{selectedSlot || 'None'}</span></p>
              </div>

              {/* Time selection */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Select check-in and check-out</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Start</label>
                    <input
                      type="datetime-local"
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">End</label>
                    <input
                      type="datetime-local"
                      value={endDateTime}
                      onChange={(e) => setEndDateTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Duration: {durationHours} hour{durationHours !== 1 ? 's' : ''} · {new Date(startDateTime).toLocaleString()} → {new Date(endDateTime).toLocaleString()}</p>
                {durationHours === 0 && <p className="text-sm text-red-600 mt-2">Please pick an end time after the start time.</p>}
              </div>

              {/* Additional services */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Additional Services</p>
                <div className="flex flex-wrap gap-3">
                  {MOCK_PARKING_LOT.services.map(s => (
                    <label key={s.id} className={`flex items-center gap-2 px-3 py-2 border rounded ${selectedServices.includes(s.id) ? 'bg-indigo-50' : 'bg-white'}`}>
                      <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} />
                      <div className="text-sm">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-500">₹{s.price}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Small notice */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center">
                <div className="flex-1 text-sm text-blue-800">Estimated charges shown here are indicative. Final amount will be charged at payment confirmation.</div>
              </div>
            </div>
          </div>

          {/* Sticky summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-semibold">Booking Summary</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <div>Vehicle</div>
                  <div className="font-medium text-gray-900">{vehicleType.toUpperCase()}</div>
                </div>
                <div className="flex justify-between text-gray-600">
                  <div>Slot</div>
                  <div className="font-medium text-gray-900">{selectedSlot || '—'}</div>
                </div>
                <div className="flex justify-between text-gray-600">
                  <div>Duration</div>
                  <div className="font-medium text-gray-900">{durationHours} hr</div>
                </div>
                <div className="flex justify-between text-gray-600">
                  <div>Base ({baseRate}/hr)</div>
                  <div className="font-medium text-gray-900">₹{(baseRate * Math.max(1, durationHours)).toFixed(2)}</div>
                </div>
                {selectedServices.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="text-gray-600 mb-2">Services</div>
                    {selectedServices.map(id => {
                      const s = MOCK_PARKING_LOT.services.find(x => x.id === id);
                      return (
                        <div key={id} className="flex justify-between text-gray-700">
                          <div>{s.name}</div>
                          <div>₹{s.price}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between text-gray-700">
                    <div>Subtotal</div>
                    <div>₹{subtotal.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <div>Tax ({(TAX_RATE * 100).toFixed(0)}%)</div>
                    <div>₹{tax.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between font-semibold text-lg mt-2">
                    <div>Total</div>
                    <div>₹{total.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <button onClick={proceedToPayment} disabled={!selectedSlot || durationHours === 0} className={`mt-6 w-full px-4 py-2 rounded ${selectedSlot && durationHours > 0 ? 'bg-gradient-to-r from-green-600 to-green-700 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>
                Proceed to Payment
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
