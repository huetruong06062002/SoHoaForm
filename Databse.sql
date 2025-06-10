-- Tạo database SoHoaForm
CREATE DATABASE SoHoaForm;
GO

-- Sử dụng database SoHoaForm
USE SoHoaForm;
GO

-- Tạo bảng Roles
CREATE TABLE Roles (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RoleName NVARCHAR(50) NOT NULL
);
GO

-- Tạo bảng User
CREATE TABLE User (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    RoleId INT NOT NULL,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);
GO

-- Tạo bảng Form
CREATE TABLE Form (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(255) NOT NULL,
    Category NVARCHAR(100),
    CreatedBy INT NOT NULL,
    WordFilePath NVARCHAR(500),
    Status NVARCHAR(50) NOT NULL, -- Thay vì PublishStatus để ngắn gọn hơn
    FOREIGN KEY (CreatedBy) REFERENCES User(Id)
);
GO

-- Tạo bảng FormFields
CREATE TABLE FormFields (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FormId INT NOT NULL,
    FieldName NVARCHAR(255) NOT NULL,
    DefaultValue NVARCHAR(255),
    Formula NVARCHAR(500),
    FOREIGN KEY (FormId) REFERENCES Form(Id)
);
GO

-- Tạo bảng Submissions
CREATE TABLE Submissions (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FormId INT NOT NULL,
    UserId INT NOT NULL,
    SubmissionDate DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (FormId) REFERENCES Form(Id),
    FOREIGN KEY (UserId) REFERENCES User(Id)
);
GO
