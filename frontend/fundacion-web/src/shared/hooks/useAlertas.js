import { useState, useEffect } from 'react';
import apiClient from '@/infrastructure/http/apiClient';

const INTERVALO_MS = 5 * 60 * 1000;

/** Página a la que lleva cada alerta según su módulo (campana y Dashboard). */
export const MODULO_RUTA = {
  talento_humano: '/sede/talento-humano',
  inventario:     '/sede/inventario',
  contabilidad:   '/sede/contabilidad',
};

// Estado compartido: la campana del layout y el Dashboard usan la misma respuesta de
// /api/alertas (el servidor ya filtra por los módulos que el usuario puede ver), así
// muestran lo mismo y no se duplica la petición.
let ultimas      = [];
let enCurso      = null;
let temporizador = null;
const suscriptores = new Set();

function refrescar() {
  enCurso ??= apiClient.get('/api/alertas')
    .then(({ data }) => {
      ultimas = Array.isArray(data) ? data : [];
      suscriptores.forEach(fn => fn(ultimas));
    })
    .catch(() => { /* silencioso — no interrumpir la sesión por fallos de alertas */ })
    .finally(() => { enCurso = null; });
  return enCurso;
}

export function useAlertas() {
  const [alertas, setAlertas] = useState(ultimas);

  useEffect(() => {
    suscriptores.add(setAlertas);
    refrescar();
    temporizador ??= setInterval(refrescar, INTERVALO_MS);
    return () => {
      suscriptores.delete(setAlertas);
      if (suscriptores.size === 0) {
        clearInterval(temporizador);
        temporizador = null;
        ultimas = [];   // otra sesión (otro rol) no debe ver las alertas anteriores
      }
    };
  }, []);

  const totalAlertas = alertas.reduce((s, a) => s + (a.valor ?? 0), 0);

  const porModulo = (modulo) =>
    alertas
      .filter(a => a.modulo === modulo)
      .reduce((s, a) => s + (a.valor ?? 0), 0);

  return { alertas, totalAlertas, porModulo };
}
