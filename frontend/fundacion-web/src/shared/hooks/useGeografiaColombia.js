import { useState, useEffect } from 'react';

const BASE = 'https://api-colombia.com/api/v1';

export function useGeografiaColombia(nombreDepartamento) {
  const [depsData, setDepsData]         = useState([]); // [{ id, nombre }]
  const [ciudades, setCiudades]         = useState([]);
  const [cargandoCiudades, setCargando] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/Department`)
      .then(r => r.json())
      .then(data => setDepsData(data.map(d => ({ id: d.id, nombre: d.name })).sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!nombreDepartamento) { setCiudades([]); return; }
    const dep = depsData.find(d => d.nombre.toLowerCase() === nombreDepartamento.toLowerCase());
    if (!dep) { setCiudades([]); return; }
    setCargando(true);
    fetch(`${BASE}/Department/${dep.id}/cities`)
      .then(r => r.json())
      .then(data => setCiudades(data.map(c => c.name).sort()))
      .catch(() => setCiudades([]))
      .finally(() => setCargando(false));
  }, [nombreDepartamento, depsData]);

  return {
    departamentos: depsData.map(d => d.nombre),
    ciudades,
    cargandoCiudades,
  };
}
