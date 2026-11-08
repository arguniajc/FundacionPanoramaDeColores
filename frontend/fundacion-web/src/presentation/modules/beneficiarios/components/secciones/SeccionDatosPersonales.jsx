import { Grid, TextField, Autocomplete, InputAdornment, CircularProgress, Alert, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { TIPOS_DOC, PAISES } from '@/shared/constants/beneficiarios';
import { useGeografia } from '@/shared/hooks/useGeografia';
import { DOCS_NUMERICOS, esSinDocumento, validarCampo } from '@/domain/beneficiarios/validacionBeneficiario';
import { GENEROS, calcularCategoria } from './beneficiarioForm';
import { SeccionTitulo, CampoSelect, ChipCategoria } from './comunes';
import { ayuda } from './ayuda';

/**
 * Nombres, fecha de nacimiento (ajusta el tipo niño/adulto y avisa), documento (con
 * verificación de duplicado), género, lugar de nacimiento y composición del hogar.
 *
 * @param {object}   props.c                 helpers de useCamposBeneficiario
 * @param {object}   props.doc               useVerificarDocumento
 * @param {string}   [props.numeroOriginal]  al editar: número guardado (no se verifica si no cambia)
 * @param {Function} [props.onVerBeneficiario] (id) => abre la ficha del beneficiario que ya tiene el documento
 */
export default function SeccionDatosPersonales({
  c, doc, cambiarFecha, cambiarTipoDocumento, avisoTipo, cerrarAvisoTipo, numeroOriginal, onVerBeneficiario,
}) {
  const { form, err } = c;
  const { esColombia, departamentos, ciudades, deptoHabilitado, ciudadHabilitada } =
    useGeografia(form.paisNacimiento, form.departamentoNacimiento);
  const categoria = calcularCategoria(form.fechaNacimiento);

  const sinDoc   = esSinDocumento(form.tipoDocumento);
  const numerico = DOCS_NUMERICOS.includes(form.tipoDocumento);
  const numero   = String(form.numeroDocumento ?? '').trim();
  const docDeAhora = doc.numero === numero && numero !== '';
  const docLibre   = docDeAhora && doc.fase === 'libre';
  const docExiste  = docDeAhora && doc.fase === 'existe';
  const docFallo   = docDeAhora && doc.fase === 'error';

  const cambiarNumero = e => {
    // RC/TI/CC/NUIP solo números; pasaporte, CE, PPT y RAMV admiten letras
    const v = numerico ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    c.setV('numeroDocumento', v);
    if (doc.fase !== 'idle') doc.reiniciar();
  };

  const salirDelNumero = () => {
    c.marcarTocado('numeroDocumento');
    if (sinDoc || !numero) return;
    if (numeroOriginal !== undefined && numero === String(numeroOriginal ?? '').trim()) return; // es el suyo
    if (validarCampo('numeroDocumento', form)) return; // primero que tenga el formato correcto
    doc.verificar(numero);
  };

  const nombreCampo = (campo, label, required) => (
    <Grid size={{ xs: 12, sm: 6 }}>
      <TextField fullWidth label={label} size="small" required={required} autoComplete="off"
        value={form[campo]} onChange={c.capitalizar(campo)} onBlur={c.touch(campo)}
        error={!!err(campo)} helperText={ayuda(err(campo))} />
    </Grid>
  );

  return (
    <>
      <SeccionTitulo>{c.esNino ? 'Datos del menor' : 'Datos del beneficiario'}</SeccionTitulo>
      {nombreCampo('primerNombre', 'Primer nombre', true)}
      {nombreCampo('segundoNombre', 'Segundo nombre', false)}
      {nombreCampo('primerApellido', 'Primer apellido', true)}
      {nombreCampo('segundoApellido', 'Segundo apellido', false)}

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Fecha de nacimiento" size="small" type="date" required
          value={form.fechaNacimiento} onChange={cambiarFecha} onBlur={c.touch('fechaNacimiento')}
          error={!!err('fechaNacimiento')} helperText={ayuda(err('fechaNacimiento'))}
          slotProps={{ inputLabel: { shrink: true } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CampoSelect c={c} campo="tipoDocumento" label="Tipo de documento" required vacio={null}
          opciones={TIPOS_DOC} onChange={cambiarTipoDocumento} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Número de documento" size="small" required={!sinDoc} disabled={sinDoc}
          value={sinDoc ? '' : form.numeroDocumento} onChange={cambiarNumero} onBlur={salirDelNumero}
          autoComplete="off"
          placeholder={sinDoc ? 'No aplica' : undefined}
          error={!!err('numeroDocumento')}
          helperText={ayuda(sinDoc
            ? 'No aplica: el beneficiario no tiene documento.'
            : err('numeroDocumento') || (docFallo ? 'No se pudo comprobar si ya está registrado; se revisará al guardar.' : ''))}
          slotProps={{
            htmlInput: { inputMode: numerico ? 'numeric' : 'text' },
            input: {
              endAdornment: doc.fase === 'verificando' && docDeAhora
                ? <InputAdornment position="end"><CircularProgress size={14} aria-label="Verificando documento" /></InputAdornment>
                : docLibre
                  ? <InputAdornment position="end"><CheckCircleIcon titleAccess="Documento disponible" sx={{ fontSize: 16, color: 'success.main' }} /></InputAdornment>
                  : null,
            },
          }}
        />
      </Grid>
      {docExiste && (
        <Grid size={12}>
          <Alert severity="warning"
            action={onVerBeneficiario && doc.existente?.id
              ? <Button color="inherit" size="small" onClick={() => onVerBeneficiario(doc.existente.id)}>Ver beneficiario</Button>
              : undefined}>
            Este documento ya está registrado{doc.existente?.nombre ? <> a nombre de <strong>{doc.existente.nombre}</strong></> : null}.
            {' '}Revisa el número o abre su ficha en vez de registrarlo de nuevo.
          </Alert>
        </Grid>
      )}
      {avisoTipo && (
        <Grid size={12}>
          <Alert severity="info" onClose={cerrarAvisoTipo} role="status">{avisoTipo}</Alert>
        </Grid>
      )}
      <ChipCategoria categoria={categoria} />

      <Grid size={{ xs: 12, sm: 4 }}>
        <CampoSelect c={c} campo="genero" label="Género" required opciones={GENEROS} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Autocomplete options={PAISES} value={form.paisNacimiento} disableClearable
          onChange={(_, v) => c.setForm(p => ({ ...p, paisNacimiento: v || '', departamentoNacimiento: '', ciudadNacimiento: '' }))}
          renderInput={params => <TextField {...params} label="País de nacimiento" size="small" />} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {esColombia ? (
          <Autocomplete options={departamentos} value={form.departamentoNacimiento || null} disabled={!deptoHabilitado}
            onChange={(_, v) => { c.setForm(p => ({ ...p, departamentoNacimiento: v || '', ciudadNacimiento: '' })); c.marcarTocado('departamentoNacimiento'); }}
            renderInput={params => (
              <TextField {...params} label="Departamento" size="small" required onBlur={c.touch('departamentoNacimiento')}
                error={!!err('departamentoNacimiento')} helperText={ayuda(err('departamentoNacimiento'))} />
            )} />
        ) : (
          <TextField fullWidth label="Departamento / Estado" size="small" required
            value={form.departamentoNacimiento} disabled={!deptoHabilitado}
            onChange={c.capitalizar('departamentoNacimiento')} onBlur={c.touch('departamentoNacimiento')}
            error={!!err('departamentoNacimiento')} helperText={ayuda(err('departamentoNacimiento'))} />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        {esColombia ? (
          <Autocomplete options={ciudades} value={form.ciudadNacimiento || null} disabled={!ciudadHabilitada}
            onChange={(_, v) => { c.setV('ciudadNacimiento', v || ''); c.marcarTocado('ciudadNacimiento'); }}
            renderInput={params => (
              <TextField {...params} label="Ciudad / Municipio" size="small" required onBlur={c.touch('ciudadNacimiento')}
                error={!!err('ciudadNacimiento')} helperText={ayuda(err('ciudadNacimiento'))} />
            )} />
        ) : (
          <TextField fullWidth label="Ciudad" size="small" required
            value={form.ciudadNacimiento} disabled={!ciudadHabilitada}
            onChange={c.capitalizar('ciudadNacimiento')} onBlur={c.touch('ciudadNacimiento')}
            error={!!err('ciudadNacimiento')} helperText={ayuda(err('ciudadNacimiento'))} />
        )}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="N.º personas con quienes vive" size="small" required autoComplete="off"
          value={form.numPersonasVive} onChange={c.soloDigitos('numPersonasVive')} onBlur={c.touch('numPersonasVive')}
          error={!!err('numPersonasVive')} helperText={ayuda(err('numPersonasVive'))}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 2 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label={c.esNino ? 'N.º de hermanos' : 'N.º de hijos'} size="small" required autoComplete="off"
          value={form.numHermanos} onChange={c.soloDigitos('numHermanos')} onBlur={c.touch('numHermanos')}
          error={!!err('numHermanos')} helperText={ayuda(err('numHermanos'))}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 2 } }} />
      </Grid>
    </>
  );
}

