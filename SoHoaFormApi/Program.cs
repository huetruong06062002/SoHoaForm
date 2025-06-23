using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.DbSoHoaForm;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
Environment.SetEnvironmentVariable("TZ", "Asia/Ho_Chi_Minh");

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Đọc connection string từ appsettings.json
var connectionString = builder.Configuration.GetConnectionString("SoHoaFormConnectionString");

// Kết nối db
builder.Services.AddDbContext<SoHoaFormContext>(options =>
    options.UseLazyLoadingProxies(false).UseSqlServer(connectionString));


// Đăng ký các repository
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IFormRepository, FormRepository>();
builder.Services.AddScoped<IFormCategoryRepository, FormCategoryRepository>();
builder.Services.AddScoped<IFieldRepository, FieldRepository>();
builder.Services.AddScoped<IFormFieldRepository, FormFieldRepository>();
builder.Services.AddScoped<IPdfRepository, PdfRepository>();
builder.Services.AddScoped<IUserFillFormRepository, UserFillFormRepository>();
builder.Services.AddScoped<IUserFillFormHistoryRepository, UserFillFormHistoryRepository>();



//Đăng kí unit of work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
// Đăng ký Services
builder.Services.AddScoped<JwtAuthService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IWordReaderService, WordReaderService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IPdfExportService, PdfExportService>();

if (builder.Environment.IsProduction())
{
    // Font environment setup với Windows fonts đã có
    Environment.SetEnvironmentVariable("FONTCONFIG_PATH", "/etc/fonts");
    Environment.SetEnvironmentVariable("FONTCONFIG_FILE", "/etc/fonts/fonts.conf");
    Environment.SetEnvironmentVariable("DOTNET_SYSTEM_GLOBALIZATION_INVARIANT", "false");

    // .NET Drawing support
    AppContext.SetSwitch("System.Drawing.EnableUnixSupport", true);
    AppContext.SetSwitch("System.Drawing.Common.EnableXPlatSupport", true);

    // 🎯 WINDOWS FONTS CONFIGURATION - BẬT LẠI FONT DETECTION
    try
    {
        // Set Windows fonts làm default (KHÔNG bypass nữa vì đã có fonts)
        Environment.SetEnvironmentVariable("SPIRE_DEFAULT_FONT", "Arial");
        Environment.SetEnvironmentVariable("SPIRE_FALLBACK_FONTS", "Times New Roman;Calibri;DejaVu Sans");
        Environment.SetEnvironmentVariable("SPIRE_IGNORE_MISSING_FONTS", "false"); // Bật lại vì có fonts rồi
        
        // BỎ CÁC DÒNG BYPASS FONT - vì giờ có fonts rồi
        // Environment.SetEnvironmentVariable("SPIRE_DISABLE_FONT_VALIDATION", "true");
        // Environment.SetEnvironmentVariable("SPIRE_USE_SYSTEM_FONTS", "false");
        
        // Set font paths
        var fontPaths = new[]
        {
            "/usr/share/fonts/truetype/msttcorefonts",    // Microsoft Core Fonts - CHÍNH
            "/usr/share/fonts/truetype/dejavu",           // Backup
            "/usr/share/fonts/truetype/liberation",       // Backup
            "/usr/share/fonts/truetype/noto"              // Backup
        };
        
        Environment.SetEnvironmentVariable("SPIRE_FONT_PATH", string.Join(":", fontPaths));
        
        Console.WriteLine("✅ Windows fonts configuration completed with actual fonts");
        
        // Verify Arial font exists
        if (File.Exists("/usr/share/fonts/truetype/msttcorefonts/arial.ttf"))
        {
            Console.WriteLine("✅ Arial font confirmed at: /usr/share/fonts/truetype/msttcorefonts/arial.ttf");
        }
        
        if (File.Exists("/usr/share/fonts/truetype/msttcorefonts/times.ttf"))
        {
            Console.WriteLine("✅ Times New Roman font confirmed at: /usr/share/fonts/truetype/msttcorefonts/times.ttf");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Windows fonts configuration error: {ex.Message}");
    }

    // BỎ PHẦN FONT BYPASS SERVICE - vì giờ có fonts thật rồi
    /*
    builder.Services.Configure<Dictionary<string, object>>(options =>
    {
        options["FontBypass"] = true;
        options["MinimalFonts"] = true;
        options["IgnoreFontErrors"] = true;
    });
    */

    // Font cache refresh
    try
    {
        Console.WriteLine("🔄 Refreshing font cache with Windows fonts...");
        var process = new System.Diagnostics.Process()
        {
            StartInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "fc-cache",
                Arguments = "-fv",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };
        
        process.Start();
        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit(10000);
        
        if (process.ExitCode == 0)
        {
            Console.WriteLine("✅ Font cache refreshed successfully");
            Console.WriteLine($"📋 Fonts available: Arial, Times New Roman, Calibri");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Font cache refresh failed: {ex.Message}");
    }

    builder.WebHost.UseUrls("http://*:80");
}

// Cấu hình CORS
builder.Services.AddCors(option =>
{
    option.AddPolicy("allowOrigin", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development: Cho phép tất cả origins
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            // Production: Chỉ định cụ thể
            policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://157.66.100.51:3000",
                "http://157.66.100.51",
                "https://157.66.100.51:3000",
                "https://157.66.100.51")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Cấu hình JWT Authentication
var jwtSettings = builder.Configuration.GetSection("jwt");
var secretKey = jwtSettings["Secret-Key"]; // Sửa typo: Secret-Key thay vì Serect-Key
var issuer = jwtSettings["Issuer"];
var audience = jwtSettings["Audience"];

// Kiểm tra null
if (string.IsNullOrEmpty(secretKey))
{
    throw new ArgumentNullException("Secret-Key is missing in appsettings.json");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters()
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.Name,
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("UserOnly", policy => policy.RequireRole("user"));
});

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "SoHoaForm API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token vào ô bên dưới theo định dạng: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

async Task SeedBasicData(SoHoaFormContext context)
{
    // Seed Roles nếu chưa có
    if (!context.Roles.Any())
    {
        context.Roles.AddRange(
            new Role { Id = Guid.NewGuid(), RoleName = "admin" },
            new Role { Id = Guid.NewGuid(), RoleName = "user" }
        );
        await context.SaveChangesAsync();
    }
}

app.UseHttpsRedirection();

// Sửa thứ tự middleware - CORS phải đặt trước Authentication
app.UseCors("allowOrigin"); // Sửa tên policy cho đúng

app.UseAuthentication(); // Authentication phải đặt trước Authorization
app.UseAuthorization();

app.MapControllers();

app.Run();