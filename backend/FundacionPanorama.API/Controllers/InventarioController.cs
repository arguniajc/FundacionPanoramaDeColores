using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using FundacionPanorama.API.Data;
using System.Security.Claims;

namespace FundacionPanorama.API.Controllers;

public record ItemInventarioDto(
    Guid    Id,
    string? Codigo,
    string  Nombre,
    string? Descripcion,
    string  UnidadMedida,
    decimal StockActual,
    decimal StockMinimo,
    bool    Activo,
    DateTime FechaCreacion,
    DateTime FechaModificacion
);

public record CrearItemDto(
    string? Codigo,
    string  Nombre,
    string? Descripcion,
    string  UnidadMedida,
    decimal StockActual,
    decimal StockMinimo
);

public record ActualizarItemDto(
    string? Codigo,
    string  Nombre,
    string? Descripcion,
    string  UnidadMedida,
    decimal StockMinimo
);

public record TipoMovimientoDto(
    int     Id,
    string  Codigo,
    string  Nombre,
    string? Descripcion,
    string  AfectaStock
);

public record MovimientoDto(
    Guid     Id,
    Guid     ItemId,
    string   NombreItem,
    int      TipoMovimientoId,
    string   NombreTipo,
    string   AfectaStock,
    decimal  Cantidad,
    decimal  StockResultante,
    string?  Motivo,
    string?  Donante,
    string?  UsuarioEmail,
    DateTime FechaMovimiento
);

public record RegistrarMovimientoDto(
    Guid    ItemId,
    int     TipoMovimientoId,
    decimal Cantidad,
    string? Motivo,
    string? Donante
);

public record StatsInventarioDto(int TotalItems, int StockBajo, int MovimientosMes);

[ApiController]
[Route("api/inventario")]
[Authorize]
public class InventarioController : ControllerBase
{
    private readonly AppDbContext _db;
    public InventarioController(AppDbContext db) => _db = db;

    private NpgsqlConnection AbrirConexion() => new(_db.Database.GetConnectionString());
    private string? EmailUsuario =>
        User.FindFirst("email")?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;

    // ── Items ─────────────────────────────────────────────────────────────────

    [HttpGet("items")]
    public async Task<IActionResult> ListarItems([FromQuery] string? buscar = null)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            cmd.CommandText = @"SELECT id,codigo,nombre,descripcion,unidad_medida,stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion
                FROM inventario_items WHERE activo = true
                AND (LOWER(nombre) LIKE @b OR LOWER(COALESCE(codigo,'')) LIKE @b)
                ORDER BY nombre";
            cmd.Parameters.AddWithValue("b", $"%{buscar.ToLower().Trim()}%");
        }
        else
        {
            cmd.CommandText = @"SELECT id,codigo,nombre,descripcion,unidad_medida,stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion
                FROM inventario_items WHERE activo = true ORDER BY nombre";
        }
        var list = new List<ItemInventarioDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerItem(r));
        return Ok(list);
    }

    [HttpGet("items/{id:guid}")]
    public async Task<IActionResult> ObtenerItem(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"SELECT id,codigo,nombre,descripcion,unidad_medida,stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion
            FROM inventario_items WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerItem(r));
    }

    [HttpPost("items")]
    public async Task<IActionResult> CrearItem([FromBody] CrearItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });
        if (dto.StockActual < 0 || dto.StockMinimo < 0)
            return BadRequest(new { mensaje = "El stock no puede ser negativo." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"INSERT INTO inventario_items (codigo,nombre,descripcion,unidad_medida,stock_actual,stock_minimo)
            VALUES (@cod,@nom,@des,@uni,@sa,@sm)
            RETURNING id,codigo,nombre,descripcion,unidad_medida,stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion";
        cmd.Parameters.AddWithValue("cod", (object?)dto.Codigo?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nom", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("des", (object?)dto.Descripcion?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("uni", string.IsNullOrWhiteSpace(dto.UnidadMedida) ? "unidad" : dto.UnidadMedida.Trim());
        cmd.Parameters.AddWithValue("sa",  dto.StockActual);
        cmd.Parameters.AddWithValue("sm",  dto.StockMinimo);
        await using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();
        return Ok(LeerItem(r));
    }

    [HttpPut("items/{id:guid}")]
    public async Task<IActionResult> ActualizarItem(Guid id, [FromBody] ActualizarItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El nombre es obligatorio." });
        if (dto.StockMinimo < 0)
            return BadRequest(new { mensaje = "El stock mínimo no puede ser negativo." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"UPDATE inventario_items
            SET codigo=@cod, nombre=@nom, descripcion=@des, unidad_medida=@uni, stock_minimo=@sm, fecha_modificacion=NOW()
            WHERE id=@id
            RETURNING id,codigo,nombre,descripcion,unidad_medida,stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion";
        cmd.Parameters.AddWithValue("id",  id);
        cmd.Parameters.AddWithValue("cod", (object?)dto.Codigo?.Trim()         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nom", dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("des", (object?)dto.Descripcion?.Trim()    ?? DBNull.Value);
        cmd.Parameters.AddWithValue("uni", string.IsNullOrWhiteSpace(dto.UnidadMedida) ? "unidad" : dto.UnidadMedida.Trim());
        cmd.Parameters.AddWithValue("sm",  dto.StockMinimo);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return NotFound();
        return Ok(LeerItem(r));
    }

    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> EliminarItem(Guid id)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        // Si tiene movimientos → soft delete; si no → hard delete
        await using (var chk = conn.CreateCommand())
        {
            chk.CommandText = "SELECT COUNT(1) FROM inventario_movimientos WHERE item_id=@id";
            chk.Parameters.AddWithValue("id", id);
            var cnt = Convert.ToInt64(await chk.ExecuteScalarAsync());
            if (cnt > 0)
            {
                await using var upd = conn.CreateCommand();
                upd.CommandText = "UPDATE inventario_items SET activo=false, fecha_modificacion=NOW() WHERE id=@id";
                upd.Parameters.AddWithValue("id", id);
                await upd.ExecuteNonQueryAsync();
                return NoContent();
            }
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM inventario_items WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return NotFound();
        return NoContent();
    }

    // ── Movimientos ───────────────────────────────────────────────────────────

    [HttpGet("movimientos")]
    public async Task<IActionResult> ListarMovimientos([FromQuery] Guid? itemId = null)
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        if (itemId.HasValue)
        {
            cmd.CommandText = @"SELECT m.id, m.item_id, i.nombre,
                m.tipo_movimiento_id, t.nombre, t.afecta_stock,
                m.cantidad, m.stock_resultante, m.motivo, m.donante, m.usuario_email, m.fecha_movimiento
                FROM inventario_movimientos m
                JOIN inventario_items i ON i.id = m.item_id
                JOIN cat_tipo_movimiento_inv t ON t.id = m.tipo_movimiento_id
                WHERE m.item_id = @iid
                ORDER BY m.fecha_movimiento DESC LIMIT 200";
            cmd.Parameters.AddWithValue("iid", itemId.Value);
        }
        else
        {
            cmd.CommandText = @"SELECT m.id, m.item_id, i.nombre,
                m.tipo_movimiento_id, t.nombre, t.afecta_stock,
                m.cantidad, m.stock_resultante, m.motivo, m.donante, m.usuario_email, m.fecha_movimiento
                FROM inventario_movimientos m
                JOIN inventario_items i ON i.id = m.item_id
                JOIN cat_tipo_movimiento_inv t ON t.id = m.tipo_movimiento_id
                ORDER BY m.fecha_movimiento DESC LIMIT 200";
        }
        var list = new List<MovimientoDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerMovimiento(r));
        return Ok(list);
    }

    [HttpPost("movimientos")]
    public async Task<IActionResult> RegistrarMovimiento([FromBody] RegistrarMovimientoDto dto)
    {
        if (dto.Cantidad <= 0)
            return BadRequest(new { mensaje = "La cantidad debe ser mayor a cero." });

        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            // Verificar tipo y su dirección
            string afecta;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction  = tx;
                cmd.CommandText  = "SELECT afecta_stock FROM cat_tipo_movimiento_inv WHERE id=@id";
                cmd.Parameters.AddWithValue("id", dto.TipoMovimientoId);
                var val = await cmd.ExecuteScalarAsync();
                if (val is null) return BadRequest(new { mensaje = "Tipo de movimiento no válido." });
                afecta = val.ToString()!;
            }

            // Bloquear fila del artículo y leer stock actual
            decimal stockActual;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction  = tx;
                cmd.CommandText  = "SELECT stock_actual FROM inventario_items WHERE id=@id FOR UPDATE";
                cmd.Parameters.AddWithValue("id", dto.ItemId);
                var val = await cmd.ExecuteScalarAsync();
                if (val is null) return NotFound(new { mensaje = "Artículo no encontrado." });
                stockActual = Convert.ToDecimal(val);
            }

            decimal nuevoStock = afecta == "+" ? stockActual + dto.Cantidad : stockActual - dto.Cantidad;
            if (nuevoStock < 0)
                return BadRequest(new { mensaje = $"Stock insuficiente. Stock actual: {stockActual}." });

            // Actualizar stock
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction  = tx;
                cmd.CommandText  = "UPDATE inventario_items SET stock_actual=@s, fecha_modificacion=NOW() WHERE id=@id";
                cmd.Parameters.AddWithValue("s",  nuevoStock);
                cmd.Parameters.AddWithValue("id", dto.ItemId);
                await cmd.ExecuteNonQueryAsync();
            }

            // Insertar movimiento
            Guid newId;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction  = tx;
                cmd.CommandText  = @"INSERT INTO inventario_movimientos
                    (item_id,tipo_movimiento_id,cantidad,stock_resultante,motivo,donante,usuario_email)
                    VALUES (@iid,@tid,@cant,@sr,@mot,@don,@email)
                    RETURNING id";
                cmd.Parameters.AddWithValue("iid",   dto.ItemId);
                cmd.Parameters.AddWithValue("tid",   dto.TipoMovimientoId);
                cmd.Parameters.AddWithValue("cant",  dto.Cantidad);
                cmd.Parameters.AddWithValue("sr",    nuevoStock);
                cmd.Parameters.AddWithValue("mot",   (object?)dto.Motivo?.Trim()  ?? DBNull.Value);
                cmd.Parameters.AddWithValue("don",   (object?)dto.Donante?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("email", (object?)EmailUsuario        ?? DBNull.Value);
                newId = (Guid)(await cmd.ExecuteScalarAsync())!;
            }

            await tx.CommitAsync();
            return Ok(new { movimientoId = newId, nuevoStock });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // ── Tipos de movimiento (catálogo) ────────────────────────────────────────

    [HttpGet("tipos")]
    public async Task<IActionResult> ListarTipos()
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id,codigo,nombre,descripcion,afecta_stock FROM cat_tipo_movimiento_inv ORDER BY id";
        var list = new List<TipoMovimientoDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
            list.Add(new TipoMovimientoDto(
                r.GetInt32(0), r.GetString(1), r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3),
                r.GetString(4)));
        return Ok(list);
    }

    // ── Estadísticas ──────────────────────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> ObtenerStats()
    {
        await using var conn = AbrirConexion();
        await conn.OpenAsync();

        int totalItems = 0, stockBajo = 0, movimientosMes = 0;

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = @"SELECT COUNT(*), SUM(CASE WHEN stock_actual < stock_minimo THEN 1 ELSE 0 END)
                FROM inventario_items WHERE activo = true";
            await using var r = await cmd.ExecuteReaderAsync();
            if (await r.ReadAsync())
            {
                totalItems = r.IsDBNull(0) ? 0 : Convert.ToInt32(r.GetInt64(0));
                stockBajo  = r.IsDBNull(1) ? 0 : Convert.ToInt32(r.GetInt64(1));
            }
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*) FROM inventario_movimientos WHERE fecha_movimiento >= date_trunc('month', NOW())";
            var val = await cmd.ExecuteScalarAsync();
            movimientosMes = val is null ? 0 : Convert.ToInt32(val);
        }

        return Ok(new StatsInventarioDto(totalItems, stockBajo, movimientosMes));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ItemInventarioDto LeerItem(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0),
        r.IsDBNull(1) ? null : r.GetString(1),
        r.GetString(2),
        r.IsDBNull(3) ? null : r.GetString(3),
        r.GetString(4),
        r.GetDecimal(5),
        r.GetDecimal(6),
        r.GetBoolean(7),
        r.GetDateTime(8),
        r.GetDateTime(9)
    );

    private static MovimientoDto LeerMovimiento(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0), r.GetGuid(1), r.GetString(2),
        r.GetInt32(3), r.GetString(4), r.GetString(5),
        r.GetDecimal(6), r.GetDecimal(7),
        r.IsDBNull(8)  ? null : r.GetString(8),
        r.IsDBNull(9)  ? null : r.GetString(9),
        r.IsDBNull(10) ? null : r.GetString(10),
        r.GetDateTime(11)
    );
}
