namespace FundacionPanorama.API.DTOs;

public class InscripcionDto
{
    public Guid Id { get; set; }
    public string NombreMenor { get; set; } = string.Empty;
    public DateOnly FechaNacimiento { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string? NumeroDocumento { get; set; }
    public string? Eps { get; set; }
    public string? TallaCamisa { get; set; }
    public string? TallaPantalon { get; set; }
    public string? TallaZapatos { get; set; }
    public string TieneAlergia { get; set; } = "no";
    public string? DescripcionAlergia { get; set; }
    public string? ObservacionesSalud { get; set; }
    public string NombreAcudiente { get; set; } = string.Empty;
    public string? Parentesco { get; set; }
    public string? Whatsapp { get; set; }
    public string? Direccion { get; set; }
    public string? FotoMenorUrl { get; set; }
    public string? FotoDocumentoUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool Activo { get; set; }
}

public class CrearInscripcionDto
{
    public string NombreMenor { get; set; } = string.Empty;
    public DateOnly FechaNacimiento { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string? NumeroDocumento { get; set; }
    public string? Eps { get; set; }
    public string? TallaCamisa { get; set; }
    public string? TallaPantalon { get; set; }
    public string? TallaZapatos { get; set; }
    public string TieneAlergia { get; set; } = "no";
    public string? DescripcionAlergia { get; set; }
    public string? ObservacionesSalud { get; set; }
    public string NombreAcudiente { get; set; } = string.Empty;
    public string? Parentesco { get; set; }
    public string? Whatsapp { get; set; }
    public string? Direccion { get; set; }
    public string? FotoMenorUrl { get; set; }
    public string? FotoDocumentoUrl { get; set; }
}

public class InscripcionListDto
{
    public List<InscripcionDto> Data { get; set; } = new();
    public int Total { get; set; }
    public int Pagina { get; set; }
    public int PorPagina { get; set; }
}
