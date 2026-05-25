import apiClient from '../http/apiClient';

export const talentoHumanoRepository = {
  stats: () => apiClient.get('/api/talento-humano/stats'),
};
