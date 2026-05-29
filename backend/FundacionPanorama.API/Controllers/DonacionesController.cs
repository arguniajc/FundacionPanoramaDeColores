using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using FundacionPanorama.API.Data;
using System.Security.Claims;

namespace FundacionPanorama.API.Controllers;

public record DonacionDto(
    Guid      Id,
    Guid      DonanteId,
    string    NombreDonante,
    string    TipoDonante,
    string    Tipo,
    decimal?  Monto,
    Guid?     ItemId,
    string?   NombreItem,
    decimal?  Cantidad,
    string?   UnidadMedida,
    Guid?     ProgramaId,
    string    NombrePrograma,
    Guid?     SedeId,
    string    NombreSede,
    string?   Descripcion,
    DateTime  FechaDonacion,
    string?   ReciboNumero,
    bool      Activo,
    DateTime  FechaCreacion,
    string?   TipoDocDonante,
    string?   DocumentoDonante,
    string?   EmailDonante,
    string    ReciboEstado
);

public record CrearDonacionDto(
    Guid      DonanteId,
    string    Tipo,
    decimal?  Monto,
    Guid?     ItemId,
    string?   NombreItem,
    decimal?  Cantidad,
    string?   UnidadMedida,
    Guid?     ProgramaId,
    Guid?     SedeId,
    string?   Descripcion,
    DateTime? FechaDonacion,
    string?   ReciboNumero
);

public record StatsDonacionesDto(
    decimal TotalDineroMes,
    decimal TotalDineroAnio,
    decimal TotalDineroTotal,
    int     TotalEspecieMes,
    int     TotalDonantesActivos
);

[ApiController]
[Route("api/donaciones")]
[Authorize]
public class DonacionesController : BaseController
{
    private readonly AppDbContext _db;
    public DonacionesController(AppDbContext db) => _db = db;

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] Guid?     donanteId  = null,
        [FromQuery] string?   tipo       = null,
        [FromQuery] Guid?     sedeId     = null,
        [FromQuery] Guid?     programaId = null,
        [FromQuery] DateTime? desde      = null,
        [FromQuery] DateTime? hasta      = null)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();

        var where = new List<string> { "dn.activo = true" };
        if (donanteId.HasValue)  { where.Add("dn.donante_id  = @did"); cmd.Parameters.AddWithValue("did", donanteId.Value); }
        if (!string.IsNullOrWhiteSpace(tipo)) { where.Add("dn.tipo = @tipo"); cmd.Parameters.AddWithValue("tipo", tipo); }
        if (sedeId.HasValue)     { where.Add("dn.sede_id     = @sid"); cmd.Parameters.AddWithValue("sid", sedeId.Value); }
        if (programaId.HasValue) { where.Add("dn.programa_id = @pid"); cmd.Parameters.AddWithValue("pid", programaId.Value); }
        if (desde.HasValue)      { where.Add("dn.fecha_donacion >= @desde"); cmd.Parameters.AddWithValue("desde", desde.Value.Date); }
        if (hasta.HasValue)      { where.Add("dn.fecha_donacion <= @hasta"); cmd.Parameters.AddWithValue("hasta", hasta.Value.Date); }

        cmd.CommandText = $@"
            SELECT dn.id, dn.donante_id, d.nombre, d.tipo,
                   dn.tipo, dn.monto,
                   dn.item_id, COALESCE(i.nombre, dn.nombre_item) AS nombre_item,
                   dn.cantidad, dn.unidad_medida,
                   dn.programa_id, COALESCE(p.nombre,'') AS nombre_programa,
                   dn.sede_id,    COALESCE(s.nombre,'') AS nombre_sede,
                   dn.descripcion, dn.fecha_donacion, dn.recibo_numero,
                   dn.activo, dn.fecha_creacion,
                   d.tipo_documento, d.documento,
                   d.email, COALESCE(dn.recibo_estado,'emitido')
            FROM donaciones dn
            JOIN  donantes d          ON d.id  = dn.donante_id
            LEFT JOIN inventario_items i ON i.id  = dn.item_id
            LEFT JOIN programas p     ON p.id  = dn.programa_id
            LEFT JOIN sedes     s     ON s.id  = dn.sede_id
            WHERE {string.Join(" AND ", where)}
            ORDER BY dn.fecha_donacion DESC, dn.fecha_creacion DESC
            LIMIT 500";

        var list = new List<DonacionDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerDonacion(r));
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ObtenerPorId(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT dn.id, dn.donante_id, d.nombre, d.tipo,
                   dn.tipo, dn.monto,
                   dn.item_id, COALESCE(i.nombre, dn.nombre_item),
                   dn.cantidad, dn.unidad_medida,
                   dn.programa_id, COALESCE(p.nombre,''),
                   dn.sede_id,    COALESCE(s.nombre,''),
                   dn.descripcion, dn.fecha_donacion, dn.recibo_numero,
                   dn.activo, dn.fecha_creacion,
                   d.tipo_documento, d.documento
            FROM donaciones dn
            JOIN  donantes d          ON d.id  = dn.donante_id
            LEFT JOIN inventario_items i ON i.id  = dn.item_id
            LEFT JOIN programas p     ON p.id  = dn.programa_id
            LEFT JOIN sedes     s     ON s.id  = dn.sede_id
            WHERE dn.id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerDonacion(r));
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearDonacionDto dto)
    {
        if (dto.Tipo == "dinero" && (dto.Monto is null || dto.Monto <= 0))
            return BadRequest(new { mensaje = "El monto es obligatorio para donaciones en dinero." });
        if (dto.Tipo == "especie" && (dto.Cantidad is null || dto.Cantidad <= 0))
            return BadRequest(new { mensaje = "La cantidad es obligatoria para donaciones en especie." });
        if (dto.Tipo == "especie" && dto.ItemId is null && string.IsNullOrWhiteSpace(dto.NombreItem))
            return BadRequest(new { mensaje = "Debe indicar el artículo o su nombre." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            // Auto-generar número de recibo si no se proporcionó uno
            string reciboNumero;
            if (!string.IsNullOrWhiteSpace(dto.ReciboNumero))
            {
                reciboNumero = dto.ReciboNumero.Trim();
            }
            else
            {
                int anio = (dto.FechaDonacion ?? DateTime.UtcNow).Year;
                await using var cmdSeq = conn.CreateCommand();
                cmdSeq.Transaction = tx;
                cmdSeq.CommandText = $"""
                    SELECT COALESCE(MAX(
                        CASE WHEN recibo_numero ~ '^REC-{anio}-[0-9]+$'
                             THEN CAST(SPLIT_PART(recibo_numero, '-', 3) AS INTEGER)
                             ELSE 0 END
                    ), 0) + 1
                    FROM donaciones
                    """;
                int siguiente = Convert.ToInt32(await cmdSeq.ExecuteScalarAsync());
                reciboNumero = $"REC-{anio}-{siguiente:D4}";
            }

            Guid newId;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"
                    INSERT INTO donaciones
                        (donante_id,tipo,monto,item_id,nombre_item,cantidad,unidad_medida,
                         programa_id,sede_id,descripcion,fecha_donacion,recibo_numero)
                    VALUES
                        (@did,@tipo,@monto,@iid,@nitem,@cant,@uni,@pid,@sid,@desc,@fecha,@recibo)
                    RETURNING id";
                cmd.Parameters.AddWithValue("did",    dto.DonanteId);
                cmd.Parameters.AddWithValue("tipo",   dto.Tipo);
                cmd.Parameters.AddWithValue("monto",  (object?)dto.Monto                       ?? DBNull.Value);
                cmd.Parameters.AddWithValue("iid",    (object?)dto.ItemId                      ?? DBNull.Value);
                cmd.Parameters.AddWithValue("nitem",  (object?)dto.NombreItem?.Trim()           ?? DBNull.Value);
                cmd.Parameters.AddWithValue("cant",   (object?)dto.Cantidad                    ?? DBNull.Value);
                cmd.Parameters.AddWithValue("uni",    (object?)dto.UnidadMedida?.Trim()         ?? DBNull.Value);
                cmd.Parameters.AddWithValue("pid",    (object?)dto.ProgramaId                  ?? DBNull.Value);
                cmd.Parameters.AddWithValue("sid",    (object?)dto.SedeId                      ?? DBNull.Value);
                cmd.Parameters.AddWithValue("desc",   (object?)dto.Descripcion?.Trim()          ?? DBNull.Value);
                cmd.Parameters.AddWithValue("fecha",  (dto.FechaDonacion ?? DateTime.UtcNow).Date);
                cmd.Parameters.AddWithValue("recibo", reciboNumero);
                newId = (Guid)(await cmd.ExecuteScalarAsync())!;
            }

            // Si es especie y tiene item_id → registrar movimiento DONACION_RECIBIDA en inventario
            if (dto.Tipo == "especie" && dto.ItemId.HasValue && dto.Cantidad > 0)
            {
                int tipoMovId = 0;
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText = "SELECT id FROM cat_tipo_movimiento_inv WHERE codigo='DONACION_RECIBIDA'";
                    var val = await cmd.ExecuteScalarAsync();
                    if (val is not null) tipoMovId = Convert.ToInt32(val);
                }

                if (tipoMovId > 0)
                {
                    decimal stockActual;
                    await using (var cmd = conn.CreateCommand())
                    {
                        cmd.Transaction = tx;
                        cmd.CommandText = "SELECT stock_actual FROM inventario_items WHERE id=@id FOR UPDATE";
                        cmd.Parameters.AddWithValue("id", dto.ItemId.Value);
                        var val = await cmd.ExecuteScalarAsync();
                        stockActual = val is null ? 0m : Convert.ToDecimal(val);
                    }

                    decimal nuevoStock = stockActual + dto.Cantidad!.Value;

                    await using (var cmd = conn.CreateCommand())
                    {
                        cmd.Transaction = tx;
                        cmd.CommandText = "UPDATE inventario_items SET stock_actual=@s, fecha_modificacion=NOW() WHERE id=@id";
                        cmd.Parameters.AddWithValue("s",  nuevoStock);
                        cmd.Parameters.AddWithValue("id", dto.ItemId.Value);
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // Nombre del donante para el campo donante del movimiento
                    string? nombreDonante = null;
                    await using (var cmd = conn.CreateCommand())
                    {
                        cmd.Transaction = tx;
                        cmd.CommandText = "SELECT nombre FROM donantes WHERE id=@id";
                        cmd.Parameters.AddWithValue("id", dto.DonanteId);
                        nombreDonante = (string?)await cmd.ExecuteScalarAsync();
                    }

                    await using (var cmd = conn.CreateCommand())
                    {
                        cmd.Transaction = tx;
                        cmd.CommandText = @"INSERT INTO inventario_movimientos
                            (item_id,tipo_movimiento_id,cantidad,stock_resultante,motivo,donante,donante_id,usuario_email)
                            VALUES (@iid,@tid,@cant,@sr,@mot,@don,@did,@email)";
                        cmd.Parameters.AddWithValue("iid",   dto.ItemId.Value);
                        cmd.Parameters.AddWithValue("tid",   tipoMovId);
                        cmd.Parameters.AddWithValue("cant",  dto.Cantidad.Value);
                        cmd.Parameters.AddWithValue("sr",    nuevoStock);
                        cmd.Parameters.AddWithValue("mot",   (object?)dto.Descripcion?.Trim()  ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("don",   (object?)nombreDonante            ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("did",   dto.DonanteId);
                        cmd.Parameters.AddWithValue("email", (object?)EmailUsuario             ?? DBNull.Value);
                        await cmd.ExecuteNonQueryAsync();
                    }
                }
            }

            await RegistrarAuditAsync(conn, tx, "donacion", newId.ToString(), reciboNumero, "creado");
            await tx.CommitAsync();

            // Registrar automáticamente el movimiento contable (no-fatal)
            if (dto.Tipo == "dinero" && dto.Monto > 0)
            {
                var fechaDon = DateOnly.FromDateTime((dto.FechaDonacion ?? DateTime.UtcNow).Date);
                _ = AutoRegistrarMovimientoContableAsync(
                    dto.DonanteId, dto.Monto!.Value, fechaDon,
                    dto.ProgramaId, reciboNumero, conn.ConnectionString);
            }

            // Devolver el registro completo
            var result = (await ObtenerPorId(newId) as OkObjectResult)!.Value;
            return Ok(result);
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    private async Task AutoRegistrarMovimientoContableAsync(
        Guid donanteId, decimal monto, DateOnly fecha,
        Guid? programaId, string reciboNumero, string connStr)
    {
        try
        {
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();

            // Buscar categoría de ingreso para donaciones (busca "donacion" primero, si no la primera de ingreso)
            int? catId = null;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = """
                    SELECT id FROM cat_contable
                    WHERE tipo = 'ingreso'
                    ORDER BY (nombre ILIKE '%donacion%' OR nombre ILIKE '%donación%') DESC, codigo_puc
                    LIMIT 1
                    """;
                var val = await cmd.ExecuteScalarAsync();
                if (val is not null) catId = Convert.ToInt32(val);
            }
            if (catId is null) return;

            // Buscar primera cuenta activa
            Guid? cuentaId = null;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT id FROM cuentas_caja WHERE activo = true ORDER BY nombre LIMIT 1";
                var val = await cmd.ExecuteScalarAsync();
                if (val is not null) cuentaId = (Guid)val;
            }
            if (cuentaId is null) return;

            // Obtener nombre del donante
            string nombreDonante = "";
            string? docDonante = null;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT nombre, documento FROM donantes WHERE id = @id";
                cmd.Parameters.AddWithValue("id", donanteId);
                await using var r = await cmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                {
                    nombreDonante = r.GetString(0);
                    docDonante    = r.IsDBNull(1) ? null : r.GetString(1);
                }
            }

            // Número de consecutivo
            int consecutivo;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = """
                    SELECT COALESCE(MAX(consecutivo), 0) + 1
                    FROM movimientos_contables
                    WHERE EXTRACT(YEAR FROM fecha) = @anio
                    """;
                cmd.Parameters.AddWithValue("anio", fecha.Year);
                consecutivo = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            }

            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = """
                    INSERT INTO movimientos_contables
                        (tipo, fecha, concepto, monto, cuenta_id, categoria_id,
                         programa_id, tercero_nombre, tercero_documento,
                         numero_soporte, consecutivo)
                    VALUES
                        ('ingreso', @fecha, @concepto, @monto, @cuentaId, @catId,
                         @progId, @tercero, @doc, @soporte, @consecutivo)
                    """;
                cmd.Parameters.AddWithValue("fecha",       fecha);
                cmd.Parameters.AddWithValue("concepto",    $"Donación {nombreDonante} — {reciboNumero}");
                cmd.Parameters.AddWithValue("monto",       monto);
                cmd.Parameters.AddWithValue("cuentaId",    cuentaId.Value);
                cmd.Parameters.AddWithValue("catId",       catId.Value);
                cmd.Parameters.AddWithValue("progId",      (object?)programaId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("tercero",     nombreDonante);
                cmd.Parameters.AddWithValue("doc",         (object?)docDonante ?? DBNull.Value);
                cmd.Parameters.AddWithValue("soporte",     reciboNumero);
                cmd.Parameters.AddWithValue("consecutivo", consecutivo);
                await cmd.ExecuteNonQueryAsync();

                // Actualizar saldo de la cuenta
                await using var cmdSaldo = conn.CreateCommand();
                cmdSaldo.CommandText = "UPDATE cuentas_caja SET saldo_actual = saldo_actual + @monto WHERE id = @id";
                cmdSaldo.Parameters.AddWithValue("monto", monto);
                cmdSaldo.Parameters.AddWithValue("id",    cuentaId.Value);
                await cmdSaldo.ExecuteNonQueryAsync();
            }
        }
        catch { /* no-fatal: contabilidad es auxiliar, no bloquea la donación */ }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CrearDonacionDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE donaciones
            SET monto=@monto, item_id=@iid, nombre_item=@nitem,
                cantidad=@cant, unidad_medida=@uni,
                programa_id=@pid, sede_id=@sid,
                descripcion=@desc, fecha_donacion=@fecha, recibo_numero=@recibo,
                fecha_modificacion=NOW()
            WHERE id=@id";
        cmd.Parameters.AddWithValue("id",     id);
        cmd.Parameters.AddWithValue("monto",  (object?)dto.Monto                  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("iid",    (object?)dto.ItemId                 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nitem",  (object?)dto.NombreItem?.Trim()      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cant",   (object?)dto.Cantidad               ?? DBNull.Value);
        cmd.Parameters.AddWithValue("uni",    (object?)dto.UnidadMedida?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("pid",    (object?)dto.ProgramaId             ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sid",    (object?)dto.SedeId                 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("desc",   (object?)dto.Descripcion?.Trim()     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("fecha",  (dto.FechaDonacion ?? DateTime.UtcNow).Date);
        cmd.Parameters.AddWithValue("recibo", (object?)dto.ReciboNumero?.Trim()    ?? DBNull.Value);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();

        await RegistrarAuditAsync(conn, null, "donacion", id.ToString(), dto.ReciboNumero, "editado");
        var result = (await ObtenerPorId(id) as OkObjectResult)!.Value;
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE donaciones SET activo=false, fecha_modificacion=NOW() WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();
        await RegistrarAuditAsync(conn, null, "donacion", id.ToString(), null, "eliminado");
        return NoContent();
    }

    [HttpGet("stats")]
    public async Task<IActionResult> ObtenerStats()
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        decimal mesD = 0, anioD = 0, totalD = 0;
        int mesE = 0;
        int donantesActivos = 0;

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"
                SELECT
                    COALESCE(SUM(CASE WHEN tipo='dinero' AND fecha_donacion >= date_trunc('month',NOW())  THEN monto ELSE 0 END),0),
                    COALESCE(SUM(CASE WHEN tipo='dinero' AND fecha_donacion >= date_trunc('year', NOW())  THEN monto ELSE 0 END),0),
                    COALESCE(SUM(CASE WHEN tipo='dinero'                                                  THEN monto ELSE 0 END),0),
                    COALESCE(SUM(CASE WHEN tipo='especie' AND fecha_donacion >= date_trunc('month',NOW()) THEN 1 ELSE 0 END),0)
                FROM donaciones WHERE activo=true";
            await using var r = await cmd.ExecuteReaderAsync();
            if (await r.ReadAsync())
            {
                mesD  = Convert.ToDecimal(r.GetValue(0));
                anioD = Convert.ToDecimal(r.GetValue(1));
                totalD= Convert.ToDecimal(r.GetValue(2));
                mesE  = Convert.ToInt32(r.GetValue(3));
            }
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(DISTINCT donante_id) FROM donaciones WHERE activo=true";
            donantesActivos = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        }

        return Ok(new StatsDonacionesDto(mesD, anioD, totalD, mesE, donantesActivos));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static DonacionDto LeerDonacion(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0),
        r.GetGuid(1),
        r.GetString(2),
        r.GetString(3),
        r.GetString(4),
        r.IsDBNull(5)  ? null  : Convert.ToDecimal(r.GetValue(5)),
        r.IsDBNull(6)  ? null  : r.GetGuid(6),
        r.IsDBNull(7)  ? null  : r.GetString(7),
        r.IsDBNull(8)  ? null  : Convert.ToDecimal(r.GetValue(8)),
        r.IsDBNull(9)  ? null  : r.GetString(9),
        r.IsDBNull(10) ? null  : r.GetGuid(10),
        r.GetString(11),
        r.IsDBNull(12) ? null  : r.GetGuid(12),
        r.GetString(13),
        r.IsDBNull(14) ? null  : r.GetString(14),
        r.GetDateTime(15),
        r.IsDBNull(16) ? null  : r.GetString(16),
        r.GetBoolean(17),
        r.GetDateTime(18),
        r.IsDBNull(19) ? null  : r.GetString(19),
        r.IsDBNull(20) ? null  : r.GetString(20),
        r.IsDBNull(21) ? null  : r.GetString(21),
        r.IsDBNull(22) ? "emitido" : r.GetString(22)
    );

    // =========================================================================
    // PATCH api/donaciones/{id}/anular
    // =========================================================================
    [HttpPatch("{id:guid}/anular")]
    public async Task<IActionResult> Anular(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE donaciones SET recibo_estado='anulado', fecha_modificacion=NOW() WHERE id=@id AND activo=true";
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();

        await RegistrarAuditAsync(conn, null, "donacion", id.ToString(), null, "anulado");
        await RegistrarLogEmisionAsync(conn, id, "anulacion", EmailUsuario, null, null);
        var result = (await ObtenerPorId(id) as OkObjectResult)!.Value;
        return Ok(result);
    }

    // =========================================================================
    // POST api/donaciones/{id}/log-emision
    // =========================================================================
    public record LogEmisionDto(string Accion, string? DestinatarioEmail = null, string? Detalle = null);

    [HttpPost("{id:guid}/log-emision")]
    public async Task<IActionResult> LogEmision(Guid id, [FromBody] LogEmisionDto dto)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await RegistrarLogEmisionAsync(conn, id, dto.Accion, EmailUsuario, dto.DestinatarioEmail, dto.Detalle);
        return Ok();
    }

    // =========================================================================
    // POST api/donaciones/{id}/enviar-recibo
    // =========================================================================
    [HttpPost("{id:guid}/enviar-recibo")]
    public async Task<IActionResult> EnviarRecibo(
        Guid id,
        [FromServices] FundacionPanorama.API.Services.EmailService emailSvc,
        [FromServices] FundacionPanorama.Application.Features.Configuracion.Interfaces.IConfiguracionRepository cfgRepo,
        CancellationToken ct)
    {
        var donResult = await ObtenerPorId(id) as OkObjectResult;
        if (donResult?.Value is not DonacionDto don) return NotFound();
        if (string.IsNullOrWhiteSpace(don.EmailDonante))
            return BadRequest(new { mensaje = "El donante no tiene email registrado." });

        var cfg = await cfgRepo.ObtenerAsync(ct);
        var html = GenerarHtmlRecibo(don, cfg);

        var (ok, detalle) = await emailSvc.EnviarReciboAsync(
            don.EmailDonante, don.NombreDonante,
            don.ReciboNumero ?? don.Id.ToString()[..8],
            cfg?.NombreFundacion ?? "Fundación Panorama de Colores",
            html, ct);

        if (!ok) return BadRequest(new { mensaje = detalle });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await RegistrarLogEmisionAsync(conn, id, "email_enviado", EmailUsuario, don.EmailDonante, null);
        return Ok(new { mensaje = $"Recibo enviado a {don.EmailDonante}." });
    }

    // ── Helpers privados ─────────────────────────────────────────────────────

    private static async Task RegistrarLogEmisionAsync(
        NpgsqlConnection conn, Guid donacionId, string accion,
        string? usuarioEmail, string? destinatarioEmail, string? detalle)
    {
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                INSERT INTO recibos_log (donacion_id, accion, usuario_email, destinatario_email, detalle)
                VALUES (@did, @accion, @uEmail, @dEmail, @detalle)
                """;
            cmd.Parameters.AddWithValue("did",    donacionId);
            cmd.Parameters.AddWithValue("accion", accion);
            cmd.Parameters.Add(new NpgsqlParameter("uEmail",  NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)usuarioEmail    ?? DBNull.Value });
            cmd.Parameters.Add(new NpgsqlParameter("dEmail",  NpgsqlTypes.NpgsqlDbType.Varchar) { Value = (object?)destinatarioEmail ?? DBNull.Value });
            cmd.Parameters.Add(new NpgsqlParameter("detalle", NpgsqlTypes.NpgsqlDbType.Text)    { Value = (object?)detalle          ?? DBNull.Value });
            await cmd.ExecuteNonQueryAsync();
        }
        catch { /* log failures are non-fatal */ }
    }

    private static string GenerarHtmlRecibo(DonacionDto don, FundacionPanorama.Application.Features.Configuracion.DTOs.ConfiguracionDto? cfg)
    {
        var nombre    = cfg?.NombreFundacion ?? "Fundación Panorama de Colores";
        var nit       = cfg?.Nit != null       ? $"NIT: {cfg.Nit}"       : "";
        var telefono  = cfg?.Telefono != null  ? $"Tel: {cfg.Telefono}"  : "";
        var email     = cfg?.EmailContacto ?? "";
        var subtexto  = string.Join("  |  ", new[] { nit, cfg?.Direccion, telefono, email }.Where(s => !string.IsNullOrWhiteSpace(s)));

        var fecha = don.FechaDonacion.ToString("dd/MMM/yyyy");

        var detalle = don.Tipo == "dinero"
            ? $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Valor donado</td><td style='padding:4px 0;font-weight:700;color:#059669;font-size:15px'>{FormatMoney(don.Monto)}</td></tr>"
            : $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Artículo</td><td style='padding:4px 0;font-size:13px'>{don.Cantidad} {don.UnidadMedida} — {don.NombreItem}</td></tr>";

        var programa = !string.IsNullOrWhiteSpace(don.NombrePrograma)
            ? $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Programa</td><td style='padding:4px 0;font-size:13px'>{don.NombrePrograma}</td></tr>" : "";
        var sede = !string.IsNullOrWhiteSpace(don.NombreSede)
            ? $"<tr><td style='padding:4px 0;color:#6b7280;font-size:13px'>Sede</td><td style='padding:4px 0;font-size:13px'>{don.NombreSede}</td></tr>" : "";

        var docRow = don.TipoDocDonante != null && don.DocumentoDonante != null
            ? $"<p style='margin:2px 0 0;font-size:12px;color:#6b7280'>{don.TipoDocDonante.ToUpper()}: {don.DocumentoDonante}</p>" : "";

        return $"""
            <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
              <tr><td style="background:#4E1B95;padding:28px 32px;text-align:center">
                <p style="margin:0;color:#fff;font-size:20px;font-weight:800">{System.Net.WebUtility.HtmlEncode(nombre)}</p>
                {(subtexto.Length > 0 ? $"<p style='margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:11px'>{System.Net.WebUtility.HtmlEncode(subtexto)}</p>" : "")}
                <p style="margin:12px 0 0;color:#fff;font-size:13px;letter-spacing:2px;font-weight:600">RECIBO DE DONACIÓN</p>
              </td></tr>
              <tr><td style="background:#f5f0ff;padding:16px;text-align:center">
                <p style="margin:0;font-size:20px;font-weight:800;color:#4E1B95">{System.Net.WebUtility.HtmlEncode(don.ReciboNumero ?? "—")}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280">{fecha}</p>
              </td></tr>
              <tr><td style="padding:24px 32px">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:6px;padding:14px;margin-bottom:20px">
                  <tr><td>
                    <p style="margin:0 0 2px;font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">Donante</p>
                    <p style="margin:0;font-size:15px;font-weight:700">{System.Net.WebUtility.HtmlEncode(don.NombreDonante)}</p>
                    {docRow}
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0">
                  {detalle}{programa}{sede}
                </table>
              </td></tr>
              <tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
                <p style="margin:0;font-size:11px;color:#9ca3af">Este recibo es prueba de la donación realizada. Gracias por su generosidad.</p>
              </td></tr>
            </table></td></tr></table></body></html>
            """;
    }

    private static string FormatMoney(decimal? m) =>
        m.HasValue ? m.Value.ToString("C0", new System.Globalization.CultureInfo("es-CO")) : "—";
}
