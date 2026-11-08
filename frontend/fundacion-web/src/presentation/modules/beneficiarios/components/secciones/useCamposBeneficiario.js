import { useState } from 'react';
import { esSinDocumento } from '@/domain/beneficiarios/validacionBeneficiario';
import { calcularCategoria, docPorDefecto } from './beneficiarioForm';

const capitalizarTexto = v => v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

/**
 * Estado y manejadores comunes de los campos del beneficiario (Nuevo y Editar):
 * campos tocados, mensajes por campo, capitalización, solo dígitos, cambio de tipo
 * niño/adulto y de fecha de nacimiento (con aviso), tipo de documento y "Sin documento".
 *
 * Devuelve `c`, el objeto que reciben las secciones (SeccionDatosPersonales, SeccionResidencia…).
 *
 * @param {object}   p
 * @param {object}   p.form      estado del formulario
 * @param {Function} p.setForm
 * @param {object}   p.errores   { campo: mensaje } con las reglas que aplican ahora
 * @param {object}   p.doc       resultado de useVerificarDocumento
 * @param {string}   p.idPrefix  prefijo de los id de etiquetas ('nuevo-beneficiario', 'editar-inscripcion')
 * @param {boolean}  [p.tipoDocElegido] true si el tipo de documento actual ya lo eligió alguien (edición);
 *                   por defecto, se considera elegido si no es el que se propone para el tipo.
 */
export function useCamposBeneficiario({ form, setForm, errores, doc, idPrefix, tipoDocElegido }) {
  const [touched, setTouched] = useState({});
  const [avisoTipo, setAvisoTipo] = useState('');
  // Si el usuario eligió el tipo de documento a mano, no se cambia solo al pasar de niño a adulto
  const [tipoDocManual, setTipoDocManual] = useState(() =>
    tipoDocElegido ?? (!!form.tipoDocumento && form.tipoDocumento !== docPorDefecto(form.tipo)));

  const setV = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));
  const touch = campo => () => setTouched(prev => (prev[campo] ? prev : { ...prev, [campo]: true }));
  const marcarCampos = campos => setTouched(prev => ({ ...prev, ...Object.fromEntries(campos.map(k => [k, true])) }));

  const c = {
    form, setForm, setV, touch, idPrefix,
    esNino: form.tipo !== 'adulto',
    /** Mensaje del campo: solo cuando el usuario ya pasó por él o intentó avanzar/guardar. */
    err: campo => (touched[campo] ? (errores[campo] ?? '') : ''),
    set: campo => e => setV(campo, e.target.value),
    capitalizar: campo => e => setV(campo, capitalizarTexto(e.target.value)),
    capitalizarTexto,
    soloDigitos: campo => e => setV(campo, e.target.value.replace(/\D/g, '')),
    /** Número con decimales: dígitos y un solo separador (la coma se guarda como punto). */
    decimal: campo => e => {
      const [ent, ...resto] = e.target.value.replace(',', '.').replace(/[^\d.]/g, '').split('.');
      setV(campo, resto.length ? `${ent}.${resto.join('')}` : ent);
    },
    marcarTocado: campo => setTouched(prev => ({ ...prev, [campo]: true })),
  };

  /** Niño ↔ adulto con el selector (limpia el grado y, para adulto, el colegio). */
  const cambiarTipo = nuevo => {
    if (!nuevo || nuevo === form.tipo) return;
    setAvisoTipo('');
    setForm(p => ({
      ...p, tipo: nuevo,
      tipoDocumento: tipoDocManual ? p.tipoDocumento : docPorDefecto(nuevo),
      gradoEscolar: '', ...(nuevo === 'adulto' ? { nombreColegio: '' } : {}),
    }));
  };

  /** Al cambiar la fecha el tipo se ajusta solo a la edad, avisando del cambio. */
  const cambiarFecha = e => {
    const fecha = e.target.value;
    c.marcarTocado('fechaNacimiento');
    const cat = calcularCategoria(fecha);
    const nuevoTipo = cat ? (cat.edad >= 18 ? 'adulto' : 'niño') : form.tipo;
    if (nuevoTipo !== form.tipo) {
      setAvisoTipo(nuevoTipo === 'adulto'
        ? `Se cambió a "Adulto" por la edad (${cat.edad} años).`
        : `Se cambió a "Niño / Adolescente" por la edad (${cat.edad} ${cat.edad === 1 ? 'año' : 'años'}).`);
    }
    setForm(p => ({
      ...p, fechaNacimiento: fecha, tipo: nuevoTipo,
      tipoDocumento: nuevoTipo !== p.tipo && !tipoDocManual ? docPorDefecto(nuevoTipo) : p.tipoDocumento,
    }));
  };

  /** Tipo de documento elegido a mano. "Sin documento" limpia el número y su verificación. */
  const cambiarTipoDocumento = e => {
    const tipo = e.target.value;
    setTipoDocManual(true);
    c.marcarTocado('tipoDocumento');
    if (esSinDocumento(tipo)) { doc.reiniciar(); setForm(p => ({ ...p, tipoDocumento: tipo, numeroDocumento: '' })); }
    else setV('tipoDocumento', tipo);
  };

  return {
    c, touched, marcarCampos,
    avisoTipo, cerrarAvisoTipo: () => setAvisoTipo(''),
    cambiarTipo, cambiarFecha, cambiarTipoDocumento,
  };
}
