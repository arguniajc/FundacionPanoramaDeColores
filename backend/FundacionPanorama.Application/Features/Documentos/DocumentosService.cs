using FundacionPanorama.Application.Features.Documentos.DTOs;
using FundacionPanorama.Application.Features.Documentos.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Documentos;

/// <summary>
/// Documentos institucionales y archivos de beneficiarios. La URL se abre en el panel
/// (window.open), así que solo se acepta una referencia "privado://…" del almacenamiento o
/// un enlace https (del propio Supabase cuando el controller indica su origen): nunca
/// "javascript:", "data:" ni otros esquemas. Un dato inválido lanza DatoInvalidoException (400).
/// </summary>
public class DocumentosService(IDocumentosRepository repo)
{
    /// <summary>Categorías del panel (documentos/helpers.js).</summary>
    public static readonly string[] Categorias = ["Actas", "Políticas", "Formularios", "Informes", "Certificados", "Otros"];

    public const string PrefijoPrivado = "privado://";

    // Columnas: documentos_institucionales.titulo / nombre_original VARCHAR(200), categoria VARCHAR(50);
    // archivos.nombre_original VARCHAR(200)
    const int MaxTitulo = 200;
    const int MaxNombre = 200;

    public Task<IReadOnlyList<DocumentoInstitucionalDto>> ListarAsync(string? categoria, CancellationToken ct = default)
        => repo.ListarAsync(categoria, ct);

    /// <param name="origenPublicoPermitido">
    /// Prefijo https permitido para enlaces públicos (p. ej. "https://xyz.supabase.co/storage/v1/object/public/").
    /// Null = se acepta cualquier https.
    /// </param>
    public Task<Guid> CrearAsync(CrearDocumentoDto dto, string email, string? origenPublicoPermitido = null, CancellationToken ct = default)
    {
        Obligatorio(dto.Titulo, "El título es obligatorio. Ejemplo: Acta de asamblea 2025");
        Largo(dto.Titulo, MaxTitulo, "El título");
        Largo(dto.NombreOriginal, MaxNombre, "El nombre del archivo");
        EnLista(dto.Categoria, Categorias, "La categoría no es válida (Actas, Políticas, Formularios, Informes, Certificados u Otros).");
        ValidarUrl(dto.Url, origenPublicoPermitido);
        return repo.CrearAsync(dto with { Categoria = dto.Categoria.Trim() }, email, ct);
    }

    public Task<DocumentoEliminado?> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);

    public Task<IReadOnlyList<ArchivoBeneficiarioDto>> ListarPorBeneficiarioAsync(Guid beneficiarioId, CancellationToken ct = default)
        => repo.ListarPorBeneficiarioAsync(beneficiarioId, ct);

    public Task<Guid?> GuardarArchivoBeneficiarioAsync(Guid beneficiarioId, GuardarArchivoDto dto,
        string? origenPublicoPermitido = null, CancellationToken ct = default)
    {
        Largo(dto.Titulo, MaxNombre, "El título");
        Largo(dto.NombreOriginal, MaxNombre, "El nombre del archivo");
        ValidarUrl(dto.Url, origenPublicoPermitido);
        return repo.GuardarArchivoBeneficiarioAsync(beneficiarioId, dto, ct);
    }

    public Task<DocumentoEliminado?> EliminarArchivoAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarArchivoAsync(id, ct);

    /// <summary>Solo "privado://carpeta/archivo" o https (del origen permitido, si se indica).</summary>
    public static void ValidarUrl(string? url, string? origenPublicoPermitido)
    {
        const string mensaje = "El enlace del archivo no es válido. Vuelve a subir el archivo.";
        Obligatorio(url, mensaje);
        var u = url!.Trim();
        // Sin espacios ni caracteres de control: los navegadores los ignoran dentro del esquema
        Exigir(!u.Any(c => char.IsWhiteSpace(c) || char.IsControl(c)), mensaje);

        if (u.StartsWith(PrefijoPrivado, StringComparison.Ordinal))
        {
            var ruta = u[PrefijoPrivado.Length..];
            Exigir(ruta.Length > 0 && !ruta.Contains("..") && !ruta.StartsWith('/'), mensaje);
            return;
        }

        Exigir(Uri.TryCreate(u, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps, mensaje);
        if (!string.IsNullOrWhiteSpace(origenPublicoPermitido))
            Exigir(u.StartsWith(origenPublicoPermitido, StringComparison.OrdinalIgnoreCase), mensaje);
    }
}
