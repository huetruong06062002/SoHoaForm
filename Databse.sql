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

-- Bảng UseRole
Create TABLE [UserRole] (
	Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
	RoleId UNIQUEIDENTIFIER,
	UserId UNIQUEIDENTIFIER,
	FOREIGN KEY (RoleId) REFERENCES Roles(Id),
	FOREIGN KEY (UserId) REFERENCES [User](Id)
)

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
)


-- Bảng Permissions
CREATE TABLE Permissions (
	 Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
	 PermissionName NVARCHAR(50)
)


-- Bảng RolePermission
CREATE TABLE RolePermission(
	Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
	RoleId UNIQUEIDENTIFIER,
	PermissionId UNIQUEIDENTIFIER,
	FOREIGN KEY (RoleId) REFERENCES Roles(Id),
	FOREIGN KEY (PermissionId) REFERENCES Permissions(Id),

)

-- Bảng RoleCategoryPermission
CREATE TABLE RoleCategoryPermission (
	Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
	RoleId UNIQUEIDENTIFIER,
	FormCategoryId UNIQUEIDENTIFIER,
	CanAcess BIT DEFAULT 0,
	FOREIGN KEY (RoleId) REFERENCES Roles(Id),
	FOREIGN KEY (FormCategoryId) REFERENCES FormCategory(Id),
)


ALTER TABLE FormCategory
ADD ParentCategoryId UNIQUEIDENTIFIER;



ALTER TABLE FormCategory
ADD FOREIGN KEY (ParentCategoryId) REFERENCES FormCategory(Id);


ALTER TABLE Form
ADD TimeExpired DATETIME;


ALTER TABLE [User]
ADD [UserName] NVARCHAR(50);

ALTER TABLE [User]
ADD [PassWord] NVARCHAR(255);


ALTER TABLE [Roles]
ADD [UserId] UNIQUEIDENTIFIER;



ALTER TABLE [Roles]
ADD [DateCreated] DateTime

ALTER TABLE [User]
ADD [DateCreated] DateTime

ALTER TABLE [UserRole]
ADD [DateCreated] DateTime


BEGIN TRANSACTION;

-- Bước 1: Xóa dữ liệu từ UserFillFormHistory
DELETE FROM UserFillFormHistory;

-- Bước 2: Xóa dữ liệu từ UserFillForm
DELETE FROM UserFillForm;

-- Bước 3: Xóa dữ liệu từ FormField
DELETE FROM FormField;

-- Bước 4: Xóa dữ liệu từ PDF
DELETE FROM PDF;

-- Bước 5: Xóa dữ liệu từ RolePermission
DELETE FROM RolePermission;

-- Bước 6: Xóa dữ liệu từ RoleCategoryPermission
DELETE FROM RoleCategoryPermission;

-- Bước 7: Xóa dữ liệu từ Form và FormField
DELETE FROM Form;
DELETE FROM FormField;

-- Bước 8: Xóa dữ liệu từ User
DELETE FROM [User];

-- Bước 9: Xóa dữ liệu từ Permissions
DELETE FROM Permissions;

-- Bước 10: Xóa dữ liệu từ Roles
DELETE FROM Roles;

-- Bước 11: Xóa dữ liệu từ UserRole
DELETE FROM UserRole


-- Kiểm tra nếu tất cả lệnh thành công, commit giao dịch
IF @@ERROR = 0
BEGIN
    COMMIT TRANSACTION;
    PRINT 'All data deleted successfully.';
END
ELSE
BEGIN
    ROLLBACK TRANSACTION;
    PRINT 'An error occurred. Transaction rolled back.';
END;



SELECT * FROM [FormField] WHERE FormId = '807eef00-f015-4e5a-b994-acec95bd2aba' 

SELECT f.Name 
FROM [Field] f
INNER JOIN [FormField] ff ON f.Id = ff.FieldId
INNER JOIN [Form] form ON ff.FormId = form.Id
WHERE form.Id = '807eef00-f015-4e5a-b994-acec95bd2aba'


CREATE PROCEDURE sp_DeleteFormAndRelatedData
    @FormId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Khai báo biến để chuyển đổi GUID thành string
        DECLARE @FormIdString NVARCHAR(50);
        SET @FormIdString = CAST(@FormId AS NVARCHAR(50));
        
        -- Lấy đường dẫn file Word trước khi xóa
        DECLARE @WordFilePath NVARCHAR(MAX);
        SELECT @WordFilePath = WordFilePath FROM Form WHERE Id = @FormId;
        
        -- Kiểm tra Form có tồn tại không
        IF NOT EXISTS (SELECT 1 FROM Form WHERE Id = @FormId)
        BEGIN
            -- Trả về error format giống success format
            SELECT 
                @FormId AS DeletedFormId,
                'Error' AS Status,
                'Form không tồn tại với ID: ' + @FormIdString AS Message,
                GETDATE() AS DeletedAt,
                0 AS PDFsDeleted,
                0 AS HistoriesDeleted,
                0 AS UserFillFormsDeleted,
                0 AS FormFieldsDeleted,
                0 AS FieldsDeleted,
                0 AS TotalAffectedRecords,
                NULL AS WordFilePath,
                404 AS ErrorNumber,
                16 AS ErrorSeverity,
                1 AS ErrorState;
            RETURN;
        END
        
        -- Khai báo biến đếm để tracking
        DECLARE @PDFCount INT = 0;
        DECLARE @HistoryCount INT = 0;
        DECLARE @UserFillFormCount INT = 0;
        DECLARE @FormFieldCount INT = 0;
        DECLARE @FieldCount INT = 0;
        
        -- Đếm số records sẽ bị xóa
        SELECT @PDFCount = COUNT(*) 
        FROM PDF 
        WHERE UserFillFormId IN (
            SELECT Id FROM UserFillForm WHERE FormId = @FormId
        );
        
        SELECT @HistoryCount = COUNT(*) 
        FROM UserFillFormHistory 
        WHERE UserFillFormId IN (
            SELECT Id FROM UserFillForm WHERE FormId = @FormId
        );
        
        SELECT @UserFillFormCount = COUNT(*) 
        FROM UserFillForm
        WHERE FormId = @FormId;
        
        SELECT @FormFieldCount = COUNT(*) 
        FROM FormField
        WHERE FormId = @FormId;
        
        -- Đếm Fields sẽ bị xóa (chỉ những Field không được dùng bởi Form khác)
        SELECT @FieldCount = COUNT(DISTINCT f.Id)
        FROM Field f
        INNER JOIN FormField ff ON f.Id = ff.FieldId
        WHERE ff.FormId = @FormId
        AND f.Id NOT IN (
            SELECT DISTINCT FieldId 
            FROM FormField 
            WHERE FormId != @FormId AND FieldId IS NOT NULL
        );
        
        -- 1. Xóa PDF files liên quan đến UserFillForm của Form này
        DELETE FROM PDF
        WHERE UserFillFormId IN (
            SELECT Id FROM UserFillForm WHERE FormId = @FormId
        );
        
        -- 2. Xóa UserFillFormHistory liên quan đến UserFillForm của Form này
        DELETE FROM UserFillFormHistory
        WHERE UserFillFormId IN (
            SELECT Id FROM UserFillForm WHERE FormId = @FormId
        );
        
        -- 3. Xóa UserFillForms của Form này
        DELETE FROM UserFillForm
        WHERE FormId = @FormId;
        
        -- 4. Xóa FormFields của Form này
        DELETE FROM FormField
        WHERE FormId = @FormId;
        
        -- 5. Xóa Fields chỉ thuộc về Form này (không được dùng bởi Form khác)
        DELETE FROM Field
        WHERE Id IN (
            SELECT f.Id
            FROM Field f
            INNER JOIN FormField ff ON f.Id = ff.FieldId
            WHERE ff.FormId = @FormId
            AND f.Id NOT IN (
                SELECT DISTINCT FieldId 
                FROM FormField 
                WHERE FormId != @FormId AND FieldId IS NOT NULL
            )
        );
        
        -- 6. Cuối cùng xóa Form
        DELETE FROM Form
        WHERE Id = @FormId;
        
        COMMIT TRANSACTION;
        
        -- Trả về thông tin thành công
        SELECT 
            @FormId AS DeletedFormId,
            'Success' AS Status,
            'Form và tất cả dữ liệu liên quan đã được xóa thành công' AS Message,
            GETDATE() AS DeletedAt,
            @PDFCount AS PDFsDeleted,
            @HistoryCount AS HistoriesDeleted,
            @UserFillFormCount AS UserFillFormsDeleted,
            @FormFieldCount AS FormFieldsDeleted,
            @FieldCount AS FieldsDeleted,
            (@PDFCount + @HistoryCount + @UserFillFormCount + @FormFieldCount + @FieldCount + 1) AS TotalAffectedRecords,
            @WordFilePath AS WordFilePath,
            NULL AS ErrorNumber,
            NULL AS ErrorSeverity,
            NULL AS ErrorState;
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        -- Trả về thông tin lỗi với format giống success
        SELECT 
            @FormId AS DeletedFormId,
            'Error' AS Status,
            ERROR_MESSAGE() AS Message,
            GETDATE() AS DeletedAt,
            0 AS PDFsDeleted,
            0 AS HistoriesDeleted,
            0 AS UserFillFormsDeleted,
            0 AS FormFieldsDeleted,
            0 AS FieldsDeleted,
            0 AS TotalAffectedRecords,
            NULL AS WordFilePath,
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_SEVERITY() AS ErrorSeverity,
            ERROR_STATE() AS ErrorState;
            
        THROW;
    END CATCH
END

DECLARE @TestFormId UNIQUEIDENTIFIER = 'f6d1bb13-c1d1-4c3d-8aad-56522a6b29e3';
EXEC sp_DeleteFormAndRelatedData @FormId = @TestFormId


DECLARE @NonExistFormId UNIQUEIDENTIFIER = NEWID();
EXEC sp_DeleteFormAndRelatedData @FormId = @NonExistFormId;