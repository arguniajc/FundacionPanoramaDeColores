// CRUD completo de beneficiarios (niños inscritos). La mayoría de endpoints requieren JWT.
// Regla de negocio: los beneficiarios no se eliminan permanentemente desde la UI,
// solo se "dan de baja" (activo=false). El DELETE existe para limpieza de datos por admin.
// Solo HTTP: binding, permisos, caché y códigos de estado. Reglas en BeneficiariosService,
// SQL en BeneficiariosRepository.
using FundacionPanorama.API.Filters;
using FundacionPanorama.Application.Features.Beneficiarios;
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace FundacionPanorama.API.Controllers;

[ApiController]
[Route("api/beneficiarios")]
public class BeneficiariosController : BaseController
{
    private readonly BeneficiariosService _svc;
    private readonly IMemoryCache _cache;

    public BeneficiariosController(BeneficiariosService svc, IMemoryCache cache)
    {
        _svc   = svc;
        _cache = cache;
    }

    // =========================================================================
    // GET api/beneficiarios?pagina=1&porPagina=10&buscar=...&estado=activos|baja|todos
    // =========================================================================
    [HttpGet]
    [RequierePermiso("beneficiarios", "ver")]
    public async Task<IActionResult> Listar(
        [FromQuery] int     pagina       = 1,
        [FromQuery] int     porPagina    = 10,
        [FromQuery] string? buscar       = null,
        [FromQuery] string  estado       = "activos",
        [FromQuery] string? genero       = null,
        [FromQuery] int?    edadMin      = null,
        [FromQuery] int?    edadMax      = null,
        [FromQuery] string? eps          = null,
        [FromQuery] string? tieneAlergia = null,
        [FromQuery] string? tipo         = null,
        CancellationToken ct = default)
        => Ok(await _svc.ListarAsync(pagina, porPagina, buscar, estado, genero, edadMin, edadMax, eps, tieneAlergia, tipo, ct));

    // =========================================================================
    // GET api/beneficiarios/stats
    // =========================================================================
    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> Stats([FromQuery] string? tipo = null, CancellationToken ct = default)
    {
        bool   filtrarTipo   = tipo == "niño" || tipo == "adulto";
        string cacheKeyStr   = filtrarTipo ? $"stats_{tipo!.Trim()}" : "stats";
        if (_cache.TryGetValue(cacheKeyStr, out object? cached)) return Ok(cached);

        var statsDto = await _svc.ObtenerStatsAsync(tipo, ct);
        _cache.Set(cacheKeyStr, (object)statsDto, TimeSpan.FromMinutes(10));
        return Ok(statsDto);
    }

    // =========================================================================
    // GET api/beneficiarios/incompletos
    // Devuelve hasta 60 beneficiarios activos con campos de calidad vacíos,
    // ordenados por cantidad de campos faltantes (más incompleto primero).
    // =========================================================================
    [HttpGet("incompletos")]
    [RequierePermiso("beneficiarios", "ver")]
    public async Task<IActionResult> Incompletos([FromQuery] string? tipo = null, CancellationToken ct = default)
        => Ok(await _svc.ListarIncompletosAsync(tipo, ct));

    // =========================================================================
    // GET api/beneficiarios/stats-ninos
    // =========================================================================
    [HttpGet("stats-ninos")]
    [Authorize]
    public async Task<IActionResult> StatsNinos(CancellationToken ct)
    {
        if (_cache.TryGetValue("stats_ninos", out object? cached)) return Ok(cached);

        var ninosDto = await _svc.ObtenerStatsNinosAsync(ct);
        _cache.Set("stats_ninos", ninosDto, TimeSpan.FromMinutes(10));
        return Ok(ninosDto);
    }

    // =========================================================================
    // GET api/beneficiarios/{id}
    // =========================================================================
    [HttpGet("{id:guid}")]
    [RequierePermiso("beneficiarios", "ver")]
    public async Task<IActionResult> ObtenerPorId(Guid id, CancellationToken ct = default)
    {
        var dto = await _svc.ObtenerAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    // =========================================================================
    // GET api/beneficiarios/verificar-documento/{numero}
    // =========================================================================
    [HttpGet("verificar-documento/{numero}")]
    [RequiereAlgunPermiso("beneficiarios:crear", "beneficiarios:editar")]
    public async Task<IActionResult> VerificarDocumento(string numero, CancellationToken ct = default)
        => Ok(new { existe = await _svc.ExisteDocumentoAsync(numero, ct) });

    // =========================================================================
    // POST api/beneficiarios
    // =========================================================================
    [HttpPost]
    [RequierePermiso("beneficiarios", "crear")]
    public async Task<IActionResult> Crear([FromBody] CrearBeneficiarioDto dto)
    {
        var res = await _svc.CrearAsync(dto, EmailUsuario);
        return res.Estado switch
        {
            EstadoResultado.Invalido  => BadRequest(new { mensaje = string.Join(" ", res.Errores), errores = res.Errores }),
            EstadoResultado.Conflicto => Conflict(new { mensaje = res.Mensaje }),
            _ => CreatedAtAction(nameof(ObtenerPorId), new { id = res.Valor!.Id }, res.Valor),
        };
    }

    // =========================================================================
    // PUT api/beneficiarios/{id}
    // =========================================================================
    [HttpPut("{id:guid}")]
    [RequierePermiso("beneficiarios", "editar")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearBeneficiarioDto dto)
    {
        var res = await _svc.ActualizarAsync(id, dto, EmailUsuario);
        return res.Estado switch
        {
            EstadoResultado.Invalido     => BadRequest(new { mensaje = string.Join(" ", res.Errores), errores = res.Errores }),
            EstadoResultado.NoEncontrado => NotFound(),
            EstadoResultado.Conflicto    => Conflict(new { mensaje = res.Mensaje }),
            _ => Ok(res.Valor),
        };
    }

    // =========================================================================
    // PATCH api/beneficiarios/{id}/baja
    // =========================================================================
    [HttpPatch("{id:guid}/baja")]
    [RequierePermiso("beneficiarios", "editar")]
    public async Task<IActionResult> DarDeBaja(Guid id, [FromBody] DarDeBajaDto? dto)
    {
        if (!EsAdmin()) return StatusCode(403, new { mensaje = "Solo un administrador puede hacer esta acción." });
        var result = await _svc.DarDeBajaAsync(id, dto?.Motivo, EmailUsuario);
        return result is null ? NotFound() : Ok(result);
    }

    // =========================================================================
    // PATCH api/beneficiarios/{id}/reactivar
    // =========================================================================
    [HttpPatch("{id:guid}/reactivar")]
    [RequierePermiso("beneficiarios", "editar")]
    public async Task<IActionResult> Reactivar(Guid id)
    {
        // Igual que dar de baja: solo un administrador (el panel solo le muestra el botón a él)
        if (!EsAdmin()) return StatusCode(403, new { mensaje = "Solo un administrador puede hacer esta acción." });
        var result = await _svc.ReactivarAsync(id, EmailUsuario);
        return result is null ? NotFound() : Ok(result);
    }

    // =========================================================================
    // DELETE api/beneficiarios/{id}
    // =========================================================================
    [HttpDelete("{id:guid}")]
    [RequierePermiso("beneficiarios", "eliminar")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        if (!EsAdmin()) return StatusCode(403, new { mensaje = "Solo un administrador puede hacer esta acción." });

        var res = await _svc.EliminarAsync(id, EmailUsuario);
        return res.Estado switch
        {
            EstadoResultado.NoEncontrado => NotFound(),
            EstadoResultado.Conflicto    => Conflict(new { mensaje = res.Mensaje }),
            _ => NoContent(),
        };
    }

    // Devuelve true si el JWT corresponde a un administrador.
    private bool EsAdmin()
    {
        var rol = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        return rol is "administrador" or "Admin";
    }

    // =========================================================================
    // GET api/beneficiarios/{id}/historial
    // =========================================================================
    [HttpGet("{id:guid}/historial")]
    [RequierePermiso("beneficiarios", "ver")]
    public async Task<IActionResult> Historial(Guid id, [FromQuery] int limite = 50, CancellationToken ct = default)
        => Ok(await _svc.HistorialAsync(id, limite, ct));

    // =========================================================================
    // POST api/beneficiarios/importar-xlsx
    // =========================================================================
    [HttpPost("importar-xlsx")]
    [RequierePermiso("beneficiarios", "crear")]
    public async Task<IActionResult> ImportarXlsx(
        [FromBody] List<ImportarBeneficiarioRowDto> filas, CancellationToken ct)
    {
        var res = await _svc.ImportarFilasAsync(filas, EmailUsuario, ct);
        return res.Estado == EstadoResultado.Invalido
            ? BadRequest(new { mensaje = res.Mensaje })
            : Ok(res.Valor);
    }
}
