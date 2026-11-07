/**
 * Archivos privados: las fotos y documentos personales se guardan como referencias
 * "privado://carpeta/archivo" (no son URLs públicas). Para mostrarlos se pide a la API
 * un enlace temporal firmado (válido 1 h), solo con sesión iniciada.
 *
 *   const url = useArchivoUrl(beneficiario.fotoMenorUrl);   // en componentes
 *   const url = await resolverArchivo(valor);               // en código async (PDFs)
 *   abrirArchivo(valor);                                    // abrir en otra pestaña
 *
 * Las URLs normales (públicas, data:, blob:) se devuelven tal cual.
 */
import { useEffect, useState } from 'react';
import apiClient from '@/infrastructure/http/apiClient';

const PREFIJO = 'privado://';
const VIGENCIA_MS = 50 * 60 * 1000; // la API firma por 60 min; se renueva antes

export const esPrivado = valor => typeof valor === 'string' && valor.startsWith(PREFIJO);

const cache = new Map();   // ref → { url, vence }
let pendientes = new Map(); // ref → [resolve, reject][]
let temporizador = null;

async function firmarLote() {
  const lote = pendientes;
  pendientes = new Map();
  temporizador = null;
  const refs = [...lote.keys()];
  try {
    for (let i = 0; i < refs.length; i += 200) {
      const parte = refs.slice(i, i + 200);
      const { data } = await apiClient.post('/api/archivos/firmar', { referencias: parte });
      const vence = Date.now() + VIGENCIA_MS;
      for (const ref of parte) {
        const url = data.urls?.[ref] ?? null; // null: el archivo ya no existe
        if (url) cache.set(ref, { url, vence });
        lote.get(ref).forEach(([resolve]) => resolve(url));
      }
    }
  } catch (err) {
    lote.forEach(cbs => cbs.forEach(([, reject]) => reject(err)));
  }
}

/** URL utilizable para un valor guardado (privado → enlace temporal). */
export function resolverArchivo(valor) {
  if (!esPrivado(valor)) return Promise.resolve(valor || null);
  const c = cache.get(valor);
  if (c && c.vence > Date.now()) return Promise.resolve(c.url);
  return new Promise((resolve, reject) => {
    if (!pendientes.has(valor)) pendientes.set(valor, []);
    pendientes.get(valor).push([resolve, reject]);
    // se agrupan las solicitudes del mismo momento (p. ej. una lista de fotos) en una sola llamada
    if (!temporizador) temporizador = setTimeout(firmarLote, 20);
  });
}

/** Resuelve varios valores a la vez (mismo orden). */
export const resolverArchivos = valores => Promise.all(valores.map(v => resolverArchivo(v).catch(() => null)));

/** Abre el archivo en otra pestaña. La pestaña se abre antes de esperar la firma para que el navegador no la bloquee. */
export async function abrirArchivo(valor) {
  if (!valor) return;
  if (!esPrivado(valor)) { window.open(valor, '_blank', 'noopener,noreferrer'); return; }
  const pestana = window.open('', '_blank');
  try {
    const url = await resolverArchivo(valor);
    if (pestana) pestana.location.href = url; else window.open(url, '_blank', 'noopener,noreferrer');
  } catch (err) {
    pestana?.close();
    throw err;
  }
}

/** URL ya disponible sin esperar (pública o firmada en caché vigente); null si hay que firmar. */
function urlInmediata(valor) {
  if (!esPrivado(valor)) return valor || null;
  const c = cache.get(valor);
  return c && c.vence > Date.now() ? c.url : null;
}

/** Hook: URL lista para <img src> / <Avatar src> / href. Mientras firma devuelve null. */
export function useArchivoUrl(valor) {
  const inmediato = urlInmediata(valor);
  const [firmada, setFirmada] = useState({ valor: null, url: null });

  useEffect(() => {
    if (!esPrivado(valor) || inmediato) return;
    let activo = true;
    resolverArchivo(valor)
      .then(url => { if (activo) setFirmada({ valor, url }); })
      .catch(() => { /* sin enlace: se muestra el marcador de posición (inicial / ícono) */ });
    return () => { activo = false; };
  }, [valor, inmediato]);

  return inmediato ?? (firmada.valor === valor ? firmada.url : null);
}
