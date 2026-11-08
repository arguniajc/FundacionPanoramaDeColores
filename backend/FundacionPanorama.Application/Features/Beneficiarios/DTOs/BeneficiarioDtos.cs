// DTOs del módulo Beneficiarios: salida (BeneficiarioDto), entrada (CrearBeneficiarioDto),
// paginación (ListaPaginada<BeneficiarioDto>) y estadísticas (BeneficiarioStatsDto).
using System.ComponentModel.DataAnnotations;
namespace FundacionPanorama.Application.Features.Beneficiarios.DTOs;

// Forma plana que consume el frontend — combina datos del menor, acudiente, tallas y archivos.
public class BeneficiarioDto
{
    public Guid      Id                 { get; set; }
    public string    PrimerNombre       { get; set; } = string.Empty;
    public string?   SegundoNombre      { get; set; }
    public string    PrimerApellido     { get; set; } = string.Empty;
    public string?   SegundoApellido    { get; set; }
    public string    NombreMenor        { get; set; } = string.Empty; // concat calculado en SQL
    public DateOnly  FechaNacimiento    { get; set; }
    public string    TipoDocumento      { get; set; } = string.Empty;
    public string?   NumeroDocumento    { get; set; }
    public string?   Eps                { get; set; }
    // ── Tallas ────────────────────────────────────────────────────────────────
    public string?   TallaCamisa        { get; set; }
    public string?   TallaPantalon      { get; set; }
    public string?   TallaZapatos       { get; set; }
    public decimal?  PesoKg             { get; set; }
    public int?      TallaCm            { get; set; }
    // ── Salud ─────────────────────────────────────────────────────────────────
    public string    TieneAlergia       { get; set; } = "no";
    public string?   DescripcionAlergia { get; set; }
    public string?   ObservacionesSalud { get; set; }
    public bool      TieneDiscapacidad  { get; set; }
    public string?   DescripcionDiscapacidad { get; set; }
    // ── Acudiente ─────────────────────────────────────────────────────────────
    public string    NombreAcudiente    { get; set; } = string.Empty;
    public string?   Parentesco         { get; set; }
    public string?   Whatsapp           { get; set; }
    public string?   Direccion          { get; set; }
    public bool?     ViveConNino        { get; set; }
    // ── Lugar de nacimiento ───────────────────────────────────────────────────
    public string?   PaisNacimiento          { get; set; }
    public string?   DepartamentoNacimiento  { get; set; }
    public string?   CiudadNacimiento        { get; set; }
    public string?   Barrio                  { get; set; }
    // ── Composición familiar ──────────────────────────────────────────────────
    public int?      NumPersonasVive    { get; set; }
    public int?      NumHermanos        { get; set; }
    // ── Educación ─────────────────────────────────────────────────────────────
    public string?   NombreColegio      { get; set; }
    public string?   GradoEscolar       { get; set; }
    // ── Género ────────────────────────────────────────────────────────────────
    public string?   Genero             { get; set; }
    // ── Autorización ──────────────────────────────────────────────────────────
    public bool      Autorizacion       { get; set; }
    // ── Archivos ──────────────────────────────────────────────────────────────
    public string?   FotoMenorUrl            { get; set; }
    public string?   FotoDocumentoUrl        { get; set; }
    public string?   FotoDocumentoReversoUrl { get; set; }
    public DateTime  CreatedAt               { get; set; }
    public bool      Activo             { get; set; }
    public string?   MotivoBaja         { get; set; }
    // ── Tipo ──────────────────────────────────────────────────────────────────
    public string    Tipo               { get; set; } = "niño"; // "niño" | "adulto"
}

public class CrearBeneficiarioDto
{
    [Required][StringLength(80)]
    public string    PrimerNombre       { get; set; } = string.Empty;
    [StringLength(80)]
    public string?   SegundoNombre      { get; set; }
    [Required][StringLength(80)]
    public string    PrimerApellido     { get; set; } = string.Empty;
    [StringLength(80)]
    public string?   SegundoApellido    { get; set; }
    public string NombreCompleto =>
        $"{PrimerNombre.Trim()}{(string.IsNullOrWhiteSpace(SegundoNombre) ? "" : " " + SegundoNombre.Trim())} {PrimerApellido.Trim()}{(string.IsNullOrWhiteSpace(SegundoApellido) ? "" : " " + SegundoApellido.Trim())}".Trim();
    public DateOnly  FechaNacimiento    { get; set; }
    [StringLength(20)]
    public string    TipoDocumento      { get; set; } = string.Empty;
    [Required][StringLength(30)]
    public string    NumeroDocumento    { get; set; } = string.Empty;
    [Required][StringLength(100)]
    public string    Eps                { get; set; } = string.Empty;
    // ── Tallas ────────────────────────────────────────────────────────────────
    [Required][StringLength(10)]
    public string    TallaCamisa        { get; set; } = string.Empty;
    [Required][StringLength(10)]
    public string    TallaPantalon      { get; set; } = string.Empty;
    [Required][StringLength(10)]
    public string    TallaZapatos       { get; set; } = string.Empty;
    [Required]
    public decimal?  PesoKg             { get; set; }
    [Required]
    public int?      TallaCm            { get; set; }
    // ── Salud ─────────────────────────────────────────────────────────────────
    [StringLength(10)]
    public string    TieneAlergia       { get; set; } = "no";
    [StringLength(500)]
    public string?   DescripcionAlergia { get; set; }
    [StringLength(1000)]
    public string?   ObservacionesSalud { get; set; }
    public bool      TieneDiscapacidad  { get; set; }
    [StringLength(500)]
    public string?   DescripcionDiscapacidad { get; set; }
    // ── Tipo ──────────────────────────────────────────────────────────────────
    [StringLength(20)]
    public string    Tipo               { get; set; } = "niño"; // "niño" | "adulto"
    // ── Acudiente ─────────────────────────────────────────────────────────────
    [StringLength(200)]
    public string?   NombreAcudiente    { get; set; }
    [StringLength(50)]
    public string?   Parentesco         { get; set; }
    [Phone][StringLength(30)]
    public string?   Whatsapp           { get; set; }
    [StringLength(200)]
    public string?   Direccion          { get; set; }
    public bool?     ViveConNino        { get; set; }
    // ── Lugar de nacimiento ───────────────────────────────────────────────────
    [Required][StringLength(100)]
    public string    PaisNacimiento          { get; set; } = string.Empty;
    [Required][StringLength(100)]
    public string    DepartamentoNacimiento  { get; set; } = string.Empty;
    [Required][StringLength(100)]
    public string    CiudadNacimiento        { get; set; } = string.Empty;
    [Required][StringLength(100)]
    public string    Barrio                  { get; set; } = string.Empty;
    // ── Composición familiar ──────────────────────────────────────────────────
    [Required]
    public int?      NumPersonasVive    { get; set; }
    [Required]
    public int?      NumHermanos        { get; set; }
    // ── Educación ─────────────────────────────────────────────────────────────
    [StringLength(200)]
    public string?   NombreColegio      { get; set; }
    [StringLength(50)]
    public string?   GradoEscolar       { get; set; }
    // ── Género ────────────────────────────────────────────────────────────────
    [Required][StringLength(20)]
    public string    Genero             { get; set; } = string.Empty;
    // ── Autorización ──────────────────────────────────────────────────────────
    public bool      Autorizacion       { get; set; }
    // ── Archivos ──────────────────────────────────────────────────────────────
    [StringLength(500)]
    public string?   FotoMenorUrl            { get; set; }
    [StringLength(500)]
    public string?   FotoDocumentoUrl        { get; set; }
    [StringLength(500)]
    public string?   FotoDocumentoReversoUrl { get; set; }
}

public class ImportarBeneficiarioRowDto
{
    public string? PrimerNombre       { get; set; }
    public string? SegundoNombre      { get; set; }
    public string? PrimerApellido     { get; set; }
    public string? SegundoApellido    { get; set; }
    public string? FechaNacimiento    { get; set; }
    public string? TipoDocumento      { get; set; }
    public string? NumeroDocumento    { get; set; }
    public string? Genero             { get; set; }
    public string? Eps                { get; set; }
    public string? NombreAcudiente    { get; set; }
    public string? Parentesco         { get; set; }
    public string? Whatsapp           { get; set; }
    public string? Direccion          { get; set; }
    public string? GradoEscolar       { get; set; }
    public string? NombreColegio      { get; set; }
    public string? TieneAlergia       { get; set; }
    public string? DescripcionAlergia { get; set; }
    public string? Tipo               { get; set; }
}

/// <summary>
/// Fila del LISTADO de beneficiarios (GET api/beneficiarios): solo lo que muestran la tabla
/// y los buscadores. Sin salud, dirección, acudiente ni rutas de fotos: esos datos de menores
/// solo viajan en el detalle (GET api/beneficiarios/{id}) o en la exportación con permiso.
/// </summary>
public class BeneficiarioResumenDto
{
    public Guid     Id                 { get; set; }
    public string   NombreMenor        { get; set; } = string.Empty;
    public DateOnly FechaNacimiento    { get; set; }
    public string   TipoDocumento      { get; set; } = string.Empty;
    public string?  NumeroDocumento    { get; set; }
    public string?  Genero             { get; set; }
    public string?  Whatsapp           { get; set; } // la tabla lo muestra con enlace a WhatsApp
    public string   TieneAlergia       { get; set; } = "no"; // solo si/no; la descripción va en el detalle
    public bool     Activo             { get; set; }
    public string   Tipo               { get; set; } = "niño";
    public bool     TieneFotoMenor     { get; set; }
    public bool     TieneFotoDocumento { get; set; }
    /// <summary>Porcentaje de perfil completo (0-100), calculado con la ficha completa.</summary>
    public int      Completitud        { get; set; }

    /// <summary>
    /// Misma regla que tenía el frontend: 10 campos para niños y 8 para adultos (sin colegio ni grado).
    /// La definición vive en CompletitudPerfil (también la usan los perfiles incompletos).
    /// </summary>
    public static int CalcularCompletitud(BeneficiarioDto b)
        => CompletitudPerfil.Evaluar(DatosPerfil.Desde(b)).Porcentaje;

    public static BeneficiarioResumenDto Desde(BeneficiarioDto b) => new()
    {
        Id                 = b.Id,
        NombreMenor        = b.NombreMenor,
        FechaNacimiento    = b.FechaNacimiento,
        TipoDocumento      = b.TipoDocumento,
        NumeroDocumento    = b.NumeroDocumento,
        Genero             = b.Genero,
        Whatsapp           = b.Whatsapp,
        TieneAlergia       = b.TieneAlergia,
        Activo             = b.Activo,
        Tipo               = b.Tipo,
        TieneFotoMenor     = !string.IsNullOrWhiteSpace(b.FotoMenorUrl),
        TieneFotoDocumento = !string.IsNullOrWhiteSpace(b.FotoDocumentoUrl),
        Completitud        = CalcularCompletitud(b),
    };
}

public class BeneficiarioStatsDto
{
    public int Total       { get; set; }
    public int Activos     { get; set; }
    public int Baja        { get; set; }
    public int ConAlergia  { get; set; }

    public int SinDocumento  { get; set; }
    public int SinEps        { get; set; }
    public int SinWhatsapp   { get; set; }
    public int SinDireccion  { get; set; }
    public int SinTallas     { get; set; }
    public int SinFoto       { get; set; }

    public Dictionary<string, int> PorEdad { get; set; } = [];
    public Dictionary<string, int> PorMes  { get; set; } = [];

    public List<TallaFreq> TopCamisa   { get; set; } = [];
    public List<TallaFreq> TopZapatos  { get; set; } = [];
    public List<TallaFreq> TopPantalon { get; set; } = [];
}

public record TallaFreq(string Talla, int Cantidad);

public class PerfilIncompletoDto
{
    public Guid         Id          { get; set; }
    public string       Nombre      { get; set; } = string.Empty;
    public string?      FotoUrl     { get; set; }
    public List<string> Faltantes   { get; set; } = [];
    public int          Completitud { get; set; }
}

// Cuerpo de PATCH api/beneficiarios/{id}/baja (antes anidado en BeneficiariosController).
public record DarDeBajaDto(string? Motivo);

// ── Datos internos entre servicio y repositorio (no se serializan tal cual) ───

public sealed record FiltroBeneficiarios(
    string? Buscar, string Estado, string? Genero, int? EdadMin, int? EdadMax,
    string? Eps, string? TieneAlergia, string? Tipo);

// Fila de "incompletos": los datos de la ficha que cuentan para la completitud (la regla se aplica en C#).
public sealed record PerfilIncompletoFila(Guid Id, string Nombre, DatosPerfil Datos);

public sealed record StatsNinosDatos(
    int TotalActivos, int SinEdad, int Extranjeros, int OtraRegion,
    int PI, int IN1, int IN2, int PA, int AD,
    List<(string Pais, int Total)> TopPaises,
    List<(string Depto, string Ciudad, int Total)> DeptoRows,
    List<(string Genero, int Total)> PorGenero);

public sealed record HistorialFila(Guid Id, string Accion, string? UsuarioEmail, string? Detalle, DateTime Fecha);

public sealed record DependenciasBeneficiario(string? Nombre, int Inscripciones, int Movimientos);

public enum EstadoActualizacion { Ok, NoEncontrado, DocumentoDuplicado }

public enum EstadoResultado { Ok, Invalido, NoEncontrado, Conflicto }

// Resultado de una operación del servicio; el controlador lo traduce a código HTTP.
public sealed class ResultadoBeneficiario<T>
{
    public EstadoResultado Estado  { get; private init; }
    public T?              Valor   { get; private init; }
    public string?         Mensaje { get; private init; }
    public List<string>    Errores { get; private init; } = [];

    public static ResultadoBeneficiario<T> Ok(T valor)                  => new() { Estado = EstadoResultado.Ok, Valor = valor };
    public static ResultadoBeneficiario<T> Invalido(List<string> errores) => new() { Estado = EstadoResultado.Invalido, Errores = errores };
    public static ResultadoBeneficiario<T> Invalido(string mensaje)     => new() { Estado = EstadoResultado.Invalido, Mensaje = mensaje };
    public static ResultadoBeneficiario<T> NoEncontrado()               => new() { Estado = EstadoResultado.NoEncontrado };
    public static ResultadoBeneficiario<T> Conflicto(string mensaje)    => new() { Estado = EstadoResultado.Conflicto, Mensaje = mensaje };
}
