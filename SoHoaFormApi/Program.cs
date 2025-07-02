using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Infrastructure.Services;
using SoHoaFormApi.Models.DbSoHoaForm;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Microsoft.OpenApi.Models;
using SoHoaFormApi.Infrastructure.Extensions;
using System.Runtime.InteropServices;

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

builder.Services.AddScoped<IPermissionsRepository, PermissionsRepository>();
builder.Services.AddScoped<IRoleCategoryPermissionRepository, RoleCategoryPermissionRepository>();
builder.Services.AddScoped<IRolePermissionsRepository, RolePermissionsRepository>();
builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();


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
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IRoleCategoryPermissionService, RoleCategoryPermissionService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IFormCategoryService, FormCategoryService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();



// Bật hỗ trợ toàn cục hóa (globalization)
if (builder.Environment.IsProduction())
{ Console.WriteLine("🚀 Production environment - Font setup...");

    // **THÊM: GDI+ support cho Linux**
    Environment.SetEnvironmentVariable("LC_ALL", "C.UTF-8");
    Environment.SetEnvironmentVariable("LANG", "C.UTF-8");
    Environment.SetEnvironmentVariable("FONTCONFIG_PATH", "/etc/fonts");
    
    // **SỬA: System.Drawing setup cho Linux**
    try
    {
        AppContext.SetSwitch("System.Drawing.EnableUnixSupport", true);
        AppContext.SetSwitch("System.Drawing.Common.EnableXPlatSupport", true);
        
        // **THÊM: Workaround cho GDI+ trên Docker Linux**
        var gdiWorkaround = Environment.GetEnvironmentVariable("DOTNET_SYSTEM_DRAWING_GRAPHICS_FACTORY");
        if (string.IsNullOrEmpty(gdiWorkaround))
        {
            Environment.SetEnvironmentVariable("DOTNET_SYSTEM_DRAWING_GRAPHICS_FACTORY", "skia");
        }
        
        Console.WriteLine("✅ GDI+ workaround applied");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ GDI+ setup warning: {ex.Message}");
    }

    // Kiểm tra fonts có sẵn
    var commonFonts = new[]
    {
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    };

    foreach (var font in commonFonts)
    {
        if (File.Exists(font))
        {
            Console.WriteLine($"✅ Found font: {font}");
        }
    }

    // **THÊM: Test GDI+ functionality**
    try
    {
        // Test basic System.Drawing operations
        using (var bitmap = new System.Drawing.Bitmap(1, 1))
        {
            Console.WriteLine("✅ System.Drawing operations working");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ System.Drawing test failed: {ex.Message}");
        Console.WriteLine("This may cause PDF generation issues with Spire.Doc");
    }

    // Test Vietnamese text support
    try
    {
        var vietnameseTest = "Tiếng Việt: áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệ ✓☐";
        Console.WriteLine($"🔤 Unicode test: {vietnameseTest}");
        Console.WriteLine("✅ Vietnamese font support initialized");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️ Vietnamese font warning: {ex.Message}");
    }

    Console.WriteLine("✅ Font setup completed");
    builder.WebHost.UseUrls("http://*:80");
}
else
{
    Console.WriteLine("🔧 Development environment");
    AppContext.SetSwitch("System.Drawing.EnableUnixSupport", true);
    AppContext.SetSwitch("System.Drawing.Common.EnableXPlatSupport", true);
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

app.UseHttpsRedirection();

// 🆕 Sử dụng Data Seeding Middleware
app.UseDataSeeding();


//CORS phải đặt trước Authentication
app.UseCors("allowOrigin");

if (builder.Environment.IsProduction())
{
    app.MapGet("/test-vietnamese-fonts", () =>
{
    try
    {
        var result = new
        {
            TestText = "Xin chào! Tiếng Việt: áàảãạ ✓☐",
            Environment = new
            {
                Locale = Environment.GetEnvironmentVariable("LC_ALL"),
                FontPath = Environment.GetEnvironmentVariable("FONTCONFIG_PATH"),
                Globalization = Environment.GetEnvironmentVariable("DOTNET_SYSTEM_GLOBALIZATION_INVARIANT")
            },
            Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Font test error: {ex.Message}");
    }
});
    app.MapGet("/debug-unicode-fonts", () =>
{
    var fontInfo = new
    {
        Environment = new
        {
            OS = RuntimeInformation.OSDescription,
            Locale = Environment.GetEnvironmentVariable("LC_ALL"),
            FontPath = Environment.GetEnvironmentVariable("FONTCONFIG_PATH"),
        },

        AvailableFonts = new
        {
            DejaVu = File.Exists("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            DejaVuBold = File.Exists("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            Liberation = File.Exists("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
            Noto = File.Exists("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
            NotoSymbols = File.Exists("/usr/share/fonts/truetype/noto/NotoSansSymbols-Regular.ttf"),
            Symbola = File.Exists("/usr/share/fonts/truetype/symbola/Symbola.ttf"),
            Unifont = File.Exists("/usr/share/fonts/truetype/unifont/unifont.ttf")
        },

        UnicodeSymbols = new
        {
            CheckboxChecked = "☑",
            CheckboxUnchecked = "☐",
            RadioSelected = "●",
            RadioUnselected = "○",
            OtherSymbols = "✓✗⚫⚪⬛⬜▣▢●○◉◯"
        },

        TestVietnamese = "Tiếng Việt: áàảãạăắằẳẵặâấầẩẫậéèẻẽẹ",

        FontCommands = new[]
        {
            "fc-list | grep -i dejavu",
            "fc-list | grep -i noto",
            "fc-list | grep -i symbol",
            "fc-cache -fv"
        }
    };

    return Results.Ok(fontInfo);
});
app.MapGet("/debug-gdi-plus", () =>
{
    try
    {
        var gdiInfo = new
        {
            Environment = new
            {
                OS = RuntimeInformation.OSDescription,
                Architecture = RuntimeInformation.OSArchitecture.ToString(),
                Framework = RuntimeInformation.FrameworkDescription,
                DotNetVersion = Environment.Version.ToString(),
                
                // GDI+ specific environment
                SystemDrawingFactory = Environment.GetEnvironmentVariable("DOTNET_SYSTEM_DRAWING_GRAPHICS_FACTORY"),
                XPlatSupport = AppContext.TryGetSwitch("System.Drawing.Common.EnableXPlatSupport", out var xplat) ? xplat : false,
                UnixSupport = AppContext.TryGetSwitch("System.Drawing.EnableUnixSupport", out var unix) ? unix : false,
            },

            SystemDrawingTest = TestSystemDrawing(),
            
            AvailableFonts = new
            {
                DejaVu = File.Exists("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                Liberation = File.Exists("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
                Noto = File.Exists("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
            },

            Libraries = new
            {
                LibGdi = File.Exists("/usr/lib/x86_64-linux-gnu/libgdiplus.so") || 
                        File.Exists("/usr/lib/libgdiplus.so") ||
                        File.Exists("/lib/x86_64-linux-gnu/libgdiplus.so"),
                
                // Check for common graphics libraries
                LibCairo = File.Exists("/usr/lib/x86_64-linux-gnu/libcairo.so.2"),
                LibFontconfig = File.Exists("/usr/lib/x86_64-linux-gnu/libfontconfig.so.1"),
            },

            TestResults = new
            {
                CanCreateBitmap = TestBitmapCreation(),
                CanUseFonts = TestFontOperations(),
                SpireDocCompatible = TestSpireDocCompatibility()
            }
        };

        return Results.Ok(gdiInfo);
    }
    catch (Exception ex)
    {
        return Results.Problem($"GDI+ debug error: {ex.Message}");
    }
});

// **THÊM: Test methods**
static object TestSystemDrawing()
{
    try
    {
        using var bitmap = new System.Drawing.Bitmap(1, 1);
        return new { Status = "Success", Message = "System.Drawing is working" };
    }
    catch (Exception ex)
    {
        return new { Status = "Failed", Message = ex.Message };
    }
}

static object TestBitmapCreation()
{
    try
    {
        using var bitmap = new System.Drawing.Bitmap(100, 100);
        using var graphics = System.Drawing.Graphics.FromImage(bitmap);
        graphics.Clear(System.Drawing.Color.White);
        return new { Status = "Success", Message = "Bitmap creation works" };
    }
    catch (Exception ex)
    {
        return new { Status = "Failed", Message = ex.Message };
    }
}

static object TestFontOperations()
{
    try
    {
        using var font = new System.Drawing.Font("Arial", 12);
        return new { Status = "Success", FontName = font.Name, Size = font.Size };
    }
    catch (Exception ex)
    {
        return new { Status = "Failed", Message = ex.Message };
    }
}

static object TestSpireDocCompatibility()
{
    try
    {
        // Test minimal Spire.Doc operation
        var doc = new Spire.Doc.Document();
        var section = doc.AddSection();
        var para = section.AddParagraph();
        para.AppendText("Test");
        
        return new { Status = "Success", Message = "Spire.Doc basic operations work" };
    }
    catch (Exception ex)
    {
        return new { Status = "Failed", Message = ex.Message };
    }
}
}

app.UseAuthentication(); // Authentication phải đặt trước Authorization
app.UseAuthorization();

app.MapControllers();



app.Run();