using FundacionPanorama.Application.Features.Donantes.DTOs;
using FundacionPanorama.Application.Features.Donantes.Interfaces;
using static FundacionPanorama.Application.Shared.Validar;

namespace FundacionPanorama.Application.Features.Donantes;

public class DonantesService(IDonantesRepository repo)
{
    /// <summary>Tipos del panel (DonanteDialog.jsx). Vacío = "persona" (lo pone el repositorio).</summary>
    public static readonly string[] Tipos = ["persona", "empresa"];

    static void ValidarDonante(CrearDonanteDto dto)
    {
        Obligatorio(dto.Nombre, "El nombre es obligatorio. Ejemplo: Ferretería El Tornillo");
        Largo(dto.Nombre, 200, "El nombre");
        Exigir(string.IsNullOrWhiteSpace(dto.Tipo) || Tipos.Contains(dto.Tipo), "El tipo de donante no es válido (persona o empresa).");
        Correo(dto.Email, 150, "El correo", "nombre@empresa.com");
    }

    public Task<IReadOnlyList<DonanteDto>> ListarAsync(string? buscar, bool soloActivos, int pagina, int porPagina, CancellationToken ct = default)
        => repo.ListarAsync(buscar, soloActivos, Math.Max(pagina, 1), Math.Clamp(porPagina, 1, 500), ct);

    public Task<DonanteDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<DonanteDto> CrearAsync(CrearDonanteDto dto, CancellationToken ct = default)
    {
        ValidarDonante(dto);
        return repo.CrearAsync(dto, ct);
    }

    public Task<DonanteDto?> ActualizarAsync(Guid id, CrearDonanteDto dto, CancellationToken ct = default)
    {
        ValidarDonante(dto);
        return repo.ActualizarAsync(id, dto, ct);
    }

    /// <summary>
    /// Documento comparable: sin puntos, espacios ni guiones, en minúsculas y sin el dígito de
    /// verificación del NIT ("900.123.456-8" → "900123456"). El número identifica al donante sin
    /// importar el tipo: el NIT de una persona natural es su cédula más el DV.
    /// </summary>
    public static string NormalizarDocumento(string? numero)
    {
        var s = (numero ?? "").Trim().ToLowerInvariant();
        var guion = s.LastIndexOf('-');
        // "<dígitos>-<1 dígito>" = NIT con DV: el DV no cuenta para comparar.
        if (guion > 0 && guion == s.Length - 2 && char.IsDigit(s[^1])
            && s[..guion].All(c => char.IsDigit(c) || c == '.' || c == ' '))
            s = s[..guion];
        return new string(s.Where(c => c is (>= '0' and <= '9') or (>= 'a' and <= 'z')).ToArray());
    }

    /// <summary>Otro donante con el mismo documento (null si nadie lo tiene o el número está vacío).</summary>
    public Task<DonanteExistente?> BuscarDocumentoAsync(string? numero, Guid? excluirId, CancellationToken ct = default)
    {
        var normalizado = NormalizarDocumento(numero);
        return normalizado.Length == 0
            ? Task.FromResult<DonanteExistente?>(null)
            : repo.BuscarDocumentoAsync(normalizado, excluirId, ct);
    }

    public Task<bool?> ToggleAsync(Guid id, CancellationToken ct = default)
        => repo.ToggleAsync(id, ct);

    public Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
        => repo.EliminarAsync(id, ct);
}
