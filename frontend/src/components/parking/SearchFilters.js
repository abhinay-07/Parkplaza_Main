import React from 'react';

const SearchFilters = ({ filters, onFilterChange }) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Vehicle Type */}
        <div>
          <label className="label">Vehicle Type</label>
          <select
            className="input"
            value={filters.vehicleType || ''}
            onChange={(e) => onFilterChange({ vehicleType: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="truck">Truck</option>
            <option value="van">Van</option>
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="label">Min Price (₹/hr)</label>
          <input
            type="number"
            className="input"
            placeholder="0"
            value={filters.minPrice || ''}
            onChange={(e) => onFilterChange({ minPrice: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Max Price (₹/hr)</label>
          <input
            type="number"
            className="input"
            placeholder="1000"
            value={filters.maxPrice || ''}
            onChange={(e) => onFilterChange({ maxPrice: e.target.value })}
          />
        </div>

        {/* Radius */}
        <div>
          <label className="label">Radius (km)</label>
          <input
            type="range"
            min="1"
            max="50"
            className="w-full"
            value={filters.radius || 10}
            onChange={(e) => onFilterChange({ radius: e.target.value })}
          />
          <span className="text-sm text-gray-600">{filters.radius || 10} km</span>
        </div>
      </div>
      
      {/* Clear Filters */}
      <div className="mt-4">
        <button
          onClick={() => onFilterChange({})}
          className="btn btn-secondary"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

export default SearchFilters;
