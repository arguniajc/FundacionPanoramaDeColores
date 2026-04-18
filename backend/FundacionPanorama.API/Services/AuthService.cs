// Valida tokens de Google OAuth y genera JWT internos para el panel admin.
// Los emails autorizados se configuran en appsettings bajo Admin:EmailsAutorizados.
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;

namespace FundacionPanorama.API.Services;

public class AuthService
{
    private readonly IConfiguration _config;

    public AuthService(IConfiguration config)
    {
        _config = config;
    }

    // Verifica el idToken con los servidores de Google. Retorna null si es inválido.
    public async Task<GoogleJsonWebSignature.Payload?> ValidarGoogleTokenAsync(string idToken)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _config["Google:ClientId"] }
            };
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return payload;
        }
        catch
        {
            return null;
        }
    }

    // Comprueba si el email está en la lista blanca de admins (appsettings).
    public bool EsEmailAutorizado(string email)
    {
        var emailsAutorizados = _config.GetSection("Admin:EmailsAutorizados").Get<string[]>() ?? Array.Empty<string>();
        return emailsAutorizados.Contains(email, StringComparer.OrdinalIgnoreCase);
    }

    // Genera un JWT firmado con HS256, válido 8 horas, que incluye email, nombre y rol Admin.
    public string GenerarJwt(string email, string nombre, string? avatarUrl)
    {
        var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key no configurada.");
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name,  nombre),
            new Claim("avatar",         avatarUrl ?? ""),
            new Claim(ClaimTypes.Role,  "Admin")
        };

        var token = new JwtSecurityToken(
            issuer:            _config["Jwt:Issuer"],
            audience:          _config["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
