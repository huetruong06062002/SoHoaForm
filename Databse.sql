-- Tạo database SoHoaForm
CREATE DATABASE SoHoaForm;
GO

-- Sử dụng database SoHoaForm
USE SoHoaForm;
GO

-- Bảng Roles
CREATE TABLE Roles (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoleName NVARCHAR(100) NOT NULL
);

-- Bảng FormCategory
CREATE TABLE FormCategory (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CategoryName NVARCHAR(100) NOT NULL
);

-- Bảng User
CREATE TABLE [User] (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    RoleId UNIQUEIDENTIFIER,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);

-- Bảng Form
CREATE TABLE Form (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    CategoryId UNIQUEIDENTIFIER,
    UserId UNIQUEIDENTIFIER,
    WordFilePath NVARCHAR(255),
    Status NVARCHAR(50),
    CreatedAt DATETIME,
    FOREIGN KEY (CategoryId) REFERENCES FormCategory(Id),
    FOREIGN KEY (UserId) REFERENCES [User](Id)
);

-- Bảng Field
CREATE TABLE Field (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Type NVARCHAR(50),
    Description NVARCHAR(255),
    IsRequired BIT DEFAULT 0,
    IsUpperCase BIT DEFAULT 0
);

-- Bảng FormField
CREATE TABLE FormField (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FormId UNIQUEIDENTIFIER,
    FieldId UNIQUEIDENTIFIER,
    Formula NVARCHAR(255),
    FOREIGN KEY (FormId) REFERENCES Form(Id),
    FOREIGN KEY (FieldId) REFERENCES Field(Id)
);

-- Bảng UserFillForm
CREATE TABLE UserFillForm (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FormId UNIQUEIDENTIFIER,
    UserId UNIQUEIDENTIFIER,
    json_field_value NVARCHAR(MAX),
    Status NVARCHAR(50),
    DateTime DATETIME,
    FOREIGN KEY (FormId) REFERENCES Form(Id),
    FOREIGN KEY (UserId) REFERENCES [User](Id)
);

-- Bảng PDF
CREATE TABLE PDF (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserFillFormId UNIQUEIDENTIFIER,
    PdfPath NVARCHAR(255),
    FOREIGN KEY (UserFillFormId) REFERENCES UserFillForm(Id)
);

-- Bảng UserFillFormHistory
CREATE TABLE UserFillFormHistory (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserFillFormId UNIQUEIDENTIFIER,
    DateFill DATETIME,
    DateWrite DATETIME,
    DateFinish DATETIME,
    Status NVARCHAR(50),
    FOREIGN KEY (UserFillFormId) REFERENCES UserFillForm(Id)
);



BEGIN TRANSACTION;
DELETE FROM [Form];
DELETE FROM [FormCategory];
COMMIT TRANSACTION;


BEGIN TRANSACTION;
-- Delete from dependent tables first


DELETE FROM [FormField];
DELETE FROM [Form];
-- Delete from reference tables last
DELETE FROM [Field];
DELETE FROM [FormCategory];
COMMIT TRANSACTION;


SELECT * FROM [FormField] WHERE FormId = '807eef00-f015-4e5a-b994-acec95bd2aba' 

SELECT f.Name 
FROM [Field] f
INNER JOIN [FormField] ff ON f.Id = ff.FieldId
INNER JOIN [Form] form ON ff.FormId = form.Id
WHERE form.Id = '807eef00-f015-4e5a-b994-acec95bd2aba'




              
