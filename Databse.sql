-- Tạo database SoHoaForm
CREATE DATABASE SoHoaForm;
GO

-- Sử dụng database SoHoaForm
USE SoHoaForm;
GO

-- Create tabe Roles
CREATE TABLE Roles (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoleName NVARCHAR(50) NOT NULL
);
GO

-- Create tabe [User]
CREATE TABLE [User] (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100),
    RoleId UNIQUEIDENTIFIER NOT NULL,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);
GO

-- Create tabe Form
CREATE TABLE Form (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(255) NOT NULL,
    Category NVARCHAR(100),
    CreatedBy UNIQUEIDENTIFIER NOT NULL,
    WordFilePath NVARCHAR(500),
    Status NVARCHAR(50) NOT NULL,
    FOREIGN KEY (CreatedBy) REFERENCES [User](Id)
);
GO

-- Create tabe FormFields
CREATE TABLE FormFields (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FormId UNIQUEIDENTIFIER NOT NULL,
    FieldName NVARCHAR(255) NOT NULL,
    DefaultValue NVARCHAR(255),
    Formula NVARCHAR(500),
    FOREIGN KEY (FormId) REFERENCES Form(Id)
);
GO

-- Create tabe Submissions
CREATE TABLE Submissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FormId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    SubmissionDate DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (FormId) REFERENCES Form(Id),
    FOREIGN KEY (UserId) REFERENCES [User](Id)
);
GO

-- Insert data into Roles table
INSERT INTO Roles (Id, RoleName)
VALUES 
    (NEWID(), 'Admin'),
    (NEWID(), 'User');
GO

-- Insert data into [User] table
--CREATE AdminRoleId variant
DECLARE @AdminRoleId UNIQUEIDENTIFIER = (SELECT Id FROM Roles WHERE RoleName = 'Admin');
--CREATE UserRoleId variant
DECLARE @UserRoleId UNIQUEIDENTIFIER = (SELECT Id FROM Roles WHERE RoleName = 'User');

INSERT INTO [User] (Id, Name, RoleId)
VALUES 
    (NEWID(), '', @AdminRoleId),
    (NEWID(), '', @UserRoleId),
    (NEWID(), '', @UserRoleId);
GO

