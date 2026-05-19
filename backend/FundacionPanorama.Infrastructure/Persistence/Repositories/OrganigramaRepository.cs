using FundacionPanorama.Application.Features.Organigrama;
using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

public sealed class OrganigramaRepository(DbConnectionFactory factory) : IOrganigramaRepository
{
    const string SELECT = """
        SELECT op.id, op.cargo, op.orden, op.empleado_id,
               CASE WHEN op.empleado_id IS NOT NULL
                    THEN e.nombres || ' ' || e.apellidos
                    ELSE NULL END AS empleado_nombre,
               e.cargo AS empleado_cargo,
               op.nombre_externo, op.foto_url, op.parent_id
        FROM organigrama_personas op
        LEFT JOIN empleados e ON e.id = op.empleado_id
        WHERE op.activo = true
        """;

    public async Task<IReadOnlyList<OrganigramaPersonaDto>> ListarAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = SELECT + " ORDER BY op.orden, op.cargo";
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var list = new List<OrganigramaPersonaDto>();
        while (await r.ReadAsync(ct)) list.Add(Map(r));
        return list;
    }

    public async Task<OrganigramaPersonaDto?> ObtenerAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = SELECT + " AND op.id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? Map(r) : null;
    }

    public async Task<OrganigramaPersonaDto> CrearAsync(CrearOrganigramaPersonaDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO organigrama_personas (cargo, orden, empleado_id, nombre_externo, foto_url, parent_id)
            VALUES (@cargo, @orden, @empId, @nombre, @foto, @parentId)
            RETURNING id
            """;
        cmd.Parameters.AddWithValue("cargo",    dto.Cargo);
        cmd.Parameters.AddWithValue("orden",    dto.Orden);
        cmd.Parameters.AddWithValue("empId",    (object?)dto.EmpleadoId   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("nombre",   (object?)dto.NombreExterno ?? DBNull.Value);
        cmd.Parameters.AddWithValue("foto",     (object?)dto.FotoUrl       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("parentId", (object?)dto.ParentId      ?? DBNull.Value);
        var newId = (Guid)(await cmd.ExecuteScalarAsync(ct))!;
        return (await ObtenerAsync(newId, ct))!;
    }

    public async Task<OrganigramaPersonaDto?> ActualizarAsync(Guid id, ActualizarOrganigramaPersonaDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();

        var sets = new List<string> { "updated_at = NOW()" };
        if (!string.IsNullOrWhiteSpace(dto.Cargo))
                                          { sets.Add("cargo = @cargo");             cmd.Parameters.AddWithValue("cargo",    dto.Cargo.Trim()); }
        if (dto.Orden.HasValue)           { sets.Add("orden = @orden");             cmd.Parameters.AddWithValue("orden",    dto.Orden.Value); }
        if (dto.EmpleadoId is not null)   { sets.Add("empleado_id = @empId");       cmd.Parameters.AddWithValue("empId",    dto.EmpleadoId == Guid.Empty ? DBNull.Value : (object)dto.EmpleadoId.Value); }
        if (dto.NombreExterno is not null){ sets.Add("nombre_externo = @nombre");   cmd.Parameters.AddWithValue("nombre",   dto.NombreExterno == "" ? DBNull.Value : (object)dto.NombreExterno); }
        if (dto.FotoUrl is not null)      { sets.Add("foto_url = @foto");           cmd.Parameters.AddWithValue("foto",     dto.FotoUrl == "" ? DBNull.Value : (object)dto.FotoUrl); }
        // ParentId siempre se actualiza (null = nodo raíz)
        sets.Add("parent_id = @parentId");
        cmd.Parameters.AddWithValue("parentId", dto.ParentId.HasValue ? (object)dto.ParentId.Value : DBNull.Value);

        cmd.CommandText = $"UPDATE organigrama_personas SET {string.Join(", ", sets)} WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        await cmd.ExecuteNonQueryAsync(ct);
        return await ObtenerAsync(id, ct);
    }

    public async Task<bool> EliminarAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE organigrama_personas SET activo = false, updated_at = NOW() WHERE id = @id";
        cmd.Parameters.AddWithValue("id", id);
        return await cmd.ExecuteNonQueryAsync(ct) > 0;
    }

    static OrganigramaPersonaDto Map(NpgsqlDataReader r) => new(
        r.GetGuid(0),
        r.GetString(1),
        r.GetInt32(2),
        r.IsDBNull(3) ? null : r.GetGuid(3),
        r.IsDBNull(4) ? null : r.GetString(4),
        r.IsDBNull(5) ? null : r.GetString(5),
        r.IsDBNull(6) ? null : r.GetString(6),
        r.IsDBNull(7) ? null : r.GetString(7),
        r.IsDBNull(8) ? null : r.GetGuid(8)
    );
}
