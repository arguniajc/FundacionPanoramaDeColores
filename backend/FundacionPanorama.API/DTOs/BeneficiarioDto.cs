namespace FundacionPanorama.API.DTOs;

/// <summary>
/// DTO de salida con la misma forma plana que tenía InscripcionDto
/// para mantener compatibilidad con el frontend.
/// </summary>
public class BeneficiarioDto
{
    public Guid      Id                 { get; set; }
    public string    NombreMenor        { get; set; } = string.Empty;
    public DateOnly  FechaNacimiento    { get; set; }
    public string    TipoDocumento      { get; set; } = string.Empty;
    public string?   NumeroDocumento    { get; set; }
    public string?   Eps                { get; set; }
    public string?   TallaCamisa        { get; set; }
    public string?   TallaPantalon      { get; set; }
    public string?   TallaZapatos       { get; set; }
    public string    TieneAlergia       { get; set; } = "no";
    public string?   DescripcionAlergia { get; set; }
    public string?   ObservacionesSalud { get; set; }
    public string    NombreAcudiente    { get; set; } = string.Empty;
    public string?   Parentesco         { get; set; }
    public string?   Whatsapp           { get; set; }
    public string?   Direccion          { get; set; }
    public string?   FotoMenorUrl            { get; set; }
    public string?   FotoDocumentoUrl        { get; set; }
    public string?   FotoDocumentoReversoUrl { get; set; }
    public DateTime  CreatedAt               { get; set; }
    public bool      Activo             { get; set; }
    public string?   MotivoBaja         { get; set; }
}

public class CrearBeneficiarioDto
{
    public string    NombreMenor        { get; set; } = string.Empty;
    public DateOnly  FechaNacimiento    { get; set; }
    public string    TipoDocumento      { get; set; } = string.Empty;
    public string?   NumeroDocumento    { get; set; }
    public string?   Eps                { get; set; }
    public string?   TallaCamisa        { get; set; }
    public string?   TallaPantalon      { get; set; }
    public string?   TallaZapatos       { get; set; }
    public string    TieneAlergia       { get; set; } = "no";
    public string?   DescripcionAlergia { get; set; }
    public string?   ObservacionesSalud { get; set; }
    public string    NombreAcudiente    { get; set; } = string.Empty;
    public string?   Parentesco         { get; set; }
    public string?   Whatsapp           { get; set; }
    public string?   Direccion          { get; set; }
    public string?   FotoMenorUrl            { get; set; }
    public string?   FotoDocumentoUrl        { get; set; }
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
