import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import parkingService from '../../services/parkingService';
import { isDemoLotId } from '../../services/demoLots';
import LoadingSpinner from '../ui/LoadingSpinner';

/*
  Lightweight 3D-esque viewer using CSS transforms (no heavy Three.js yet):
  Renders levels stacked with perspective. Can be upgraded to Three.js later.
*/
const Slot3DViewer = ({ lotId, onSelect }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isDemoLotId(lotId)) {
          // Synthesize a small grid of demo slots
          const demoSlots = Array.from({ length: 24 }).map((_, idx) => {
            let status = 'available';
            if (idx % 7 === 0) status = 'occupied';
            else if (idx % 5 === 0) status = 'reserved';
            return {
              code: `L1-R${String(Math.floor(idx / 6) + 1).padStart(2, '0')}-C${String((idx % 6) + 1).padStart(2, '0')}`,
              type: 'car',
              level: 1,
              status,
              position: { x: (idx % 6) * 2, y: 0, z: Math.floor(idx / 6) * 4 }
            };
          });
          setSlots(demoSlots);
        } else {
          const data = await parkingService.getSlots(lotId);
          setSlots(data.data?.slots || data.data || []);
        }
        setError(null);
      } catch (e) {
        console.warn('Slot load failed', e);
        setError('Failed to load slots');
      }
      setLoading(false);
    })();
  }, [lotId]);

  const grouped = slots.reduce((acc, s) => {
    acc[s.level] = acc[s.level] || [];
    acc[s.level].push(s);
    return acc;
  }, {});

  const handleSelect = (slot) => {
    setSelected(slot.code);
  onSelect?.(slot);
  };

  if (loading) return <div className="py-6"><LoadingSpinner message="Loading slots..." /></div>;
  if (error) return <div className="text-red-600 text-sm">{error}</div>;
  if (!slots.length) return <div className="text-gray-500 text-sm">No slots available</div>;

  return (
    <div className="relative" style={{ perspective: '1200px' }}>
      {Object.keys(grouped).sort((a,b)=>a-b).map(level => {
        return (
          <div key={level} className="mb-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Level {level}</h4>
            <div className="overflow-auto border rounded-lg p-4 bg-white shadow-sm">
              <div className="relative" style={{ transformStyle:'preserve-3d' }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px,1fr))' }}>
                  {grouped[level].map(slot => {
                    const isSelected = selected === slot.code;
                    const disabled = slot.status !== 'available';
                    const statusBadge = slot.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500';
                    return (
                      <button
                        key={slot.code}
                        disabled={disabled}
                        onClick={() => handleSelect(slot)}
                        className={`h-14 flex flex-col items-center justify-center text-xs border rounded-md transition-all ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 hover:bg-blue-50'} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
                        title={slot.code}
                      >
                        <span className="font-medium">{slot.code.split('-').slice(-1)}</span>
                        <span className={`mt-1 px-1 rounded text-[10px] ${statusBadge}`}>{slot.status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Slot3DViewer;

Slot3DViewer.propTypes = {
  lotId: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
};

Slot3DViewer.defaultProps = {
  onSelect: null,
};
