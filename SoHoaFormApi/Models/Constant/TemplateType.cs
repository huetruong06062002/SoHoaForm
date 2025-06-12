namespace SoHoaFormApi.Models.Enums
{
    /// <summary>
    /// Enum định nghĩa các loại template form
    /// </summary>
    public enum TemplateType
    {
        /// <summary>
        /// Loại template không xác định hoặc chưa được nhận diện
        /// </summary>
        Unknown,

        /// <summary>
        /// Form đơn giản với các trường văn bản cơ bản theo layout dọc
        /// </summary>
        Simple,

        /// <summary>
        /// Form dạng bảng với dữ liệu có cấu trúc theo hàng và cột
        /// </summary>
        Table,

        /// <summary>
        /// Form đánh giá với chấm điểm, đánh giá năng lực và nhiều phân đoạn
        /// </summary>
        Assessment,

        /// <summary>
        /// Form hỗn hợp chứa cả trường văn bản và cấu trúc bảng
        /// </summary>
        Mixed
    }
}