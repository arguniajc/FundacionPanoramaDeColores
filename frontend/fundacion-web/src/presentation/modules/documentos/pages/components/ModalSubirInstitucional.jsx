import { useState, useRef } from 'react';
import {
  Alert, Box, DialogContent,
  DialogTitle, FormControl, FormHelperText, IconButton, InputLabel, LinearProgress,
  MenuItem, Select, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import Dialog from '@/shared/components/DialogResponsive';
import { AccionesDialogo, ErrorServidor } from '@/shared/components/form/FormControles';
import { useCerrarConCambios, hayCambiosEn } from '@/shared/hooks/useCerrarConCambios';
import { useAutoFocus } from '@/shared/hooks/useAutoFocus';
import CloseIcon          from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import apiClient              from '@/infrastructure/http/apiClient';
import { mensajeErrorApi }        from '@/shared/utils/mensajeErrorApi';
import { r } from '@/shared/utils/validacion';
import { useValidacion } from '@/shared/hooks/useValidacion';
import ResumenErrores from '@/shared/components/ResumenErrores';
import { CATEGORIAS, HEADER_GRADIENT, sinExtension, recortarNombreArchivo } from './helpers';
import { validarArchivo, clasificarArchivo, ACCEPT_ARCHIVO, LIMITES_ARCHIVO } from '@/shared/utils/archivosPermitidos';

/** documentos_institucionales.titulo VARCHAR(200): el título sale del nombre del archivo. */
const MAX_TITULO = 200;

// Reglas del formulario: cada una dice qué está mal y cómo llenarlo
const ESQUEMA = {
  categoria: { etiqueta: 'Categoría', reglas: [r.seleccion('Actas')] },
  archivos:  { etiqueta: 'Archivos', reglas: [r.propia(lista => {
    if (!lista?.length) return 'Selecciona al menos un PDF haciendo clic o arrastrándolo al recuadro. Ejemplo: acta_asamblea_2025.pdf';
    const malos = lista.filter(f => validarArchivo(f, { tipos: 'pdf' })).map(f => f.name);
    return malos.length
      ? `Superan el máximo de ${LIMITES_ARCHIVO.pdf.maxMB} MB o están vacíos: ${malos.join(', ')}. Quítalos de la lista o comprímelos.` : '';
  })] },
};

const FORM_INICIAL = { categoria: 'Otros', archivos: [] };

export function ModalSubirInstitucional({ onCerrar, onSubido, onToast }) {
  const [categoria, setCategoria] = useState('Otros');
  const [archivos,  setArchivos]  = useState([]);
  const [subiendo,  setSubiendo]  = useState(false);
  const [progreso,  setProgreso]  = useState(0);
  const [error,     setError]     = useState('');
  const [aviso,     setAviso]     = useState('');
  const inputRef = useRef();
  const v = useValidacion(ESQUEMA, { categoria, archivos });
  const hayCambios = hayCambiosEn({ categoria, archivos }, FORM_INICIAL);
  const { confirmarCierre } = useCerrarConCambios({ hayCambios, bloqueado: subiendo, onCerrar });
  const autoFocus = useAutoFocus();

  const agregarArchivos = (lista) => {
    const todos     = Array.from(lista);
    const esPdf     = f => clasificarArchivo(f) === 'pdf';
    const nuevos    = todos.filter(esPdf);
    const omitidos  = todos.filter(f => !esPdf(f)).map(f => f.name);
    setArchivos(prev => {
      const nombres = new Set(prev.map(f => f.name));
      return [...prev, ...nuevos.filter(f => !nombres.has(f.name))];
    });
    // se avisa en lugar de descartar en silencio los que no son PDF
    setAviso(omitidos.length
      ? `Se omitieron ${omitidos.length} archivo(s) que no son PDF: ${omitidos.join(', ')}. Solo se aceptan documentos PDF.`
      : '');
    v.tocar('archivos');
  };

  const quitarArchivo = (nombre) => setArchivos(prev => prev.filter(f => f.name !== nombre));

  const handleSubir = async () => {
    if (!v.validarTodo()) return;
    setSubiendo(true); setError(''); setAviso('');
    let ok = 0;
    const fallos = [];
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      try {
        const fd = new FormData();
        fd.append('archivo', file);
        const { data: up } = await apiClient.post(
          '/api/archivos/upload?carpeta=documentos-institucionales', fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        await onSubido({
          titulo: sinExtension(file.name).trim().slice(0, MAX_TITULO),
          categoria, url: up.url, nombreOriginal: recortarNombreArchivo(file.name),
        });
        ok++;
      } catch (err) {
        fallos.push(`"${file.name}": ${mensajeErrorApi(err, { accion: 'subir el documento' })}`);
      }
      setProgreso(Math.round(((i + 1) / archivos.length) * 100));
    }
    setSubiendo(false);
    const msgFallos = fallos.length
      ? `No se pudo subir ${fallos.join(' · ')}`
      : '';
    if (ok > 0) {
      if (msgFallos)
        onToast(`Se subieron ${ok} documento${ok > 1 ? 's' : ''}. ${msgFallos}`, 'error');
      else
        onToast(`${ok} documento${ok > 1 ? 's' : ''} subido${ok > 1 ? 's' : ''} correctamente`, 'success');
      onCerrar();
    } else if (msgFallos) {
      setError(msgFallos);
    }
  };

  return (
    <Dialog slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 3 } } } }} open onClose={confirmarCierre} alEnviar={handleSubir} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: HEADER_GRADIENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><UploadFileIcon /> Subir documentos</Box>
        <IconButton onClick={() => confirmarCierre()} disabled={subiendo} size="small" aria-label="Cerrar" sx={{ color: 'rgba(255,255,255,0.8)' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2.5, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {aviso && <Alert severity="warning" onClose={() => setAviso('')}>{aviso}</Alert>}
        <FormControl size="small" fullWidth error={!!v.err('categoria')}>
          <InputLabel id="modal-subir-institucional-categoria-label">Categoría</InputLabel>
          <Select labelId="modal-subir-institucional-categoria-label" label="Categoría" value={categoria} autoFocus={autoFocus} onChange={e => setCategoria(e.target.value)}
            onBlur={() => v.tocar('categoria')}>
            {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
          {v.err('categoria') && <FormHelperText>{v.err('categoria')}</FormHelperText>}
        </FormControl>

        <Box onClick={() => inputRef.current.click()} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current.click(); } }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); }}
          sx={{
            border: '2px dashed', borderColor: v.err('archivos') ? 'error.main' : archivos.length ? 'var(--color-primario)' : 'divider',
            borderRadius: 2, p: 2.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: (t) => (archivos.length ? alpha(t.palette.primary.main, 0.06) : 'transparent'),
            '&:hover': { borderColor: 'var(--color-primario-texto)', bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
          }}>
          <InsertDriveFileIcon sx={{ fontSize: 36, color: archivos.length ? 'var(--color-primario)' : 'text.disabled', mb: 0.5 }} />
          <Typography sx={{ color: archivos.length ? 'var(--color-primario)' : 'text.secondary', fontWeight: 600 }} variant="body2">
            {archivos.length
              ? `${archivos.length} archivo${archivos.length > 1 ? 's' : ''} seleccionado${archivos.length > 1 ? 's' : ''}`
              : 'Haz clic o arrastra PDFs aquí (máx. 10 MB c/u)'}
          </Typography>
          {archivos.length === 0 && (
            <Typography sx={{ color: 'text.disabled' }} variant="caption">Puedes seleccionar varios a la vez</Typography>
          )}
          <input ref={inputRef} type="file" accept={ACCEPT_ARCHIVO.pdf} multiple hidden
            onChange={e => agregarArchivos(e.target.files)} />
        </Box>
        {v.err('archivos') && <FormHelperText error sx={{ mt: -1.5 }}>{v.err('archivos')}</FormHelperText>}

        {archivos.length > 0 && (
          <Box sx={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {archivos.map(f => (
              <Box key={f.name}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: (t) => alpha(t.palette.primary.main, 0.06), borderRadius: 1, px: 1.5, py: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--color-primario-texto)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                  {f.name}
                </Typography>
                <IconButton size="small" onClick={() => quitarArchivo(f.name)} disabled={subiendo}>
                  <CloseIcon sx={{ fontSize: 14, color: 'var(--color-primario-texto)' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {subiendo && (
          <Box>
            <Typography sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }} variant="caption">
              Subiendo… {progreso}%
            </Typography>
            <LinearProgress variant="determinate" value={progreso}
              sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: 'var(--color-primario)' } }} />
          </Box>
        )}
      </DialogContent>
      <ResumenErrores {...v.resumen} accion="subir los documentos" />
      <ErrorServidor mensaje={error} onClose={() => setError('')} titulo="No se pudo subir" />
      <AccionesDialogo onCancelar={confirmarCierre} guardando={subiendo} enviar
        textoGuardar={`Subir ${archivos.length > 1 ? `${archivos.length} archivos` : 'archivo'}`}
        sxGuardar={{ bgcolor: 'var(--color-primario)', '&:hover': { bgcolor: 'var(--color-gradiente)' }, minWidth: 140 }} />
    </Dialog>
  );
}
