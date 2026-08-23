using Microsoft.EntityFrameworkCore;
using LibraryAPI.Models;

namespace LibraryAPI.Data
{
    public class LibraryDbContext : DbContext
    {
        public LibraryDbContext(DbContextOptions<LibraryDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Role> Roles { get; set; } = null!;
        public DbSet<UserRole> UserRoles { get; set; } = null!;
        public DbSet<Author> Authors { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<Publisher> Publishers { get; set; } = null!;
        public DbSet<Book> Books { get; set; } = null!;
        public DbSet<BookAuthor> BookAuthors { get; set; } = null!;
        public DbSet<BookCategory> BookCategories { get; set; } = null!;
        public DbSet<Borrowing> Borrowings { get; set; } = null!;
        public DbSet<Reservation> Reservations { get; set; } = null!;
        public DbSet<Review> Reviews { get; set; } = null!;
        public DbSet<Setting> Settings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Table name configurations (Sequelize uses quoted plurals by default)
            modelBuilder.Entity<User>().ToTable("Users");
            modelBuilder.Entity<Role>().ToTable("Roles");
            modelBuilder.Entity<UserRole>().ToTable("UserRoles");
            modelBuilder.Entity<Author>().ToTable("Authors");
            modelBuilder.Entity<Category>().ToTable("Categories");
            modelBuilder.Entity<Publisher>().ToTable("Publishers");
            modelBuilder.Entity<Book>().ToTable("Books");
            modelBuilder.Entity<BookAuthor>().ToTable("BookAuthors");
            modelBuilder.Entity<BookCategory>().ToTable("BookCategories");
            modelBuilder.Entity<Borrowing>().ToTable("Borrowings");
            modelBuilder.Entity<Reservation>().ToTable("Reservations");
            modelBuilder.Entity<Review>().ToTable("Reviews");
            modelBuilder.Entity<Setting>().ToTable("Settings");

            // Define column casing explicitly to match Sequelize (which keeps camelCase in quotes)
            
            // User Mapping
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
                entity.Property(e => e.Surname).HasColumnName("surname");
                entity.Property(e => e.Email).HasColumnName("email");
                entity.Property(e => e.Phone).HasColumnName("phone");
                entity.Property(e => e.MemberNo).HasColumnName("memberNo");
                entity.Property(e => e.Password).HasColumnName("password");
                entity.Property(e => e.DebtBalance).HasColumnName("debtBalance").HasColumnType("decimal(10,2)");
                entity.Property(e => e.ResetPasswordToken).HasColumnName("resetPasswordToken");
                entity.Property(e => e.ResetPasswordExpires).HasColumnName("resetPasswordExpires");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");

                // Many-to-Many using UserRole
                entity.HasMany(e => e.Roles)
                      .WithMany(r => r.Users)
                      .UsingEntity<UserRole>(
                          j => j.HasOne(ur => ur.Role).WithMany(r => r.UserRoles).HasForeignKey(ur => ur.RoleId),
                          j => j.HasOne(ur => ur.User).WithMany(u => u.UserRoles).HasForeignKey(ur => ur.UserId)
                      );
            });

            // Role Mapping
            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
            });

            // UserRole Mapping
            modelBuilder.Entity<UserRole>(entity =>
            {
                entity.HasKey(ur => new { ur.UserId, ur.RoleId });
                entity.Property(ur => ur.UserId).HasColumnName("userId");
                entity.Property(ur => ur.RoleId).HasColumnName("roleId");
            });

            // Author Mapping
            modelBuilder.Entity<Author>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
                entity.Property(e => e.Biography).HasColumnName("biography");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
            });

            // Category Mapping
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
            });

            // Publisher Mapping
            modelBuilder.Entity<Publisher>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Name).HasColumnName("name");
                entity.Property(e => e.Address).HasColumnName("address");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
            });

            // Book Mapping
            modelBuilder.Entity<Book>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.Title).HasColumnName("title");
                entity.Property(e => e.Isbn).HasColumnName("isbn");
                entity.Property(e => e.Description).HasColumnName("description");
                entity.Property(e => e.Stock).HasColumnName("stock");
                entity.Property(e => e.TotalQuantity).HasColumnName("totalQuantity");
                entity.Property(e => e.ShelfPosition).HasColumnName("shelfPosition");
                entity.Property(e => e.PublicationYear).HasColumnName("publicationYear");
                entity.Property(e => e.PublisherId).HasColumnName("publisherId");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
                entity.Property(e => e.DeletedAt).HasColumnName("deletedAt");

                // Global soft delete query filter
                entity.HasQueryFilter(b => b.DeletedAt == null);

                // Publisher relation
                entity.HasOne(e => e.Publisher)
                      .WithMany(p => p.Books)
                      .HasForeignKey(e => e.PublisherId)
                      .OnDelete(DeleteBehavior.SetNull);

                // Many-to-Many using BookAuthor
                entity.HasMany(e => e.Authors)
                      .WithMany(a => a.Books)
                      .UsingEntity<BookAuthor>(
                          j => j.HasOne(ba => ba.Author).WithMany(a => a.BookAuthors).HasForeignKey(ba => ba.AuthorId),
                          j => j.HasOne(ba => ba.Book).WithMany(b => b.BookAuthors).HasForeignKey(ba => ba.BookId)
                      );

                // Many-to-Many using BookCategory
                entity.HasMany(e => e.Categories)
                      .WithMany(c => c.Books)
                      .UsingEntity<BookCategory>(
                          j => j.HasOne(bc => bc.Category).WithMany(c => c.BookCategories).HasForeignKey(bc => bc.CategoryId),
                          j => j.HasOne(bc => bc.Book).WithMany(b => b.BookCategories).HasForeignKey(bc => bc.BookId)
                      );
            });

            // BookAuthor Mapping
            modelBuilder.Entity<BookAuthor>(entity =>
            {
                entity.HasKey(ba => new { ba.BookId, ba.AuthorId });
                entity.Property(ba => ba.BookId).HasColumnName("bookId");
                entity.Property(ba => ba.AuthorId).HasColumnName("authorId");
            });

            // BookCategory Mapping
            modelBuilder.Entity<BookCategory>(entity =>
            {
                entity.HasKey(bc => new { bc.BookId, bc.CategoryId });
                entity.Property(bc => bc.BookId).HasColumnName("bookId");
                entity.Property(bc => bc.CategoryId).HasColumnName("categoryId");
            });

            // Borrowing Mapping
            modelBuilder.Entity<Borrowing>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("userId");
                entity.Property(e => e.BookId).HasColumnName("bookId");
                entity.Property(e => e.BorrowedAt).HasColumnName("borrowedAt");
                entity.Property(e => e.DueAt).HasColumnName("dueAt");
                entity.Property(e => e.ReturnedAt).HasColumnName("returnedAt");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Borrowings)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Book)
                      .WithMany(b => b.Borrowings)
                      .HasForeignKey(e => e.BookId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Reservation Mapping
            modelBuilder.Entity<Reservation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("userId");
                entity.Property(e => e.BookId).HasColumnName("bookId");
                entity.Property(e => e.ReservedAt).HasColumnName("reservedAt");
                entity.Property(e => e.Status).HasColumnName("status");
                entity.Property(e => e.QueuePosition).HasColumnName("queuePosition");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Reservations)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Book)
                      .WithMany(b => b.Reservations)
                      .HasForeignKey(e => e.BookId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Review Mapping
            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("userId");
                entity.Property(e => e.BookId).HasColumnName("bookId");
                entity.Property(e => e.Rating).HasColumnName("rating");
                entity.Property(e => e.Comment).HasColumnName("comment");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Reviews)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Book)
                      .WithMany(b => b.Reviews)
                      .HasForeignKey(e => e.BookId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Setting Mapping
            modelBuilder.Entity<Setting>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.MaxBorrowDays).HasColumnName("maxBorrowDays");
                entity.Property(e => e.DailyPenaltyFee).HasColumnName("dailyPenaltyFee").HasColumnType("decimal(10,2)");
                entity.Property(e => e.MaxBooksLimit).HasColumnName("maxBooksLimit");
                entity.Property(e => e.CreatedAt).HasColumnName("createdAt");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
            });
        }
    }
}
