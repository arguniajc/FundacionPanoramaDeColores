using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;

namespace FundacionPanorama.API.Services;

public class AuthService(IConfiguration config)
{
    public async Task<GoogleJsonWebSignature.Payload?> ValidarGoogleTokenAsync(string idToken)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [config["Google:ClientId"]]
            };
            return await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch { return null; }
    }

    public bool EsAdminBootstrap(string email)
    {
        var emails = config.GetSection("Admin:EmailsAutorizados").Get<string[]>() ?? [];
        return emails.Contains(email, StringComparer.OrdinalIgnoreCase);
    }

    public string GenerarJwt(string email, string nombre, string? avatarUrl, string rol)
    {
        var jwtKey = config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key no configurada.");
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name,  nombre),
            new Claim("avatar",         avatarUrl ?? ""),
            new Claim(ClaimTypes.Role,  rol),
        };

        var token = new JwtSecurityToken(
            issuer:             config["Jwt:Issuer"],
            audience:           config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(2),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
