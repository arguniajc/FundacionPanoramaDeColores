using FundacionPanorama.Application.Features.Inventario;
using FundacionPanorama.Application.Features.Inventario.DTOs;
using FundacionPanorama.Application.Features.Inventario.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public class InventarioRepository(DbConnectionFactory factory) : IInventarioRepository
{
    // ── Items ─────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ItemInventarioDto>> ListarItemsAsync(
        Guid? sedeId, string? buscar, string? categoria, string? tipoTenencia)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();

        var where = new List<string> { "i.activo = true" };
        if (sedeId.HasValue)
            where.Add("i.sede_id = @sid");
        if (!string.IsNullOrWhiteSpace(buscar))
            where.Add("(LOWER(i.nombre) LIKE @b OR LOWER(COALESCE(i.codigo,'')) LIKE @b)");
        if (!string.IsNullOrWhiteSpace(categoria))
            where.Add("i.categoria = @cat");
        if (!string.IsNullOrWhiteSpace(tipoTenencia))
            where.Add("i.tipo_tenencia = @tten");

        cmd.CommandText = $@"
            SELECT i.id, i.sede_id, COALESCE(s.nombre,'') AS nombre_sede,
                   i.codigo, i.nombre, i.descripcion, i.unidad_medida,
                   i.categoria, i.stock_actual, i.stock_minimo,
                   i.activo, i.fecha_creacion, i.fecha_modificacion,
                   i.tipo_tenencia, i.comodante, i.comodato_contrato,
                   TO_CHAR(i.comodato_fecha_inicio,'YYYY-MM-DD') AS comodato_fecha_inicio,
                   TO_CHAR(i.comodato_fecha_fin,'YYYY-MM-DD') AS comodato_fecha_fin
            FROM inventario_items i
            LEFT JOIN sedes s ON s.id = i.sede_id
            WHERE {string.Join(" AND ", where)}
            ORDER BY i.nombre";

        if (sedeId.HasValue)
            cmd.Parameters.AddWithValue("sid", sedeId.Value);
        if (!string.IsNullOrWhiteSpace(buscar))
            cmd.Parameters.AddWithValue("b", $"%{buscar.ToLower().Trim()}%");
        if (!string.IsNullOrWhiteSpace(categoria))
            cmd.Parameters.AddWithValue("cat", categoria.Trim());
        if (!string.IsNullOrWhiteSpace(tipoTenencia))
            cmd.Parameters.AddWithValue("tten", tipoTenencia.Trim());

        var list = new List<ItemInventarioDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerItem(r));
        return list;
    }

    public async Task<ItemInventarioDto?> ObtenerItemAsync(Guid id)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT i.id, i.sede_id, COALESCE(s.nombre,'') AS nombre_sede,
                   i.codigo, i.nombre, i.descripcion, i.unidad_medida,
                   i.categoria, i.stock_actual, i.stock_minimo,
                   i.activo, i.fecha_creacion, i.fecha_modificacion,
                   i.tipo_tenencia, i.comodante, i.comodato_contrato,
                   TO_CHAR(i.comodato_fecha_inicio,'YYYY-MM-DD') AS comodato_fecha_inicio,
                   TO_CHAR(i.comodato_fecha_fin,'YYYY-MM-DD') AS comodato_fecha_fin
            FROM inventario_items i
            LEFT JOIN sedes s ON s.id = i.sede_id
            WHERE i.id=@id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;
        return LeerItem(r);
    }

    public async Task<ItemInventarioDto> CrearItemAsync(CrearItemDto dto, string categoria, string prefijo, string anio2Digitos)
    {
        var cat    = categoria;
        var prefix = prefijo;
        var yy     = anio2Digitos;

        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        ItemInventarioDto item;
        try
        {
            // Obtener siguiente número de secuencia para este prefijo+año (con lock implícito por tx)
            int seq;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"
                    SELECT COALESCE(MAX(CAST(SPLIT_PART(codigo, '-', 3) AS INTEGER)), 0) + 1
                    FROM inventario_items
                    WHERE codigo ~ ('^' || @pre || '-' || @yy || '-[0-9]+$')";
                cmd.Parameters.AddWithValue("pre", prefix);
                cmd.Parameters.AddWithValue("yy",  yy);
                seq = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            }
            var codigoGenerado = InventarioReglas.GenerarCodigo(prefix, yy, seq);

            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"
                    INSERT INTO inventario_items (sede_id,codigo,nombre,descripcion,unidad_medida,categoria,stock_actual,stock_minimo,tipo_tenencia,comodante,comodato_contrato,comodato_fecha_inicio,comodato_fecha_fin)
                    VALUES (@sid,@cod,@nom,@des,@uni,@cat,@sa,@sm,@tten,@cmod,@ccont,@cfdi::date,@cfdf::date)
                    RETURNING id, sede_id, '' AS nombre_sede,
                              codigo,nombre,descripcion,unidad_medida,categoria,
                              stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion,
                              tipo_tenencia, comodante, comodato_contrato,
                              TO_CHAR(comodato_fecha_inicio,'YYYY-MM-DD'), TO_CHAR(comodato_fecha_fin,'YYYY-MM-DD')";
                cmd.Parameters.AddWithValue("sid",  (object?)dto.SedeId              ?? DBNull.Value);
                cmd.Parameters.AddWithValue("cod",  codigoGenerado);
                cmd.Parameters.AddWithValue("nom",  dto.Nombre.Trim());
                cmd.Parameters.AddWithValue("des",  (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("uni",  string.IsNullOrWhiteSpace(dto.UnidadMedida) ? "unidad" : dto.UnidadMedida.Trim());
                cmd.Parameters.AddWithValue("cat",  cat);
                cmd.Parameters.AddWithValue("sa",   dto.StockActual);
                cmd.Parameters.AddWithValue("sm",   dto.StockMinimo);
                cmd.Parameters.AddWithValue("tten", string.IsNullOrWhiteSpace(dto.TipoTenencia) ? "propio" : dto.TipoTenencia.Trim());
                cmd.Parameters.AddWithValue("cmod", (object?)dto.Comodante?.Trim()        ?? DBNull.Value);
                cmd.Parameters.AddWithValue("ccont",(object?)dto.ComodatoContrato?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("cfdi", (object?)dto.ComodatoFechaInicio       ?? DBNull.Value);
                cmd.Parameters.AddWithValue("cfdf", (object?)dto.ComodatoFechaFin          ?? DBNull.Value);
                await using var r = await cmd.ExecuteReaderAsync();
                await r.ReadAsync();
                item = LeerItem(r);
            }

            await tx.CommitAsync();
        }
        catch { await tx.RollbackAsync(); throw; }

        // Ya confirmado: un fallo al leer el nombre de la sede no debe responder error
        // (antes intentaba deshacer una transacción ya confirmada y devolvía 500)
        if (item.SedeId.HasValue)
        {
            try
            {
                await using var s = conn.CreateCommand();
                s.CommandText = "SELECT nombre FROM sedes WHERE id=@id";
                s.Parameters.AddWithValue("id", item.SedeId.Value);
                var nombreSede = (string?)await s.ExecuteScalarAsync() ?? "";
                item = item with { NombreSede = nombreSede };
            }
            catch { /* el nombre de la sede es solo informativo */ }
        }
        return item;
    }

    public async Task<ItemInventarioDto?> ActualizarItemAsync(Guid id, ActualizarItemDto dto)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE inventario_items
            SET nombre=@nom, descripcion=@des,
                unidad_medida=@uni, categoria=@cat, stock_minimo=@sm,
                tipo_tenencia=@tten, comodante=@cmod, comodato_contrato=@ccont,
                comodato_fecha_inicio=@cfdi::date, comodato_fecha_fin=@cfdf::date,
                fecha_modificacion=NOW()
            WHERE id=@id
            RETURNING id, sede_id, '' AS nombre_sede,
                      codigo,nombre,descripcion,unidad_medida,categoria,
                      stock_actual,stock_minimo,activo,fecha_creacion,fecha_modificacion,
                      tipo_tenencia, comodante, comodato_contrato,
                      TO_CHAR(comodato_fecha_inicio,'YYYY-MM-DD'), TO_CHAR(comodato_fecha_fin,'YYYY-MM-DD')";
        cmd.Parameters.AddWithValue("id",   id);
        cmd.Parameters.AddWithValue("nom",  dto.Nombre.Trim());
        cmd.Parameters.AddWithValue("des",  (object?)dto.Descripcion?.Trim()            ?? DBNull.Value);
        cmd.Parameters.AddWithValue("uni",  string.IsNullOrWhiteSpace(dto.UnidadMedida) ? "unidad" : dto.UnidadMedida.Trim());
        cmd.Parameters.AddWithValue("cat",  string.IsNullOrWhiteSpace(dto.Categoria)    ? "Otros"  : dto.Categoria.Trim());
        cmd.Parameters.AddWithValue("sm",   dto.StockMinimo);
        cmd.Parameters.AddWithValue("tten", string.IsNullOrWhiteSpace(dto.TipoTenencia) ? "propio" : dto.TipoTenencia.Trim());
        cmd.Parameters.AddWithValue("cmod", (object?)dto.Comodante?.Trim()        ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ccont",(object?)dto.ComodatoContrato?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cfdi", (object?)dto.ComodatoFechaInicio       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cfdf", (object?)dto.ComodatoFechaFin          ?? DBNull.Value);
        ItemInventarioDto item;
        await using (var r = await cmd.ExecuteReaderAsync())
        {
            if (!await r.ReadAsync()) return null;
            item = LeerItem(r);
        }

        if (item.SedeId.HasValue)
        {
            await using var s = conn.CreateCommand();
            s.CommandText = "SELECT nombre FROM sedes WHERE id=@id";
            s.Parameters.AddWithValue("id", item.SedeId.Value);
            var nombreSede = (string?)await s.ExecuteScalarAsync() ?? "";
            item = item with { NombreSede = nombreSede };
        }
        return item;
    }

    public async Task<ResultadoEliminacionItem> EliminarItemAsync(Guid id)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using (var chk = conn.CreateCommand())
        {
            chk.CommandText = "SELECT COUNT(1) FROM inventario_movimientos WHERE item_id=@id";
            chk.Parameters.AddWithValue("id", id);
            if (Convert.ToInt64(await chk.ExecuteScalarAsync()) > 0)
            {
                await using var upd = conn.CreateCommand();
                upd.CommandText = "UPDATE inventario_items SET activo=false, fecha_modificacion=NOW() WHERE id=@id";
                upd.Parameters.AddWithValue("id", id);
                await upd.ExecuteNonQueryAsync();
                return ResultadoEliminacionItem.Desactivado;
            }
        }
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM inventario_items WHERE id=@id";
        cmd.Parameters.AddWithValue("id", id);
        if (await cmd.ExecuteNonQueryAsync() == 0) return ResultadoEliminacionItem.NoEncontrado;
        return ResultadoEliminacionItem.Eliminado;
    }

    // ── Movimientos ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MovimientoDto>> ListarMovimientosAsync(Guid? itemId, Guid? sedeId)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();

        var where = new List<string>();
        if (itemId.HasValue) { where.Add("m.item_id = @iid"); cmd.Parameters.AddWithValue("iid", itemId.Value); }
        if (sedeId.HasValue) { where.Add("i.sede_id = @sid"); cmd.Parameters.AddWithValue("sid", sedeId.Value); }

        var whereClause = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : "";
        cmd.CommandText = $@"
            SELECT m.id, m.item_id, i.nombre,
                   m.tipo_movimiento_id, t.nombre, t.afecta_stock,
                   m.cantidad, m.stock_resultante,
                   m.motivo, m.donante,
                   m.donante_id, COALESCE(d.nombre,'') AS nombre_donante,
                   m.sede_destino_id, COALESCE(sd.nombre,'') AS nombre_sede_destino,
                   m.transferencia_grupo,
                   m.usuario_email, m.fecha_movimiento
            FROM inventario_movimientos m
            JOIN  inventario_items i        ON i.id  = m.item_id
            JOIN  cat_tipo_movimiento_inv t ON t.id  = m.tipo_movimiento_id
            LEFT JOIN donantes d            ON d.id  = m.donante_id
            LEFT JOIN sedes    sd           ON sd.id = m.sede_destino_id
            {whereClause}
            ORDER BY m.fecha_movimiento DESC LIMIT 300";

        var list = new List<MovimientoDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerMovimiento(r));
        return list;
    }

    public async Task<ResultadoInventario<MovimientoRegistradoResultado>> RegistrarMovimientoAsync(
        RegistrarMovimientoDto dto, string? usuarioEmail)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            string afecta;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "SELECT afecta_stock FROM cat_tipo_movimiento_inv WHERE id=@id";
                cmd.Parameters.AddWithValue("id", dto.TipoMovimientoId);
                var val = await cmd.ExecuteScalarAsync();
                if (val is null) return ResultadoInventario<MovimientoRegistradoResultado>.Invalido("Tipo de movimiento no válido.");
                afecta = val.ToString()!;
            }

            decimal stockActual;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "SELECT stock_actual FROM inventario_items WHERE id=@id FOR UPDATE";
                cmd.Parameters.AddWithValue("id", dto.ItemId);
                var val = await cmd.ExecuteScalarAsync();
                if (val is null) return ResultadoInventario<MovimientoRegistradoResultado>.NoEncontrado("Artículo no encontrado.");
                stockActual = Convert.ToDecimal(val);
            }

            decimal nuevoStock = InventarioReglas.CalcularNuevoStock(afecta, stockActual, dto.Cantidad);
            if (nuevoStock < 0)
                return ResultadoInventario<MovimientoRegistradoResultado>.Invalido($"Stock insuficiente. Stock actual: {stockActual}.");

            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "UPDATE inventario_items SET stock_actual=@s, fecha_modificacion=NOW() WHERE id=@id";
                cmd.Parameters.AddWithValue("s", nuevoStock);
                cmd.Parameters.AddWithValue("id", dto.ItemId);
                await cmd.ExecuteNonQueryAsync();
            }

            Guid newId;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"
                    INSERT INTO inventario_movimientos
                        (item_id,tipo_movimiento_id,cantidad,stock_resultante,motivo,donante,donante_id,usuario_email)
                    VALUES (@iid,@tid,@cant,@sr,@mot,@don,@did,@email)
                    RETURNING id";
                cmd.Parameters.AddWithValue("iid",   dto.ItemId);
                cmd.Parameters.AddWithValue("tid",   dto.TipoMovimientoId);
                cmd.Parameters.AddWithValue("cant",  dto.Cantidad);
                cmd.Parameters.AddWithValue("sr",    nuevoStock);
                cmd.Parameters.AddWithValue("mot",   (object?)dto.Motivo?.Trim()  ?? DBNull.Value);
                cmd.Parameters.AddWithValue("don",   (object?)dto.Donante?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("did",   (object?)dto.DonanteId       ?? DBNull.Value);
                cmd.Parameters.AddWithValue("email", (object?)usuarioEmail        ?? DBNull.Value);
                newId = (Guid)(await cmd.ExecuteScalarAsync())!;
            }

            await tx.CommitAsync();
            return ResultadoInventario<MovimientoRegistradoResultado>.Exito(new MovimientoRegistradoResultado(newId, nuevoStock));
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    // ── Transferencia entre sedes ─────────────────────────────────────────────

    public async Task<ResultadoInventario<TransferenciaResultado>> TransferirAsync(TransferenciaDto dto, string? usuarioEmail)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            // Datos del item origen
            string nombre; string? codigo; string unidad; string categoria; Guid? sedeOrigen; decimal stockOrigen;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "SELECT nombre,codigo,unidad_medida,categoria,sede_id,stock_actual FROM inventario_items WHERE id=@id AND activo=true FOR UPDATE";
                cmd.Parameters.AddWithValue("id", dto.ItemOrigenId);
                await using var r = await cmd.ExecuteReaderAsync();
                if (!await r.ReadAsync()) return ResultadoInventario<TransferenciaResultado>.NoEncontrado("Artículo origen no encontrado.");
                nombre      = r.GetString(0);
                codigo      = r.IsDBNull(1) ? null : r.GetString(1);
                unidad      = r.GetString(2);
                categoria   = r.GetString(3);
                sedeOrigen  = r.IsDBNull(4) ? null : r.GetGuid(4);
                stockOrigen = r.GetDecimal(5);
            }

            if (stockOrigen < dto.Cantidad)
                return ResultadoInventario<TransferenciaResultado>.Invalido($"Stock insuficiente en origen. Stock actual: {stockOrigen}.");
            if (sedeOrigen == dto.SedeDestinoId)
                return ResultadoInventario<TransferenciaResultado>.Invalido("La sede destino debe ser diferente a la sede origen.");

            // Verificar sede destino existe
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "SELECT COUNT(1) FROM sedes WHERE id=@id AND activo=true";
                cmd.Parameters.AddWithValue("id", dto.SedeDestinoId);
                if (Convert.ToInt64(await cmd.ExecuteScalarAsync()) == 0)
                    return ResultadoInventario<TransferenciaResultado>.Invalido("Sede destino no encontrada.");
            }

            decimal nuevoStockOrigen = stockOrigen - dto.Cantidad;

            // IDs de tipos de transferencia
            int tipoSalida = 0, tipoEntrada = 0;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "SELECT id,codigo FROM cat_tipo_movimiento_inv WHERE codigo IN ('TRANSFERENCIA_SALIDA','TRANSFERENCIA_ENTRADA')";
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    if (r.GetString(1) == "TRANSFERENCIA_SALIDA")  tipoSalida  = r.GetInt32(0);
                    if (r.GetString(1) == "TRANSFERENCIA_ENTRADA") tipoEntrada = r.GetInt32(0);
                }
            }

            // Buscar o crear item destino
            Guid itemDestinoId;
            decimal stockDestino = 0;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = codigo != null
                    ? "SELECT id,stock_actual FROM inventario_items WHERE sede_id=@sid AND codigo=@cod AND activo=true FOR UPDATE LIMIT 1"
                    : "SELECT id,stock_actual FROM inventario_items WHERE sede_id=@sid AND nombre=@nom AND activo=true FOR UPDATE LIMIT 1";
                cmd.Parameters.AddWithValue("sid", dto.SedeDestinoId);
                if (codigo != null) cmd.Parameters.AddWithValue("cod", codigo);
                else                cmd.Parameters.AddWithValue("nom", nombre);
                await using var r = await cmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                {
                    itemDestinoId = r.GetGuid(0);
                    stockDestino  = r.GetDecimal(1);
                }
                else
                {
                    // Crear artículo en sede destino
                    await r.CloseAsync();
                    await using var ins = conn.CreateCommand();
                    ins.Transaction = tx;
                    ins.CommandText = @"INSERT INTO inventario_items (sede_id,codigo,nombre,unidad_medida,categoria,stock_actual,stock_minimo)
                        VALUES (@sid,@cod,@nom,@uni,@cat,0,0) RETURNING id";
                    ins.Parameters.AddWithValue("sid", dto.SedeDestinoId);
                    ins.Parameters.AddWithValue("cod", (object?)codigo ?? DBNull.Value);
                    ins.Parameters.AddWithValue("nom", nombre);
                    ins.Parameters.AddWithValue("uni", unidad);
                    ins.Parameters.AddWithValue("cat", categoria);
                    itemDestinoId = (Guid)(await ins.ExecuteScalarAsync())!;
                }
            }

            decimal nuevoStockDestino = stockDestino + dto.Cantidad;
            var grupoId = Guid.NewGuid();
            var motivo  = dto.Motivo?.Trim();

            // Descontar en origen
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "UPDATE inventario_items SET stock_actual=@s, fecha_modificacion=NOW() WHERE id=@id";
                cmd.Parameters.AddWithValue("s",  nuevoStockOrigen);
                cmd.Parameters.AddWithValue("id", dto.ItemOrigenId);
                await cmd.ExecuteNonQueryAsync();
            }

            // Agregar en destino
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "UPDATE inventario_items SET stock_actual=@s, fecha_modificacion=NOW() WHERE id=@id";
                cmd.Parameters.AddWithValue("s",  nuevoStockDestino);
                cmd.Parameters.AddWithValue("id", itemDestinoId);
                await cmd.ExecuteNonQueryAsync();
            }

            // Movimiento salida
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"INSERT INTO inventario_movimientos
                    (item_id,tipo_movimiento_id,cantidad,stock_resultante,motivo,sede_destino_id,transferencia_grupo,usuario_email)
                    VALUES (@iid,@tid,@cant,@sr,@mot,@sdid,@grp,@email)";
                cmd.Parameters.AddWithValue("iid",   dto.ItemOrigenId);
                cmd.Parameters.AddWithValue("tid",   tipoSalida);
                cmd.Parameters.AddWithValue("cant",  dto.Cantidad);
                cmd.Parameters.AddWithValue("sr",    nuevoStockOrigen);
                cmd.Parameters.AddWithValue("mot",   (object?)motivo ?? DBNull.Value);
                cmd.Parameters.AddWithValue("sdid",  dto.SedeDestinoId);
                cmd.Parameters.AddWithValue("grp",   grupoId);
                cmd.Parameters.AddWithValue("email", (object?)usuarioEmail ?? DBNull.Value);
                await cmd.ExecuteNonQueryAsync();
            }

            // Movimiento entrada
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"INSERT INTO inventario_movimientos
                    (item_id,tipo_movimiento_id,cantidad,stock_resultante,motivo,transferencia_grupo,usuario_email)
                    VALUES (@iid,@tid,@cant,@sr,@mot,@grp,@email)";
                cmd.Parameters.AddWithValue("iid",   itemDestinoId);
                cmd.Parameters.AddWithValue("tid",   tipoEntrada);
                cmd.Parameters.AddWithValue("cant",  dto.Cantidad);
                cmd.Parameters.AddWithValue("sr",    nuevoStockDestino);
                cmd.Parameters.AddWithValue("mot",   (object?)motivo ?? DBNull.Value);
                cmd.Parameters.AddWithValue("grp",   grupoId);
                cmd.Parameters.AddWithValue("email", (object?)usuarioEmail ?? DBNull.Value);
                await cmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return ResultadoInventario<TransferenciaResultado>.Exito(new TransferenciaResultado(
                grupoId, dto.ItemOrigenId, nuevoStockOrigen, itemDestinoId, nuevoStockDestino, nombre));
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    // ── Tipos de movimiento ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<TipoMovimientoDto>> ListarTiposAsync()
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id,codigo,nombre,descripcion,afecta_stock FROM cat_tipo_movimiento_inv ORDER BY id";
        var list = new List<TipoMovimientoDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
            list.Add(new TipoMovimientoDto(
                r.GetInt32(0), r.GetString(1), r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3), r.GetString(4)));
        return list;
    }

    // ── Donantes (búsqueda rápida para autocomplete) ──────────────────────────

    public async Task<IReadOnlyList<DonanteResumenDto>> BuscarDonantesAsync(string? buscar)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            cmd.CommandText = @"SELECT id,nombre,tipo,documento FROM donantes
                WHERE activo=true AND LOWER(nombre) LIKE @b ORDER BY nombre LIMIT 20";
            cmd.Parameters.AddWithValue("b", $"%{buscar.ToLower().Trim()}%");
        }
        else
        {
            cmd.CommandText = "SELECT id,nombre,tipo,documento FROM donantes WHERE activo=true ORDER BY nombre LIMIT 50";
        }
        var list = new List<DonanteResumenDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
            list.Add(new DonanteResumenDto(
                r.GetGuid(0), r.GetString(1), r.GetString(2),
                r.IsDBNull(3) ? null : r.GetString(3)));
        return list;
    }

    // ── Estadísticas ──────────────────────────────────────────────────────────

    public async Task<StatsInventarioDto> ObtenerStatsAsync(Guid? sedeId)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();

        int totalItems = 0, stockBajo = 0, movimientosMes = 0, sinStock = 0;

        await using (var cmd = conn.CreateCommand())
        {
            var sedeWhere = sedeId.HasValue ? "AND sede_id = @sid" : "";
            cmd.CommandText = $@"SELECT
                COUNT(*),
                SUM(CASE WHEN stock_actual < stock_minimo AND stock_actual > 0 THEN 1 ELSE 0 END),
                SUM(CASE WHEN stock_actual <= 0 THEN 1 ELSE 0 END)
                FROM inventario_items WHERE activo = true {sedeWhere}";
            if (sedeId.HasValue) cmd.Parameters.AddWithValue("sid", sedeId.Value);
            await using var r = await cmd.ExecuteReaderAsync();
            if (await r.ReadAsync())
            {
                totalItems = r.IsDBNull(0) ? 0 : Convert.ToInt32(r.GetInt64(0));
                stockBajo  = r.IsDBNull(1) ? 0 : Convert.ToInt32(r.GetInt64(1));
                sinStock   = r.IsDBNull(2) ? 0 : Convert.ToInt32(r.GetInt64(2));
            }
        }

        await using (var cmd = conn.CreateCommand())
        {
            var sedeWhere = sedeId.HasValue ? "AND i.sede_id = @sid" : "";
            cmd.CommandText = $@"SELECT COUNT(*) FROM inventario_movimientos m
                JOIN inventario_items i ON i.id = m.item_id
                WHERE m.fecha_movimiento >= date_trunc('month', NOW()) {sedeWhere}";
            if (sedeId.HasValue) cmd.Parameters.AddWithValue("sid", sedeId.Value);
            var val = await cmd.ExecuteScalarAsync();
            movimientosMes = val is null ? 0 : Convert.ToInt32(val);
        }

        return new StatsInventarioDto(totalItems, stockBajo, movimientosMes, sinStock);
    }

    // ── Ingresar desde donación ───────────────────────────────────────────────

    public async Task<ResultadoInventario<IngresoDonacionResultado>> IngresarDesdeDonacionAsync(
        IngresarDesdeDonacionDto dto, string nombreItem, string? usuarioEmail)
    {
        var nombre = nombreItem;

        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            // Obtener id del tipo DONACION_RECIBIDA
            int tipoId;
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "SELECT id FROM cat_tipo_movimiento_inv WHERE codigo='DONACION_RECIBIDA' LIMIT 1";
                var val = await cmd.ExecuteScalarAsync();
                if (val is null) return ResultadoInventario<IngresoDonacionResultado>.Invalido("Tipo de movimiento DONACION_RECIBIDA no configurado.");
                tipoId = Convert.ToInt32(val);
            }

            Guid itemId;
            decimal nuevoStock;

            if (dto.ItemId.HasValue)
            {
                // Usar ítem existente
                decimal stockActual;
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText = "SELECT stock_actual FROM inventario_items WHERE id=@id AND activo=true FOR UPDATE";
                    cmd.Parameters.AddWithValue("id", dto.ItemId.Value);
                    var val = await cmd.ExecuteScalarAsync();
                    if (val is null) return ResultadoInventario<IngresoDonacionResultado>.NoEncontrado("Artículo no encontrado.");
                    stockActual = Convert.ToDecimal(val);
                }
                nuevoStock = stockActual + dto.Cantidad;
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText = "UPDATE inventario_items SET stock_actual=@s, fecha_modificacion=NOW() WHERE id=@id";
                    cmd.Parameters.AddWithValue("s", nuevoStock);
                    cmd.Parameters.AddWithValue("id", dto.ItemId.Value);
                    await cmd.ExecuteNonQueryAsync();
                }
                itemId = dto.ItemId.Value;
            }
            else
            {
                // Crear nuevo ítem con stock inicial
                nuevoStock = dto.Cantidad;
                await using (var cmd = conn.CreateCommand())
                {
                    cmd.Transaction = tx;
                    cmd.CommandText = @"INSERT INTO inventario_items (sede_id,nombre,unidad_medida,categoria,stock_actual,stock_minimo)
                        VALUES (@sid,@nom,@uni,@cat,@sa,@sm) RETURNING id";
                    cmd.Parameters.AddWithValue("sid", (object?)dto.SedeId     ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("nom", nombre);
                    cmd.Parameters.AddWithValue("uni", string.IsNullOrWhiteSpace(dto.UnidadMedida) ? "unidad" : dto.UnidadMedida.Trim());
                    cmd.Parameters.AddWithValue("cat", string.IsNullOrWhiteSpace(dto.Categoria)    ? "Otros"   : dto.Categoria.Trim());
                    cmd.Parameters.AddWithValue("sa",  nuevoStock);
                    cmd.Parameters.AddWithValue("sm",  dto.StockMinimo >= 0 ? dto.StockMinimo : 0);
                    itemId = (Guid)(await cmd.ExecuteScalarAsync())!;
                }
            }

            // Registrar movimiento
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"INSERT INTO inventario_movimientos
                    (item_id,tipo_movimiento_id,cantidad,stock_resultante,donante_id,donante,donacion_id,usuario_email)
                    VALUES (@iid,@tid,@cant,@sr,@did,@don,@donid,@email)";
                cmd.Parameters.AddWithValue("iid",   itemId);
                cmd.Parameters.AddWithValue("tid",   tipoId);
                cmd.Parameters.AddWithValue("cant",  dto.Cantidad);
                cmd.Parameters.AddWithValue("sr",    nuevoStock);
                cmd.Parameters.AddWithValue("did",   (object?)dto.DonanteId     ?? DBNull.Value);
                cmd.Parameters.AddWithValue("don",   (object?)dto.NombreDonante ?? DBNull.Value);
                cmd.Parameters.AddWithValue("donid", (object?)dto.DonacionId    ?? DBNull.Value);
                cmd.Parameters.AddWithValue("email", (object?)usuarioEmail      ?? DBNull.Value);
                await cmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return ResultadoInventario<IngresoDonacionResultado>.Exito(new IngresoDonacionResultado(itemId, nuevoStock));
        }
        catch { await tx.RollbackAsync(); throw; }
    }

    // ── Comodatos próximos a vencer ───────────────────────────────────────────

    public async Task<IReadOnlyList<ItemInventarioDto>> ComodatosProximosAsync(int dias)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT i.id, i.sede_id, COALESCE(s.nombre,'') AS nombre_sede,
                   i.codigo, i.nombre, i.descripcion, i.unidad_medida,
                   i.categoria, i.stock_actual, i.stock_minimo,
                   i.activo, i.fecha_creacion, i.fecha_modificacion,
                   i.tipo_tenencia, i.comodante, i.comodato_contrato,
                   TO_CHAR(i.comodato_fecha_inicio,'YYYY-MM-DD') AS comodato_fecha_inicio,
                   TO_CHAR(i.comodato_fecha_fin,'YYYY-MM-DD') AS comodato_fecha_fin
            FROM inventario_items i
            LEFT JOIN sedes s ON s.id = i.sede_id
            WHERE i.activo = true
              AND i.tipo_tenencia = 'comodato'
              AND i.comodato_fecha_fin IS NOT NULL
              AND i.comodato_fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + (@dias || ' days')::interval
            ORDER BY i.comodato_fecha_fin";
        cmd.Parameters.AddWithValue("dias", dias);
        var list = new List<ItemInventarioDto>();
        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync()) list.Add(LeerItem(r));
        return list;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ItemInventarioDto LeerItem(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0),
        r.IsDBNull(1) ? null : r.GetGuid(1),
        r.GetString(2),
        r.IsDBNull(3) ? null : r.GetString(3),
        r.GetString(4),
        r.IsDBNull(5) ? null : r.GetString(5),
        r.GetString(6),
        r.GetString(7),
        r.GetDecimal(8),
        r.GetDecimal(9),
        r.GetBoolean(10),
        r.GetDateTime(11),
        r.GetDateTime(12),
        r.IsDBNull(13) ? "propio" : r.GetString(13),
        r.IsDBNull(14) ? null : r.GetString(14),
        r.IsDBNull(15) ? null : r.GetString(15),
        r.IsDBNull(16) ? null : r.GetString(16),
        r.IsDBNull(17) ? null : r.GetString(17)
    );

    private static MovimientoDto LeerMovimiento(System.Data.Common.DbDataReader r) => new(
        r.GetGuid(0), r.GetGuid(1), r.GetString(2),
        r.GetInt32(3), r.GetString(4), r.GetString(5),
        r.GetDecimal(6), r.GetDecimal(7),
        r.IsDBNull(8)  ? null : r.GetString(8),
        r.IsDBNull(9)  ? null : r.GetString(9),
        r.IsDBNull(10) ? null : r.GetGuid(10),
        r.GetString(11),
        r.IsDBNull(12) ? null : r.GetGuid(12),
        r.GetString(13),
        r.IsDBNull(14) ? null : r.GetGuid(14),
        r.IsDBNull(15) ? null : r.GetString(15),
        r.GetDateTime(16)
    );
}
