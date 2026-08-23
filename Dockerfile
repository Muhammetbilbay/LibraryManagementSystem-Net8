# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy csproj and restore dependencies
COPY LibraryAPI.csproj ./
RUN dotnet restore

# Copy all files and build release
COPY . ./
RUN dotnet publish -c Release -o out

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-env /app/out .

# Configure ASP.NET Core to run on port 5000 to match existing port
ENV ASPNETCORE_HTTP_PORTS=5000
ENV ASPNETCORE_ENVIRONMENT=Development

EXPOSE 5000

ENTRYPOINT ["dotnet", "LibraryAPI.dll"]
