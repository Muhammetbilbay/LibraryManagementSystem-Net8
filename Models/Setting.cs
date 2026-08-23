using System;

namespace LibraryAPI.Models
{
    public class Setting
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public int MaxBorrowDays { get; set; } = 14;
        public decimal DailyPenaltyFee { get; set; } = 5.00m;
        public int MaxBooksLimit { get; set; } = 3;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
