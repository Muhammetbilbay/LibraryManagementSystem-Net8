using System;
using System.Collections.Generic;

namespace LibraryAPI.Models
{
    public class Publisher
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public ICollection<Book> Books { get; set; } = new List<Book>();
    }
}
