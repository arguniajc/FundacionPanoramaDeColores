using FundacionPanorama.Application.Features.Nomina;
using FundacionPanorama.Application.Features.Nomina.DTOs;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using FundacionPanorama.IntegrationTests.Infraestructura;

namespace FundacionPanorama.IntegrationTests;

/// <summary>La nómina guarda exactamente los totales de CalculoNomina y respeta el período cerrado.</summary>
[Collection(ColeccionPostgres.Nombre)]
public class NominaIntegracionTests(PostgresFixture pg)
{
    static readonly CancellationToken Ct = CancellationToken.None;

    static void AssertTotales(TotalesLiquidacion t, NominaLiquidacionDto l)
    {
        Assert.Equal(t.Auxilio,     l.AuxilioTransporte);
        Assert.Equal(t.Salud,       l.DeduccionSalud);
        Assert.Equal(t.Pension,     l.DeduccionPension);
        Assert.Equal(t.Devengado,   l.TotalDevengado);
        Assert.Equal(t.Deducciones, l.TotalDeducciones);
        Assert.Equal(t.Neto,        l.NetoPagar);
    }

    static LiquidarEmpleadoDto Liq(Guid emp, int dias, decimal he = 0, decimal bon = 0, decimal rte = 0, decimal otras = 0, decimal? salario = null) =>
        new(emp, dias, salario, he, bon, rte, otras, "prueba");

    [SkippableFact]
    public async Task AutoLiquidar_guarda_mes_completo_calculado_para_empleados_activos_con_salario()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new NominaRepository(db);
        var bajo     = await db.CrearEmpleadoAsync("Con auxilio", 1_500_000m);
        var alto     = await db.CrearEmpleadoAsync("Sin auxilio", 6_000_000m);
        var inactivo = await db.CrearEmpleadoAsync("Retirado", 2_000_000m, activo: false);
        await db.CrearEmpleadoAsync("Sin salario", null);

        var periodo = await repo.CrearPeriodoAsync(new CrearPeriodoDto(3, 2025, null, null), Ct);
        var liqs = await repo.AutoLiquidarAsync(periodo.Id, new AutoLiquidarDto(SoloActivos: true), Ct);
        var p = await repo.ObtenerParametrosAsync(Ct);

        Assert.Equal(2, liqs.Count);
        Assert.DoesNotContain(liqs, l => l.EmpleadoId == inactivo);
        foreach (var (emp, salario) in new[] { (bajo, 1_500_000m), (alto, 6_000_000m) })
        {
            var l = liqs.Single(x => x.EmpleadoId == emp);
            Assert.Equal(30, l.DiasTrabajados);
            Assert.Equal(salario, l.SalarioBase);
            AssertTotales(CalculoNomina.Calcular(p, salario, 30), l);
        }
        Assert.True(liqs.Single(l => l.EmpleadoId == bajo).AuxilioTransporte > 0);
        Assert.Equal(0m, liqs.Single(l => l.EmpleadoId == alto).AuxilioTransporte);

        // El período suma los netos guardados
        var per = await repo.ObtenerPeriodoAsync(periodo.Id, Ct);
        Assert.Equal(2, per!.TotalEmpleados);
        Assert.Equal(liqs.Sum(l => l.NetoPagar), per.TotalNeto);

        // Incluyendo inactivos aparece el retirado
        var todos = await repo.AutoLiquidarAsync(periodo.Id, new AutoLiquidarDto(SoloActivos: false), Ct);
        Assert.Equal(3, todos.Count);
    }

    [SkippableFact]
    public async Task Liquidar_y_editar_guardan_totales_proporcionales_a_los_dias()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new NominaRepository(db);
        var emp = await db.CrearEmpleadoAsync("Proporcional", 1_800_000m);
        var periodo = await repo.CrearPeriodoAsync(new CrearPeriodoDto(4, 2025, null, null), Ct);
        var p = await repo.ObtenerParametrosAsync(Ct);

        // Liquidar 15 días con novedades
        var l = await repo.LiquidarEmpleadoAsync(periodo.Id, Liq(emp, 15, he: 50_000m, bon: 30_000m, rte: 10_000m, otras: 5_000m), Ct);
        Assert.Equal(15, l.DiasTrabajados);
        Assert.Equal(1_800_000m, l.SalarioBase);   // guarda el salario MENSUAL
        Assert.Equal(50_000m, l.HorasExtras);
        Assert.Equal(30_000m, l.Bonificaciones);
        Assert.Equal(10_000m, l.RetencionFuente);
        Assert.Equal(5_000m, l.OtrasDeducciones);
        AssertTotales(CalculoNomina.Calcular(p, 1_800_000m, 15, 50_000m, 30_000m, 10_000m, 5_000m), l);

        // Editar a 10 días y otro salario (override): recalcula todo
        var editada = await repo.ActualizarLiquidacionAsync(l.Id, Liq(emp, 10, bon: 1_000m, salario: 2_100_000m), Ct);
        Assert.NotNull(editada);
        Assert.Equal(10, editada!.DiasTrabajados);
        Assert.Equal(2_100_000m, editada.SalarioBase);
        Assert.Equal(0m, editada.HorasExtras);
        AssertTotales(CalculoNomina.Calcular(p, 2_100_000m, 10, 0, 1_000m), editada);

        // Liquidar otra vez al mismo empleado reemplaza (ON CONFLICT), no duplica
        var otra = await repo.LiquidarEmpleadoAsync(periodo.Id, Liq(emp, 30), Ct);
        Assert.Equal(l.Id, otra.Id);
        Assert.Single(await repo.ListarLiquidacionesAsync(periodo.Id, Ct));
        AssertTotales(CalculoNomina.Calcular(p, 1_800_000m, 30), otra);
    }

    [SkippableFact]
    public async Task En_periodo_cerrado_no_se_edita_ni_se_elimina_la_liquidacion()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new NominaRepository(db);
        var emp = await db.CrearEmpleadoAsync("Cerrado", 2_000_000m);
        var periodo = await repo.CrearPeriodoAsync(new CrearPeriodoDto(5, 2025, null, null), Ct);
        var l = await repo.LiquidarEmpleadoAsync(periodo.Id, Liq(emp, 30), Ct);

        Assert.True(await repo.CerrarPeriodoAsync(periodo.Id, Ct));
        Assert.False(await repo.CerrarPeriodoAsync(periodo.Id, Ct));   // ya estaba cerrado

        Assert.Null(await repo.ActualizarLiquidacionAsync(l.Id, Liq(emp, 1, bon: 999_999m), Ct));
        Assert.False(await repo.EliminarLiquidacionAsync(l.Id, Ct));
        Assert.False(await repo.EliminarPeriodoAsync(periodo.Id, Ct));

        var guardada = await repo.ObtenerLiquidacionAsync(l.Id, Ct);
        Assert.Equal(30, guardada!.DiasTrabajados);
        Assert.Equal(l.NetoPagar, guardada.NetoPagar);
        Assert.Equal(0m, guardada.Bonificaciones);
    }

    [SkippableFact]
    public async Task AutoLiquidar_sobre_una_liquidacion_editada_deja_totales_coherentes()
    {
        Bugs.Pendiente(Bugs.AutoLiquidarPisaEdicion);
        var db = await pg.CrearBaseAsync();
        var repo = new NominaRepository(db);
        var emp = await db.CrearEmpleadoAsync("Editado", 1_600_000m);
        var periodo = await repo.CrearPeriodoAsync(new CrearPeriodoDto(6, 2025, null, null), Ct);
        var p = await repo.ObtenerParametrosAsync(Ct);

        await repo.LiquidarEmpleadoAsync(periodo.Id, Liq(emp, 12, he: 40_000m, rte: 7_000m), Ct);
        var tras = (await repo.AutoLiquidarAsync(periodo.Id, new AutoLiquidarDto(), Ct)).Single();

        // Lo guardado debe ser coherente consigo mismo: totales = cálculo de SUS días y novedades
        var esperado = CalculoNomina.Calcular(p, tras.SalarioBase, tras.DiasTrabajados,
            tras.HorasExtras, tras.Bonificaciones, tras.RetencionFuente, tras.OtrasDeducciones);
        AssertTotales(esperado, tras);
    }
}
