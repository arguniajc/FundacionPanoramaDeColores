using FundacionPanorama.Application.Features.Beneficiarios.DTOs;

namespace FundacionPanorama.Application.Features.Beneficiarios;

/// <summary>Datos de la ficha que cuentan para la completitud del perfil.</summary>
public sealed record DatosPerfil(
    string   Tipo,
    string?  FotoMenorUrl,
    string?  FotoDocumentoUrl,
    string?  Eps,
    string?  Whatsapp,
    string?  Direccion,
    string?  TallaCamisa,
    string?  TallaZapatos,
    decimal? PesoKg,
    string?  NombreColegio,
    string?  GradoEscolar)
{
    public static DatosPerfil Desde(BeneficiarioDto b) => new(
        b.Tipo, b.FotoMenorUrl, b.FotoDocumentoUrl, b.Eps, b.Whatsapp, b.Direccion,
        b.TallaCamisa, b.TallaZapatos, b.PesoKg, b.NombreColegio, b.GradoEscolar);
}

/// <summary>
/// ÚNICA definición de "perfil completo" (la que mostraba el panel): 10 campos para niños y 8 para
/// adultos (sin colegio ni grado). "No registra" cuenta como vacío. La usan el resumen del listado
/// (BeneficiarioResumenDto.Completitud) y los perfiles incompletos, así nunca dan cifras distintas.
/// </summary>
public static class CompletitudPerfil
{
    sealed record Campo(string Etiqueta, bool SoloNinos, Func<DatosPerfil, bool> Tiene);

    static bool Dato(string? v)  => !string.IsNullOrWhiteSpace(v) && v != "No registra";
    static bool Lleno(string? v) => !string.IsNullOrWhiteSpace(v);

    // El orden es el de los chips de "faltantes" en el panel
    static readonly Campo[] Campos =
    [
        new("Foto del menor", false, d => Lleno(d.FotoMenorUrl)),
        new("Foto documento", false, d => Lleno(d.FotoDocumentoUrl)),
        new("EPS",            false, d => Dato(d.Eps)),
        new("WhatsApp",       false, d => Lleno(d.Whatsapp)),
        new("Dirección",      false, d => Dato(d.Direccion)),
        new("Talla camisa",   false, d => Dato(d.TallaCamisa)),
        new("Talla zapatos",  false, d => Dato(d.TallaZapatos)),
        new("Peso",           false, d => d.PesoKg is > 0),
        new("Colegio",        true,  d => Dato(d.NombreColegio)),
        new("Grado escolar",  true,  d => Lleno(d.GradoEscolar)),
    ];

    /// <summary>Etiquetas de todos los campos que pueden faltar, en orden.</summary>
    public static IReadOnlyList<string> Etiquetas { get; } = Campos.Select(c => c.Etiqueta).ToArray();

    /// <summary>Porcentaje (0-100, redondeo como Math.round del frontend) y campos que faltan.</summary>
    public static (int Porcentaje, IReadOnlyList<string> Faltantes) Evaluar(DatosPerfil d)
    {
        var aplican   = Campos.Where(c => !c.SoloNinos || d.Tipo != "adulto").ToList();
        var faltantes = aplican.Where(c => !c.Tiene(d)).Select(c => c.Etiqueta).ToList();
        var porcentaje = (int)Math.Round((aplican.Count - faltantes.Count) * 100.0 / aplican.Count, MidpointRounding.AwayFromZero);
        return (porcentaje, faltantes);
    }
}
