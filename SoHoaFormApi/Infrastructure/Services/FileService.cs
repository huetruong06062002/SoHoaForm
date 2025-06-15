using System;
using System.IO;
using System.Threading.Tasks;

namespace SoHoaFormApi.Infrastructure.Services
{
    public interface IFileService
    {
        Task<bool> DeleteFileAsync(string filePath);
        bool FileExists(string filePath);
    }

    public class FileService : IFileService
    {
        public async Task<bool> DeleteFileAsync(string filePath)
        {
            try
            {
                if (string.IsNullOrEmpty(filePath))
                    return false;

                if (File.Exists(filePath))
                {
                    await Task.Run(() => File.Delete(filePath));
                    return true;
                }
                
                return false; // File không tồn tại
            }
            catch (Exception ex)
            {
                // Log error here if needed
                Console.WriteLine($"Error deleting file {filePath}: {ex.Message}");
                return false;
            }
        }

        public bool FileExists(string filePath)
        {
            try
            {
                return !string.IsNullOrEmpty(filePath) && File.Exists(filePath);
            }
            catch
            {
                return false;
            }
        }
    }
}