using FundacionPanorama.API.Services;

namespace FundacionPanorama.Tests.Services;

/// <summary>
/// Parseo del texto OCR de facturas y recibos colombianos (POST /api/contabilidad/extraer-factura).
/// </summary>
public class ParserFacturaTests
{
    // Factura electrónica típica de un supermercado (como la devuelve OCR.space: una línea por renglón)
    const string FacturaSupermercado = """
        SUPERMERCADO LA ECONOMIA S.A.S.
        NIT: 900.123.456-7
        Cra 4 # 12-30 Yumbo - Valle
        FACTURA ELECTRÓNICA DE VENTA No. FE-10234
        Fecha: 15/03/2026  Hora: 10:42
        Arroz Diana x 5 kg
        Aceite Premier 3000 ml
        SUBTOTAL $ 1.050.420,17
        IVA 19% $ 199.579,83
        TOTAL A PAGAR $ 1.250.000,00
        Gracias por su compra
        """;

    const string ReciboPapeleria = """
        PAPELERIA EL ESTUDIANTE
        NIT 1144123456
        Tel 3001234567
        RECIBO DE CAJA N° 0457
        Cuadernos y lápices taller de pintura
        Fecha 2026-02-03
        TOTAL $45.900
        """;

    [Fact]
    public void Factura_Completa_Extrae_Todos_Los_Datos()
    {
        var r = ParserFactura.Parsear(FacturaSupermercado);

        Assert.Equal(1_250_000.00m, r.Monto);
        Assert.Equal("2026-03-15", r.Fecha);
        Assert.Equal("900123456", r.NitProveedor);
        Assert.Equal("FE-10234", r.NumeroFactura);
        Assert.Equal("Factura electrónica", r.TipoSoporte);
        Assert.Equal("SUPERMERCADO LA ECONOMIA S.A.S.", r.NombreProveedor);
        Assert.Equal("Arroz Diana x 5 kg", r.Concepto);
        Assert.Null(r.Advertencia);
    }

    [Fact]
    public void Recibo_De_Caja_Extrae_Total_Fecha_Iso_Y_Numero()
    {
        var r = ParserFactura.Parsear(ReciboPapeleria);

        Assert.Equal(45_900m, r.Monto);
        Assert.Equal("2026-02-03", r.Fecha);
        Assert.Equal("1144123456", r.NitProveedor);
        Assert.Equal("0457", r.NumeroFactura);
        Assert.Equal("Recibo de caja", r.TipoSoporte);
        Assert.Equal("PAPELERIA EL ESTUDIANTE", r.NombreProveedor);
        Assert.Equal("Cuadernos y lápices taller de pintura", r.Concepto);
    }

    // ── Monto ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("1.250.000,00", 1_250_000.00)]
    [InlineData("1.250.000", 1_250_000)]
    [InlineData("45.900", 45_900)]
    [InlineData("12.345,5", 12_345.5)]
    [InlineData("1,250,000.50", 1_250_000.50)]
    [InlineData("98000", 98_000)]
    [InlineData("45.900.", 45_900)]
    public void Valor_Con_Puntos_De_Miles_Y_Coma_Decimal(string texto, double esperado)
        => Assert.Equal((decimal)esperado, ParserFactura.ParsearValor(texto));

    [Theory]
    [InlineData("")]
    [InlineData(".,")]
    public void Valor_Vacio_Es_Null(string texto) => Assert.Null(ParserFactura.ParsearValor(texto));

    [Fact]
    public void El_Subtotal_No_Se_Toma_Como_Total()
    {
        var r = ParserFactura.Parsear("TIENDA DON JOSE\nSUBTOTAL 84.034\nIVA 15.966\nTOTAL 100.000");
        Assert.Equal(100_000m, r.Monto);
    }

    [Fact]
    public void Sub_Total_Separado_Tampoco_Es_El_Total()
    {
        var r = ParserFactura.Parsear("TIENDA DON JOSE\nSUB TOTAL 84.034\nTOTAL IVA 15.966\nTOTAL: $ 100.000");
        Assert.Equal(100_000m, r.Monto);
    }

    [Fact]
    public void Total_A_Pagar_Tiene_Prioridad_Sobre_Total()
    {
        var r = ParserFactura.Parsear("DROGUERIA LA SALUD\nTOTAL ITEMS 3\nDESCUENTO 5.000\nTOTAL A PAGAR 95.000");
        Assert.Equal(95_000m, r.Monto);
    }

    [Fact]
    public void Total_En_La_Linea_Siguiente_Al_Rotulo()
        => Assert.Equal(320_000m, ParserFactura.Parsear("FERRETERIA\nTOTAL\n$ 320.000").Monto);

    [Fact]
    public void Sin_Rotulo_De_Total_Usa_Valor()
        => Assert.Equal(60_000m, ParserFactura.Parsear("TRANSPORTES RAPIDOS\nVALOR: 60.000").Monto);

    [Fact]
    public void Sin_Rotulo_Usa_El_Primer_Valor_Con_Signo_Peso()
        => Assert.Equal(18_500m, ParserFactura.Parsear("CAFETERIA\nTinto y pan $ 18.500").Monto);

    // ── Fecha ─────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("Fecha: 15/03/2026", "2026-03-15")]
    [InlineData("Fecha: 5-3-2026", "2026-03-05")]
    [InlineData("Fecha: 05.03.2026", "2026-03-05")]
    [InlineData("Fecha: 2026/03/15", "2026-03-15")]
    [InlineData("Fecha: 2026-3-5", "2026-03-05")]
    [InlineData("Yumbo, 15 de marzo de 2026", "2026-03-15")]
    [InlineData("FECHA: 15-MAR-2026", "2026-03-15")]
    [InlineData("Expedida el 1 dic. 2025", "2025-12-01")]
    public void Fecha_En_Varios_Formatos(string linea, string esperada)
        => Assert.Equal(esperada, ParserFactura.Parsear($"PROVEEDOR XYZ\n{linea}").Fecha);

    [Theory]
    [InlineData("Fecha: 15/13/2026")]   // mes 13
    [InlineData("Fecha: 31/02/2026")]   // 31 de febrero
    [InlineData("Fecha: 2026-02-30")]
    public void Fecha_Imposible_Se_Descarta(string linea)
        => Assert.Null(ParserFactura.Parsear($"PROVEEDOR XYZ\n{linea}").Fecha);

    [Fact]
    public void Fecha_Colombiana_Es_Dia_Mes_Anio()
        => Assert.Equal("2026-12-03", ParserFactura.Parsear("03/12/2026").Fecha);

    // ── NIT ───────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData("NIT: 900.123.456-7", "900123456")]
    [InlineData("NIT 900123456-7", "900123456")]
    [InlineData("N.I.T. 800 197 268-4", "800197268")]
    [InlineData("Nit:890.903.938-8", "890903938")]
    [InlineData("NIT. 1.144.123.456", "1144123456")]
    public void Nit_Se_Guarda_Sin_Puntos_Ni_Digito_De_Verificacion(string linea, string esperado)
        => Assert.Equal(esperado, ParserFactura.Parsear($"PROVEEDOR XYZ\n{linea}").NitProveedor);

    [Fact]
    public void Valor_Unitario_No_Se_Confunde_Con_Nit()
        => Assert.Null(ParserFactura.Parsear("PROVEEDOR XYZ\nVALOR UNITARIO 4500000").NitProveedor);

    // ── Número de factura ─────────────────────────────────────────────────────

    [Theory]
    [InlineData("FACTURA ELECTRÓNICA DE VENTA No. FE-10234", "FE-10234")]
    [InlineData("Factura electronica de venta N° SETP990001234", "SETP990001234")]
    [InlineData("FACTURA # 3345", "3345")]
    [InlineData("Factura: A-778", "A-778")]
    [InlineData("TIQUETE DE VENTA 000123", "000123")]
    [InlineData("RECIBO DE CAJA No 0457", "0457")]
    public void Numero_De_Factura(string linea, string esperado)
        => Assert.Equal(esperado, ParserFactura.Parsear($"PROVEEDOR XYZ\n{linea}").NumeroFactura);

    [Fact]
    public void Sin_Numero_No_Inventa_Una_Palabra()
        => Assert.Null(ParserFactura.Parsear("PROVEEDOR XYZ\nFACTURA DE VENTA\nGracias").NumeroFactura);

    [Fact]
    public void Tiquete_Se_Clasifica_Como_Recibo_De_Caja()
        => Assert.Equal("Recibo de caja", ParserFactura.Parsear("TIQUETE POS 5566").TipoSoporte);

    // ── Proveedor / concepto ──────────────────────────────────────────────────

    [Fact]
    public void Proveedor_Salta_Lineas_De_Solo_Numeros_Nit_Y_Telefono()
    {
        var r = ParserFactura.Parsear("0001\nNIT 900123456\nTEL 6024445566\nASADERO EL POLLO FELIZ\nAlmuerzos");
        Assert.Equal("ASADERO EL POLLO FELIZ", r.NombreProveedor);
    }

    // ── Sin datos ─────────────────────────────────────────────────────────────

    [Fact]
    public void Texto_Sin_Monto_Ni_Fecha_Avisa_Que_Faltan_Datos()
    {
        var r = ParserFactura.Parsear("texto ilegible\n### ~~~");
        Assert.Null(r.Monto);
        Assert.Null(r.Fecha);
        Assert.Null(r.NitProveedor);
        Assert.Null(r.NumeroFactura);
        Assert.Equal("Recibo de caja", r.TipoSoporte);
        Assert.Equal("Datos incompletos. Revisa y corrige manualmente.", r.Advertencia);
    }

    [Fact]
    public void Texto_Vacio_No_Falla()
    {
        var r = ParserFactura.Parsear("");
        Assert.Null(r.Monto);
        Assert.Null(r.NombreProveedor);
        Assert.Null(r.Concepto);
        Assert.NotNull(r.Advertencia);
    }

    [Fact]
    public void Con_Solo_Fecha_No_Hay_Advertencia()
        => Assert.Null(ParserFactura.Parsear("PROVEEDOR XYZ\nFecha 10/01/2026").Advertencia);

    [Fact]
    public void Total_Cero_Se_Ignora()
        => Assert.Null(ParserFactura.Parsear("PROVEEDOR XYZ\nTOTAL $ 0").Monto);
}
