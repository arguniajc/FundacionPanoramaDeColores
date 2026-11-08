using FundacionPanorama.Application.Features.Documentos.DTOs;
using FundacionPanorama.Application.Features.Documentos.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

/// <summary>Documentos institucionales (tabla propia) y adicionales por beneficiario (tabla archivos).</summary>
public class DocumentosRepository(DbConnectionFactory factory) : IDocumentosRepository
{
    // ── Institucionales ──────────────────────────────────────────────────────

    public async Task<IReadOnlyList<DocumentoInstitucionalDto>> ListarAsync(string? categoria, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();

        if (string.IsNullOrWhiteSpace(categoria))
        {
            cmd.CommandText = @"
                SELECT id, titulo, descripcion, categoria, url, nombre_original, subido_por_email, fecha_creacion
                FROM documentos_institucionales
                WHERE activo = true
                ORDER BY fecha_creacion DESC";
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, titulo, descripcion, categoria, url, nombre_original, subido_por_email, fecha_creacion
                FROM documentos_institucionales
                WHERE activo = true AND categoria = @cat
                ORDER BY fecha_creacion DESC";
            cmd.Parameters.AddWithValue("cat", categoria);
        }

        var docs = new List<DocumentoInstitucionalDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            docs.Add(new DocumentoInstitucionalDto(
                Id:             r.GetGuid(0),
                Titulo:         r.GetString(1),
                Descripcion:    r.IsDBNull(2) ? null : r.GetString(2),
                Categoria:      r.GetString(3),
                Url:            r.GetString(4),
                NombreOriginal: r.IsDBNull(5) ? null : r.GetString(5),
                SubidoPorEmail: r.IsDBNull(6) ? null : r.GetString(6),
                FechaCreacion:  r.GetDateTime(7)));
        }
        return docs;
    }

    public async Task<Guid> CrearAsync(CrearDocumentoDto dto, string email, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO documentos_institucionales (titulo, descripcion, categoria, url, nombre_original, subido_por_email)
            VALUES (@titulo, @desc, @cat, @url, @nombreOrig, @email)
            RETURNING id";
        cmd.Parameters.AddWithValue("titulo",     dto.Titulo.Trim());
        cmd.Parameters.AddWithValue("desc",       (object?)dto.Descripcion?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cat",        dto.Categoria);
        cmd.Parameters.AddWithValue("url",        dto.Url);
        cmd.Parameters.AddWithValue("nombreOrig", (object?)dto.NombreOriginal ?? DBNull.Value);
        cmd.Parameters.AddWithValue("email",      email);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<DocumentoEliminado?> EliminarAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE documentos_institucionales
            SET activo = false, fecha_modificacion = NOW()
            WHERE id = @id AND activo = true
            RETURNING url";
        cmd.Parameters.AddWithValue("id", id);
        return await LeerEliminadoAsync(cmd, ct);
    }

    // RETURNING url: sin fila = no existía o ya estaba inactivo
    static async Task<DocumentoEliminado?> LeerEliminadoAsync(Npgsql.NpgsqlCommand cmd, CancellationToken ct)
    {
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        if (!await rd.ReadAsync(ct)) return null;
        return new DocumentoEliminado(rd.IsDBNull(0) ? null : rd.GetString(0));
    }

    // ── Por beneficiario (tabla archivos) ────────────────────────────────────

    public async Task<IReadOnlyList<ArchivoBeneficiarioDto>> ListarPorBeneficiarioAsync(Guid beneficiarioId, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT id, url, nombre_original, fecha_creacion
            FROM archivos
            WHERE entidad_tipo = 'beneficiario' AND entidad_id = @bid AND activo = true
            ORDER BY fecha_creacion DESC";
        cmd.Parameters.AddWithValue("bid", beneficiarioId);
        var archivos = new List<ArchivoBeneficiarioDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            archivos.Add(new ArchivoBeneficiarioDto(
                Id:             r.GetGuid(0),
                Url:            r.GetString(1),
                NombreOriginal: r.IsDBNull(2) ? null : r.GetString(2),
                FechaCreacion:  r.GetDateTime(3)));
        }
        return archivos;
    }

    public async Task<Guid?> GuardarArchivoBeneficiarioAsync(Guid beneficiarioId, GuardarArchivoDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        await using (var cmdCheck = conn.CreateCommand())
        {
            cmdCheck.CommandText = "SELECT EXISTS(SELECT 1 FROM beneficiarios WHERE id = @id AND activo = true)";
            cmdCheck.Parameters.AddWithValue("id", beneficiarioId);
            var existe = (bool)(await cmdCheck.ExecuteScalarAsync(ct))!;
            if (!existe) return null;
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO archivos (entidad_tipo, entidad_id, url, nombre_original)
            VALUES ('beneficiario', @bid, @url, @nombreOrig)
            RETURNING id";
        cmd.Parameters.AddWithValue("bid",      beneficiarioId);
        cmd.Parameters.AddWithValue("url",      dto.Url);
        cmd.Parameters.AddWithValue("nombreOrig", (object?)(dto.NombreOriginal ?? dto.Titulo) ?? DBNull.Value);
        return (Guid)(await cmd.ExecuteScalarAsync(ct))!;
    }

    public async Task<DocumentoEliminado?> EliminarArchivoAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            UPDATE archivos
            SET activo = false, fecha_modificacion = NOW()
            WHERE id = @id AND activo = true
            RETURNING url";
        cmd.Parameters.AddWithValue("id", id);
        return await LeerEliminadoAsync(cmd, ct);
    }
}
