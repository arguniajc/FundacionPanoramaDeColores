using FundacionPanorama.API.Services;
using FundacionPanorama.Domain.Shared;
using Npgsql;

namespace FundacionPanorama.Tests.Services;

public class TraductorErroresTests
{
    static PostgresException Pg(string sqlState, string mensaje = "error") =>
        new(mensaje, "ERROR", "ERROR", sqlState);

    [Theory]
    [InlineData("22001", 400, "demasiado largo")]
    [InlineData("23505", 409, "Ya existe")]
    [InlineData("23502", 400, "obligatorio")]
    [InlineData("23514", 400, "no es válido")]
    [InlineData("22P02", 400, "formato")]
    [InlineData("22003", 400, "demasiado grande")]
    public void Errores_De_Postgres_Conocidos_Dan_Mensaje_Claro(string sqlState, int status, string fragmento)
    {
        var (s, m) = TraductorErrores.Traducir(Pg(sqlState));
        Assert.Equal(status, s);
        Assert.Contains(fragmento, m);
    }

    [Fact]
    public void Clave_Foranea_Distingue_Guardar_De_Eliminar()
    {
        Assert.Equal(400, TraductorErrores.Traducir(Pg("23503", "insert or update on table violates foreign key")).Status);
        var (s, m) = TraductorErrores.Traducir(Pg("23503", "update or delete on table violates foreign key"));
        Assert.Equal(409, s);
        Assert.Contains("dependen", m);
    }

    [Fact]
    public void Busca_La_Excepcion_De_Postgres_Envuelta()
        => Assert.Equal(409, TraductorErrores.Traducir(new InvalidOperationException("x", Pg("23505"))).Status);

    [Fact]
    public void Dato_Invalido_Devuelve_Su_Mensaje()
        => Assert.Equal((400, "El monto debe ser mayor que cero."),
                        TraductorErrores.Traducir(new DatoInvalidoException("El monto debe ser mayor que cero.")));

    [Theory]
    [InlineData("08006")]   // conexión caída: es un fallo nuestro, no del usuario
    [InlineData("42P01")]   // tabla inexistente
    public void Otros_Errores_Siguen_Siendo_500_Sin_Detalles(string sqlState)
    {
        var (s, m) = TraductorErrores.Traducir(Pg(sqlState, "relation \"usuarios\" does not exist"));
        Assert.Equal(500, s);
        Assert.Equal("Error interno del servidor.", m);
    }

    [Fact]
    public void Excepcion_Desconocida_Es_500()
        => Assert.Equal(500, TraductorErrores.Traducir(new NullReferenceException()).Status);
}
