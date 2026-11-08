import { describe, it, expect } from 'vitest';
import { validarArchivo, clasificarArchivo, LIMITES_ARCHIVO } from '@/shared/utils/archivosPermitidos';

const MB = 1024 * 1024;
/** Simula un File sin reservar memoria: solo importan name, type y size. */
const archivo = (name, type, size = 1000) => ({ name, type, size });

describe('clasificarArchivo', () => {
  it('reconoce imágenes y PDF por tipo MIME', () => {
    for (const t of LIMITES_ARCHIVO.imagen.mimes) expect(clasificarArchivo(archivo('x', t))).toBe('imagen');
    expect(clasificarArchivo(archivo('x', 'application/pdf'))).toBe('pdf');
  });

  it('rechaza tipos no admitidos aunque la extensión parezca válida', () => {
    expect(clasificarArchivo(archivo('foto.jpg', 'image/gif'))).toBeNull();
    expect(clasificarArchivo(archivo('doc.pdf', 'application/msword'))).toBeNull();
  });

  it('usa la extensión cuando el navegador no informa el tipo', () => {
    expect(clasificarArchivo(archivo('IMG_001.HEIC', ''))).toBe('imagen');
    expect(clasificarArchivo(archivo('acta.pdf', ''))).toBe('pdf');
    expect(clasificarArchivo(archivo('virus.exe', ''))).toBeNull();
  });
});

describe('validarArchivo', () => {
  it('acepta archivos válidos dentro del límite', () => {
    expect(validarArchivo(archivo('a.jpg', 'image/jpeg', 5 * MB), { tipos: 'imagen' })).toBeNull();
    expect(validarArchivo(archivo('a.pdf', 'application/pdf', 10 * MB), { tipos: 'pdf' })).toBeNull();
    expect(validarArchivo(archivo('a.webp', 'image/webp'), { tipos: 'ambos' })).toBeNull();
    expect(validarArchivo(archivo('a.pdf', 'application/pdf'))).toBeNull(); // 'ambos' por defecto
  });

  it('imagen de más de 5 MB', () => {
    const msg = validarArchivo(archivo('a.png', 'image/png', 5 * MB + 1), { tipos: 'imagen' });
    expect(msg).toMatch(/La imagen no puede superar 5 MB/);
  });

  it('PDF de más de 10 MB', () => {
    const msg = validarArchivo(archivo('a.pdf', 'application/pdf', 11 * MB), { tipos: 'ambos' });
    expect(msg).toMatch(/El PDF no puede superar 10 MB/);
  });

  it('una imagen de 8 MB no pasa aunque se acepten PDF (el límite depende del tipo)', () => {
    expect(validarArchivo(archivo('a.jpg', 'image/jpeg', 8 * MB), { tipos: 'ambos' })).toMatch(/5 MB/);
  });

  it('tipo no permitido según lo pedido', () => {
    expect(validarArchivo(archivo('a.pdf', 'application/pdf'), { tipos: 'imagen' }))
      .toBe('Solo se permiten imágenes JPG, PNG o WEBP.');
    expect(validarArchivo(archivo('a.jpg', 'image/jpeg'), { tipos: 'pdf' }))
      .toBe('Solo se permiten archivos PDF.');
    expect(validarArchivo(archivo('a.gif', 'image/gif'), { tipos: 'ambos' }))
      .toMatch(/JPG, PNG o WEBP, o archivos PDF/);
  });

  it('archivo vacío o ausente', () => {
    expect(validarArchivo(archivo('a.jpg', 'image/jpeg', 0), { tipos: 'imagen' })).toMatch(/vacío/);
    expect(validarArchivo(null)).toBe('Selecciona un archivo.');
  });
});
