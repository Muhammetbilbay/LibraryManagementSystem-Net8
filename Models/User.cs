using System;
using System.Collections.Generic;

namespace LibraryAPI.Models
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string? Surname { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? MemberNo { get; set; }
        public string Password { get; set; } = string.Empty;
        public decimal DebtBalance { get; set; } = 0.00m;
        public string? ResetPasswordToken { get; set; }
        public DateTime? ResetPasswordExpires { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Role> Roles { get; set; } = new List<Role>();
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public ICollection<Borrowing> Borrowings { get; set; } = new List<Borrowing>();
        public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}
