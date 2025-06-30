using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SoHoaFormApi.Models.Constant
{
    public class PermissionConstants
    {
         // Form permissions
        public const string VIEW_FORM = "VIEW_FORM";
        public const string CREATE_FORM = "CREATE_FORM";
        public const string EDIT_FORM = "EDIT_FORM";
        public const string DELETE_FORM = "DELETE_FORM";

        // Admin permissions
        public const string MANAGE_USERS = "MANAGE_USERS";
        public const string MANAGE_ROLES = "MANAGE_ROLES";
        public const string MANAGE_PERMISSIONS = "MANAGE_PERMISSIONS";

        // Export permissions
        public const string EXPORT_PDF = "EXPORT_PDF";
        public const string EXPORT_EXCEL = "EXPORT_EXCEL";

        // Category permissions
        public const string MANAGE_CATEGORIES = "MANAGE_CATEGORIES";

        // System permissions
        public const string VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS";
        public const string SYSTEM_ADMIN = "SYSTEM_ADMIN";
    }
}