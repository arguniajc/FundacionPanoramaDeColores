import { describe, it, expect } from 'vitest';
import { validarEsquema } from '@/shared/utils/validacion';
import {
  ESQUEMA_EDITAR_INSTITUCIONAL, ESQUEMA_EDITAR_BENEFICIARIO, formEdicion, datosEdicion,
} from '@/presentation/modules/documentos/pages/components/edicionDocumento';

// Mismas reglas que DocumentosService.EditarAsync / EditarArchivoAsync
const doc = { id: 'd1', titulo: 'Acta 2025', categoria: 'Actas', descripcion: null, url: 'privado://x.pdf' };

describe('documentos: edición', () => {
  it('el formulario parte de los datos del documento (sin el archivo)', () => {
    expect(formEdicion(doc, true)).toEqual({ titulo: 'Acta 2025', categoria: 'Actas', descripcion: '' });
    expect(formEdicion({ nombreOriginal: 'cert.pdf' }, false)).toEqual({ titulo: 'cert.pdf' });
  });

  it('institucional: título obligatorio (máx. 200), categoría de la lista, descripción máx. 1000', () => {
    const e = f => validarEsquema(ESQUEMA_EDITAR_INSTITUCIONAL, { ...formEdicion(doc, true), ...f });
    expect(e({})).toEqual({});
    expect(e({ titulo: '  ' }).titulo).toMatch(/obligatorio/i);
    expect(e({ titulo: 'a'.repeat(201) }).titulo).toMatch(/200/);
    expect(e({ categoria: 'Contratos' }).categoria).toMatch(/lista/);
    expect(e({ categoria: '' }).categoria).toMatch(/Selecciona/);
    expect(e({ descripcion: 'd'.repeat(1001) }).descripcion).toMatch(/1000/);
  });

  it('beneficiario: solo el nombre, obligatorio y de máx. 200', () => {
    const e = f => validarEsquema(ESQUEMA_EDITAR_BENEFICIARIO, f);
    expect(e({ titulo: 'cert.pdf' })).toEqual({});
    expect(e({ titulo: '' }).titulo).toMatch(/obligatorio/i);
    expect(e({ titulo: 'a'.repeat(201) }).titulo).toMatch(/200/);
  });

  it('cuerpo del PUT: textos recortados y descripción vacía como null; nunca la URL', () => {
    expect(datosEdicion({ titulo: ' Acta ', categoria: 'Informes', descripcion: '   ' }, true))
      .toEqual({ titulo: 'Acta', categoria: 'Informes', descripcion: null });
    expect(datosEdicion({ titulo: 'Acta', categoria: 'Actas', descripcion: ' Asamblea ' }, true).descripcion).toBe('Asamblea');
    expect(datosEdicion({ titulo: ' cert.pdf ' }, false)).toEqual({ nombre: 'cert.pdf' });
  });
});
