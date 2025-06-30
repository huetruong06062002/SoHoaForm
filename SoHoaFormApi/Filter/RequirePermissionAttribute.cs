using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

using System.Security.Claims;

namespace SoHoaFormApi.Infrastructure.Authorization
{
    // Attribute để check permission
    public class RequirePermissionAttribute : Attribute, IAuthorizationFilter
    {
        private readonly string _permission;

        public RequirePermissionAttribute(string permission)
        {
            _permission = permission;
        }

        public void OnAuthorization(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                context.Result = new UnauthorizedObjectResult(new
                {
                    StatusCode = 401,
                    Message = "Chưa đăng nhập",
                    DateTime = DateTime.Now
                });
                return;
            }

            var userNameClaim = user.FindFirst("UserName");
            if (userNameClaim == null)
            {
                context.Result = new UnauthorizedObjectResult(new
                {
                    StatusCode = 401,
                    Message = "Token không hợp lệ",
                    DateTime = DateTime.Now
                });
                return;
            }

            // Check permission trong database
            var unitOfWork = context.HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();
            var hasPermission = CheckUserPermissionAsync(unitOfWork, userNameClaim.Value, _permission).Result;

            if (!hasPermission)
            {
                context.Result = new ForbidResult();
                context.HttpContext.Response.StatusCode = 403;
                context.Result = new ObjectResult(new
                {
                    StatusCode = 403,
                    Message = $"Bạn không có quyền '{_permission}' để thực hiện hành động này",
                    DateTime = DateTime.Now
                });
            }
        }

        private async Task<bool> CheckUserPermissionAsync(IUnitOfWork unitOfWork, string userName, string permission)
        {
            try
            {
                var user = await unitOfWork._userRepository.GetUserWithRoleAndPermissionsAsync(userName);
                if (user?.Role?.RolePermissions == null) return false;

                return user.Role.RolePermissions.Any(rp => 
                    rp.Permission?.PermissionName == permission);
            }
            catch
            {
                return false;
            }
        }
    }

    // Attribute để check category permission
    public class RequireCategoryPermissionAttribute : Attribute, IAsyncAuthorizationFilter
    {
        private readonly string _parameterName;

        public RequireCategoryPermissionAttribute(string categoryIdParameterName = "categoryId")
        {
            _parameterName = categoryIdParameterName;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            // Lấy categoryId từ route parameters
            var categoryIdValue = context.RouteData.Values[_parameterName]?.ToString();
            if (!Guid.TryParse(categoryIdValue, out var categoryId))
            {
                context.Result = new BadRequestObjectResult(new
                {
                    StatusCode = 400,
                    Message = "CategoryId không hợp lệ",
                    DateTime = DateTime.Now
                });
                return;
            }

            var userNameClaim = user.FindFirst("UserName");
            if (userNameClaim == null)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var unitOfWork = context.HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();
            var hasAccess = await CheckCategoryAccessAsync(unitOfWork, userNameClaim.Value, categoryId);

            if (!hasAccess)
            {
                context.Result = new ObjectResult(new
                {
                    StatusCode = 403,
                    Message = "Bạn không có quyền truy cập category này",
                    DateTime = DateTime.Now
                })
                {
                    StatusCode = 403
                };
            }
        }

        private async Task<bool> CheckCategoryAccessAsync(IUnitOfWork unitOfWork, string userName, Guid categoryId)
        {
            try
            {
                var user = await unitOfWork._userRepository.GetUserWithRoleAndCategoryPermissionsAsync(userName);
                if (user?.Role?.RolePermissions == null) return false;

                return user.Role.RoleCategoryPermissions.Any(rcp => 
                    rcp.FormCategoryId == categoryId && rcp.CanAcess == true);
            }
            catch
            {
                return false;
            }
        }
    }

    // Attribute kết hợp cả permission và category 
    public class RequirePermissionAndCategoryAttribute : Attribute, IAsyncAuthorizationFilter
    {
        private readonly string _permission;
        private readonly string _formIdParameterName;

        public RequirePermissionAndCategoryAttribute(string permission, string formIdParameterName = "formId")
        {
            _permission = permission;
            _formIdParameterName = formIdParameterName;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var userNameClaim = user.FindFirst("UserName");
            if (userNameClaim == null)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var unitOfWork = context.HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();

            // 1. Check permission trước
            var hasPermission = await CheckPermissionAsync(unitOfWork, userNameClaim.Value, _permission);
            if (!hasPermission)
            {
                context.Result = new ObjectResult(new
                {
                    StatusCode = 403,
                    Message = $"Bạn không có quyền '{_permission}'",
                    DateTime = DateTime.Now
                })
                {
                    StatusCode = 403
                };
                return;
            }

            // 2. Lấy formId từ route và tìm categoryId của form đó
            var formIdValue = context.RouteData.Values[_formIdParameterName]?.ToString();
            if (!Guid.TryParse(formIdValue, out var formId))
            {
                context.Result = new BadRequestObjectResult(new
                {
                    StatusCode = 400,
                    Message = "FormId không hợp lệ",
                    DateTime = DateTime.Now
                });
                return;
            }

            // 3. Tìm categoryId của form
            var form = await unitOfWork._formRepository.GetFormWithCategoryAsync(formId);
            if (form == null)
            {
                context.Result = new NotFoundObjectResult(new
                {
                    StatusCode = 404,
                    Message = "Không tìm thấy form",
                    DateTime = DateTime.Now
                });
                return;
            }

            // 4. Check category access
            var hasCategoryAccess = await CheckCategoryAccessAsync(unitOfWork, userNameClaim.Value, form.CategoryId ?? Guid.Empty);
            if (!hasCategoryAccess)
            {
                context.Result = new ObjectResult(new
                {
                    StatusCode = 403,
                    Message = $"Bạn không có quyền truy cập category '{form.Category?.CategoryName}' của form này",
                    DateTime = DateTime.Now
                })
                {
                    StatusCode = 403
                };
            }
        }

        private async Task<bool> CheckPermissionAsync(IUnitOfWork unitOfWork, string userName, string permission)
        {
            try
            {
                var user = await unitOfWork._userRepository.GetUserWithRoleAndPermissionsAsync(userName);
                return user?.Role?.RolePermissions?.Any(rp => rp.Permission?.PermissionName == permission) ?? false;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> CheckCategoryAccessAsync(IUnitOfWork unitOfWork, string userName, Guid categoryId)
        {
            try
            {
                var user = await unitOfWork._userRepository.GetUserWithRoleAndCategoryPermissionsAsync(userName);
                
                // Nếu là admin thì có thể bypass category permission check
                if (user?.Role?.RoleName?.ToLower() == "admin")
                {
                    return true; // Admin có quyền truy cập tất cả categories
                }

                return user?.Role?.RoleCategoryPermissions?.Any(rcp => 
                    rcp.FormCategoryId == categoryId && rcp.CanAcess == true) ?? false;
            }
            catch
            {
                return false;
            }
        }
    }

    // Attribute mới: Chỉ cho phép admin HOẶC user có category permission
    public class RequirePermissionAndCategoryStrictAttribute : Attribute, IAsyncAuthorizationFilter
    {
        private readonly string _permission;
        private readonly string _formIdParameterName;

        public RequirePermissionAndCategoryStrictAttribute(string permission, string formIdParameterName = "formId")
        {
            _permission = permission;
            _formIdParameterName = formIdParameterName;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            
            if (!user.Identity?.IsAuthenticated ?? true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var userNameClaim = user.FindFirst("UserName");
            if (userNameClaim == null)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var unitOfWork = context.HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();

            // 1. Check permission trước
            var hasPermission = await CheckPermissionAsync(unitOfWork, userNameClaim.Value, _permission);
            if (!hasPermission)
            {
                context.Result = new ObjectResult(new
                {
                    StatusCode = 403,
                    Message = $"Bạn không có quyền '{_permission}'",
                    DateTime = DateTime.Now
                })
                {
                    StatusCode = 403
                };
                return;
            }

            // 2. Lấy formId từ route và tìm categoryId của form đó
            var formIdValue = context.RouteData.Values[_formIdParameterName]?.ToString();
            if (!Guid.TryParse(formIdValue, out var formId))
            {
                context.Result = new BadRequestObjectResult(new
                {
                    StatusCode = 400,
                    Message = "FormId không hợp lệ",
                    DateTime = DateTime.Now
                });
                return;
            }

            // 3. Tìm categoryId của form
            var form = await unitOfWork._formRepository.GetFormWithCategoryAsync(formId);
            if (form == null)
            {
                context.Result = new NotFoundObjectResult(new
                {
                    StatusCode = 404,
                    Message = "Không tìm thấy form",
                    DateTime = DateTime.Now
                });
                return;
            }

            // 4. STRICT: Check category access - KHÔNG bypass cho admin
            var hasCategoryAccess = await CheckCategoryAccessStrictAsync(unitOfWork, userNameClaim.Value, form.CategoryId ?? Guid.Empty);
            if (!hasCategoryAccess)
            {
                context.Result = new ObjectResult(new
                {
                    StatusCode = 403,
                    Message = $"Bạn không có quyền truy cập category '{form.Category?.CategoryName}' của form này. Admin cần được assign category permission trước.",
                    DateTime = DateTime.Now
                })
                {
                    StatusCode = 403
                };
            }
        }

        private async Task<bool> CheckPermissionAsync(IUnitOfWork unitOfWork, string userName, string permission)
        {
            try
            {
                var user = await unitOfWork._userRepository.GetUserWithRoleAndPermissionsAsync(userName);
                return user?.Role?.RolePermissions?.Any(rp => rp.Permission?.PermissionName == permission) ?? false;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> CheckCategoryAccessStrictAsync(IUnitOfWork unitOfWork, string userName, Guid categoryId)
        {
            try
            {
                var user = await unitOfWork._userRepository.GetUserWithRoleAndCategoryPermissionsAsync(userName);
                
                // STRICT: Không bypass cho ai cả, phải có category permission
                return user?.Role?.RoleCategoryPermissions?.Any(rcp => 
                    rcp.FormCategoryId == categoryId && rcp.CanAcess == true) ?? false;
            }
            catch
            {
                return false;
            }
        }
    }
}