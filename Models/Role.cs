using System;

namespace LibraryAPI.Models
{
    public class Role
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;

        // Navigation property for users
        public ICollection<User> Users { get; set; } = new List<User>();
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
