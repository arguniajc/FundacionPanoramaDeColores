import { describe, it, expect, vi } from 'vitest';

// pdf.js importa archivos.js, que usa el cliente HTTP: no hace falta en estas pruebas
vi.mock('@/infrastructure/http/apiClient', () => ({ default: { post: vi.fn() } }));

const { escaparHtml, escaparCampos, urlImagenSegura } = await import('@/shared/utils/pdf');

describe('hoja de vida: datos escapados', () => {
  it('escapa etiquetas, comillas y &', () => {
    expect(escaparHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escaparHtml("O'Neil & Cía")).toBe('O&#39;Neil &amp; Cía');
  });

  it('escapa solo los textos del registro y deja números y booleanos', () => {
    const r = escaparCampos({ nombreMenor: '<b>Ana</b>', pesoKg: 30, tieneDiscapacidad: false, eps: null });
    expect(r).toEqual({ nombreMenor: '&lt;b&gt;Ana&lt;/b&gt;', pesoKg: 30, tieneDiscapacidad: false, eps: null });
  });

  it('solo acepta fotos con enlace https', () => {
    expect(urlImagenSegura('https://x.supabase.co/storage/v1/object/sign/a.jpg?token=1')).toMatch(/^https:/);
    expect(urlImagenSegura('javascript:alert(1)')).toBeNull();
    expect(urlImagenSegura('data:text/html,<script>')).toBeNull();
    expect(urlImagenSegura(null)).toBeNull();
  });
});
