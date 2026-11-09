using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Application.Features.Beneficiarios;

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
        Tipo = "adulto", Celular = "3109876543",
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
            ValidacionBeneficiario.MsgDocumentoObligatorio, "El género es obligatorio.",
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

    // ── Celular / WhatsApp propio del adulto ─────────────────────────────────

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Celular_Del_Adulto_Es_Obligatorio(string? celular)
    {
        var dto = AdultoValido();
        dto.Celular = celular;
        Assert.Equal([ValidacionBeneficiario.MsgCelularObligatorio], Validar(dto));
    }

    [Theory]
    [InlineData("2001234567")]
    [InlineData("300123456")]
    [InlineData("300 123 4567")]
    [InlineData("+573001234567")]
    public void Celular_Del_Adulto_Invalido(string celular)
    {
        var dto = AdultoValido();
        dto.Celular = celular;
        Assert.Equal([ValidacionBeneficiario.MsgCelularInvalido], Validar(dto));
    }

    [Theory]
    [InlineData("3001234567")]
    [InlineData(" 3001234567 ")]
    [InlineData("No registra")]
    public void Celular_Del_Adulto_Valido_O_No_Registra(string celular)
    {
        var dto = AdultoValido();
        dto.Celular = celular;
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Celular_No_Se_Exige_Ni_Valida_A_Un_Nino()
    {
        var dto = NinoValido();
        dto.Celular = "123";
        Assert.Empty(Validar(dto));
    }

    [Fact]
    public void Normalizar_Descarta_El_Celular_De_Un_Nino_Y_Recorta_El_Del_Adulto()
    {
        var nino = NinoValido(); nino.Celular = "3001234567";
        ValidacionBeneficiario.Normalizar(nino);
        Assert.Null(nino.Celular);

        var adulto = AdultoValido(); adulto.Celular = " 3001234567 ";
        ValidacionBeneficiario.Normalizar(adulto);
        Assert.Equal("3001234567", adulto.Celular);
    }

    // ── "Sin documento" ──────────────────────────────────────────────────────

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("ABC-123 con espacios")]   // aunque escriban algo, no se revisa
    public void Sin_Documento_No_Exige_Ni_Valida_El_Numero(string? numero)
    {
        var dto = NinoValido();
        dto.TipoDocumento = "Sin documento"; dto.NumeroDocumento = numero;
        Assert.Empty(Validar(dto));

        var adulto = AdultoValido();
        adulto.TipoDocumento = "SIN DOCUMENTO"; adulto.NumeroDocumento = numero;
        Assert.Empty(Validar(adulto));
    }

    [Fact]
    public void Sin_Documento_Normalizar_Deja_El_Numero_En_Null()
    {
        var dto = NinoValido();
        dto.TipoDocumento = "sin documento"; dto.NumeroDocumento = "1144123456";
        ValidacionBeneficiario.Normalizar(dto);
        Assert.Null(dto.NumeroDocumento);
        Assert.Equal("Sin documento", dto.TipoDocumento);
    }

    [Fact]
    public void Con_Otro_Tipo_El_Numero_Sigue_Siendo_Obligatorio()
    {
        var dto = NinoValido();
        dto.NumeroDocumento = null;
        Assert.Equal([ValidacionBeneficiario.MsgDocumentoObligatorio], Validar(dto));
    }

    // ── Sugerencia de tipo de documento (registros con tipo_documento_id NULL) ─

    private static readonly DateOnly HoyFijo = new(2026, 11, 8);

    [Theory]
    [InlineData(null,       5,  true,  "Sin documento")]
    [InlineData("  ",       30, false, "Sin documento")]
    [InlineData("AB123456", 10, true,  null)]          // letras: PA/PPT/RAMV/PEP → revisar a mano
    [InlineData("1107654321", 0, true, "RC")]
    [InlineData("1107654321", 6, true, "RC")]
    [InlineData("1107123456", 7, true, "TI")]
    [InlineData("1107123456", 17, true, "TI")]
    [InlineData("1144123456", 18, false, "CC")]
    [InlineData("123",       10, true,  null)]          // muy corto para TI: no se sugiere algo que no pasaría
    public void SugerirTipoDocumento_Segun_Numero_Y_Edad(string? numero, int edad, bool esNino, string? esperado)
        => Assert.Equal(esperado, ValidacionBeneficiario.SugerirTipoDocumento(numero, HoyFijo.AddYears(-edad), esNino, HoyFijo));

    [Fact]
    public void SugerirTipoDocumento_Edad_Cumplida_Hoy_Cuenta()
    {
        // Cumple 7 mañana: aún es RC; cumplió 7 hoy: TI
        Assert.Equal("RC", ValidacionBeneficiario.SugerirTipoDocumento("1107654321", HoyFijo.AddYears(-7).AddDays(1), true, HoyFijo));
        Assert.Equal("TI", ValidacionBeneficiario.SugerirTipoDocumento("1107654321", HoyFijo.AddYears(-7), true, HoyFijo));
    }

    [Fact]
    public void SugerirTipoDocumento_Sin_Fecha_Con_Digitos_No_Sugiere()
        => Assert.Null(ValidacionBeneficiario.SugerirTipoDocumento("1107654321", null, true, HoyFijo));

    [Theory]
    [InlineData("PA",  "AB123456",   true,  true)]
    [InlineData("TI",  "AB123456",   true,  false)]   // numérico con letras
    [InlineData("CC",  "1144123456", true,  false)]   // menor con cédula
    [InlineData("RC",  "1107654321", false, false)]   // adulto con registro civil
    [InlineData("Sin documento", "lo que sea", true, true)]
    [InlineData("CE",  "12",         false, false)]   // alfanumérico muy corto
    public void ValidarDocumento_Reglas(string tipo, string numero, bool esNino, bool valido)
        => Assert.Equal(valido, !ValidacionBeneficiario.ValidarDocumento(tipo, numero, esNino).Any());
}
