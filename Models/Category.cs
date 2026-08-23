using System;
using System.Collections.Generic;

namespace LibraryAPI.Models
{
    public class Category
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Book> Books { get; set; } = new List<Book>();
        public ICollection<BookCategory> BookCategories { get; set; } = new List<BookCategory>();
    }
}
