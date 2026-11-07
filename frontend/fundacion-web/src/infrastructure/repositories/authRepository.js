/**
 * authRepository
 * Autenticación con Google OAuth contra el backend.
 */
import apiClient from '../http/apiClient';

export const authRepository = {
  loginGoogle: (idToken) => apiClient.post('/api/auth/google', { idToken }),
  renovar:     ()        => apiClient.post('/api/auth/renovar'),
};
