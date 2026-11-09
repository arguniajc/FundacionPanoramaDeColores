// Cupos de un programa: cuántos inscritos activos tiene frente a su cupo máximo.
// El backend envía `cupoMaximo` (null = sin límite) e `inscritosActivos` (misma regla que el
// control de cupo al inscribir). Si `inscritosActivos` no llega, solo se muestra el cupo máximo.

/** Desde este porcentaje de ocupación el programa se marca en ámbar ("casi lleno"). */
export const UMBRAL_CASI_LLENO = 0.8;

/**
 * Estado del cupo de un programa.
 * @returns {{ limitado: boolean, conocido: boolean, inscritos: number|null, cupo: number|null,
 *   disponibles: number|null, porcentaje: number|null, lleno: boolean,
 *   tono: 'exito'|'aviso'|'error'|'neutro', texto: string }}
 */
export function estadoCupo(programa) {
  const { cupoMaximo, inscritosActivos } = programa ?? {};
  const n = Number(inscritosActivos);
  const inscritos = inscritosActivos != null && Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
  const cupo = Number(cupoMaximo) > 0 ? Math.trunc(Number(cupoMaximo)) : null;
  const conocido = inscritos !== null;

  if (cupo === null) {
    const texto = conocido
      ? `Sin límite de cupos · ${inscritos} ${inscritos === 1 ? 'inscrito' : 'inscritos'}`
      : 'Sin límite de cupos';
    return { limitado: false, conocido, inscritos, cupo, disponibles: null, porcentaje: null, lleno: false, tono: 'neutro', texto };
  }
  if (!conocido)
    return { limitado: true, conocido, inscritos, cupo, disponibles: null, porcentaje: null, lleno: false, tono: 'neutro', texto: `Cupo máximo: ${cupo}` };

  const porcentaje = Math.min(1, inscritos / cupo);
  const lleno = inscritos >= cupo;
  const tono = lleno ? 'error' : porcentaje >= UMBRAL_CASI_LLENO ? 'aviso' : 'exito';
  return {
    limitado: true, conocido, inscritos, cupo, disponibles: Math.max(0, cupo - inscritos),
    porcentaje, lleno, tono, texto: `${inscritos} de ${cupo} cupos`,
  };
}
