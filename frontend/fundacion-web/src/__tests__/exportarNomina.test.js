import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sin red ni navegador: se simulan el registro de exportaciones y jsPDF
const { registrarExportacion, exportarExcel, paginas, JsPDFFalso } = vi.hoisted(() => {
  const paginas = [];
  class JsPDFFalso {
    constructor() { this.textos = [[]]; paginas.push(this.textos[0]); this.guardado = null; JsPDFFalso.ultimo = this; }
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addPage() { const p = []; this.textos.push(p); paginas.push(p); }
    text(t) { this.textos.at(-1).push(Array.isArray(t) ? t.join(' ') : String(t)); }
    splitTextToSize(t) { return [t]; }
    save(nombre) { this.guardado = nombre; }
  }
  for (const m of ['setFillColor', 'rect', 'setTextColor', 'setFont', 'setFontSize', 'setDrawColor',
    'setLineWidth', 'roundedRect', 'line'])
    JsPDFFalso.prototype[m] = () => {};
  return { registrarExportacion: vi.fn(), exportarExcel: vi.fn(async () => true), paginas, JsPDFFalso };
});
vi.mock('@/shared/utils/exportarExcel', () => ({ exportarExcel, registrarExportacion }));
vi.mock('jspdf', () => ({ default: JsPDFFalso }));

const { filasNominaExcel, exportarNominaExcel, generarDesprendiblesPDF } =
  await import('@/presentation/modules/talento_humano/pages/components/exportarNomina');

const liq = (id, nombre, neto, extra = {}) => ({
  id, empleadoNombre: nombre, numeroDocumento: `10${id}`, cargo: 'Docente', diasTrabajados: 30,
  salarioBase: 1_500_000, auxilioTransporte: 200_000, horasExtras: 0, bonificaciones: 0,
  deduccionSalud: 60_000, deduccionPension: 60_000, retencionFuente: 0, otrasDeducciones: 0,
  totalDevengado: 1_700_000, totalDeducciones: 120_000, netoPagar: neto, observacion: null, ...extra,
});

const PERIODO = { id: 1, mes: 10, anio: 2026, estado: 'borrador' };

beforeEach(() => { paginas.length = 0; vi.clearAllMocks(); });

describe('nómina: Excel del período', () => {
  it('una fila por empleado con todas las columnas y una fila de totales', () => {
    const filas = filasNominaExcel([liq(1, 'Ana Pérez', 1_580_000), liq(2, 'Luis Gómez', 1_000_000)]);
    expect(filas).toHaveLength(4);
    expect(filas[0]).toEqual([
      'Documento', 'Empleado', 'Cargo', 'Días trabajados', 'Salario mensual', 'Salario del período', 'Auxilio transporte',
      'Horas extras', 'Bonificaciones', 'Deducción salud', 'Deducción pensión', 'Retención fuente',
      'Otras deducciones', 'Total devengado', 'Total deducciones', 'Neto a pagar',
    ]);
    expect(filas[1].slice(0, 5)).toEqual(['101', 'Ana Pérez', 'Docente', 30, 1_500_000]);
    const total = filas.at(-1);
    expect(total[0]).toBe('TOTAL');
    expect(total.at(-1)).toBe(2_580_000);
    expect(total[4]).toBe(3_000_000);
  });

  it('con días incompletos muestra el salario mensual y el del período', () => {
    // 15 de 30 días: salario 750.000 y auxilio 100.000 → devengado 850.000
    const quincena = liq(3, 'Eva Ruiz', 0, { diasTrabajados: 15, auxilioTransporte: 100_000, totalDevengado: 850_000 });
    const [, fila] = filasNominaExcel([quincena]);
    expect(fila.slice(3, 7)).toEqual([15, 1_500_000, 750_000, 100_000]);
  });

  it('el registro de la exportación cuenta empleados, no la fila de totales', async () => {
    const lista = [liq(1, 'Ana Pérez', 1)];
    await exportarNominaExcel(PERIODO, lista);
    const [nombre, [hoja]] = exportarExcel.mock.calls[0];
    expect(nombre).toBe('nomina_octubre_2026');
    expect(hoja.datos).toBe(lista);
    expect(hoja.filas).toHaveLength(3);
  });
});

describe('nómina: desprendibles de pago en PDF', () => {
  const config = { nombreFundacion: 'Fundación Prueba', nit: '900123456-7', direccion: 'Calle 1 # 2-3' };

  it('una página por empleado con encabezado de la fundación y el neto', async () => {
    const lista = [liq(1, 'Ana Pérez', 1_580_000), liq(2, 'José Núñez', 990_000, { observacion: 'Ajuste' })];
    expect(await generarDesprendiblesPDF(PERIODO, lista, config)).toBe(true);

    expect(paginas).toHaveLength(2);
    expect(paginas[0]).toContain('Fundación Prueba');
    expect(paginas[0].some(t => t.includes('NIT 900123456-7'))).toBe(true);
    expect(paginas[0]).toContain('DESPRENDIBLE DE PAGO DE NÓMINA');
    expect(paginas[0]).toContain('Período: Octubre 2026');
    expect(paginas[0]).toContain('Ana Pérez');
    expect(paginas[1]).toContain('José Núñez');
    expect(paginas[1]).toContain('Ajuste');
    expect(JsPDFFalso.ultimo.guardado).toBe('desprendible_octubre_2026_todos.pdf');
    expect(registrarExportacion).toHaveBeenCalledWith('desprendible_octubre_2026_todos', [{ datos: lista }]);
  });

  it('con un solo empleado el archivo lleva su nombre', async () => {
    await generarDesprendiblesPDF(PERIODO, [liq(3, 'María José Ñañez', 1)], config);
    expect(JsPDFFalso.ultimo.guardado).toBe('desprendible_octubre_2026_maria_jose_nanez.pdf');
  });

  it('sin liquidaciones no genera nada', async () => {
    expect(await generarDesprendiblesPDF(PERIODO, [], config)).toBe(false);
    expect(registrarExportacion).not.toHaveBeenCalled();
  });
});
