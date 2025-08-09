import { servicesAPI } from './api';

const servicesService = {
  getOptions: async (params = {}) => {
    const { data } = await servicesAPI.getOptions(params);
    return data;
  },
  getService: async (id) => {
    const { data } = await servicesAPI.getService(id);
    return data;
  },
  getByCategory: async (category, params = {}) => {
    const { data } = await servicesAPI.getByCategory(category, params);
    return data;
  },
  getPopular: async (params = {}) => {
    const { data } = await servicesAPI.getPopular(params);
    return data;
  },
  search: async (params = {}) => {
    const { data } = await servicesAPI.search(params);
    return data;
  },
  getPricingForLot: async (serviceId, lotId) => {
    const { data } = await servicesAPI.getPricingForLot(serviceId, lotId);
    return data;
  }
};

export default servicesService;
