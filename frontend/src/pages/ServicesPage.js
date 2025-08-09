import React, { useState } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAllServices } from '../hooks/useAPI';

const ServicesPage = () => {
  const { services, loading, error } = useAllServices();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');

  // Get unique categories from services
  const categories = [...new Set(services.map(service => service.category))];

  // Filter services based on search and filters
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    
    let matchesPrice = true;
    if (priceRange !== 'all') {
      const price = service.price;
      switch (priceRange) {
        case 'low':
          matchesPrice = price <= 100;
          break;
        case 'medium':
          matchesPrice = price > 100 && price <= 500;
          break;
        case 'high':
          matchesPrice = price > 500;
          break;
        default:
          matchesPrice = true;
      }
    }
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSpinner message="Loading services..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Services</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Parking Services</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enhance your parking experience with our premium services. From car wash to EV charging, 
            we've got everything you need.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Services
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or description..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Prices</option>
                <option value="low">Under ₹100</option>
                <option value="medium">₹100 - ₹500</option>
                <option value="high">Above ₹500</option>
              </select>
            </div>
          </div>

          {/* Filter Results Counter */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredServices.length} of {services.length} services
            </p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Service Image/Icon */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-32 flex items-center justify-center">
                <div className="text-4xl text-white">{service.icon}</div>
              </div>

              {/* Service Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{service.name}</h3>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {service.category}
                    </span>
                  </div>
                  {service.popular && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {service.description}
                </p>

                {/* Service Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Price:</span>
                    <span className="font-semibold text-gray-900">
                      ₹{service.price}
                      {service.priceType === 'per-kwh' && '/kWh'}
                      {service.priceType === 'per-service' && ' per service'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Duration:</span>
                    <span className="text-sm text-gray-700">{service.duration} minutes</span>
                  </div>
                  {service.availability && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Availability:</span>
                      <span className={`text-sm ${service.availability === '24/7' ? 'text-green-600' : 'text-gray-700'}`}>
                        {service.availability}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                {service.features && service.features.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {service.features.slice(0, 3).map((feature, index) => (
                        <span
                          key={index}
                          className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                      {service.features.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          +{service.features.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Book Service
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setPriceRange('all');
              }}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Need a Custom Service?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? We offer custom parking services tailored to your specific needs. 
            Contact us to discuss your requirements.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
