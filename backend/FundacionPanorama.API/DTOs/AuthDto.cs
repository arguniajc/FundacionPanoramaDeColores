namespace FundacionPanorama.API.DTOs;

public class GoogleLoginDto
{
    public string IdToken { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}
