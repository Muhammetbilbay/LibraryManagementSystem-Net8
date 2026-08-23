using System;
using System.Collections.Generic;

namespace LibraryAPI.Models
{
    public class Book
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = string.Empty;
        public string? Isbn { get; set; }
        public string? Description { get; set; }
        public int Stock { get; set; } = 0;
        public int TotalQuantity { get; set; } = 0;
        public string? ShelfPosition { get; set; }
        public int? PublicationYear { get; set; }

        public Guid? PublisherId { get; set; }
        public Publisher? Publisher { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; } // For soft deletes

        // Navigation properties
        public ICollection<Author> Authors { get; set; } = new List<Author>();
        public ICollection<BookAuthor> BookAuthors { get; set; } = new List<BookAuthor>();

        public ICollection<Category> Categories { get; set; } = new List<Category>();
        public ICollection<BookCategory> BookCategories { get; set; } = new List<BookCategory>();

        public ICollection<Borrowing> Borrowings { get; set; } = new List<Borrowing>();
        public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}
