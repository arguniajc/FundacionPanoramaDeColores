// Reglas del módulo Beneficiarios (niños inscritos y adultos). Regla de negocio: los
// beneficiarios no se eliminan permanentemente desde la UI, solo se "dan de baja"
// (activo=false). El DELETE existe para limpieza de datos por admin.
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Application.Features.Beneficiarios.Interfaces;
using FundacionPanorama.Application.Shared;
using FundacionPanorama.Domain.Shared;

namespace FundacionPanorama.Application.Features.Beneficiarios;

public class BeneficiariosService(IBeneficiariosRepository repo)
{
    // ── Lecturas ──────────────────────────────────────────────────────────────

    /// <summary>Listado para pantallas: resumen sin datos sensibles (ver BeneficiarioResumenDto).</summary>
    public async Task<ListaPaginada<BeneficiarioResumenDto>> ListarAsync(
        int pagina, int porPagina, string? buscar, string estado, string? genero,
        int? edadMin, int? edadMax, string? eps, string? tieneAlergia, string? tipo,
        CancellationToken ct = default)
    {
        var completo = await ListarCompletoAsync(pagina, porPagina, buscar, estado, genero, edadMin, edadMax, eps, tieneAlergia, tipo, ct);
        return new ListaPaginada<BeneficiarioResumenDto>
        {
            Data      = completo.Data.Select(BeneficiarioResumenDto.Desde).ToList(),
            Total     = completo.Total,
            Pagina    = completo.Pagina,
            PorPagina = completo.PorPagina,
        };
    }

    /// <summary>Listado con la ficha completa: solo para la exportación (permiso beneficiarios:exportar).</summary>
    public Task<ListaPaginada<BeneficiarioDto>> ListarCompletoAsync(
        int pagina, int porPagina, string? buscar, string estado, string? genero,
        int? edadMin, int? edadMax, string? eps, string? tieneAlergia, string? tipo,
        CancellationToken ct = default)
    {
        pagina    = Math.Max(1, pagina);
        porPagina = Math.Clamp(porPagina, 1, 100);
        var filtro = new FiltroBeneficiarios(buscar, estado, genero, edadMin, edadMax, eps, tieneAlergia, tipo);
        return repo.ListarAsync(filtro, pagina, porPagina, ct);
    }

    public Task<BeneficiarioStatsDto> ObtenerStatsAsync(string? tipo, CancellationToken ct = default)
        => repo.ObtenerStatsAsync(tipo, ct);

    // Hasta 60 beneficiarios activos con campos de calidad vacíos, del menos completo al más completo.
    // La regla es la misma del resumen del listado (CompletitudPerfil).
    public const int MaxIncompletos = 60;

    public async Task<List<PerfilIncompletoDto>> ListarIncompletosAsync(string? tipo, CancellationToken ct = default)
    {
        var filas = await repo.ListarIncompletosAsync(tipo, ct);
        return filas
            .Select(f => (Fila: f, Eval: CompletitudPerfil.Evaluar(f.Datos)))
            .Where(x => x.Eval.Faltantes.Count > 0)
            .OrderBy(x => x.Eval.Porcentaje)          // niños y adultos tienen distinto número de campos
            .ThenBy(x => x.Fila.Nombre, StringComparer.CurrentCulture)
            .Take(MaxIncompletos)
            .Select(x => new PerfilIncompletoDto
            {
                Id          = x.Fila.Id,
                Nombre      = x.Fila.Nombre,
                FotoUrl     = x.Fila.Datos.FotoMenorUrl,
                Faltantes   = [.. x.Eval.Faltantes],
                Completitud = x.Eval.Porcentaje,
            })
            .ToList();
    }

    // La forma del objeto (anónimo) es el contrato JSON de GET stats-ninos: no cambiarla.
    public async Task<object> ObtenerStatsNinosAsync(CancellationToken ct = default)
    {
        var d = await repo.ObtenerStatsNinosAsync(ct);

        var porRango = new object[]
        {
            new { Codigo = "PI",  Nombre = "Primera infancia",  rango = "0 a 5 años",   total = d.PI  },
            new { Codigo = "IN1", Nombre = "Infancia inicial",  rango = "6 a 8 años",   total = d.IN1 },
            new { Codigo = "IN2", Nombre = "Infancia media",    rango = "9 a 11 años",  total = d.IN2 },
            new { Codigo = "PA",  Nombre = "Preadolescencia",   rango = "12 a 13 años", total = d.PA  },
            new { Codigo = "AD",  Nombre = "Adolescencia",      rango = "14 a 16 años", total = d.AD  },
        };

        var topPaises = new List<object>();
        foreach (var p in d.TopPaises)
            topPaises.Add(new { pais = p.Pais, total = p.Total });

        var departamentosConCiudades = d.DeptoRows
            .GroupBy(x => x.Depto)
            .Select(g => new {
                departamento = g.Key,
                total        = g.Sum(x => x.Total),
                ciudades     = g
                    .Where(x => x.Ciudad != "")
                    .OrderByDescending(x => x.Total)
                    .Take(10)
                    .Select(x => new { ciudad = x.Ciudad, total = x.Total })
                    .ToList()
            })
            .OrderByDescending(g => g.total)
            .Take(15)
            .ToList();

        var porGenero = new List<object>();
        foreach (var g in d.PorGenero)
            porGenero.Add(new { genero = g.Genero, total = g.Total });

        int totalActivos = d.TotalActivos, sinEdad = d.SinEdad, extranjeros = d.Extranjeros, otraRegion = d.OtraRegion;
        return new {
            totalActivos,
            sinEdad,
            extranjeros,
            otraRegion,
            porRango,
            topPaises,
            departamentosConCiudades,
            porGenero,
        };
    }

    public Task<BeneficiarioDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
        => repo.ObtenerAsync(id, ct);

    public Task<bool> ExisteDocumentoAsync(string numero, CancellationToken ct = default)
        => repo.ExisteDocumentoAsync(numero, ct);

    /// <summary>
    /// Beneficiario que ya tiene ese número de documento (null si nadie lo tiene). Al editar se pasa
    /// el id propio en <paramref name="excluirId"/> para no encontrarse a sí mismo.
    /// </summary>
    public Task<DocumentoExistente?> BuscarDocumentoAsync(string numero, Guid? excluirId, CancellationToken ct = default)
        => repo.BuscarDocumentoAsync(numero.Trim(), excluirId, ct);

    // La forma del objeto (anónimo) es el contrato JSON de GET {id}/historial: no cambiarla.
    public async Task<List<object>> HistorialAsync(Guid id, int limite, CancellationToken ct = default)
    {
        limite = Math.Clamp(limite, 1, 200);
        var filas  = await repo.HistorialAsync(id, limite, ct);
        var result = new List<object>();
        foreach (var f in filas)
        {
            result.Add(new
            {
                id           = f.Id,
                accion       = f.Accion,
                usuarioEmail = f.UsuarioEmail,
                detalle      = f.Detalle,
                fecha        = f.Fecha,
            });
        }
        return result;
    }

    // ── Escrituras ────────────────────────────────────────────────────────────

    public async Task<ResultadoBeneficiario<BeneficiarioDto>> CrearAsync(
        CrearBeneficiarioDto dto, string? usuarioEmail, CancellationToken ct = default)
    {
        var errVal = ValidacionBeneficiario.Validar(dto);
        if (errVal.Count > 0) return ResultadoBeneficiario<BeneficiarioDto>.Invalido(errVal);
        ValidacionBeneficiario.Normalizar(dto);

        var newId = await repo.CrearAsync(dto, usuarioEmail, ct);
        if (newId is null)
            return ResultadoBeneficiario<BeneficiarioDto>.Conflicto("Este número de documento ya está inscrito.");

        return ResultadoBeneficiario<BeneficiarioDto>.Ok(await CargarExistenteAsync(newId.Value, ct));
    }

    public async Task<ResultadoBeneficiario<BeneficiarioDto>> ActualizarAsync(
        Guid id, CrearBeneficiarioDto dto, string? usuarioEmail, CancellationToken ct = default)
    {
        var errVal = ValidacionBeneficiario.Validar(dto);
        if (errVal.Count > 0) return ResultadoBeneficiario<BeneficiarioDto>.Invalido(errVal);
        ValidacionBeneficiario.Normalizar(dto);

        switch (await repo.ActualizarAsync(id, dto, usuarioEmail, ct))
        {
            case EstadoActualizacion.NoEncontrado:
                return ResultadoBeneficiario<BeneficiarioDto>.NoEncontrado();
            case EstadoActualizacion.DocumentoDuplicado:
                return ResultadoBeneficiario<BeneficiarioDto>.Conflicto("Ese número de documento ya está registrado.");
        }

        return ResultadoBeneficiario<BeneficiarioDto>.Ok(await CargarExistenteAsync(id, ct));
    }

    /// <summary>Null si el beneficiario no existe.</summary>
    public Task<BeneficiarioDto?> DarDeBajaAsync(Guid id, string? motivo, string? usuarioEmail, CancellationToken ct = default)
    {
        var motivoLimpio = string.IsNullOrWhiteSpace(motivo) ? null : motivo.Trim();
        // beneficiarios.motivo_baja VARCHAR(500)
        if (motivoLimpio is { Length: > 500 })
            throw new DatoInvalidoException("El motivo de la baja no puede superar 500 caracteres.");
        var motivoLog    = motivoLimpio is null ? null : $"Motivo: {motivoLimpio}";
        return repo.DarDeBajaAsync(id, motivoLimpio, motivoLog, usuarioEmail, ct);
    }

    /// <summary>Null si el beneficiario no existe.</summary>
    public Task<BeneficiarioDto?> ReactivarAsync(Guid id, string? usuarioEmail, CancellationToken ct = default)
        => repo.ReactivarAsync(id, usuarioEmail, ct);

    public async Task<ResultadoBeneficiario<bool>> EliminarAsync(Guid id, string? usuarioEmail, CancellationToken ct = default)
    {
        var dep = await repo.ObtenerDependenciasAsync(id, ct);
        if (dep.Nombre == null) return ResultadoBeneficiario<bool>.NoEncontrado();

        // Tablas que bloquean la eliminación
        var cntIns = dep.Inscripciones;
        var cntMov = dep.Movimientos;
        if (cntIns > 0 || cntMov > 0)
        {
            var partes = new List<string>();
            if (cntIns > 0) partes.Add($"{cntIns} {(cntIns > 1 ? "inscripciones" : "inscripción")} a programa{(cntIns > 1 ? "s" : "")}");
            if (cntMov > 0) partes.Add($"{cntMov} movimiento{(cntMov > 1 ? "s" : "")} de inventario");
            return ResultadoBeneficiario<bool>.Conflicto($"No se puede eliminar: el beneficiario tiene {string.Join(" y ", partes)} vinculados.");
        }

        await repo.EliminarAsync(id, dep.Nombre, usuarioEmail, ct);
        return ResultadoBeneficiario<bool>.Ok(true);
    }

    // ── Importación ───────────────────────────────────────────────────────────

    // La forma del objeto (anónimo) es el contrato JSON de POST importar-xlsx: no cambiarla.
    public async Task<ResultadoBeneficiario<object>> ImportarFilasAsync(
        List<ImportarBeneficiarioRowDto>? filas, string? usuarioEmail, CancellationToken ct = default)
    {
        if (filas is null || filas.Count == 0)
            return ResultadoBeneficiario<object>.Invalido("No hay filas para importar.");

        var insertados = 0;
        var omitidos   = 0;
        var errores    = new List<object>();

        for (int fi = 0; fi < filas.Count; fi++)
        {
            var fila   = filas[fi];
            var nombre = $"{fila.PrimerNombre?.Trim()} {fila.PrimerApellido?.Trim()}".Trim();

            if (string.IsNullOrWhiteSpace(fila.PrimerNombre) || string.IsNullOrWhiteSpace(fila.PrimerApellido))
            {
                errores.Add(new { fila = fi + 2, nombre = nombre.Length > 0 ? nombre : "(vacío)",
                    motivo = "PRIMER_NOMBRE y PRIMER_APELLIDO son obligatorios." });
                continue;
            }

            var fechaNac = ParseFecha(fila.FechaNacimiento);
            if (fechaNac is null)
            {
                errores.Add(new { fila = fi + 2, nombre,
                    motivo = "FECHA_NACIMIENTO inválida. Use formato AAAA-MM-DD." });
                continue;
            }

            // "Sin documento": no lleva número ni se revisa si está repetido
            var sinDocumento = ValidacionBeneficiario.EsSinDocumento(fila.TipoDocumento);
            var ndoc = sinDocumento ? null : fila.NumeroDocumento?.Trim();
            if (!string.IsNullOrWhiteSpace(ndoc))
            {
                if (await repo.ExisteDocumentoAsync(ndoc, ct)) { omitidos++; continue; }
            }

            var dto = new CrearBeneficiarioDto
            {
                PrimerNombre    = fila.PrimerNombre!.Trim(),
                SegundoNombre   = string.IsNullOrWhiteSpace(fila.SegundoNombre)   ? null : fila.SegundoNombre.Trim(),
                PrimerApellido  = fila.PrimerApellido!.Trim(),
                SegundoApellido = string.IsNullOrWhiteSpace(fila.SegundoApellido) ? null : fila.SegundoApellido.Trim(),
                FechaNacimiento = fechaNac.Value,
                TipoDocumento   = sinDocumento ? ValidacionBeneficiario.SinDocumento : fila.TipoDocumento ?? "",
                NumeroDocumento = string.IsNullOrWhiteSpace(ndoc) ? null : ndoc,
                Genero          = fila.Genero?.Trim()!,
                Eps             = fila.Eps?.Trim()!,
                NombreAcudiente = fila.NombreAcudiente?.Trim(),
                Parentesco      = fila.Parentesco?.Trim(),
                Whatsapp        = fila.Whatsapp?.Trim(),
                Direccion       = fila.Direccion?.Trim(),
                GradoEscolar    = fila.GradoEscolar?.Trim(),
                NombreColegio   = fila.NombreColegio?.Trim(),
                TieneAlergia    = string.IsNullOrWhiteSpace(fila.TieneAlergia) ? "no" : fila.TieneAlergia.Trim().ToLower(),
                DescripcionAlergia = fila.DescripcionAlergia?.Trim(),
                // La plantilla de Excel usa "nino" (sin ñ): se normaliza a los valores del sistema
                // ("niño" / "adulto"); vacío o cualquier otro valor = niño.
                Tipo            = string.Equals(fila.Tipo?.Trim(), "adulto", StringComparison.OrdinalIgnoreCase) ? "adulto" : "niño",
            };

            // En la plantilla, la columna WhatsApp de un adulto es su propio celular
            var esNino = dto.Tipo == "niño";
            if (!esNino) dto.Celular = string.IsNullOrWhiteSpace(fila.Whatsapp) ? null : fila.Whatsapp.Trim();

            // Mismas reglas de formato que crear/editar, solo sobre los campos que trae la fila.
            var errFmt = ValidacionBeneficiario.ValidarFormato(dto, esNino);
            if (errFmt.Count > 0)
            {
                errores.Add(new { fila = fi + 2, nombre, motivo = string.Join(" ", errFmt) });
                continue;
            }

            var error = await repo.InsertarFilaImportacionAsync(dto, fechaNac.Value, usuarioEmail, ct);
            if (error is null) insertados++;
            else               errores.Add(new { fila = fi + 2, nombre, motivo = error });
        }

        return ResultadoBeneficiario<object>.Ok(new { total = filas.Count, insertados, omitidos, errores });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<BeneficiarioDto> CargarExistenteAsync(Guid id, CancellationToken ct)
        => await repo.ObtenerAsync(id, ct)
           ?? throw new InvalidOperationException($"Beneficiario {id} no encontrado tras guardarlo.");

    private static DateOnly? ParseFecha(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "MM/dd/yyyy", "M/d/yyyy" };
        if (DateOnly.TryParseExact(s.Trim(), formats,
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None, out var d)) return d;
        if (DateOnly.TryParse(s.Trim(), out var d2)) return d2;
        return null;
    }

}
