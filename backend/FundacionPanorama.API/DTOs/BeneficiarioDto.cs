// DTOs del módulo Beneficiarios: salida (BeneficiarioDto), entrada (CrearBeneficiarioDto),
// paginación (BeneficiarioListDto) y estadísticas (BeneficiarioStatsDto).
using System.ComponentModel.DataAnnotations;
namespace FundacionPanorama.API.DTOs;

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
    [StringLength(30)]
    public string?   NumeroDocumento    { get; set; }
    [StringLength(100)]
    public string?   Eps                { get; set; }
    // ── Tallas ────────────────────────────────────────────────────────────────
    [StringLength(10)]
    public string?   TallaCamisa        { get; set; }
    [StringLength(10)]
    public string?   TallaPantalon      { get; set; }
    [StringLength(10)]
    public string?   TallaZapatos       { get; set; }
    public decimal?  PesoKg             { get; set; }
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
    // ── Acudiente ─────────────────────────────────────────────────────────────
    [Required][StringLength(200)]
    public string    NombreAcudiente    { get; set; } = string.Empty;
    [StringLength(50)]
    public string?   Parentesco         { get; set; }
    [Phone][StringLength(30)]
    public string?   Whatsapp           { get; set; }
    [StringLength(200)]
    public string?   Direccion          { get; set; }
    public bool?     ViveConNino        { get; set; }
    // ── Lugar de nacimiento ───────────────────────────────────────────────────
    [StringLength(100)]
    public string?   PaisNacimiento          { get; set; }
    [StringLength(100)]
    public string?   DepartamentoNacimiento  { get; set; }
    [StringLength(100)]
    public string?   CiudadNacimiento        { get; set; }
    [StringLength(100)]
    public string?   Barrio                  { get; set; }
    // ── Composición familiar ──────────────────────────────────────────────────
    public int?      NumPersonasVive    { get; set; }
    public int?      NumHermanos        { get; set; }
    // ── Educación ─────────────────────────────────────────────────────────────
    [StringLength(200)]
    public string?   NombreColegio      { get; set; }
    [StringLength(50)]
    public string?   GradoEscolar       { get; set; }
    // ── Género ────────────────────────────────────────────────────────────────
    [StringLength(20)]
    public string?   Genero             { get; set; }
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

public class BeneficiarioListDto
{
    public List<BeneficiarioDto> Data      { get; set; } = [];
    public int                   Total     { get; set; }
    public int                   Pagina    { get; set; }
    public int                   PorPagina { get; set; }
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
