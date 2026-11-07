/**
 * useLogin
 * Caso de uso: autenticar al usuario con Google OAuth.
 * Llama al backend, guarda la sesión y navega al panel.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authRepository } from '@/infrastructure/repositories/authRepository';
import { useAuth } from './AuthContext';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';

export function useLogin() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  const loginConGoogle = async (credentialResponse) => {
    setCargando(true);
    setError('');
    try {
      const { data } = await authRepository.loginGoogle(credentialResponse.credential);
      login(data.token, {
        email:     data.email,
        nombre:    data.nombre,
        avatarUrl: data.avatarUrl,
      });
      navigate('/sede', { replace: true });
    } catch (err) {
      setError(
        err.response?.status === 403
          ? 'Tu correo no tiene permisos para acceder al panel.'
          : err.response?.status === 401
            ? 'No se pudo validar tu cuenta de Google. Intenta iniciar sesión de nuevo.'
            : mensajeErrorApi(err, { accion: 'iniciar sesión' })
      );
    } finally {
      setCargando(false);
    }
  };

  const errorGoogle = () =>
    setError('No se pudo conectar con Google. Intenta de nuevo.');

  return { cargando, error, loginConGoogle, errorGoogle };
}
