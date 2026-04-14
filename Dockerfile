# ── Etapa 1: build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/FundacionPanorama.API/FundacionPanorama.API.csproj", "FundacionPanorama.API/"]
RUN dotnet restore "FundacionPanorama.API/FundacionPanorama.API.csproj"

COPY backend/ .
WORKDIR "/src/FundacionPanorama.API"
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ── Etapa 2: runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FundacionPanorama.API.dll"]
