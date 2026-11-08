using System.Collections;
using FundacionPanorama.Application.Features.Beneficiarios;
using FundacionPanorama.Application.Features.Beneficiarios.DTOs;
using FundacionPanorama.Application.Features.Beneficiarios.Interfaces;
using FundacionPanorama.Application.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class BeneficiariosServiceTests
{
    private readonly Mock<IBeneficiariosRepository> _repo = new();
    private readonly BeneficiariosService           _sut;

    public BeneficiariosServiceTests() => _sut = new(_repo.Object);

    private static DateOnly Hoy => DateOnly.FromDateTime(DateTime.UtcNow);

    private static CrearBeneficiarioDto NinoValido() => new()
    {
        PrimerNombre = "María", PrimerApellido = "Pérez",
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

    // Lee una propiedad de los objetos anónimos que devuelve el servicio (contrato JSON).
    private static T Prop<T>(object o, string nombre)
        => (T)o.GetType().GetProperty(nombre)!.GetValue(o)!;

    private static List<object> Errores(object valor)
        => Prop<IEnumerable>(valor, "errores").Cast<object>().ToList();

    // ── Listar ───────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-5, 500, 1, 100)]
    [InlineData(3, 25, 3, 25)]
    public async Task ListarAsync_Ajusta_Pagina_Y_PorPagina(int pagina, int porPagina, int pEsperada, int ppEsperado)
    {
        _repo.Setup(r => r.ListarAsync(It.IsAny<FiltroBeneficiarios>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .ReturnsAsync(new ListaPaginada<BeneficiarioDto>());

        await _sut.ListarAsync(pagina, porPagina, null, "activos", null, null, null, null, null, null);

        _repo.Verify(r => r.ListarAsync(It.IsAny<FiltroBeneficiarios>(), pEsperada, ppEsperado, default), Times.Once);
    }

    [Fact]
    public async Task ListarAsync_Pasa_Los_Filtros_Al_Repositorio()
    {
        FiltroBeneficiarios? recibido = null;
        _repo.Setup(r => r.ListarAsync(It.IsAny<FiltroBeneficiarios>(), It.IsAny<int>(), It.IsAny<int>(), default))
             .Callback<FiltroBeneficiarios, int, int, CancellationToken>((f, _, _, _) => recibido = f)
             .ReturnsAsync(new ListaPaginada<BeneficiarioDto>());

        await _sut.ListarAsync(1, 20, "ana", "todos", "F", 5, 10, "Sura", "si", "niño");

        Assert.Equal(new FiltroBeneficiarios("ana", "todos", "F", 5, 10, "Sura", "si", "niño"), recibido);
    }

    // ── Crear / Actualizar ───────────────────────────────────────────────────

    [Fact]
    public async Task CrearAsync_Invalido_No_Toca_El_Repositorio()
    {
        var dto = NinoValido();
        dto.NumeroDocumento = "";

        var res = await _sut.CrearAsync(dto, "u@x.com");

        Assert.Equal(EstadoResultado.Invalido, res.Estado);
        Assert.Contains(ValidacionBeneficiario.MsgDocumentoObligatorio, res.Errores);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task CrearAsync_Documento_Duplicado_Devuelve_Conflicto()
    {
        _repo.Setup(r => r.CrearAsync(It.IsAny<CrearBeneficiarioDto>(), "u@x.com", default)).ReturnsAsync((Guid?)null);

        var res = await _sut.CrearAsync(NinoValido(), "u@x.com");

        Assert.Equal(EstadoResultado.Conflicto, res.Estado);
        Assert.Equal("Este número de documento ya está inscrito.", res.Mensaje);
    }

    [Fact]
    public async Task CrearAsync_Valido_Devuelve_El_Registro_Recargado()
    {
        var id = Guid.NewGuid();
        var guardado = new BeneficiarioDto { Id = id, PrimerNombre = "María" };
        _repo.Setup(r => r.CrearAsync(It.IsAny<CrearBeneficiarioDto>(), "u@x.com", default)).ReturnsAsync(id);
        _repo.Setup(r => r.ObtenerAsync(id, default)).ReturnsAsync(guardado);

        var res = await _sut.CrearAsync(NinoValido(), "u@x.com");

        Assert.Equal(EstadoResultado.Ok, res.Estado);
        Assert.Same(guardado, res.Valor);
    }

    [Fact]
    public async Task CrearAsync_No_Se_Puede_Recargar_Tras_Guardar_Lanza()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CrearAsync(It.IsAny<CrearBeneficiarioDto>(), It.IsAny<string?>(), default)).ReturnsAsync(id);
        _repo.Setup(r => r.ObtenerAsync(id, default)).ReturnsAsync((BeneficiarioDto?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.CrearAsync(NinoValido(), null));
    }

    [Fact]
    public async Task ActualizarAsync_Invalido_No_Toca_El_Repositorio()
    {
        var dto = NinoValido();
        dto.Eps = " ";

        var res = await _sut.ActualizarAsync(Guid.NewGuid(), dto, null);

        Assert.Equal(EstadoResultado.Invalido, res.Estado);
        Assert.Contains("La EPS es obligatoria.", res.Errores);
        _repo.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ActualizarAsync_No_Encontrado()
    {
        _repo.Setup(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<CrearBeneficiarioDto>(), It.IsAny<string?>(), default))
             .ReturnsAsync(EstadoActualizacion.NoEncontrado);

        var res = await _sut.ActualizarAsync(Guid.NewGuid(), NinoValido(), null);

        Assert.Equal(EstadoResultado.NoEncontrado, res.Estado);
    }

    [Fact]
    public async Task ActualizarAsync_Documento_Duplicado_Devuelve_Conflicto()
    {
        _repo.Setup(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<CrearBeneficiarioDto>(), It.IsAny<string?>(), default))
             .ReturnsAsync(EstadoActualizacion.DocumentoDuplicado);

        var res = await _sut.ActualizarAsync(Guid.NewGuid(), NinoValido(), null);

        Assert.Equal(EstadoResultado.Conflicto, res.Estado);
        Assert.Equal("Ese número de documento ya está registrado.", res.Mensaje);
    }

    [Fact]
    public async Task ActualizarAsync_Ok_Devuelve_El_Registro()
    {
        var id  = Guid.NewGuid();
        var dto = new BeneficiarioDto { Id = id };
        _repo.Setup(r => r.ActualizarAsync(id, It.IsAny<CrearBeneficiarioDto>(), It.IsAny<string?>(), default))
             .ReturnsAsync(EstadoActualizacion.Ok);
        _repo.Setup(r => r.ObtenerAsync(id, default)).ReturnsAsync(dto);

        var res = await _sut.ActualizarAsync(id, NinoValido(), null);

        Assert.Equal(EstadoResultado.Ok, res.Estado);
        Assert.Same(dto, res.Valor);
    }

    // ── Dar de baja ──────────────────────────────────────────────────────────

    [Fact]
    public async Task DarDeBajaAsync_Recorta_Motivo_Y_Arma_Detalle()
    {
        var id = Guid.NewGuid();
        await _sut.DarDeBajaAsync(id, "  Se mudó  ", "u@x.com");
        _repo.Verify(r => r.DarDeBajaAsync(id, "Se mudó", "Motivo: Se mudó", "u@x.com", default), Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task DarDeBajaAsync_Sin_Motivo_Pasa_Null(string? motivo)
    {
        var id = Guid.NewGuid();
        await _sut.DarDeBajaAsync(id, motivo, null);
        _repo.Verify(r => r.DarDeBajaAsync(id, null, null, null, default), Times.Once);
    }

    // ── Eliminar ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task EliminarAsync_No_Existe_Devuelve_NoEncontrado()
    {
        _repo.Setup(r => r.ObtenerDependenciasAsync(It.IsAny<Guid>(), default))
             .ReturnsAsync(new DependenciasBeneficiario(null, 0, 0));

        var res = await _sut.EliminarAsync(Guid.NewGuid(), null);

        Assert.Equal(EstadoResultado.NoEncontrado, res.Estado);
        _repo.Verify(r => r.EliminarAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(1, 0, "No se puede eliminar: el beneficiario tiene 1 inscripción a programa vinculados.")]
    [InlineData(0, 1, "No se puede eliminar: el beneficiario tiene 1 movimiento de inventario vinculados.")]
    [InlineData(0, 4, "No se puede eliminar: el beneficiario tiene 4 movimientos de inventario vinculados.")]
    public async Task EliminarAsync_Con_Dependencias_Devuelve_Conflicto(int ins, int mov, string mensaje)
    {
        _repo.Setup(r => r.ObtenerDependenciasAsync(It.IsAny<Guid>(), default))
             .ReturnsAsync(new DependenciasBeneficiario("Ana", ins, mov));

        var res = await _sut.EliminarAsync(Guid.NewGuid(), null);

        Assert.Equal(EstadoResultado.Conflicto, res.Estado);
        Assert.Equal(mensaje, res.Mensaje);
        _repo.Verify(r => r.EliminarAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EliminarAsync_Con_Inscripciones_Y_Movimientos_Une_Ambas_Partes()
    {
        _repo.Setup(r => r.ObtenerDependenciasAsync(It.IsAny<Guid>(), default))
             .ReturnsAsync(new DependenciasBeneficiario("Ana", 1, 5));

        var res = await _sut.EliminarAsync(Guid.NewGuid(), null);

        Assert.Equal(EstadoResultado.Conflicto, res.Estado);
        Assert.Equal("No se puede eliminar: el beneficiario tiene 1 inscripción a programa y 5 movimientos de inventario vinculados.", res.Mensaje);
    }

    [Fact]
    public async Task EliminarAsync_Plural_De_Inscripcion_Sin_Tilde()
    {
        _repo.Setup(r => r.ObtenerDependenciasAsync(It.IsAny<Guid>(), default))
             .ReturnsAsync(new DependenciasBeneficiario("Ana", 2, 0));

        var res = await _sut.EliminarAsync(Guid.NewGuid(), null);

        Assert.Equal("No se puede eliminar: el beneficiario tiene 2 inscripciones a programas vinculados.", res.Mensaje);
    }

    [Fact]
    public async Task EliminarAsync_Sin_Dependencias_Elimina()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ObtenerDependenciasAsync(id, default))
             .ReturnsAsync(new DependenciasBeneficiario("Ana Pérez", 0, 0));

        var res = await _sut.EliminarAsync(id, "u@x.com");

        Assert.Equal(EstadoResultado.Ok, res.Estado);
        _repo.Verify(r => r.EliminarAsync(id, "Ana Pérez", "u@x.com", default), Times.Once);
    }

    // ── Incompletos ──────────────────────────────────────────────────────────

    static DatosPerfil PerfilNino(string tipo = "niño") => new(
        Tipo: tipo, FotoMenorUrl: "foto.jpg", FotoDocumentoUrl: "doc.jpg", Eps: "Sura", Whatsapp: "3001234567",
        Direccion: "Calle 1", TallaCamisa: "10", TallaZapatos: "32", PesoKg: 30m,
        NombreColegio: tipo == "adulto" ? null : "Colegio", GradoEscolar: tipo == "adulto" ? null : "4");

    [Fact]
    public async Task ListarIncompletosAsync_Mapea_Faltantes_Y_Completitud()
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.ListarIncompletosAsync("niño", default)).ReturnsAsync(
        [
            new PerfilIncompletoFila(id, "Ana", PerfilNino() with { FotoMenorUrl = null, Whatsapp = "", GradoEscolar = null }),
        ]);

        var res = await _sut.ListarIncompletosAsync("niño");

        var p = Assert.Single(res);
        Assert.Equal(id, p.Id);
        Assert.Equal("Ana", p.Nombre);
        Assert.Null(p.FotoUrl);
        Assert.Equal(["Foto del menor", "WhatsApp", "Grado escolar"], p.Faltantes);
        Assert.Equal(70, p.Completitud);
    }

    [Fact]
    public async Task ListarIncompletosAsync_Omite_Completos_Y_Ordena_Del_Menos_Completo()
    {
        var vacio = new DatosPerfil("niño", null, null, null, null, null, null, null, null, null, null);
        _repo.Setup(r => r.ListarIncompletosAsync(null, default)).ReturnsAsync(
        [
            new PerfilIncompletoFila(Guid.NewGuid(), "Completo", PerfilNino()),
            new PerfilIncompletoFila(Guid.NewGuid(), "Casi",     PerfilNino() with { Eps = "No registra" }),
            new PerfilIncompletoFila(Guid.NewGuid(), "Vacío",    vacio),
            new PerfilIncompletoFila(Guid.NewGuid(), "Adulto",   PerfilNino("adulto") with { PesoKg = 0 }),
        ]);

        var res = await _sut.ListarIncompletosAsync(null);

        Assert.Equal(["Vacío", "Adulto", "Casi"], res.Select(r => r.Nombre));
        Assert.Equal(CompletitudPerfil.Etiquetas, res[0].Faltantes);
        Assert.Equal([0, 88, 90], res.Select(r => r.Completitud));
        Assert.Equal(["Peso"], res[1].Faltantes);   // al adulto no se le pide colegio ni grado
    }

    [Fact]
    public async Task ListarIncompletosAsync_Devuelve_Maximo_60()
    {
        var vacio = new DatosPerfil("niño", null, null, null, null, null, null, null, null, null, null);
        _repo.Setup(r => r.ListarIncompletosAsync(null, default)).ReturnsAsync(
            Enumerable.Range(0, 80).Select(i => new PerfilIncompletoFila(Guid.NewGuid(), $"B{i:00}", vacio)).ToList());

        Assert.Equal(BeneficiariosService.MaxIncompletos, (await _sut.ListarIncompletosAsync(null)).Count);
    }

    [Fact]
    public void Incompletos_Y_Resumen_Usan_La_Misma_Regla()
    {
        // Mismo beneficiario visto por las dos rutas: la ficha (resumen) y los datos del SQL (incompletos)
        var ficha = new BeneficiarioDto
        {
            Tipo = "adulto", FotoMenorUrl = "f.jpg", FotoDocumentoUrl = null, Eps = "No registra", Celular = "3001234567",
            Direccion = "Calle", TallaCamisa = "M", TallaZapatos = "40", PesoKg = 70, TallaCm = 0,
        };
        Assert.Equal(BeneficiarioResumenDto.CalcularCompletitud(ficha),
                     CompletitudPerfil.Evaluar(DatosPerfil.Desde(ficha)).Porcentaje);
        Assert.Equal(75, BeneficiarioResumenDto.CalcularCompletitud(ficha));   // 6 de 8: sin foto doc ni EPS; talla en cm no cuenta
    }

    // ── Historial ────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(0, 1)]
    [InlineData(1000, 200)]
    [InlineData(50, 50)]
    public async Task HistorialAsync_Ajusta_Limite(int limite, int esperado)
    {
        var id = Guid.NewGuid();
        _repo.Setup(r => r.HistorialAsync(id, It.IsAny<int>(), default)).ReturnsAsync([]);

        await _sut.HistorialAsync(id, limite);

        _repo.Verify(r => r.HistorialAsync(id, esperado, default), Times.Once);
    }

    // ── Importación XLSX ─────────────────────────────────────────────────────

    private static ImportarBeneficiarioRowDto Fila(string? nombre = "Ana", string? apellido = "Pérez",
        string? fecha = "2015-03-04", string? doc = "1144123456") => new()
    {
        PrimerNombre = nombre, PrimerApellido = apellido, FechaNacimiento = fecha,
        NumeroDocumento = doc, TipoDocumento = "TI", Genero = "F", Eps = "Sura",
    };

    private void InsercionOk(Action<CrearBeneficiarioDto, DateOnly>? capturar = null)
        => _repo.Setup(r => r.InsertarFilaImportacionAsync(It.IsAny<CrearBeneficiarioDto>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), default))
                .Callback<CrearBeneficiarioDto, DateOnly, string?, CancellationToken>((d, f, _, _) => capturar?.Invoke(d, f))
                .ReturnsAsync((string?)null);

    [Fact]
    public async Task ImportarFilasAsync_Sin_Filas_Es_Invalido()
    {
        Assert.Equal(EstadoResultado.Invalido, (await _sut.ImportarFilasAsync(null, null)).Estado);
        var res = await _sut.ImportarFilasAsync([], null);
        Assert.Equal(EstadoResultado.Invalido, res.Estado);
        Assert.Equal("No hay filas para importar.", res.Mensaje);
    }

    [Fact]
    public async Task ImportarFilasAsync_Fila_Valida_Se_Inserta_Con_Valores_Normalizados()
    {
        CrearBeneficiarioDto? insertado = null;
        InsercionOk((d, _) => insertado = d);

        var fila = Fila(nombre: "  Ana ", apellido: " Pérez ");
        fila.SegundoNombre = "  ";
        fila.TieneAlergia  = " SI ";

        var res = await _sut.ImportarFilasAsync([fila], "u@x.com");

        Assert.Equal(EstadoResultado.Ok, res.Estado);
        Assert.Equal(1, Prop<int>(res.Valor!, "total"));
        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
        Assert.Equal(0, Prop<int>(res.Valor!, "omitidos"));
        Assert.Empty(Errores(res.Valor!));

        Assert.NotNull(insertado);
        Assert.Equal("Ana", insertado!.PrimerNombre);
        Assert.Equal("Pérez", insertado.PrimerApellido);
        Assert.Null(insertado.SegundoNombre);
        Assert.Equal("si", insertado.TieneAlergia);
        Assert.Equal("niño", insertado.Tipo);
        Assert.Equal(new DateOnly(2015, 3, 4), insertado.FechaNacimiento);
        _repo.Verify(r => r.InsertarFilaImportacionAsync(It.IsAny<CrearBeneficiarioDto>(), new DateOnly(2015, 3, 4), "u@x.com", default), Times.Once);
    }

    [Fact]
    public async Task ImportarFilasAsync_Valores_Por_Defecto_De_Alergia_Y_Tipo()
    {
        CrearBeneficiarioDto? insertado = null;
        InsercionOk((d, _) => insertado = d);

        // Un adulto debe tener 18+ y no usar TI (reglas de formato de la importación).
        var fila = Fila(fecha: "1990-05-10");
        fila.TipoDocumento = "CC";
        fila.Tipo = " adulto ";

        await _sut.ImportarFilasAsync([fila], null);

        Assert.Equal("no", insertado!.TieneAlergia);
        Assert.Equal("adulto", insertado.Tipo);
    }

    [Theory]
    [InlineData(null, "Pérez", "Pérez")]
    [InlineData("Ana", " ", "Ana")]
    [InlineData(null, null, "(vacío)")]
    public async Task ImportarFilasAsync_Sin_Nombre_O_Apellido_Reporta_Error(string? nombre, string? apellido, string nombreEsperado)
    {
        var res = await _sut.ImportarFilasAsync([Fila(nombre: nombre, apellido: apellido)], null);

        var err = Assert.Single(Errores(res.Valor!));
        Assert.Equal(2, Prop<int>(err, "fila"));
        Assert.Equal(nombreEsperado, Prop<string>(err, "nombre"));
        Assert.Equal("PRIMER_NOMBRE y PRIMER_APELLIDO son obligatorios.", Prop<string>(err, "motivo"));
        _repo.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("no-es-fecha")]
    [InlineData("2015-02-30")]
    public async Task ImportarFilasAsync_Fecha_Invalida_Reporta_Error_Con_Numero_De_Fila(string? fecha)
    {
        InsercionOk();

        // Primera fila válida, segunda con fecha mala → fila 3 (el encabezado es la fila 1).
        var res = await _sut.ImportarFilasAsync([Fila(doc: "111111"), Fila(fecha: fecha, doc: "222222")], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
        var err = Assert.Single(Errores(res.Valor!));
        Assert.Equal(3, Prop<int>(err, "fila"));
        Assert.Equal("Ana Pérez", Prop<string>(err, "nombre"));
        Assert.Equal("FECHA_NACIMIENTO inválida. Use formato AAAA-MM-DD.", Prop<string>(err, "motivo"));
    }

    [Theory]
    [InlineData("2015-03-04", 2015, 3, 4)]
    [InlineData(" 2015-03-04 ", 2015, 3, 4)]
    [InlineData("04/03/2015", 2015, 3, 4)]   // dd/MM/yyyy tiene prioridad sobre MM/dd/yyyy
    [InlineData("4/3/2015", 2015, 3, 4)]
    [InlineData("12/25/2015", 2015, 12, 25)] // solo válido como MM/dd/yyyy
    public async Task ImportarFilasAsync_Acepta_Formatos_De_Fecha(string fecha, int y, int m, int d)
    {
        DateOnly? recibida = null;
        InsercionOk((_, f) => recibida = f);

        await _sut.ImportarFilasAsync([Fila(fecha: fecha)], null);

        Assert.Equal(new DateOnly(y, m, d), recibida);
    }

    [Fact]
    public async Task ImportarFilasAsync_Documento_Existente_Se_Omite()
    {
        _repo.Setup(r => r.ExisteDocumentoAsync("1144123456", default)).ReturnsAsync(true);

        var res = await _sut.ImportarFilasAsync([Fila(doc: " 1144123456 ")], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "omitidos"));
        Assert.Equal(0, Prop<int>(res.Valor!, "insertados"));
        Assert.Empty(Errores(res.Valor!));
        _repo.Verify(r => r.InsertarFilaImportacionAsync(It.IsAny<CrearBeneficiarioDto>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ImportarFilasAsync_Sin_Documento_No_Consulta_Duplicado()
    {
        InsercionOk();

        var res = await _sut.ImportarFilasAsync([Fila(doc: "  ")], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
        _repo.Verify(r => r.ExisteDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ImportarFilasAsync_Tipo_Sin_Documento_Ignora_El_Numero_Y_No_Consulta_Duplicado()
    {
        CrearBeneficiarioDto? recibido = null;
        InsercionOk((d, _) => recibido = d);
        var fila = Fila(doc: "1144123456");
        fila.TipoDocumento = "SIN DOCUMENTO";

        var res = await _sut.ImportarFilasAsync([fila], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
        Assert.Null(recibido!.NumeroDocumento);
        Assert.Equal("Sin documento", recibido.TipoDocumento);
        _repo.Verify(r => r.ExisteDocumentoAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ImportarFilasAsync_Whatsapp_De_Un_Adulto_Es_Su_Celular()
    {
        CrearBeneficiarioDto? recibido = null;
        InsercionOk((d, _) => recibido = d);
        var fila = Fila(fecha: "1990-05-06", doc: "16123456");
        fila.TipoDocumento = "CC"; fila.Tipo = "adulto"; fila.Whatsapp = " 3001234567 ";

        await _sut.ImportarFilasAsync([fila], null);

        Assert.Equal("3001234567", recibido!.Celular);
    }

    [Fact]
    public async Task ImportarFilasAsync_Celular_Invalido_De_Un_Adulto_Se_Reporta()
    {
        var fila = Fila(fecha: "1990-05-06", doc: "16123456");
        fila.TipoDocumento = "CC"; fila.Tipo = "adulto"; fila.Whatsapp = "12345";

        var res = await _sut.ImportarFilasAsync([fila], null);

        Assert.Contains("celular / WhatsApp", Prop<string>(Assert.Single(Errores(res.Valor!)), "motivo"));
    }

    // ── Sin documento / verificar documento ──────────────────────────────────

    [Fact]
    public async Task CrearAsync_Sin_Documento_Guarda_Sin_Numero()
    {
        CrearBeneficiarioDto? recibido = null;
        var id = Guid.NewGuid();
        _repo.Setup(r => r.CrearAsync(It.IsAny<CrearBeneficiarioDto>(), null, default))
             .Callback<CrearBeneficiarioDto, string?, CancellationToken>((d, _, _) => recibido = d)
             .ReturnsAsync(id);
        _repo.Setup(r => r.ObtenerAsync(id, default)).ReturnsAsync(new BeneficiarioDto { Id = id });
        var dto = NinoValido();
        dto.TipoDocumento = "Sin documento"; dto.NumeroDocumento = "";

        var res = await _sut.CrearAsync(dto, null);

        Assert.Equal(EstadoResultado.Ok, res.Estado);
        Assert.Null(recibido!.NumeroDocumento);
    }

    [Fact]
    public async Task BuscarDocumentoAsync_Devuelve_Id_Y_Nombre_Y_Pasa_El_Id_A_Excluir()
    {
        var existente = new DocumentoExistente(Guid.NewGuid(), "Ana Pérez");
        var propio = Guid.NewGuid();
        _repo.Setup(r => r.BuscarDocumentoAsync("1144123456", propio, default)).ReturnsAsync(existente);

        Assert.Equal(existente, await _sut.BuscarDocumentoAsync(" 1144123456 ", propio));
        Assert.Null(await _sut.BuscarDocumentoAsync("999999", null));
    }

    [Fact]
    public async Task ImportarFilasAsync_Error_Del_Repositorio_Se_Reporta_En_La_Fila()
    {
        _repo.Setup(r => r.InsertarFilaImportacionAsync(It.IsAny<CrearBeneficiarioDto>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), default))
             .ReturnsAsync("violación de restricción");

        var res = await _sut.ImportarFilasAsync([Fila()], null);

        Assert.Equal(0, Prop<int>(res.Valor!, "insertados"));
        var err = Assert.Single(Errores(res.Valor!));
        Assert.Equal(2, Prop<int>(err, "fila"));
        Assert.Equal("Ana Pérez", Prop<string>(err, "nombre"));
        Assert.Equal("violación de restricción", Prop<string>(err, "motivo"));
    }

    [Fact]
    public async Task ImportarFilasAsync_Mezcla_De_Filas_Cuenta_Totales()
    {
        _repo.Setup(r => r.ExisteDocumentoAsync("333333", default)).ReturnsAsync(true);
        InsercionOk();

        var res = await _sut.ImportarFilasAsync(
        [
            Fila(doc: "111111"),
            Fila(nombre: null),
            Fila(doc: "333333"),
            Fila(fecha: "x"),
            Fila(doc: "555555"),
        ], null);

        Assert.Equal(5, Prop<int>(res.Valor!, "total"));
        Assert.Equal(2, Prop<int>(res.Valor!, "insertados"));
        Assert.Equal(1, Prop<int>(res.Valor!, "omitidos"));
        Assert.Equal([3, 5], Errores(res.Valor!).Select(e => Prop<int>(e, "fila")).ToList());
    }

    // ── Importación: reglas de formato ───────────────────────────────────────

    public static TheoryData<Action<ImportarBeneficiarioRowDto>, string> FilasConFormatoInvalido => new()
    {
        { f => f.Whatsapp = "12345",            "El WhatsApp debe ser un celular de 10 dígitos que empiece por 3." },
        { f => f.NumeroDocumento = "11.44",     "El documento TI debe tener entre 6 y 11 dígitos" },
        { f => { f.TipoDocumento = "CE"; f.NumeroDocumento = "A B"; }, "El número de documento debe tener de 4 a 15 letras o números" },
        { f => f.TipoDocumento = "CC",          "Un menor de edad no tiene Cédula." },
        { f => f.SegundoApellido = "P3rez",     "El segundo apellido solo puede tener letras." },
        { f => f.Tipo = "adulto",               "un adulto debe tener 18 o más" },
        { f => f.FechaNacimiento = "2100-01-01","La fecha de nacimiento no puede ser futura." },
    };

    [Theory]
    [MemberData(nameof(FilasConFormatoInvalido))]
    public async Task ImportarFilasAsync_Formato_Invalido_Rechaza_La_Fila_Con_Su_Numero(
        Action<ImportarBeneficiarioRowDto> danar, string motivoEsperado)
    {
        InsercionOk();
        var mala = Fila(doc: "222222");
        danar(mala);

        var res = await _sut.ImportarFilasAsync([Fila(doc: "111111"), mala], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
        var err = Assert.Single(Errores(res.Valor!));
        Assert.Equal(3, Prop<int>(err, "fila"));
        Assert.Equal("Ana Pérez", Prop<string>(err, "nombre"));
        Assert.Contains(motivoEsperado, Prop<string>(err, "motivo"));
        _repo.Verify(r => r.InsertarFilaImportacionAsync(It.IsAny<CrearBeneficiarioDto>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ImportarFilasAsync_Varios_Errores_De_Formato_Van_En_Un_Solo_Motivo()
    {
        var fila = Fila();
        fila.Whatsapp = "999";
        fila.NumeroDocumento = "12";

        var res = await _sut.ImportarFilasAsync([fila], null);

        var motivo = Prop<string>(Assert.Single(Errores(res.Valor!)), "motivo");
        Assert.Contains("El documento TI", motivo);
        Assert.Contains("El WhatsApp", motivo);
        _repo.Verify(r => r.InsertarFilaImportacionAsync(It.IsAny<CrearBeneficiarioDto>(), It.IsAny<DateOnly>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("nino")]   // valor de la plantilla (sin ñ)
    [InlineData("Niño")]
    public async Task ImportarFilasAsync_Fila_Solo_Con_Obligatorios_Se_Importa(string? tipo)
    {
        InsercionOk();
        var fila = new ImportarBeneficiarioRowDto
        {
            PrimerNombre = "Ana", PrimerApellido = "Pérez", FechaNacimiento = "2015-03-04", Tipo = tipo,
        };

        var res = await _sut.ImportarFilasAsync([fila], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
        Assert.Empty(Errores(res.Valor!));
    }

    [Fact]
    public async Task ImportarFilasAsync_Alergia_Sin_Descripcion_No_Es_Error()
    {
        InsercionOk();
        var fila = Fila();
        fila.TieneAlergia = "si";

        var res = await _sut.ImportarFilasAsync([fila], null);

        Assert.Equal(1, Prop<int>(res.Valor!, "insertados"));
    }

    [Fact]
    public void ValidarFormato_No_Exige_Campos_Obligatorios()
    {
        var dto = new CrearBeneficiarioDto { PrimerNombre = "Ana", PrimerApellido = "Pérez", FechaNacimiento = Hoy.AddYears(-8) };
        Assert.Empty(ValidacionBeneficiario.ValidarFormato(dto, esNino: true));

        dto.PesoKg = 500m;
        Assert.Equal(["El peso debe estar entre 2 y 150 kg."], ValidacionBeneficiario.ValidarFormato(dto, esNino: true));
    }

    [Fact]
    public async Task DarDeBajaAsync_Motivo_Mayor_A_500_Es_Invalido()
    {
        var ex = await Assert.ThrowsAsync<FundacionPanorama.Domain.Shared.DatoInvalidoException>(
            () => _sut.DarDeBajaAsync(Guid.NewGuid(), new string('a', 501), null));
        Assert.Contains("500 caracteres", ex.Message);
        _repo.Verify(r => r.DarDeBajaAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), default), Times.Never);
    }

    [Theory]
    [InlineData("23505", "duplicado")]
    [InlineData("22001", "demasiado largo")]
    [InlineData("XX000", "No se pudo guardar")]
    public void Importacion_Error_De_Bd_Da_Motivo_Sin_Detalles_Tecnicos(string sqlState, string fragmento)
    {
        var pg = new Npgsql.PostgresException("duplicate key value violates unique constraint \"beneficiarios_pkey\"", "ERROR", "ERROR", sqlState);
        var motivo = FundacionPanorama.Infrastructure.Persistence.Repositories.BeneficiariosRepository.MotivoErrorImportacion(pg);
        Assert.Contains(fragmento, motivo);
        Assert.DoesNotContain("constraint", motivo);
        Assert.DoesNotContain("beneficiarios_pkey", motivo);
    }
}
