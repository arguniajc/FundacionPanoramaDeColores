using FundacionPanorama.Application.Features.Contabilidad.DTOs;
using FundacionPanorama.Infrastructure.Persistence;
using FundacionPanorama.Infrastructure.Persistence.Repositories;
using FundacionPanorama.IntegrationTests.Infraestructura;

namespace FundacionPanorama.IntegrationTests;

/// <summary>Saldos, anulación, caja menor, consecutivos y reportes de Contabilidad contra PostgreSQL real.</summary>
[Collection(ColeccionPostgres.Nombre)]
public class ContabilidadIntegracionTests(PostgresFixture pg)
{
    static readonly CancellationToken Ct = CancellationToken.None;

    sealed record Contexto(DbConnectionFactory Db, ContabilidadRepository Repo, int CatIngreso, int CatIngreso2, int CatEgreso, int CatEgreso2);

    async Task<Contexto> PrepararAsync()
    {
        var db = await pg.CrearBaseAsync();
        var repo = new ContabilidadRepository(db);
        var cats = await repo.ListarCategoriasAsync(null, Ct);
        int Cat(string puc) => cats.Single(c => c.CodigoPuc == puc).Id;
        return new Contexto(db, repo, Cat("4120"), Cat("4810"), Cat("5130"), Cat("5270"));
    }

    static CrearMovimientoDto Mov(string tipo, DateOnly fecha, decimal monto, Guid cuenta, int cat, string concepto = "Movimiento de prueba") =>
        new(tipo, fecha, concepto, monto, cuenta, cat, null, null, null, null, null, null, null, null, null);

    static ActualizarMovimientoDto Edit(string tipo, DateOnly fecha, decimal monto, Guid cuenta, int cat) =>
        new(tipo, fecha, "Editado", monto, cuenta, cat, null, null, null, null, null, null, null, null, null);

    static async Task<decimal> SaldoAsync(Contexto c, Guid cuenta) =>
        (await c.Repo.ListarCuentasAsync(Ct)).Single(x => x.Id == cuenta).SaldoActual;

    Task<CuentaCajaDto> CuentaAsync(Contexto c, string nombre, decimal saldoInicial, string tipo = "cuenta_bancaria") =>
        c.Repo.CrearCuentaAsync(new CrearCuentaCajaDto(nombre, tipo, null, null, saldoInicial), Ct);

    [SkippableFact]
    public async Task Ingresos_y_egresos_actualizan_saldo_actual()
    {
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Banco", 1_000m);
        Assert.Equal(1_000m, cuenta.SaldoActual);

        await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2020, 3, 1), 500m, cuenta.Id, c.CatIngreso), Ct);
        await c.Repo.CrearMovimientoAsync(Mov("egreso",  new(2020, 3, 2), 200.50m, cuenta.Id, c.CatEgreso), Ct);

        Assert.Equal(1_299.50m, await SaldoAsync(c, cuenta.Id));
    }

    [SkippableFact]
    public async Task Editar_movimiento_revierte_el_original_y_aplica_el_nuevo_incluso_al_cambiar_de_cuenta()
    {
        var c = await PrepararAsync();
        var a = await CuentaAsync(c, "Cuenta A", 1_000m);
        var b = await CuentaAsync(c, "Cuenta B", 0m);

        var egreso = await c.Repo.CrearMovimientoAsync(Mov("egreso", new(2020, 4, 1), 200m, a.Id, c.CatEgreso), Ct);
        Assert.Equal(800m, await SaldoAsync(c, a.Id));

        // Mismo tipo y cuenta, otro monto
        await c.Repo.ActualizarMovimientoAsync(egreso.Id, Edit("egreso", new(2020, 4, 1), 350m, a.Id, c.CatEgreso), Ct);
        Assert.Equal(650m, await SaldoAsync(c, a.Id));

        // Cambia a ingreso y a la cuenta B: A recupera los 350 y B suma 120
        var editado = await c.Repo.ActualizarMovimientoAsync(egreso.Id, Edit("ingreso", new(2020, 4, 1), 120m, b.Id, c.CatIngreso), Ct);
        Assert.NotNull(editado);
        Assert.Equal(1_000m, await SaldoAsync(c, a.Id));
        Assert.Equal(120m, await SaldoAsync(c, b.Id));
        Assert.Equal(egreso.Consecutivo, editado!.Consecutivo); // editar no cambia el consecutivo
    }

    [SkippableFact]
    public async Task Anular_revierte_el_saldo_una_sola_vez_y_el_anulado_no_suma_en_listados()
    {
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Caja", 100m, "caja");
        var ing = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2020, 5, 1), 400m, cuenta.Id, c.CatIngreso), Ct);
        await c.Repo.CrearMovimientoAsync(Mov("egreso", new(2020, 5, 2), 50m, cuenta.Id, c.CatEgreso), Ct);
        Assert.Equal(450m, await SaldoAsync(c, cuenta.Id));

        Assert.True(await c.Repo.AnularMovimientoAsync(ing.Id, Ct));
        Assert.Equal(50m, await SaldoAsync(c, cuenta.Id));

        // Anular dos veces no vuelve a mover el saldo
        Assert.False(await c.Repo.AnularMovimientoAsync(ing.Id, Ct));
        Assert.Equal(50m, await SaldoAsync(c, cuenta.Id));
        Assert.True((await c.Repo.ObtenerMovimientoAsync(ing.Id, Ct))!.Anulado);

        var lista = await c.Repo.ListarMovimientosAsync(new FiltroMovimientos(null, cuenta.Id, null, null, 2020, null), 1, 50, Ct);
        Assert.Equal(2, lista.Total);              // el anulado se lista…
        Assert.Equal(0m, lista.TotalIngresos);     // …pero no suma
        Assert.Equal(50m, lista.TotalEgresos);
        Assert.Equal(0, lista.CantidadIngresos);
    }

    [SkippableFact]
    public async Task Eliminar_movimiento_revierte_su_efecto()
    {
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Banco", 0m);
        var ing = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2020, 6, 1), 300m, cuenta.Id, c.CatIngreso), Ct);
        Assert.True(await c.Repo.EliminarMovimientoAsync(ing.Id, Ct));
        Assert.Equal(0m, await SaldoAsync(c, cuenta.Id));
        Assert.Null(await c.Repo.ObtenerMovimientoAsync(ing.Id, Ct));
    }

    [SkippableFact]
    public async Task Editar_un_movimiento_anulado_no_descuadra_el_saldo()
    {
        Bugs.Pendiente(Bugs.EditarMovimientoAnulado);
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Banco", 1_000m);
        var ing = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2020, 7, 1), 300m, cuenta.Id, c.CatIngreso), Ct);
        await c.Repo.AnularMovimientoAsync(ing.Id, Ct);
        Assert.Equal(1_000m, await SaldoAsync(c, cuenta.Id));

        // Se corrige el monto del anulado (300 → 500)
        await c.Repo.ActualizarMovimientoAsync(ing.Id, Edit("ingreso", new(2020, 7, 1), 500m, cuenta.Id, c.CatIngreso), Ct);

        // Sigue anulado: no debe afectar el saldo (o la edición debería rechazarse)
        var mov = await c.Repo.ObtenerMovimientoAsync(ing.Id, Ct);
        var esperado = mov!.Anulado ? 1_000m : 1_500m;
        Assert.Equal(esperado, await SaldoAsync(c, cuenta.Id));
    }

    [SkippableFact]
    public async Task Eliminar_un_movimiento_anulado_no_descuadra_el_saldo()
    {
        Bugs.Pendiente(Bugs.EliminarMovimientoAnulado);
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Banco", 1_000m);
        var ing = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2020, 7, 1), 300m, cuenta.Id, c.CatIngreso), Ct);
        await c.Repo.AnularMovimientoAsync(ing.Id, Ct);

        await c.Repo.EliminarMovimientoAsync(ing.Id, Ct);

        Assert.Equal(1_000m, await SaldoAsync(c, cuenta.Id));
    }

    [SkippableFact]
    public async Task Reposicion_de_caja_menor_crea_salida_y_entrada_y_mueve_ambos_saldos()
    {
        var c = await PrepararAsync();
        var banco = await CuentaAsync(c, "Banco principal", 1_000_000m);
        var caja  = await CuentaAsync(c, "Caja menor sede", 50_000m, "caja_menor");

        var (entrada, salida) = await c.Repo.ReponerCajaAsync(
            new CrearReposicionDto(caja.Id, banco.Id, new(2021, 2, 10), 200_000m, "CH-001", "Reposición mensual"), Ct);

        Assert.Equal("ingreso", entrada.Tipo);
        Assert.Equal(caja.Id, entrada.CuentaId);
        Assert.Equal("TR-01", entrada.CodigoPuc);
        Assert.Contains("Banco principal", entrada.Concepto);
        Assert.Equal("egreso", salida.Tipo);
        Assert.Equal(banco.Id, salida.CuentaId);
        Assert.Equal("TR-02", salida.CodigoPuc);
        Assert.Contains("Caja menor sede", salida.Concepto);
        Assert.Equal(200_000m, entrada.Monto);
        Assert.Equal(200_000m, salida.Monto);

        Assert.Equal(800_000m, await SaldoAsync(c, banco.Id));
        Assert.Equal(250_000m, await SaldoAsync(c, caja.Id));

        // Libro auxiliar de la caja: arranca en el saldo inicial y acumula la entrada
        await c.Repo.CrearMovimientoAsync(Mov("egreso", new(2021, 2, 11), 30_000m, caja.Id, c.CatEgreso), Ct);
        var libro = await c.Repo.LibroAuxiliarAsync(caja.Id, null, null, Ct);
        Assert.Equal([250_000m, 220_000m], libro.Select(l => l.SaldoAcumulado));
        Assert.Equal(libro[^1].SaldoAcumulado, await SaldoAsync(c, caja.Id));
    }

    [SkippableFact]
    public async Task Consecutivo_de_comprobantes_es_correlativo_por_anio()
    {
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Banco", 0m);

        var m1 = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2019, 1, 5), 10m, cuenta.Id, c.CatIngreso), Ct);
        var m2 = await c.Repo.CrearMovimientoAsync(Mov("egreso",  new(2019, 6, 5), 5m, cuenta.Id, c.CatEgreso), Ct);
        var n1 = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2020, 1, 1), 10m, cuenta.Id, c.CatIngreso), Ct);
        var m3 = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2019, 12, 31), 10m, cuenta.Id, c.CatIngreso), Ct);

        Assert.Equal(1, m1.Consecutivo);
        Assert.Equal(2, m2.Consecutivo);
        Assert.Equal(3, m3.Consecutivo);
        Assert.Equal(1, n1.Consecutivo);   // cada año reinicia

        // Anular no libera el número: el siguiente sigue la serie
        await c.Repo.AnularMovimientoAsync(m3.Id, Ct);
        var m4 = await c.Repo.CrearMovimientoAsync(Mov("egreso", new(2019, 8, 1), 1m, cuenta.Id, c.CatEgreso), Ct);
        Assert.Equal(4, m4.Consecutivo);
    }

    [SkippableFact]
    public async Task Consecutivo_no_se_repite_con_creaciones_simultaneas()
    {
        Bugs.Pendiente(Bugs.ConsecutivoConcurrente);
        var c = await PrepararAsync();
        var cuenta = await CuentaAsync(c, "Banco", 0m);

        var tareas = Enumerable.Range(0, 10).Select(i =>
            c.Repo.CrearMovimientoAsync(Mov("ingreso", new(2018, 3, 1), 1m + i, cuenta.Id, c.CatIngreso), Ct));
        var creados = await Task.WhenAll(tareas);

        var numeros = creados.Select(m => m.Consecutivo).OrderBy(n => n).ToList();
        Assert.Equal(Enumerable.Range(1, 10).Select(n => (int?)n), numeros);
    }

    [SkippableFact]
    public async Task Resumen_anual_libro_mayor_y_reporte_cuadran_con_los_movimientos()
    {
        var c = await PrepararAsync();
        var banco = await CuentaAsync(c, "Banco", 0m);
        var caja  = await CuentaAsync(c, "Caja", 0m, "caja");
        const int anio = 2022;

        var movs = new List<(string Tipo, DateOnly Fecha, decimal Monto, Guid Cuenta, int Cat)>
        {
            ("ingreso", new(anio, 1, 10), 1_000m, banco.Id, c.CatIngreso),
            ("ingreso", new(anio, 1, 20),   250m, caja.Id,  c.CatIngreso2),
            ("egreso",  new(anio, 1, 25),   300m, banco.Id, c.CatEgreso),
            ("ingreso", new(anio, 3, 5),    700m, banco.Id, c.CatIngreso),
            ("egreso",  new(anio, 3, 6),    120m, caja.Id,  c.CatEgreso2),
            ("egreso",  new(anio, 3, 6),     80m, banco.Id, c.CatEgreso),
            ("egreso",  new(anio, 12, 31),   45m, banco.Id, c.CatEgreso2),
        };
        foreach (var m in movs)
            await c.Repo.CrearMovimientoAsync(Mov(m.Tipo, m.Fecha, m.Monto, m.Cuenta, m.Cat), Ct);

        // Ruido: un anulado del mismo año y un movimiento de otro año no deben contar
        var anulado = await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(anio, 3, 7), 9_999m, banco.Id, c.CatIngreso), Ct);
        await c.Repo.AnularMovimientoAsync(anulado.Id, Ct);
        await c.Repo.CrearMovimientoAsync(Mov("ingreso", new(anio - 1, 12, 31), 5_555m, banco.Id, c.CatIngreso), Ct);

        var ingEsperado = movs.Where(m => m.Tipo == "ingreso").Sum(m => m.Monto);
        var egrEsperado = movs.Where(m => m.Tipo == "egreso").Sum(m => m.Monto);

        // Resumen anual
        var resumen = await c.Repo.ResumenAnualAsync(anio, Ct);
        Assert.Equal(12, resumen.Meses.Count);
        Assert.Equal(ingEsperado, resumen.TotalIngresos);
        Assert.Equal(egrEsperado, resumen.TotalEgresos);
        Assert.Equal(ingEsperado - egrEsperado, resumen.Balance);
        foreach (var mes in resumen.Meses)
        {
            Assert.Equal(movs.Where(m => m.Fecha.Month == mes.Mes && m.Tipo == "ingreso").Sum(m => m.Monto), mes.Ingresos);
            Assert.Equal(movs.Where(m => m.Fecha.Month == mes.Mes && m.Tipo == "egreso").Sum(m => m.Monto), mes.Egresos);
        }

        // Libro mayor: una fila por movimiento válido; el saldo acumulado por cuenta PUC termina en ingresos - egresos
        var mayor = await c.Repo.LibroMayorAsync(anio, null, null, Ct);
        Assert.Equal(movs.Count, mayor.Count);
        Assert.Equal(ingEsperado, mayor.Sum(l => l.Ingreso));
        Assert.Equal(egrEsperado, mayor.Sum(l => l.Egreso));
        foreach (var grupo in mayor.GroupBy(l => l.CodigoPuc))
            Assert.Equal(grupo.Sum(l => l.Ingreso - l.Egreso), grupo.Last().SaldoAcumulado);

        // Filtro por mes y por prefijo PUC
        Assert.Equal(3, (await c.Repo.LibroMayorAsync(anio, 3, null, Ct)).Count);
        Assert.Equal(movs.Count(m => m.Tipo == "egreso"), (await c.Repo.LibroMayorAsync(anio, null, "5", Ct)).Count);

        // Reporte del contador de marzo
        var marzo = await c.Repo.ReporteAsync(3, anio, Ct);
        Assert.Equal(700m, marzo.TotalIngresos);
        Assert.Equal(200m, marzo.TotalEgresos);
        Assert.Equal(3, marzo.Movimientos.Count);
        Assert.Equal(marzo.TotalIngresos + marzo.TotalEgresos, marzo.PorCuenta.Sum(p => p.Total));

        // El saldo de las cuentas también cuadra con los movimientos (incluido el del otro año)
        Assert.Equal(1_000m - 300m + 700m - 80m - 45m + 5_555m, await SaldoAsync(c, banco.Id));
        Assert.Equal(250m - 120m, await SaldoAsync(c, caja.Id));
    }
}
