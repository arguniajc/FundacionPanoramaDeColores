namespace FundacionPanorama.API.DTOs;

public class InscripcionStatsDto
{
    public int Total      { get; set; }
    public int Activos    { get; set; }
    public int Baja       { get; set; }
    public int ConAlergia { get; set; }

    // Datos faltantes
    public int SinDocumento  { get; set; }
    public int SinEps        { get; set; }
    public int SinWhatsapp   { get; set; }
    public int SinDireccion  { get; set; }
    public int SinTallas     { get; set; }
    public int SinFoto       { get; set; }

    // Distribución por edad
    public Dictionary<string, int> PorEdad { get; set; } = new();

    // Inscripciones por mes (últimos 4 meses)
    public Dictionary<string, int> PorMes { get; set; } = new();

    // Tallas más frecuentes
    public List<TallaFreq> TopCamisa   { get; set; } = new();
    public List<TallaFreq> TopZapatos  { get; set; } = new();
    public List<TallaFreq> TopPantalon { get; set; } = new();
}

public record TallaFreq(string Talla, int Cantidad);
