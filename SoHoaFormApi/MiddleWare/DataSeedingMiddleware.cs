using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SoHoaFormApi.Models.DbSoHoaForm;

namespace SoHoaFormApi.MiddleWare
{
    public class DataSeedingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<DataSeedingMiddleware> _logger;
        private static bool _isSeeded = false;
        private static readonly object _lock = new object();

        public DataSeedingMiddleware(RequestDelegate next, ILogger<DataSeedingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider)
        {
            // Chỉ seed một lần duy nhất khi ứng dụng khởi động
            if (!_isSeeded)
            {
                lock (_lock)
                {
                    if (!_isSeeded)
                    {
                        try
                        {
                            using var scope = serviceProvider.CreateScope();
                            var dbContext = scope.ServiceProvider.GetRequiredService<SoHoaFormContext>();
                            SeedBasicDataWithUsers(dbContext).Wait();
                            _isSeeded = true;
                            _logger.LogInformation("✅ Data seeding completed successfully");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "❌ Error occurred during data seeding");
                        }
                    }
                }
            }

            // Tiếp tục pipeline
            await _next(context);
        }

        private static async Task SeedBasicDataWithUsers(SoHoaFormContext context)
        {
            try
            {
                // Đảm bảo database được tạo
                await context.Database.EnsureCreatedAsync();

                // Kiểm tra xem đã có data chưa
                if (await context.Roles.AnyAsync())
                {
                    Console.WriteLine("ℹ️ Data already exists, skipping seeding");
                    return;
                }

                Console.WriteLine("🌱 Starting data seeding...");

                // 1️⃣ SEED ROLES
                var adminRole = new Role { Id = Guid.NewGuid(), RoleName = "admin", DateCreated = DateTime.Now };
                var userRole = new Role { Id = Guid.NewGuid(), RoleName = "user", DateCreated = DateTime.Now };
                var managerRole = new Role { Id = Guid.NewGuid(), RoleName = "manager", DateCreated = DateTime.Now };
                
                context.Roles.AddRange(adminRole, userRole, managerRole);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Roles seeded");

                // 2️⃣ SEED PERMISSIONS
                var permissions = new[]
                {
                    new Permission { Id = Guid.NewGuid(), PermissionName = "CREATE_FORM" },
                    new Permission { Id = Guid.NewGuid(), PermissionName = "EDIT_FORM" },
                    new Permission { Id = Guid.NewGuid(), PermissionName = "DELETE_FORM" },
                    new Permission { Id = Guid.NewGuid(), PermissionName = "VIEW_FORM" },
                    new Permission { Id = Guid.NewGuid(), PermissionName = "MANAGE_USERS" },
                    new Permission { Id = Guid.NewGuid(), PermissionName = "MANAGE_ROLES" },
                    new Permission { Id = Guid.NewGuid(), PermissionName = "EXPORT_PDF" }
                };
                context.Permissions.AddRange(permissions);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Permissions seeded");

                // 3️⃣ SEED ROLE PERMISSIONS
                // Admin có tất cả permissions
                var adminRolePermissions = permissions.Select(p => new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = adminRole.Id,
                    PermissionId = p.Id
                });
                context.RolePermissions.AddRange(adminRolePermissions);

                // Manager có một số permissions
                var managerPermissions = permissions.Where(p => new[] { 
                    "CREATE_FORM", "EDIT_FORM", "VIEW_FORM", "EXPORT_PDF" 
                }.Contains(p.PermissionName));
                var managerRolePermissions = managerPermissions.Select(p => new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = managerRole.Id,
                    PermissionId = p.Id
                });
                context.RolePermissions.AddRange(managerRolePermissions);

                // User chỉ có permissions cơ bản
                var userPermissions = permissions.Where(p => new[] { "VIEW_FORM", "EXPORT_PDF" }.Contains(p.PermissionName));
                var userRolePermissions = userPermissions.Select(p => new RolePermission
                {
                    Id = Guid.NewGuid(),
                    RoleId = userRole.Id,
                    PermissionId = p.Id
                });
                context.RolePermissions.AddRange(userRolePermissions);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Role Permissions seeded");

                // 4️⃣ SEED USERS (Chỉ có RoleId làm role chính, UserRole sẽ seed sau)
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    Name = "Administrator",
                    UserName = "admin",
                    PassWord = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    RoleId = adminRole.Id, // Role chính
                    DateCreated = DateTime.Now 
                };

                var managerUser = new User
                {
                    Id = Guid.NewGuid(),
                    Name = "Manager",
                    UserName = "manager",
                    PassWord = BCrypt.Net.BCrypt.HashPassword("manager123"),
                    RoleId = managerRole.Id, // Role chính
                    DateCreated = DateTime.Now 
                };

                var normalUser = new User
                {
                    Id = Guid.NewGuid(),
                    Name = "Normal User",
                    UserName = "user",
                    PassWord = BCrypt.Net.BCrypt.HashPassword("user123"),
                    RoleId = userRole.Id, // Role chính
                    DateCreated = DateTime.Now 
                };

                // User có nhiều roles
                var multiRoleUser = new User
                {
                    Id = Guid.NewGuid(),
                    Name = "Multi Role User",
                    UserName = "multirole",
                    PassWord = BCrypt.Net.BCrypt.HashPassword("multi123"),
                    RoleId = adminRole.Id, // Role chính là admin
                    DateCreated = DateTime.Now 
                };

                context.Users.AddRange(adminUser, managerUser, normalUser, multiRoleUser);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Users seeded");

                // 5️⃣ SEED USER ROLES (QUAN HỆ NHIỀU-NHIỀU)
                var userRoles = new[]
                {
                    // Admin user có role admin
                    new UserRole { Id = Guid.NewGuid(), RoleId = adminRole.Id, UserId = adminUser.Id, DateCreated = DateTime.Now },
                    
                    // Manager user có role manager
                    new UserRole { Id = Guid.NewGuid(), RoleId = managerRole.Id, UserId = managerUser.Id, DateCreated = DateTime.Now },
                    
                    // Normal user có role user
                    new UserRole { Id = Guid.NewGuid(), RoleId = userRole.Id, UserId = normalUser.Id, DateCreated = DateTime.Now },
                    
                    // Multi role user có nhiều roles
                    new UserRole { Id = Guid.NewGuid(), RoleId = adminRole.Id, UserId = multiRoleUser.Id, DateCreated = DateTime.Now },
                    new UserRole { Id = Guid.NewGuid(), RoleId = managerRole.Id, UserId = multiRoleUser.Id, DateCreated = DateTime.Now },
                    new UserRole { Id = Guid.NewGuid(), RoleId = userRole.Id, UserId = multiRoleUser.Id, DateCreated = DateTime.Now }
                };
                
                context.UserRoles.AddRange(userRoles);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ User Roles seeded");

                // 6️⃣ SEED FORM CATEGORIES (Optional)
                var formCategories = new[]
                {
                    new FormCategory 
                    { 
                        Id = Guid.NewGuid(), 
                        CategoryName = "Đơn xin nghỉ phép",
                        ParentCategoryId = null
                    },
                    new FormCategory 
                    { 
                        Id = Guid.NewGuid(), 
                        CategoryName = "Đơn xin tăng ca",
                        ParentCategoryId = null
                    }
                };
                context.FormCategories.AddRange(formCategories);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Form Categories seeded");

                // 7️⃣ SEED ROLE CATEGORY PERMISSIONS
                var roleCategoryPermissions = new List<RoleCategoryPermission>();
                foreach (var category in formCategories)
                {
                    // Admin có quyền trên tất cả categories
                    roleCategoryPermissions.Add(new RoleCategoryPermission
                    {
                        Id = Guid.NewGuid(),
                        RoleId = adminRole.Id,
                        FormCategoryId = category.Id,
                        CanAcess = true
                    });

                    // Manager có quyền trên tất cả categories
                    roleCategoryPermissions.Add(new RoleCategoryPermission
                    {
                        Id = Guid.NewGuid(),
                        RoleId = managerRole.Id,
                        FormCategoryId = category.Id,
                        CanAcess = true
                    });
                }
                context.RoleCategoryPermissions.AddRange(roleCategoryPermissions);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Role Category Permissions seeded");

                Console.WriteLine("🎉 Seeded all data successfully:");
                Console.WriteLine("👥 USERS:");
                Console.WriteLine("   - Admin: admin/admin123 (Role: admin)");
                Console.WriteLine("   - Manager: manager/manager123 (Role: manager)");
                Console.WriteLine("   - User: user/user123 (Role: user)");
                Console.WriteLine("   - Multi Role: multirole/multi123 (Roles: admin, manager, user)");
                Console.WriteLine("🎭 ROLES: admin, manager, user");
                Console.WriteLine("📁 CATEGORIES: Đơn xin nghỉ phép, Đơn xin tăng ca");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error seeding data: {ex.Message}");
                throw;
            }
        }
    }
}