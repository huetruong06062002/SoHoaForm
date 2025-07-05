using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SoHoaFormApi.Models.DbSoHoaForm;
using SoHoaFormApi.Models.DTO;
using Spire.Doc;
using Spire.Doc.Documents;
using Spire.Doc.Fields;
using System.IO;

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

        public static void SetupUnicodeFonts(Spire.Doc.Document document)
        {
            try
            {
                Console.WriteLine("🔤 Setting up Unicode fonts for checkbox symbols...");

                // Font priority cho Unicode symbols
                var unicodeFonts = new[]
                {
            "Symbola",           // Chuyên dụng cho Unicode symbols
            "Noto Sans Symbols", // Google Noto fonts
            "DejaVu Sans",       // Có hỗ trợ Unicode tốt
            "Arial Unicode MS",  // Windows Unicode font
            "Segoe UI Symbol",   // Windows symbols
            "Liberation Sans"    // Fallback
        };

                string selectedFont = "DejaVu Sans"; // Default fallback

                // Test font availability
                foreach (var font in unicodeFonts)
                {
                    if (IsFontAvailable(font))
                    {
                        selectedFont = font;
                        Console.WriteLine($"✅ Selected Unicode font: {selectedFont}");
                        break;
                    }
                }

                // Apply font to entire document
                foreach (Section section in document.Sections)
                {
                    foreach (DocumentObject obj in section.Body.ChildObjects)
                    {
                        if (obj is Paragraph paragraph)
                        {
                            SetParagraphUnicodeFont(paragraph, selectedFont);
                        }
                        else if (obj is Table table)
                        {
                            SetTableUnicodeFont(table, selectedFont);
                        }
                    }
                }

                Console.WriteLine($"✅ Unicode fonts setup completed with: {selectedFont}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Unicode font setup warning: {ex.Message}");
            }
        }

        private static bool IsFontAvailable(string fontName)
        {
            try
            {
                // Simple check - trong production có thể dùng FontConfig API
                var fontPaths = new[]
                {
            $"/usr/share/fonts/truetype/{fontName.ToLower().Replace(" ", "")}",
            $"/usr/share/fonts/truetype/dejavu/{fontName}.ttf",
            $"/usr/share/fonts/truetype/liberation/{fontName}-Regular.ttf",
            $"/usr/share/fonts/truetype/noto/{fontName}-Regular.ttf",
            $"/System/Library/Fonts/{fontName}.ttf"
        };

                foreach (var path in fontPaths)
                {
                    if (File.Exists(path))
                    {
                        Console.WriteLine($"  ✅ Found font at: {path}");
                        return true;
                    }
                }

                Console.WriteLine($"  ❌ Font {fontName} not found");
                return false;
            }
            catch
            {
                return false;
            }
        }

        private static void SetParagraphUnicodeFont(Paragraph paragraph, string fontName)
        {
            foreach (DocumentObject childObj in paragraph.ChildObjects)
            {
                if (childObj is TextRange textRange)
                {
                    // Set multiple font names để ensure Unicode support
                    textRange.CharacterFormat.FontName = fontName;
                    textRange.CharacterFormat.FontNameAscii = fontName;
                    textRange.CharacterFormat.FontNameFarEast = fontName;
                    textRange.CharacterFormat.FontNameBidi = fontName;

                    // Ensure minimum readable size
                    if (textRange.CharacterFormat.FontSize < 10)
                        textRange.CharacterFormat.FontSize = 12;
                }
            }
        }

        private static void SetTableUnicodeFont(Table table, string fontName)
        {
            foreach (TableRow row in table.Rows)
            {
                foreach (TableCell cell in row.Cells)
                {
                    foreach (Paragraph cellPara in cell.Paragraphs)
                    {
                        SetParagraphUnicodeFont(cellPara, fontName);
                    }
                }
            }
        }

        public static bool ParseBooleanValue(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;

            var lowerValue = value.ToLower().Trim();

            return lowerValue == "true" ||
                   lowerValue == "1" ||
                   lowerValue == "yes" ||
                   lowerValue == "selected" ||
                   lowerValue == "checked" ||
                   (bool.TryParse(value, out var boolVal) && boolVal);
        }


    }



}