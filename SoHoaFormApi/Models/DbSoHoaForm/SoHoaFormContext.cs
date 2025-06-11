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

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserFillForm> UserFillForms { get; set; }

    public virtual DbSet<UserFillFormHistory> UserFillFormHistories { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer("Name=SoHoaFormConnectionString");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Field>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Field__3214EC073EC54C12");

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
            entity.HasKey(e => e.Id).HasName("PK__Form__3214EC07557125C8");

            entity.ToTable("Form");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.WordFilePath).HasMaxLength(255);

            entity.HasOne(d => d.Category).WithMany(p => p.Forms)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK__Form__CategoryId__2F10007B");

            entity.HasOne(d => d.User).WithMany(p => p.Forms)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Form__UserId__300424B4");
        });

        modelBuilder.Entity<FormCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__FormCate__3214EC07DB3748AA");

            entity.ToTable("FormCategory");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.CategoryName).HasMaxLength(100);
        });

        modelBuilder.Entity<FormField>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__FormFiel__3214EC076B0D8CEF");

            entity.ToTable("FormField");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Formula).HasMaxLength(255);

            entity.HasOne(d => d.Field).WithMany(p => p.FormFields)
                .HasForeignKey(d => d.FieldId)
                .HasConstraintName("FK__FormField__Field__398D8EEE");

            entity.HasOne(d => d.Form).WithMany(p => p.FormFields)
                .HasForeignKey(d => d.FormId)
                .HasConstraintName("FK__FormField__FormI__38996AB5");
        });

        modelBuilder.Entity<Pdf>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PDF__3214EC0762450987");

            entity.ToTable("PDF");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.PdfPath).HasMaxLength(255);

            entity.HasOne(d => d.UserFillForm).WithMany(p => p.Pdfs)
                .HasForeignKey(d => d.UserFillFormId)
                .HasConstraintName("FK__PDF__UserFillFor__4222D4EF");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Roles__3214EC07E21C66C5");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.RoleName).HasMaxLength(100);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__User__3214EC0717EC09DD");

            entity.ToTable("User");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Name).HasMaxLength(100);

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__User__RoleId__2B3F6F97");
        });

        modelBuilder.Entity<UserFillForm>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserFill__3214EC07D18C9D42");

            entity.ToTable("UserFillForm");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateTime).HasColumnType("datetime");
            entity.Property(e => e.JsonFieldValue).HasColumnName("json_field_value");
            entity.Property(e => e.Status).HasMaxLength(50);

            entity.HasOne(d => d.Form).WithMany(p => p.UserFillForms)
                .HasForeignKey(d => d.FormId)
                .HasConstraintName("FK__UserFillF__FormI__3D5E1FD2");

            entity.HasOne(d => d.User).WithMany(p => p.UserFillForms)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__UserFillF__UserI__3E52440B");
        });

        modelBuilder.Entity<UserFillFormHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserFill__3214EC0762ECC66B");

            entity.ToTable("UserFillFormHistory");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DateFill).HasColumnType("datetime");
            entity.Property(e => e.DateFinish).HasColumnType("datetime");
            entity.Property(e => e.DateWrite).HasColumnType("datetime");
            entity.Property(e => e.Status).HasMaxLength(50);

            entity.HasOne(d => d.UserFillForm).WithMany(p => p.UserFillFormHistories)
                .HasForeignKey(d => d.UserFillFormId)
                .HasConstraintName("FK__UserFillF__UserF__45F365D3");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
