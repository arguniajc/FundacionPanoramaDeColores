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
    string?   DocumentoDonante
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
public class DonacionesController : ControllerBase
{
    private readonly AppDbContext _db;
    public DonacionesController(AppDbContext db) => _db = db;

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());
    private string? EmailUsuario =>
        User.FindFirst("email")?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;

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
                   d.tipo_documento, d.documento
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
                cmd.Parameters.AddWithValue("recibo", (object?)dto.ReciboNumero?.Trim()         ?? DBNull.Value);
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

            await tx.CommitAsync();

            // Devolver el registro completo
            var result = (await ObtenerPorId(newId) as OkObjectResult)!.Value;
            return Ok(result);
        }
        catch { await tx.RollbackAsync(); throw; }
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
        r.IsDBNull(20) ? null  : r.GetString(20)
    );
}
