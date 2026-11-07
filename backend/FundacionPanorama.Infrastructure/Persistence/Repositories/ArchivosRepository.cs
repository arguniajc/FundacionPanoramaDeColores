using FundacionPanorama.Application.Features.Archivos.DTOs;
using FundacionPanorama.Application.Features.Archivos.Interfaces;

namespace FundacionPanorama.Infrastructure.Persistence.Repositories;

/// <summary>Auditoría de descargas de documentos (tabla log_descargas).</summary>
public class ArchivosRepository(DbConnectionFactory factory) : IArchivosRepository
{
    public async Task<long> ContarDescargasAsync(CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmdCount = conn.CreateCommand();
        cmdCount.CommandText = "SELECT COUNT(*) FROM log_descargas l JOIN beneficiarios b ON b.id = l.beneficiario_id"; // mismo JOIN que la lista
        return (long)(await cmdCount.ExecuteScalarAsync(ct))!;
    }

    public async Task<IReadOnlyList<LogDescargaRegistroDto>> ListarDescargasAsync(int pagina, int porPagina, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);

        var registros = new List<LogDescargaRegistroDto>();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            SELECT l.id, l.usuario_email, l.beneficiario_id,
                   concat_ws(' ', b.primer_nombre, b.segundo_nombre, b.primer_apellido, b.segundo_apellido) AS nombre_beneficiario,
                   l.tipo_archivo, l.url_archivo, l.descargado_en
            FROM log_descargas l
            JOIN beneficiarios b ON b.id = l.beneficiario_id
            ORDER BY l.descargado_en DESC
            LIMIT @limit OFFSET @offset";
        cmd.Parameters.AddWithValue("limit",  porPagina);
        cmd.Parameters.AddWithValue("offset", (pagina - 1) * porPagina);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            registros.Add(new LogDescargaRegistroDto(
                Id:                 r.GetGuid(0),
                UsuarioEmail:       r.GetString(1),
                BeneficiarioId:     r.GetGuid(2),
                NombreBeneficiario: r.GetString(3),
                TipoArchivo:        r.IsDBNull(4) ? null : r.GetString(4),
                UrlArchivo:         r.IsDBNull(5) ? null : r.GetString(5),
                DescargadoEn:       r.GetDateTime(6)));
        }
        return registros;
    }

    public async Task RegistrarDescargaAsync(string email, LogDescargaDto dto, CancellationToken ct = default)
    {
        await using var conn = factory.Create();
        await conn.OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO log_descargas (usuario_email, beneficiario_id, tipo_archivo, url_archivo, descargado_en)
            VALUES (@email, @bid, @tipo, @url, NOW())";
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("bid",   dto.BeneficiarioId);
        cmd.Parameters.AddWithValue("tipo",  dto.TipoArchivo ?? "documento");
        cmd.Parameters.AddWithValue("url",   (object?)dto.UrlArchivo ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
