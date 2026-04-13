using FundacionPanorama.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FundacionPanorama.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Inscripcion> Inscripciones { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Inscripcion>(entity =>
        {
            entity.ToTable("inscripciones");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()");

            entity.HasIndex(e => e.NumeroDocumento)
                .IsUnique()
                .HasFilter("numero_documento IS NOT NULL");
        });
    }
}
