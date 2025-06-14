FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

# Tạo thư mục uploads
RUN mkdir -p /app/uploads/forms

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["SoHoaFormApi.csproj", "./"]
RUN dotnet restore "SoHoaFormApi.csproj"
COPY . .
RUN dotnet build "SoHoaFormApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SoHoaFormApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Set permissions cho uploads folder
RUN chmod -R 755 /app/uploads

ENTRYPOINT ["dotnet", "SoHoaFormApi.dll"]