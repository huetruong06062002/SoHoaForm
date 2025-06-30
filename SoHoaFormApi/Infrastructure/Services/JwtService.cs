using Microsoft.IdentityModel.Tokens;
using SoHoaFormApi.Models.DbSoHoaForm;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SoHoaFormApi.Infrastructure.Services
{
    public class JwtAuthService
    {
        private readonly string _key;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly SoHoaFormContext _context;

        public JwtAuthService(IConfiguration configuration, SoHoaFormContext context)
        {
            _key = configuration["jwt:Secret-Key"] ?? throw new ArgumentNullException("Secret-Key is missing");
            _issuer = configuration["jwt:Issuer"] ?? "";
            _audience = configuration["jwt:Audience"] ?? "";
            _context = context;
        }

        public string GenerateToken(User userLogin)
        {
            // Khóa bí mật để ký token
            var key = Encoding.ASCII.GetBytes(_key);
            
            // Tạo danh sách các claims cho token
            var claims = new List<Claim>
            {
                new Claim("UserName", userLogin.UserName ?? ""),
                new Claim("UserId", userLogin.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Sub, userLogin.UserName ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                new Claim("Name", userLogin.Name ?? "")
            };

            // Add role vào token
            var userRole = _context.Roles.FirstOrDefault(r => r.Id == userLogin.RoleId);
            if (userRole != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, userRole.RoleName));
                claims.Add(new Claim("RoleName", userRole.RoleName));
            }

            // Tạo khóa bí mật để ký token
            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature
            );

            // Thiết lập thông tin cho token
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(24), // Token hết hạn sau 24 giờ
                SigningCredentials = credentials,
                Issuer = _issuer,
                Audience = _audience,
            };

            // Tạo token bằng JwtSecurityTokenHandler
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            
            // Trả về chuỗi token đã mã hóa
            return tokenHandler.WriteToken(token);
        }

        public string DecodePayloadToken(string token)
        {
            try
            {
                // Kiểm tra token có null hoặc rỗng không
                if (string.IsNullOrEmpty(token))
                {
                    throw new ArgumentException("Token không được để trống", nameof(token));
                }

                // Tạo handler và đọc token
                var handler = new JwtSecurityTokenHandler();
                var jwtToken = handler.ReadJwtToken(token);

                // Lấy username từ claims
                var usernameClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "UserName");

                if (usernameClaim == null)
                {
                    throw new InvalidOperationException("Không tìm thấy username trong payload");
                }

                return usernameClaim.Value;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Lỗi khi decode token: {ex.Message}", ex);
            }
        }

        public ClaimsPrincipal? ValidateToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(_key);

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var userId = jwtToken.Claims.First(x => x.Type == "UserId").Value;
                
                return new ClaimsPrincipal(new ClaimsIdentity(jwtToken.Claims, "jwt"));
            }
            catch
            {
                return null;
            }
        }
    }
}