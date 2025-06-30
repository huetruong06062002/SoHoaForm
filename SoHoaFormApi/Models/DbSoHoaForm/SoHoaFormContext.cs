using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace SoHoaFormApi.Models.DbSoHoaForm;

public partial class SoHoaFormContext : DbContext
{
    public SoHoaFormContext()
    {
    }

    public SoHoaFormContext(DbContextOptions<SoHoaFormContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Field> Fields { get; set; }

    public virtual DbSet<Form> Forms { get; set; }

    public virtual DbSet<FormCategory> FormCategories { get; set; }

    public virtual DbSet<FormField> FormFields { get; set; }

    public virtual DbSet<Pdf> Pdfs { get; set; }

    public virtual DbSet<Permission> Permissions { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<RoleCategoryPermission> RoleCategoryPermissions { get; set; }

    public virtual DbSet<RolePermission> RolePermissions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserFillForm> UserFillForms { get; set; }

    public virtual DbSet<UserFillFormHistory> UserFillFormHistories { get; set; }

    public virtual DbSet<UserRole> UserRoles { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer("Name=SoHoaFormConnectionString");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Field>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Field__3214EC0740E2F5FF");

            entity.ToTable("Field");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.IsRequired).HasDefaultValue(false);
            entity.Property(e => e.IsUpperCase).HasDefaultValue(false);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Type).HasMaxLength(50);
        });

        modelBuilder.Entity<Form>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Form__3214EC07E6841332");

            entity.ToTable("Form");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.TimeExpired).HasColumnType("datetime");
            entity.Property(e => e.WordFilePath).HasMaxLength(255);

            entity.HasOne(d => d.Category).WithMany(p => p.Forms)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK__Form__CategoryId__5165187F");

            entity.HasOne(d => d.User).WithMany(p => p.Forms)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Form__UserId__52593CB8");
        });

        modelBuilder.Entity<FormCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__FormCate__3214EC070E77DA07");

            entity.ToTable("FormCategory");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CategoryName).HasMaxLength(100);

            entity.HasOne(d => d.ParentCategory).WithMany(p => p.InverseParentCategory)
                .HasForeignKey(d => d.ParentCategoryId)
                .HasConstraintName("FK__FormCateg__Paren__72C60C4A");
        });

        modelBuilder.Entity<FormField>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__FormFiel__3214EC07623CB06E");

            entity.ToTable("FormField");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Formula).HasMaxLength(255);

            entity.HasOne(d => d.Field).WithMany(p => p.FormFields)
                .HasForeignKey(d => d.FieldId)
                .HasConstraintName("FK__FormField__Field__5441852A");

            entity.HasOne(d => d.Form).WithMany(p => p.FormFields)
                .HasForeignKey(d => d.FormId)
                .HasConstraintName("FK__FormField__FormI__534D60F1");
        });

        modelBuilder.Entity<Pdf>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PDF__3214EC077F27F791");

            entity.ToTable("PDF");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.PdfPath).HasMaxLength(255);

            entity.HasOne(d => d.UserFillForm).WithMany(p => p.Pdfs)
                .HasForeignKey(d => d.UserFillFormId)
                .HasConstraintName("FK__PDF__UserFillFor__5535A963");
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Permissi__3214EC073DEF414E");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.PermissionName).HasMaxLength(50);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Roles__3214EC078BA9DA1E");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateCreated).HasColumnType("datetime");
            entity.Property(e => e.RoleName).HasMaxLength(100);
        });

        modelBuilder.Entity<RoleCategoryPermission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__RoleCate__3214EC0720264DA8");

            entity.ToTable("RoleCategoryPermission");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CanAcess).HasDefaultValue(false);

            entity.HasOne(d => d.FormCategory).WithMany(p => p.RoleCategoryPermissions)
                .HasForeignKey(d => d.FormCategoryId)
                .HasConstraintName("FK__RoleCateg__FormC__00200768");

            entity.HasOne(d => d.Role).WithMany(p => p.RoleCategoryPermissions)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__RoleCateg__RoleI__7F2BE32F");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__RolePerm__3214EC070A1596BF");

            entity.ToTable("RolePermission");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.Permission).WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.PermissionId)
                .HasConstraintName("FK__RolePermi__Permi__7A672E12");

            entity.HasOne(d => d.Role).WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__RolePermi__RoleI__797309D9");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__User__3214EC07963D8E92");

            entity.ToTable("User");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateCreated).HasColumnType("datetime");
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.PassWord).HasMaxLength(255);
            entity.Property(e => e.UserName).HasMaxLength(50);

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__User__RoleId__5629CD9C");
        });

        modelBuilder.Entity<UserFillForm>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserFill__3214EC0708622732");

            entity.ToTable("UserFillForm");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateTime).HasColumnType("datetime");
            entity.Property(e => e.JsonFieldValue).HasColumnName("json_field_value");
            entity.Property(e => e.Status).HasMaxLength(50);

            entity.HasOne(d => d.Form).WithMany(p => p.UserFillForms)
                .HasForeignKey(d => d.FormId)
                .HasConstraintName("FK__UserFillF__FormI__571DF1D5");

            entity.HasOne(d => d.User).WithMany(p => p.UserFillForms)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__UserFillF__UserI__5812160E");
        });

        modelBuilder.Entity<UserFillFormHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserFill__3214EC073A42A57F");

            entity.ToTable("UserFillFormHistory");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateFill).HasColumnType("datetime");
            entity.Property(e => e.DateFinish).HasColumnType("datetime");
            entity.Property(e => e.DateWrite).HasColumnType("datetime");
            entity.Property(e => e.Status).HasMaxLength(50);

            entity.HasOne(d => d.UserFillForm).WithMany(p => p.UserFillFormHistories)
                .HasForeignKey(d => d.UserFillFormId)
                .HasConstraintName("FK__UserFillF__UserF__59063A47");
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserRole__3214EC07515B9F32");

            entity.ToTable("UserRole");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateCreated).HasColumnType("datetime");

            entity.HasOne(d => d.Role).WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__UserRole__RoleId__03F0984C");

            entity.HasOne(d => d.User).WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__UserRole__UserId__04E4BC85");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
