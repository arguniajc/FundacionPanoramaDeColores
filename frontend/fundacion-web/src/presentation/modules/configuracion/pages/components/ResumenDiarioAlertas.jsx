import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, FormControl, FormControlLabel,
  InputLabel, MenuItem, Select, Switch, Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { configuracionRepository } from '@/infrastructure/repositories/configuracionRepository';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { COLOR } from './helpers';
import { etiquetaHora, formatoFechaISO } from './resumenDiario';

const HORAS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Interruptor y hora del resumen diario de alertas por correo. Se guarda aparte del
 * formulario general (su propio endpoint), con su propio botón.
 */
export function ResumenDiarioAlertas() {
  const [conf, setConf]         = useState(null);   // { activo, hora, ultimoEnvio }
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje]   = useState(null);   // { ok, msg }

  useEffect(() => {
    let vivo = true;
    configuracionRepository.obtenerResumenDiario()
      .then(({ data }) => { if (vivo) setConf(data); })
      .catch(e => { if (vivo) setMensaje({ ok: false, msg: mensajeErrorApi(e, { accion: 'cargar el resumen diario de alertas' }) }); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const { data } = await configuracionRepository.guardarResumenDiario({ activo: conf.activo, hora: conf.hora });
      setConf(data);
      setMensaje({ ok: true, msg: 'Resumen diario guardado.' });
    } catch (e) {
      setMensaje({ ok: false, msg: mensajeErrorApi(e, { accion: 'guardar el resumen diario de alertas' }) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <NotificationsActiveIcon sx={{ color: COLOR }} />
        <Box>
          <Typography sx={{ fontWeight: 700, color: COLOR }}>Resumen diario de alertas</Typography>
          <Typography sx={{ color: 'text.secondary' }} variant="caption">
            Una vez al día, si hay alertas (contratos por vencer, stock bajo, presupuesto…), cada usuario
            activo recibe un correo solo con las alertas de los módulos que puede ver. Hora de Colombia.
          </Typography>
        </Box>
      </Box>

      {cargando && <CircularProgress size={20} sx={{ color: COLOR }} />}

      {conf && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={!!conf.activo}
                onChange={e => setConf(c => ({ ...c, activo: e.target.checked }))}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLOR },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: COLOR } }}
              />
            }
            label="Enviar resumen diario"
          />
          <FormControl size="small" sx={{ minWidth: 150 }} disabled={!conf.activo}>
            <InputLabel id="resumen-hora">Hora de envío</InputLabel>
            <Select labelId="resumen-hora" label="Hora de envío" value={conf.hora ?? 7}
              onChange={e => setConf(c => ({ ...c, hora: Number(e.target.value) }))}>
              {HORAS.map(h => <MenuItem key={h} value={h}>{etiquetaHora(h)}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={guardar} disabled={guardando}
            startIcon={guardando ? <CircularProgress size={14} /> : null}
            sx={{ borderColor: COLOR, color: COLOR, minHeight: 40 }}>
            {guardando ? 'Guardando…' : 'Guardar resumen'}
          </Button>
        </Box>
      )}

      {conf?.ultimoEnvio && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
          Último resumen procesado: {formatoFechaISO(conf.ultimoEnvio)}
        </Typography>
      )}

      {mensaje && (
        <Alert severity={mensaje.ok ? 'success' : 'error'} sx={{ mt: 2 }}>{mensaje.msg}</Alert>
      )}
    </Box>
  );
}
