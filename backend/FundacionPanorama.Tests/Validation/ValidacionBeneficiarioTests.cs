using FundacionPanorama.API.DTOs;
using FundacionPanorama.API.Validation;

namespace FundacionPanorama.Tests.Validation;

public class ValidacionBeneficiarioTests
{
    private static DateOnly Hoy => DateOnly.FromDateTime(DateTime.UtcNow);

    private static CrearBeneficiarioDto NinoValido() => new()
    {
        PrimerNombre = "María", SegundoNombre = "José", PrimerApellido = "Pérez", SegundoApellido = "O'Neil",
        FechaNacimiento = Hoy.AddYears(-8),
        TipoDocumento = "TI", NumeroDocumento = "1144123456",
        Genero = "F", Eps = "Sura",
        TallaCamisa = "10", TallaPantalon = "10", TallaZapatos = "30",
        PesoKg = 25m, TallaCm = 125,
        Tipo = "niño",
        NombreAcudiente = "Ana Pérez", Parentesco = "Madre", Whatsapp = "3001234567",
        Direccion = "Calle 1 # 2-3", ViveConNino = true,
        PaisNacimiento = "Colombia", DepartamentoNacimiento = "Valle", CiudadNacimiento = "Cali", Barrio = "Centro",
        NumPersonasVive = 4, NumHermanos = 2,
    };

    private static CrearBeneficiarioDto AdultoValido() => new()
    {
        PrimerNombre = "Carlos", PrimerApellido = "Gómez",
        FechaNacimiento = Hoy.AddYears(-35),
        TipoDocumento = "CC", NumeroDocumento = "16123456",
        Genero = "M", Eps = "Nueva EPS",
        TallaCamisa = "L", TallaPantalon = "32", TallaZapatos = "41",
        PesoKg = 70m, TallaCm = 172,
        Tipo = "adulto",
        PaisNacimiento = "Colombia", DepartamentoNacimiento = "Valle", CiudadNacimiento = "Cali", Barrio = "Centro",
        NumPersonasVive = 3, NumHermanos = 0,
    };

    private static List<string> Validar(CrearBeneficiarioDto dto) => ValidacionBeneficiario.Validar(dto);

    // ── Casos válidos ────────────────────────────────────────────────────────

    [Fact]
    public void Nino_Valido_No_Tiene_Errores() => Assert.Empty(Validar(NinoValido()));

    [Fact]
    public void Adulto_Valido_No_Tiene_Errores() => Assert.Empty(Validar(AdultoValido()));

    [Fact]
    public void Adulto_No_Requiere_Datos_De_Acudiente()
    {
        var dto = AdultoValido();
        dto.NombreAcudiente = null; dto.Parentesco = null; dto.Whatsapp = null; dto.Direccion = null; dto.ViveConNino = null;
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Campos_Opcionales_Nulos_O_Vacios_Son_Validos()
    {
        var dto = NinoValido();
        dto.SegundoNombre = null; dto.SegundoApellido = "";
        dto.DescripcionAlergia = null; dto.DescripcionDiscapacidad = "";
        dto.ObservacionesSalud = null; dto.NombreColegio = null; dto.GradoEscolar = null;
        dto.FotoMenorUrl = null;
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Tipo_Vacio_Se_Trata_Como_Nino()
    {
        var dto = NinoValido();
        dto.Tipo = "";
        Assert.Empty(Validar(dto));
        dto.NombreAcudiente = null;
        Assert.Contains("El nombre del acudiente es obligatorio.", Validar(dto));
    }

    [Fact]
    public void Tipo_Nino_Ignora_Mayusculas()
    {
        var dto = NinoValido();
        dto.Tipo = "NIÑO";
        Assert.Empty(Validar(dto));
    }

    // ── Obligatorios ─────────────────────────────────────────────────────────

    [Fact]
    public void Dto_Vacio_Reporta_Todos_Los_Obligatorios()
    {
        var dto = new CrearBeneficiarioDto { Tipo = "niño", FechaNacimiento = Hoy.AddYears(-5) };
        var e = Validar(dto);
        string[] esperados =
        [
            "El número de documento es obligatorio.", "El género es obligatorio.",
            "El país de nacimiento es obligatorio.", "El departamento es obligatorio.",
            "La ciudad es obligatoria.", "El barrio es obligatorio.",
            "El N.º de personas con quienes vive es obligatorio.", "El N.º de hermanos es obligatorio.",
            "La EPS es obligatoria.", "La talla de camisa es obligatoria.",
            "La talla de pantalón es obligatoria.", "La talla de zapatos es obligatoria.",
            "El peso es obligatorio.", "La talla/altura es obligatoria.",
            "El nombre del acudiente es obligatorio.", "El parentesco es obligatorio.",
            "El WhatsApp del acudiente es obligatorio.", "Debe indicar si el acudiente vive con el niño.",
            "La dirección es obligatoria.",
        ];
        foreach (var m in esperados) Assert.Contains(m, e);
        Assert.Equal(esperados.Length, e.Count);
    }

    [Fact]
    public void Obligatorio_Solo_Espacios_Cuenta_Como_Vacio()
    {
        var dto = NinoValido();
        dto.Barrio = "   ";
        Assert.Equal(["El barrio es obligatorio."], Validar(dto));
    }

    // ── Nombres ──────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("PrimerNombre",    "primer nombre")]
    [InlineData("SegundoNombre",   "segundo nombre")]
    [InlineData("PrimerApellido",  "primer apellido")]
    [InlineData("SegundoApellido", "segundo apellido")]
    public void Nombres_Solo_Letras(string propiedad, string etiqueta)
    {
        var dto = NinoValido();
        typeof(CrearBeneficiarioDto).GetProperty(propiedad)!.SetValue(dto, "Juan2");
        Assert.Equal([$"El {etiqueta} solo puede tener letras. Ejemplo: María."], Validar(dto));
    }

    [Theory]
    [InlineData("Ñoño Úrsula")]
    [InlineData("D'Angelo")]
    [InlineData("Ana-María")]
    [InlineData("  Luis  ")]
    public void Nombres_Con_Tildes_Apostrofe_Guion_Son_Validos(string nombre)
    {
        var dto = NinoValido();
        dto.PrimerNombre = nombre;
        Assert.Empty(Validar(dto));
    }

    // ── Fecha de nacimiento ─────────────────────────────────────────────────

    [Fact]
    public void Fecha_Futura()
    {
        var dto = NinoValido();
        dto.FechaNacimiento = Hoy.AddDays(1);
        Assert.Equal(["La fecha de nacimiento no puede ser futura."], Validar(dto));
    }

    [Fact]
    public void Mas_De_110_Anios()
    {
        var dto = AdultoValido();
        dto.FechaNacimiento = Hoy.AddYears(-111);
        Assert.Equal(["La fecha de nacimiento no es válida (más de 110 años)."], Validar(dto));
    }

    [Fact]
    public void Nino_De_18_Anios_Es_Rechazado()
    {
        var dto = NinoValido();
        dto.FechaNacimiento = Hoy.AddYears(-18);
        dto.TipoDocumento = "NUIP";
        Assert.Equal(["Tiene 18 años: un niño debe ser menor de 18. Regístralo como adulto."], Validar(dto));
    }

    [Fact]
    public void Nino_Que_Cumple_18_Manana_Es_Valido()
    {
        var dto = NinoValido();
        dto.FechaNacimiento = Hoy.AddYears(-18).AddDays(1);
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Adulto_Menor_De_18_Es_Rechazado()
    {
        var dto = AdultoValido();
        dto.FechaNacimiento = Hoy.AddYears(-17);
        dto.PesoKg = 60m; dto.TallaCm = 165;
        Assert.Equal(["Tiene 17 años: un adulto debe tener 18 o más. Regístralo como niño."], Validar(dto));
    }

    // ── Tipo de documento vs edad ───────────────────────────────────────────

    [Theory]
    [InlineData("RC")]
    [InlineData("TI")]
    public void Adulto_Con_RC_O_TI(string tipo)
    {
        var dto = AdultoValido();
        dto.TipoDocumento = tipo;
        Assert.Equal(["Un adulto no usa Registro Civil ni Tarjeta de Identidad. Usa CC, CE, PPT o PA."], Validar(dto));
    }

    [Fact]
    public void Nino_Con_CC()
    {
        var dto = NinoValido();
        dto.TipoDocumento = "CC";
        Assert.Equal(["Un menor de edad no tiene Cédula. Usa RC, TI o NUIP."], Validar(dto));
    }

    // ── Número de documento ─────────────────────────────────────────────────

    [Theory]
    [InlineData("TI", "12345")]          // muy corto
    [InlineData("TI", "123456789012")]   // muy largo
    [InlineData("RC", "1.144.123")]      // con puntos
    [InlineData("NUIP", "12345A78")]     // con letras
    public void Documento_Numerico_Invalido(string tipo, string numero)
    {
        var dto = NinoValido();
        dto.TipoDocumento = tipo; dto.NumeroDocumento = numero;
        Assert.Equal([$"El documento {tipo} debe tener entre 6 y 11 dígitos, sin puntos ni espacios. Ejemplo: 1144123456."], Validar(dto));
    }

    [Theory]
    [InlineData("123456")]
    [InlineData("12345678901")]
    public void Documento_Numerico_Limites_Validos(string numero)
    {
        var dto = NinoValido();
        dto.NumeroDocumento = numero;
        Assert.Empty(Validar(dto));
    }

    [Theory]
    [InlineData("AB1")]               // muy corto
    [InlineData("AB12345678901234")]  // 16 caracteres
    [InlineData("AB 123456")]         // con espacio
    [InlineData("AB-123456")]         // con guion
    public void Documento_Alfanumerico_Invalido(string numero)
    {
        var dto = AdultoValido();
        dto.TipoDocumento = "PA"; dto.NumeroDocumento = numero;
        Assert.Equal(["El número de documento debe tener de 4 a 15 letras o números, sin espacios. Ejemplo: AB123456."], Validar(dto));
    }

    [Fact]
    public void Documento_Alfanumerico_Valido()
    {
        var dto = AdultoValido();
        dto.TipoDocumento = "PPT"; dto.NumeroDocumento = "AB123456";
        Assert.Empty(Validar(dto));
    }

    // ── Rangos ───────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(0)]
    [InlineData(21)]
    public void Personas_Vive_Fuera_De_Rango(int n)
    {
        var dto = NinoValido();
        dto.NumPersonasVive = n;
        Assert.Equal(["Las personas con quienes vive deben estar entre 1 y 20."], Validar(dto));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(21)]
    public void Hermanos_Fuera_De_Rango(int n)
    {
        var dto = NinoValido();
        dto.NumHermanos = n;
        Assert.Equal(["El número de hermanos/hijos debe estar entre 0 y 20."], Validar(dto));
    }

    [Theory]
    [InlineData(1.9, true)]
    [InlineData(150.1, true)]
    [InlineData(29.9, false)]
    [InlineData(250.1, false)]
    public void Peso_Fuera_De_Rango(double peso, bool nino)
    {
        var dto = nino ? NinoValido() : AdultoValido();
        dto.PesoKg = (decimal)peso;
        var msg = nino ? "El peso debe estar entre 2 y 150 kg." : "El peso debe estar entre 30 y 250 kg.";
        Assert.Equal([msg], Validar(dto));
    }

    [Theory]
    [InlineData(39, true)]
    [InlineData(201, true)]
    [InlineData(119, false)]
    [InlineData(231, false)]
    public void Estatura_Fuera_De_Rango(int talla, bool nino)
    {
        var dto = nino ? NinoValido() : AdultoValido();
        dto.TallaCm = talla;
        var msg = nino ? "La estatura debe estar entre 40 y 200 cm." : "La estatura debe estar entre 120 y 230 cm.";
        Assert.Equal([msg], Validar(dto));
    }

    // ── Descripciones condicionales ─────────────────────────────────────────

    [Fact]
    public void Alergia_Sin_Descripcion()
    {
        var dto = NinoValido();
        dto.TieneAlergia = "si";
        Assert.Equal(["Describe la alergia. Ejemplo: Alergia al maní."], Validar(dto));
        dto.DescripcionAlergia = "Maní";
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Discapacidad_Sin_Descripcion()
    {
        var dto = NinoValido();
        dto.TieneDiscapacidad = true;
        Assert.Equal(["Describe la discapacidad o condición. Ejemplo: Discapacidad auditiva leve."], Validar(dto));
        dto.DescripcionDiscapacidad = "Auditiva leve";
        Assert.Empty(Validar(dto));
    }

    // ── WhatsApp ─────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("2001234567")]     // no empieza por 3
    [InlineData("300123456")]      // 9 dígitos
    [InlineData("30012345678")]    // 11 dígitos
    [InlineData("+573001234567")]  // con indicativo
    [InlineData("300 123 4567")]   // con espacios
    public void Whatsapp_Invalido(string numero)
    {
        var dto = NinoValido();
        dto.Whatsapp = numero;
        Assert.Equal(["El WhatsApp debe ser un celular de 10 dígitos que empiece por 3. Ejemplo: 3001234567."], Validar(dto));
    }

    [Fact]
    public void Whatsapp_Con_Espacios_Alrededor_Es_Valido()
    {
        var dto = NinoValido();
        dto.Whatsapp = " 3001234567 ";
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Whatsapp_De_Adulto_No_Se_Valida()
    {
        var dto = AdultoValido();
        dto.Whatsapp = "123";
        Assert.Empty(Validar(dto));
    }
}
