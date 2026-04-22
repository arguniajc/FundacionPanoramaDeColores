using FundacionPanorama.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Catálogos
    public DbSet<CatTipoDocumento> CatTiposDocumento { get; set; }
    public DbSet<CatParentesco>    CatParentescos    { get; set; }
    public DbSet<CatEps>           CatEps            { get; set; }
    public DbSet<CatTipoArchivo>   CatTiposArchivo   { get; set; }

    // Módulo Beneficiarios
    public DbSet<Beneficiario>          Beneficiarios          { get; set; }
    public DbSet<Acudiente>             Acudientes             { get; set; }
    public DbSet<BeneficiarioAcudiente> BeneficiarioAcudientes { get; set; }
    public DbSet<BeneficiarioSalud>     BeneficiariosSalud     { get; set; }
    public DbSet<AlergiasCatalogo>      AlergiasCatalogo       { get; set; }
    public DbSet<BeneficiarioAlergia>   BeneficiariosAlergia   { get; set; }
    public DbSet<BeneficiarioTalla>     BeneficiariosTalla     { get; set; }
    public DbSet<Archivo>               Archivos               { get; set; }
    public DbSet<LogDescarga>           LogDescargas           { get; set; }
    public DbSet<Sede>                  Sedes                  { get; set; }
    public DbSet<Programa>              Programas              { get; set; }
    public DbSet<ProgramaCampo>         ProgramasCampos        { get; set; }
    public DbSet<Inscripcion>           Inscripciones          { get; set; }

    // Módulo Documentos
    public DbSet<DocumentoInstitucional> DocumentosInstitucionales { get; set; }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── Beneficiario ─────────────────────────────────────────────────────
        mb.Entity<Beneficiario>(e =>
        {
            e.Property(b => b.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(b => b.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(b => b.FechaModificacion).HasDefaultValueSql("now()");
            e.HasIndex(b => b.NumeroDocumento).IsUnique().HasFilter("numero_documento IS NOT NULL");
            e.HasOne(b => b.TipoDocumento).WithMany().HasForeignKey(b => b.TipoDocumentoId);
            e.HasOne(b => b.Salud)
             .WithOne()
             .HasForeignKey<BeneficiarioSalud>(s => s.BeneficiarioId);
            e.HasMany(b => b.BeneficiarioAcudientes)
             .WithOne()
             .HasForeignKey(ba => ba.BeneficiarioId);
            e.HasMany(b => b.Tallas)
             .WithOne()
             .HasForeignKey(t => t.BeneficiarioId);
            e.HasMany(b => b.Alergias)
             .WithOne()
             .HasForeignKey(a => a.BeneficiarioId);
        });

        // ── BeneficiarioAcudiente ─────────────────────────────────────────────
        mb.Entity<BeneficiarioAcudiente>(e =>
        {
            e.Property(ba => ba.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(ba => ba.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(ba => ba.FechaModificacion).HasDefaultValueSql("now()");
            e.HasOne(ba => ba.Acudiente).WithMany().HasForeignKey(ba => ba.AcudienteId);
            e.HasOne(ba => ba.Parentesco).WithMany().HasForeignKey(ba => ba.ParentescoId);
        });

        // ── Acudiente ─────────────────────────────────────────────────────────
        mb.Entity<Acudiente>(e =>
        {
            e.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(a => a.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(a => a.FechaModificacion).HasDefaultValueSql("now()");
        });

        // ── BeneficiarioSalud ─────────────────────────────────────────────────
        mb.Entity<BeneficiarioSalud>(e =>
        {
            e.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(s => s.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(s => s.FechaModificacion).HasDefaultValueSql("now()");
            e.HasOne(s => s.Eps).WithMany().HasForeignKey(s => s.EpsId);
        });

        // ── AlergiasCatalogo ──────────────────────────────────────────────────
        mb.Entity<AlergiasCatalogo>(e =>
        {
            e.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(a => a.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(a => a.FechaModificacion).HasDefaultValueSql("now()");
        });

        // ── BeneficiarioAlergia ───────────────────────────────────────────────
        mb.Entity<BeneficiarioAlergia>(e =>
        {
            e.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(a => a.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(a => a.FechaModificacion).HasDefaultValueSql("now()");
            e.HasOne(a => a.Alergia).WithMany().HasForeignKey(a => a.AlergiaId);
        });

        // ── BeneficiarioTalla ─────────────────────────────────────────────────
        mb.Entity<BeneficiarioTalla>(e =>
        {
            e.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(t => t.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(t => t.FechaModificacion).HasDefaultValueSql("now()");
            e.Property(t => t.FechaMedicion).HasDefaultValueSql("CURRENT_DATE");
        });

        // ── Sede ─────────────────────────────────────────────────────────────
        mb.Entity<Sede>(e =>
        {
            e.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(s => s.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(s => s.FechaModificacion).HasDefaultValueSql("now()");
            e.HasMany(s => s.Programas).WithOne(p => p.Sede).HasForeignKey(p => p.SedeId);
        });

        // ── Programa ─────────────────────────────────────────────────────────
        mb.Entity<Programa>(e =>
        {
            e.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(p => p.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(p => p.FechaModificacion).HasDefaultValueSql("now()");
        });

        // ── Archivo ───────────────────────────────────────────────────────────
        mb.Entity<Archivo>(e =>
        {
            e.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(a => a.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(a => a.FechaModificacion).HasDefaultValueSql("now()");
            e.HasOne(a => a.TipoArchivo).WithMany().HasForeignKey(a => a.TipoArchivoId);
        });

        // ── DocumentoInstitucional ────────────────────────────────────────────
        mb.Entity<DocumentoInstitucional>(e =>
        {
            e.Property(d => d.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(d => d.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(d => d.FechaModificacion).HasDefaultValueSql("now()");
            e.HasIndex(d => d.Categoria);
            e.HasIndex(d => d.Activo);
        });

        // ── ProgramaCampo ─────────────────────────────────────────────────────
        mb.Entity<ProgramaCampo>(e =>
        {
            e.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(c => c.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(c => c.FechaModificacion).HasDefaultValueSql("now()");
            // Npgsql mapea string? → text automáticamente; se guarda como JSON para opciones
            e.HasOne(c => c.Programa).WithMany()
             .HasForeignKey(c => c.ProgramaId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(c => c.ProgramaId);
        });

        // ── Inscripcion ───────────────────────────────────────────────────────
        mb.Entity<Inscripcion>(e =>
        {
            e.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(i => i.FechaCreacion).HasDefaultValueSql("now()");
            e.Property(i => i.FechaModificacion).HasDefaultValueSql("now()");
            e.Property(i => i.FechaInscripcion).HasDefaultValueSql("now()");
            // Datos se mapea como string; PostgreSQL hace cast implícito text→jsonb
            e.HasOne(i => i.Beneficiario).WithMany().HasForeignKey(i => i.BeneficiarioId);
            e.HasOne(i => i.Programa).WithMany().HasForeignKey(i => i.ProgramaId);
            e.HasIndex(i => i.ProgramaId);
            e.HasIndex(i => i.BeneficiarioId);
        });
    }
}
