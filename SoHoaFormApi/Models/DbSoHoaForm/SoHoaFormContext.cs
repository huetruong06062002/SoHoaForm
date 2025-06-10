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

    public virtual DbSet<Form> Forms { get; set; }

    public virtual DbSet<FormField> FormFields { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Submission> Submissions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer("Name=SoHoaFormConnectionString");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Form>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Form__3214EC077F307595");

            entity.ToTable("Form");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.WordFilePath).HasMaxLength(500);

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Forms)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Form__CreatedBy__2C3393D0");
        });

        modelBuilder.Entity<FormField>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__FormFiel__3214EC0721A58DEA");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.DefaultValue).HasMaxLength(255);
            entity.Property(e => e.FieldName).HasMaxLength(255);
            entity.Property(e => e.Formula).HasMaxLength(500);

            entity.HasOne(d => d.Form).WithMany(p => p.FormFields)
                .HasForeignKey(d => d.FormId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__FormField__FormI__300424B4");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Roles__3214EC07B8E46BE3");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.RoleName).HasMaxLength(50);
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Submissi__3214EC07A63DA6A7");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.SubmissionDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.HasOne(d => d.Form).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.FormId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Submissio__FormI__34C8D9D1");

            entity.HasOne(d => d.User).WithMany(p => p.Submissions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Submissio__UserI__35BCFE0A");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__User__3214EC07E6098666");

            entity.ToTable("User");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.Name).HasMaxLength(100);

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__User__RoleId__286302EC");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
