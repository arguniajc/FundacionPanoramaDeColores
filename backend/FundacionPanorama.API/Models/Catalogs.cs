using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FundacionPanorama.API.Models;

[Table("cat_tipo_documento")]
public class CatTipoDocumento
{
    [Key, Column("id")]  public short  Id     { get; set; }
    [Column("codigo")]   public string Codigo { get; set; } = "";
    [Column("nombre")]   public string Nombre { get; set; } = "";
    [Column("activo")]   public bool   Activo { get; set; } = true;
}

[Table("cat_parentesco")]
public class CatParentesco
{
    [Key, Column("id")]  public short  Id     { get; set; }
    [Column("nombre")]   public string Nombre { get; set; } = "";
    [Column("activo")]   public bool   Activo { get; set; } = true;
}

[Table("cat_eps")]
public class CatEps
{
    [Key, Column("id")]  public short  Id     { get; set; }
    [Column("nombre")]   public string Nombre { get; set; } = "";
    [Column("activo")]   public bool   Activo { get; set; } = true;
}

[Table("cat_tipo_archivo")]
public class CatTipoArchivo
{
    [Key, Column("id")]  public short  Id     { get; set; }
    [Column("nombre")]   public string Nombre { get; set; } = "";
    [Column("activo")]   public bool   Activo { get; set; } = true;
}
