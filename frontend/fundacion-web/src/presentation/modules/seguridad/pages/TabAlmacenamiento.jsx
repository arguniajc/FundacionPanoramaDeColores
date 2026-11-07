// Migración de fotos y documentos personales del almacenamiento público al privado.
// Solo administradores. Paso 1: simular · Paso 2: migrar · Paso 3: borrar las copias públicas.
import { useState } from 'react';
import {
  Box, Typography, Button, Alert, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Stepper, Step, StepLabel,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import apiClient from '@/infrastructure/http/apiClient';
import { mensajeErrorApi } from '@/shared/utils/mensajeErrorApi';
import { useConfirm } from '@/shared/components/ConfirmDialog';

export default function TabAlmacenamiento() {
  const confirm = useConfirm();
  const [paso,      setPaso]      = useState(0);
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState('');
  const [resultado, setResultado] = useState(null);
  const [limpieza,  setLimpieza]  = useState(null);

  const migrar = async (simular) => {
    if (!simular && !await confirm(
      `Se copiarán ${resultado?.archivos ?? 0} archivos al almacenamiento privado y se actualizarán sus referencias en la base de datos. ¿Continuar?`)) return;
    setCargando(true); setError('');
    try {
      const { data } = await apiClient.post('/api/archivos/migrar-privado', null, { params: { simular } });
      setResultado(data);
      setPaso(simular ? 1 : 2);
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: simular ? 'analizar los archivos' : 'migrar los archivos' }));
    } finally { setCargando(false); }
  };

  const limpiar = async () => {
    if (!await confirm(
      'Se borrarán del almacenamiento público las copias de fotos y documentos que ya están en el privado y que ya no se usan. Esta acción no se puede deshacer. ¿Continuar?')) return;
    setCargando(true); setError('');
    try {
      const { data } = await apiClient.post('/api/archivos/limpiar-publicos');
      setLimpieza(data);
      setPaso(3);
    } catch (err) {
      setError(mensajeErrorApi(err, { accion: 'borrar las copias públicas' }));
    } finally { setCargando(false); }
  };

  return (
    <Box>
      <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
        Las fotos y documentos de los beneficiarios, inscripciones y organigrama se guardan ahora en un
        almacenamiento <strong>privado</strong>: solo se ven desde el panel con sesión iniciada, mediante
        enlaces que vencen en 1 hora. Los archivos subidos antes de este cambio siguen en el almacenamiento
        público hasta que los migres aquí. Las imágenes de la página web se quedan públicas.
      </Alert>

      <Stepper activeStep={paso} sx={{ mb: 3 }}>
        {['Analizar', 'Migrar', 'Borrar copias públicas'].map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <Button variant="outlined" onClick={() => migrar(true)} disabled={cargando}>
          1. Analizar (sin cambios)
        </Button>
        <Button variant="contained" onClick={() => migrar(false)} disabled={cargando || paso < 1}>
          2. Migrar al almacenamiento privado
        </Button>
        <Button variant="contained" color="warning" onClick={limpiar} disabled={cargando || paso < 2}>
          3. Borrar copias públicas
        </Button>
        {cargando && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
      </Box>

      {resultado && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={700} mb={1}>
            {resultado.simulacion
              ? `Análisis: ${resultado.archivos} archivos personales están en el almacenamiento público.`
              : `Migración: ${resultado.copiados} de ${resultado.archivos} archivos copiados · ${resultado.filasActualizadas} registros actualizados.`}
          </Typography>
          {resultado.fallidos?.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {resultado.fallidos.length} archivos no se pudieron copiar (pueden no existir ya). Siguen con su enlace
              público; puedes volver a ejecutar la migración más tarde.
            </Alert>
          )}
          {resultado.detalle?.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Tabla</TableCell><TableCell>Columna</TableCell>
                  <TableCell align="right">Archivos</TableCell>
                  {!resultado.simulacion && <TableCell align="right">Registros actualizados</TableCell>}</TableRow>
              </TableHead>
              <TableBody>
                {resultado.detalle.map(d => (
                  <TableRow key={`${d.tabla}.${d.columna}`}>
                    <TableCell>{d.tabla}</TableCell><TableCell>{d.columna}</TableCell>
                    <TableCell align="right">{d.archivos}</TableCell>
                    {!resultado.simulacion && <TableCell align="right">{d.filasActualizadas}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {limpieza && (
        <Alert severity="success">
          Se borraron {limpieza.borrados} copias públicas.
          {limpieza.sinCopiaOEnUso > 0 && ` ${limpieza.sinCopiaOEnUso} se conservaron porque no tienen copia privada o todavía se usan.`}
        </Alert>
      )}
    </Box>
  );
}
