using Npgsql;

namespace FundacionPanorama.Infrastructure.Persistence;

public class DbConnectionFactory(string connectionString)
{
    public NpgsqlConnection Create() => new(connectionString);
}
