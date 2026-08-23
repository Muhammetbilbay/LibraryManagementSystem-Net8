using System;

namespace LibraryAPI.Models
{
    public class Reservation
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid BookId { get; set; }
        public Book? Book { get; set; }

        public DateTime ReservedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "pending"; // 'pending', 'fulfilled', 'cancelled'
        public int QueuePosition { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
