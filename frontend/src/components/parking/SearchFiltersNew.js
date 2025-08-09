import React, { useState } from 'react';

const SearchFilters = ({ filters, onFiltersChange, parkingLots = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique features from parking lots for filter options
  const availableFeatures = [...new Set(parkingLots.flatMap(lot => lot.features || []))];

  const handlePriceRangeChange = (value, index) => {
    const newRange = [...filters.priceRange];
    newRange[index] = parseInt(value);
    onFiltersChange({
      ...filters,
      priceRange: newRange
    });
  };

  const handleRatingChange = (rating) => {
    onFiltersChange({
      ...filters,
      rating: parseFloat(rating)
    });
  };

  const handleFeatureToggle = (feature) => {
    const newFeatures = filters.features.includes(feature)
      ? filters.features.filter(f => f !== feature)
      : [...filters.features, feature];
    
    onFiltersChange({
      ...filters,
      features: newFeatures
    });
  };

  const handleAvailabilityToggle = () => {
    onFiltersChange({
      ...filters,
      availabilityOnly: !filters.availabilityOnly
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      priceRange: [0, 100],
      rating: 0,
      features: [],
      availabilityOnly: false
    });
  };

  const hasActiveFilters = filters.priceRange[0] > 0 || 
                          filters.priceRange[1] < 100 || 
                          filters.rating > 0 || 
                          filters.features.length > 0 || 
                          filters.availabilityOnly;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium lg:hidden"
          >
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleAvailabilityToggle}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filters.availabilityOnly
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Available Only
        </button>
        
        <button
          onClick={() => handleRatingChange(filters.rating >= 4 ? 0 : 4)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            filters.rating >= 4
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          4+ Stars
        </button>

        {availableFeatures.slice(0, 3).map(feature => (
          <button
            key={feature}
            onClick={() => handleFeatureToggle(feature)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.features.includes(feature)
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {feature}
          </button>
        ))}
      </div>

      {/* Detailed Filters */}
      <div className={`space-y-6 ${isExpanded || window.innerWidth >= 1024 ? 'block' : 'hidden'} lg:block`}>
        
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Price Range (₹/hour)
          </label>
          <div className="px-3">
            <div className="relative">
              {/* Price Range Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={filters.priceRange[0]}
                onChange={(e) => handlePriceRangeChange(e.target.value, 0)}
                className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.priceRange[1]}
                onChange={(e) => handlePriceRangeChange(e.target.value, 1)}
                className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            {/* Price Labels */}
            <div className="flex justify-between text-sm text-gray-600 mt-6">
              <span>₹{filters.priceRange[0]}</span>
              <span>₹{filters.priceRange[1]}</span>
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Minimum Rating
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => handleRatingChange(rating)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                  filters.rating === rating
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating === 0 ? 'Any' : `${rating}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Features Filter */}
        {availableFeatures.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Features
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableFeatures.map(feature => (
                <label key={feature} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.features.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{feature}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Count */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {parkingLots.length} parking lots match your criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
