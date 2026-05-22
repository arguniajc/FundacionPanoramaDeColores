import { useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider,
  FormControlLabel, Grid, Switch, TextField, Typography,
} from '@mui/material';
import EmailIcon  from '@mui/icons-material/Email';
import CheckIcon  from '@mui/icons-material/Check';
import { configuracionRepository } from '../../../../../infrastructure/repositories/configuracionRepository';
import { COLOR } from './helpers';

export function TabSmtp({ form, set }) {
  const [probando,   setProbando]   = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState(null); // { ok, msg }

  const handleProbar = async () => {
    setProbando(true);
    setResultadoPrueba(null);
    try {
      const { data } = await configuracionRepository.probarSmtp();
      setResultadoPrueba({ ok: true, msg: data.mensaje });
    } catch (e) {
      setResultadoPrueba({ ok: false, msg: e?.response?.data?.mensaje || 'Error al conectar con el servidor SMTP.' });
    } finally {
      setProbando(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <EmailIcon sx={{ color: COLOR }} />
        <Box>
          <Typography fontWeight={700} color={COLOR}>Correo saliente (SMTP)</Typography>
          <Typography variant="caption" color="text.secondary">
            Configura el servidor de correo para enviar recibos de donación a los donantes.
            Para Gmail usa <strong>smtp.gmail.com</strong> puerto <strong>587</strong> con una
            contraseña de aplicación (no la contraseña normal de Gmail).
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField fullWidth size="small" label="Servidor SMTP"
            placeholder="smtp.gmail.com"
            value={form.smtpHost ?? ''} onChange={set('smtpHost')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth size="small" label="Puerto" type="number"
            value={form.smtpPuerto ?? 587} onChange={set('smtpPuerto')}
            inputProps={{ min: 1, max: 65535 }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Usuario / Email de envío"
            placeholder="fundacion@gmail.com"
            value={form.smtpUsuario ?? ''} onChange={set('smtpUsuario')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Contraseña de aplicación"
            type="password" autoComplete="new-password"
            placeholder={form.smtpClaveGuardada ? '••••••••  (guardada — deja vacío para no cambiar)' : 'Contraseña de aplicación Gmail'}
            value={form.smtpClave ?? ''} onChange={set('smtpClave')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Nombre del remitente"
            placeholder="Fundación Panorama de Colores"
            value={form.smtpDeNombre ?? ''} onChange={set('smtpDeNombre')} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Email del remitente (visible para el donante)"
            placeholder="donaciones@fundacion.org"
            value={form.smtpDeEmail ?? ''} onChange={set('smtpDeEmail')} />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={
              <Switch
                checked={form.smtpSsl ?? true}
                onChange={e => set('smtpSsl')({ target: { value: e.target.checked } })}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLOR },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: COLOR } }}
              />
            }
            label="Usar STARTTLS / SSL (recomendado)"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2.5 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined" size="small"
          startIcon={probando ? <CircularProgress size={14} /> : <CheckIcon />}
          onClick={handleProbar}
          disabled={probando}
          sx={{ borderColor: COLOR, color: COLOR }}
        >
          {probando ? 'Enviando prueba…' : 'Enviar email de prueba'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Guarda primero la configuración, luego prueba el envío.
        </Typography>
      </Box>

      {resultadoPrueba && (
        <Alert severity={resultadoPrueba.ok ? 'success' : 'error'} sx={{ mt: 2 }}>
          {resultadoPrueba.msg}
        </Alert>
      )}
    </Box>
  );
}
