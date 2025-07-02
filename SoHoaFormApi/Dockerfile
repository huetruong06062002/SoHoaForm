FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

# Install Arial fonts và other essentials
RUN apt-get update && apt-get install -y \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    libgdiplus \
    && fc-cache -fv \
    && ln -sf /usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf /usr/share/fonts/truetype/liberation/Arial.ttf \
    && ln -sf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /usr/share/fonts/truetype/dejavu/Arial.ttf \
    && rm -rf /var/lib/apt/lists/*

# Set font environment for Arial
ENV FONTCONFIG_PATH=/etc/fonts
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
ENV DEFAULT_FONT_FAMILY="Liberation Sans"
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8


# Tạo thư mục uploads
RUN mkdir -p /app/uploads/forms

# Rest of your Dockerfile...
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

RUN echo "Available fonts:" && fc-list | grep -E "(Liberation|DejaVu|Noto)" | head -5
ENTRYPOINT ["dotnet", "SoHoaFormApi.dll"]