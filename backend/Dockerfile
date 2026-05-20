# ── Etapa 1: build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar solo .csproj primero para que Docker cachee el restore si no cambia ningún proyecto
COPY --link ["FundacionPanorama.API/FundacionPanorama.API.csproj",                     "FundacionPanorama.API/"]
COPY --link ["FundacionPanorama.Domain/FundacionPanorama.Domain.csproj",               "FundacionPanorama.Domain/"]
COPY --link ["FundacionPanorama.Application/FundacionPanorama.Application.csproj",     "FundacionPanorama.Application/"]
COPY --link ["FundacionPanorama.Infrastructure/FundacionPanorama.Infrastructure.csproj","FundacionPanorama.Infrastructure/"]
RUN dotnet restore "FundacionPanorama.API/FundacionPanorama.API.csproj"

COPY --link . .
WORKDIR "/src/FundacionPanorama.API"
RUN dotnet publish -c Release -o /app/publish \
    /p:UseAppHost=false \
    --no-restore

# ── Etapa 2: runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080

# Usuario sin privilegios para reducir superficie de ataque (Debian: groupadd/useradd)
RUN groupadd --system appgroup \
 && useradd  --system --gid appgroup --no-create-home appuser

COPY --from=build --chown=appuser:appgroup /app/publish .

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl --fail --silent http://localhost:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "FundacionPanorama.API.dll"]
