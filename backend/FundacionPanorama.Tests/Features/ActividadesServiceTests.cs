using FundacionPanorama.Application.Features.Actividades;
using FundacionPanorama.Application.Features.Actividades.DTOs;
using FundacionPanorama.Application.Features.Actividades.Interfaces;
using FundacionPanorama.Domain.Shared;
using Moq;

namespace FundacionPanorama.Tests.Features;

public class ActividadesServiceTests
{
    private readonly Mock<IActividadesRepository> _repo = new();
    private readonly ActividadesService           _sut;

    public ActividadesServiceTests()
    {
        _sut = new(_repo.Object);
        _repo.Setup(r => r.ExisteProgramaAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _repo.Setup(r => r.BeneficiariosInexistentesAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync([]);
    }

    static readonly DateTime Inicio = new(2026, 3, 15, 8, 0, 0);

    static CrearActividadDto Nueva(string titulo = "Taller de pintura", DateTime? fin = null, string? lugar = null,
        List<CrearActividadDiaDto>? dias = null, Guid? programaId = null)
        => new(titulo, null, programaId, Inicio, fin ?? Inicio.AddHours(2), lugar, dias);

    static ActualizarActividadDto Editar(string estado)
        => new("Taller", null, null, Inicio, Inicio.AddHours(2), null, estado, null);

    static CrearHorarioDto Horario(int dia = 1, string hi = "08:00", string hf = "10:00",
        string? desde = null, string? hasta = null, Guid? programaId = null)
        => new(programaId ?? Guid.NewGuid(), dia, hi, hf, null, desde, hasta);

    async Task<string> Falla(Func<Task> accion) => (await Assert.ThrowsAsync<DatoInvalidoException>(accion)).Message;

    // ── Actividades ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Titulo_Obligatorio(string titulo)
    {
        Assert.Contains("título es obligatorio", await Falla(() => _sut.CrearAsync(Nueva(titulo))));
        _repo.Verify(r => r.CrearAsync(It.IsAny<CrearActividadDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Titulo_Y_Lugar_Respetan_La_Columna()
    {
        Assert.Contains("200 caracteres", await Falla(() => _sut.CrearAsync(Nueva(new string('a', 201)))));
        Assert.Contains("200 caracteres", await Falla(() => _sut.CrearAsync(Nueva(lugar: new string('a', 201)))));
    }

    [Fact]
    public async Task Fin_No_Puede_Ser_Antes_Del_Inicio()
        => Assert.Contains("anterior", await Falla(() => _sut.CrearAsync(Nueva(fin: Inicio.AddHours(-1)))));

    [Fact]
    public async Task Programa_Inexistente()
    {
        var pid = Guid.NewGuid();
        _repo.Setup(r => r.ExisteProgramaAsync(pid, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        Assert.Contains("programa", await Falla(() => _sut.CrearAsync(Nueva(programaId: pid))));
    }

    [Theory]
    [InlineData("2026-02-30", "08:00", "10:00", "fecha")]
    [InlineData("15/03/2026", "08:00", "10:00", "AAAA-MM-DD")]
    [InlineData("2026-03-16", "25:00", "10:00", "hora")]
    [InlineData("2026-03-16", "10:00", "09:00", "posterior")]
    [InlineData("", "08:00", "10:00", "incompleto")]
    public async Task Dias_Adicionales_Invalidos(string fecha, string hi, string hf, string fragmento)
        => Assert.Contains(fragmento, await Falla(() => _sut.CrearAsync(Nueva(dias: [new(fecha, hi, hf)]))));

    [Fact]
    public async Task Actividad_Valida_Se_Guarda()
    {
        var dto = Nueva(dias: [new("2026-03-16", "08:00", "10:00")]);
        await _sut.CrearAsync(dto);
        _repo.Verify(r => r.CrearAsync(dto, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("terminada")]
    [InlineData("")]
    [InlineData("PROGRAMADA")]
    public async Task Estado_Fuera_De_La_Lista(string estado)
        => Assert.Contains("estado no es válido", await Falla(() => _sut.ActualizarAsync(Guid.NewGuid(), Editar(estado))));

    [Theory]
    [InlineData("programada")]
    [InlineData("en_curso")]
    [InlineData("realizada")]
    [InlineData("cancelada")]
    public async Task Estados_Del_Panel_Son_Validos(string estado)
    {
        await _sut.ActualizarAsync(Guid.NewGuid(), Editar(estado));
        _repo.Verify(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<ActualizarActividadDto>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Asistencia ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Asistencia_Con_Beneficiario_Inexistente()
    {
        var bid = Guid.NewGuid();
        _repo.Setup(r => r.BeneficiariosInexistentesAsync(It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync([bid]);

        Assert.Contains("ya no existe", await Falla(() =>
            _sut.RegistrarAsistenciaAsync(Guid.NewGuid(), new([new(bid, true)]))));
        _repo.Verify(r => r.RegistrarAsistenciaAsync(It.IsAny<Guid>(), It.IsAny<RegistrarAsistenciaDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Asistencia_Valida_Se_Registra()
    {
        var dto = new RegistrarAsistenciaDto([new(Guid.NewGuid(), true)]);
        await _sut.RegistrarAsistenciaAsync(Guid.NewGuid(), dto);
        _repo.Verify(r => r.RegistrarAsistenciaAsync(It.IsAny<Guid>(), dto, It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Horarios ─────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(-1)]
    [InlineData(7)]
    public async Task Dia_De_Semana_Fuera_De_0_A_6(int dia)
        => Assert.Contains("día de la semana", await Falla(() => _sut.CrearHorarioAsync(Horario(dia: dia))));

    [Theory]
    [InlineData("10:00", "10:00")]
    [InlineData("10:00", "08:00")]
    public async Task Hora_Fin_Debe_Ser_Posterior(string hi, string hf)
        => Assert.Contains("posterior", await Falla(() => _sut.CrearHorarioAsync(Horario(hi: hi, hf: hf))));

    [Theory]
    [InlineData("8am")]
    [InlineData("")]
    public async Task Hora_Con_Formato_Invalido(string hi)
        => Assert.Contains("HH:MM", await Falla(() => _sut.CrearHorarioAsync(Horario(hi: hi))));

    [Fact]
    public async Task Vigencia_Fin_Antes_Del_Inicio()
        => Assert.Contains("vigencia", await Falla(() => _sut.CrearHorarioAsync(Horario(desde: "2026-06-01", hasta: "2026-05-01"))));

    [Fact]
    public async Task Vigencia_Con_Formato_Invalido()
        => Assert.Contains("AAAA-MM-DD", await Falla(() => _sut.CrearHorarioAsync(Horario(desde: "01/06/2026"))));

    [Fact]
    public async Task Horario_Sin_Programa_O_Con_Programa_Inexistente()
    {
        Assert.Contains("Selecciona el programa", await Falla(() => _sut.CrearHorarioAsync(Horario(programaId: Guid.Empty))));

        var pid = Guid.NewGuid();
        _repo.Setup(r => r.ExisteProgramaAsync(pid, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        Assert.Contains("no existe", await Falla(() => _sut.CrearHorarioAsync(Horario(programaId: pid))));
    }

    [Theory]
    [InlineData(0)] // domingo (convención de JavaScript: Date.getDay)
    [InlineData(6)] // sábado
    public async Task Horario_Valido_Se_Guarda(int dia)
    {
        var dto = Horario(dia: dia, desde: "2026-02-03", hasta: "2026-11-28");
        await _sut.CrearHorarioAsync(dto);
        _repo.Verify(r => r.CrearHorarioAsync(dto, It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Estado según la fecha (calculado al leer, sin UPDATE en el GET) ──────

    static readonly DateTime Ahora = new(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("programada", -48, -46,   "realizada")]  // ya terminó
    [InlineData("en_curso",   -48, -46,   "realizada")]
    [InlineData("programada", -1,  1,     "en_curso")]   // empezó y no ha terminado
    [InlineData("programada", -1,  null,  "en_curso")]   // sin fin: en curso desde que empieza
    [InlineData("programada", 24,  26,    "programada")] // futura
    [InlineData("en_curso",   -1,  null,  "en_curso")]
    [InlineData("cancelada",  -48, -46,   "cancelada")]  // cancelada no cambia
    [InlineData("realizada",  24,  26,    "realizada")]  // lo que el usuario marcó a mano se respeta
    public void EstadoEfectivo_Segun_La_Fecha(string estado, int inicioHoras, int? finHoras, string esperado)
        => Assert.Equal(esperado, ActividadesService.EstadoEfectivo(
            estado, Ahora.AddHours(inicioHoras), finHoras is { } f ? Ahora.AddHours(f) : null, Ahora));

    [Fact]
    public async Task Listar_Muestra_El_Estado_Segun_La_Fecha_Sin_Escribir()
    {
        var pasada = DateTime.UtcNow.AddDays(-3);
        var futura = DateTime.UtcNow.AddDays(3);
        _repo.Setup(r => r.ListarAsync(null, null, null, It.IsAny<CancellationToken>())).ReturnsAsync([
            new ActividadResumenDto(Guid.NewGuid(), "Pasada", null, null, null, pasada, pasada.AddHours(2), null, "programada", 0, []),
            new ActividadResumenDto(Guid.NewGuid(), "Futura", null, null, null, futura, futura.AddHours(2), null, "programada", 0, []),
        ]);

        var lista = await _sut.ListarAsync(null, null, null);

        Assert.Equal(["realizada", "programada"], lista.Select(a => a.Estado));
        // Solo se leyó: el repositorio no recibió ninguna operación de escritura
        _repo.Verify(r => r.ListarAsync(null, null, null, It.IsAny<CancellationToken>()), Times.Once);
        _repo.Verify(r => r.ActualizarAsync(It.IsAny<Guid>(), It.IsAny<ActualizarActividadDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Obtener_Tambien_Calcula_El_Estado()
    {
        var id     = Guid.NewGuid();
        var pasada = DateTime.UtcNow.AddDays(-3);
        _repo.Setup(r => r.ObtenerAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(
            new ActividadDto(id, "Pasada", null, null, null, pasada, pasada.AddHours(2), null, "en_curso", 0, 0, pasada, []));

        Assert.Equal("realizada", (await _sut.ObtenerAsync(id))!.Estado);
    }
}
