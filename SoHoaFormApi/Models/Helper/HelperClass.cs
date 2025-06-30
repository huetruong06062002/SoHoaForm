using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;

namespace SoHoaFormApi.Models.Helper
{
    public class HelperClass
    {



        public static bool IsValidJson(string jsonString)
        {
            if (string.IsNullOrWhiteSpace(jsonString))
                return false;

            try
            {
                System.Text.Json.JsonDocument.Parse(jsonString);
                return true;
            }
            catch
            {
                return false;
            }
        }

        // Helper methods
        public static int GetCategoryLevel(FormCategory category)
        {
            int level = 0;
            var current = category;
            while (current.ParentCategory != null)
            {
                level++;
                current = current.ParentCategory;
            }
            return level;
        }

        public static string GetCategoryPath(FormCategory category)
        {
            var path = new List<string>();
            var current = category;

            while (current != null)
            {
                path.Insert(0, current.CategoryName);
                current = current.ParentCategory;
            }

            return string.Join(" > ", path);
        }

        public static FormCategoryTreeDto BuildCategoryTree(FormCategory category, List<FormCategory> allCategories)
        {
            var children = allCategories.Where(c => c.ParentCategoryId == category.Id).ToList();

            return new FormCategoryTreeDto
            {
                Id = category.Id,
                CategoryName = category.CategoryName,
                ParentCategoryId = category.ParentCategoryId,
                Level = HelperClass.GetCategoryLevel(category),
                FormsCount = category.Forms.Count,
                HasChildren = children.Any(),
                Children = children.Select(child => BuildCategoryTree(child, allCategories)).ToList()
            };
        }

        // ✅ HELPER METHOD: Map User entity thành UserDto với đầy đủ thông tin roles
        public static UserDto MapToUserDto(User user)
        {
             var userRoles = user.UserRoles?.Select(ur => new UserRoleDto
    {
        RoleId = ur.RoleId ?? Guid.Empty,
        RoleName = ur.Role?.RoleName ?? "",
        AssignedAt = ur.DateCreated
    }).ToList() ?? new List<UserRoleDto>();

    var allRoleNames = userRoles.Select(ur => ur.RoleName).Where(name => !string.IsNullOrEmpty(name));

    return new UserDto
    {
        Id = user.Id,
        Name = user.Name,
        UserName = user.UserName ?? "",
        RoleId = user.RoleId, // Có thể null
        RoleName = user.Role?.RoleName ?? "Chưa gán role", // ✅ THAY ĐỔI: Hiển thị text khi chưa có role
        UserRoles = userRoles,
        CreatedAt = user.DateCreated,
        TotalRoles = userRoles.Count,
        AllRoleNames = allRoleNames.Any() ? string.Join(", ", allRoleNames) : "Chưa có role"
    };
        }
    }
}