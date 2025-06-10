using Microsoft.EntityFrameworkCore;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();


// Đọc connection string từ appsettings.json
var connectionString = builder.Configuration.GetConnectionString("SoHoaFormConnectionString");

//Kết nối db
// builder.Services.AddDbContext<>(options => 
//     options.UseLazyLoadingProxies(false).UseSqlServer(connectionString));


builder.Services.AddSwaggerGen();

builder.Services.AddCors(option =>
{
    option.AddPolicy("allowOrigin", policy =>
    {
        policy.WithOrigins("https://localhost:5200")
              .AllowAnyHeader() 
              .AllowAnyMethod() 
              .AllowCredentials(); 
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddAuthorization();
builder.Services.AddAuthentication(); 


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();
app.UseAuthentication();
app.MapControllers();
// Configure CORS
app.UseCors("allow_origin");

app.Run();
