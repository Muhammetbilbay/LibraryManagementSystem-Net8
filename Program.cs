using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using LibraryAPI.Data;
using LibraryAPI.Models;
using LibraryAPI.Controllers;

var builder = WebApplication.CreateBuilder(args);

// Configure DB Connection String from Environment Variables (matching docker-compose)
var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "library_user";
var dbPass = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "library_password";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "library_management";

var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPass};Include Error Detail=true";

builder.Services.AddDbContext<LibraryDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add services to the container.
builder.Services.AddControllers();

// Configure CORS to allow frontend communication
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "super_secret_key_123456_longer_version_to_prevent_errors_if_possible";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

var app = builder.Build();

// Enable CORS
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Database initialization and seeding
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<LibraryDbContext>();
    try
    {
        Console.WriteLine("Dropping database and applying schema sync...");
        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();

        Console.WriteLine("Seeding Database...");
        
        // 1. Seed System Settings
        var setting = new Setting
        {
            MaxBorrowDays = 14,
            DailyPenaltyFee = 5.00m,
            MaxBooksLimit = 3,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Settings.Add(setting);

        // 2. Seed Roles
        var adminRole = new Role { Name = "ADMIN" };
        var staffRole = new Role { Name = "STAFF" };
        var userRole = new Role { Name = "USER" };
        context.Roles.AddRange(adminRole, staffRole, userRole);
        await context.SaveChangesAsync();

        // 3. Seed Users
        var hashedAdminPassword = BCrypt.Net.BCrypt.HashPassword("admin123", 10);
        var hashedStaffPassword = BCrypt.Net.BCrypt.HashPassword("staff123", 10);
        var hashedUserPassword = BCrypt.Net.BCrypt.HashPassword("user123", 10);

        var adminUser = new User
        {
            Name = "Kemal",
            Surname = "Yılmaz",
            Email = "admin@library.com",
            Phone = "+905555555555",
            MemberNo = "ADM001",
            Password = hashedAdminPassword,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var staffUser = new User
        {
            Name = "Ayşe",
            Surname = "Demir",
            Email = "staff@library.com",
            Phone = "+905555555556",
            MemberNo = "STF001",
            Password = hashedStaffPassword,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var standardUser = new User
        {
            Name = "Muhammet",
            Surname = "Bilbay",
            Email = "user@library.com",
            Phone = "+905555555557",
            MemberNo = "STD101",
            Password = hashedUserPassword,
            DebtBalance = 15.50m,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.AddRange(adminUser, staffUser, standardUser);
        await context.SaveChangesAsync();

        // Assign Roles
        context.UserRoles.AddRange(
            new UserRole { UserId = adminUser.Id, RoleId = adminRole.Id },
            new UserRole { UserId = staffUser.Id, RoleId = staffRole.Id },
            new UserRole { UserId = standardUser.Id, RoleId = userRole.Id }
        );
        await context.SaveChangesAsync();

        // 4. Seed Authors
        var auth1 = new Author { Name = "Mustafa Kemal Atatürk", Biography = "Türkiye Cumhuriyeti'nin kurucusu." };
        var auth2 = new Author { Name = "Sabahattin Ali", Biography = "Türk yazar, şair ve gazeteci." };
        var auth3 = new Author { Name = "Reşat Nuri Güntekin", Biography = "Çalıkuşu romanının ünlü yazarı." };
        var auth4 = new Author { Name = "Yaşar Kemal", Biography = "İnce Memed destanının dünyaca ünlü yazarı." };
        var auth5 = new Author { Name = "Peyami Safa", Biography = "Dokuzuncu Hariciye Koğuşu yazarı." };
        context.Authors.AddRange(auth1, auth2, auth3, auth4, auth5);

        // 5. Seed Categories
        var cat1 = new Category { Name = "Edebiyat Klasikleri" };
        var cat2 = new Category { Name = "Psikoloji" };
        var cat3 = new Category { Name = "Roman" };
        var cat4 = new Category { Name = "Tarih" };
        context.Categories.AddRange(cat1, cat2, cat3, cat4);

        // 6. Seed Publishers
        var pub1 = new Publisher { Name = "Yapı Kredi Yayınları", Address = "İstanbul, TR" };
        var pub2 = new Publisher { Name = "Can Yayınları", Address = "İstanbul, TR" };
        var pub3 = new Publisher { Name = "İletişim Yayınları", Address = "İstanbul, TR" };
        var pub4 = new Publisher { Name = "Destek Yayınları", Address = "İstanbul, TR" };
        context.Publishers.AddRange(pub1, pub2, pub3, pub4);
        await context.SaveChangesAsync();

        // 7. Seed Books (Turkish classics)
        var book1 = new Book
        {
            Title = "Nutuk",
            Isbn = "9789751601612",
            Description = "Atatürk'ün 1919-1927 yılları arasındaki dönemi anlattığı tarihi eser.",
            Stock = 5,
            TotalQuantity = 5,
            ShelfPosition = "A-01",
            PublicationYear = 1927,
            PublisherId = pub1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var book2 = new Book
        {
            Title = "Kürk Mantolu Madonna",
            Isbn = "9789753638029",
            Description = "Sabahattin Ali'nin derin psikolojik tahliller içeren başyapıt romanı.",
            Stock = 3,
            TotalQuantity = 4,
            ShelfPosition = "B-12",
            PublicationYear = 1943,
            PublisherId = pub1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var book3 = new Book
        {
            Title = "Çalıkuşu",
            Isbn = "9789751002587",
            Description = "Feride adında idealist bir öğretmen kızın Anadolu'daki yaşam mücadelesi.",
            Stock = 2,
            TotalQuantity = 2,
            ShelfPosition = "B-15",
            PublicationYear = 1922,
            PublisherId = pub2.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var book4 = new Book
        {
            Title = "İnce Memed",
            Isbn = "9789750807143",
            Description = "Yaşar Kemal'in Çukurova'daki eşkıyalık düzenini anlattığı destansı romanı.",
            Stock = 0, // Set to 0 so standard user has to reserve it
            TotalQuantity = 3,
            ShelfPosition = "C-04",
            PublicationYear = 1955,
            PublisherId = pub3.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var book5 = new Book
        {
            Title = "Dokuzuncu Hariciye Koğuşu",
            Isbn = "9789754370508",
            Description = "Peyami Safa'nın otobiyografik nitelikteki psikolojik tahlil romanı.",
            Stock = 4,
            TotalQuantity = 4,
            ShelfPosition = "C-08",
            PublicationYear = 1930,
            PublisherId = pub4.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Books.AddRange(book1, book2, book3, book4, book5);
        await context.SaveChangesAsync();

        // Assign Book Authors
        context.BookAuthors.AddRange(
            new BookAuthor { BookId = book1.Id, AuthorId = auth1.Id },
            new BookAuthor { BookId = book2.Id, AuthorId = auth2.Id },
            new BookAuthor { BookId = book3.Id, AuthorId = auth3.Id },
            new BookAuthor { BookId = book4.Id, AuthorId = auth4.Id },
            new BookAuthor { BookId = book5.Id, AuthorId = auth5.Id }
        );

        // Assign Book Categories
        context.BookCategories.AddRange(
            new BookCategory { BookId = book1.Id, CategoryId = cat4.Id }, // Nutuk -> Tarih
            new BookCategory { BookId = book2.Id, CategoryId = cat2.Id }, // Madonna -> Psikoloji
            new BookCategory { BookId = book2.Id, CategoryId = cat3.Id }, // Madonna -> Roman
            new BookCategory { BookId = book3.Id, CategoryId = cat3.Id }, // Çalıkuşu -> Roman
            new BookCategory { BookId = book4.Id, CategoryId = cat3.Id }, // İnce Memed -> Roman
            new BookCategory { BookId = book5.Id, CategoryId = cat2.Id }  // Dokuzuncu -> Psikoloji
        );
        await context.SaveChangesAsync();

        // 8. Seed Borrowing Records for Trend & Leaderboards
        var date1 = DateTime.UtcNow.AddDays(-10);
        var date2 = DateTime.UtcNow.AddDays(-5);

        // Returned loan
        var loan1 = new Borrowing
        {
            UserId = standardUser.Id,
            BookId = book1.Id,
            BorrowedAt = date1,
            DueAt = date1.AddDays(14),
            ReturnedAt = date1.AddDays(5),
            Status = "returned",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Active loan
        var loan2 = new Borrowing
        {
            UserId = standardUser.Id,
            BookId = book2.Id,
            BorrowedAt = date2,
            DueAt = date2.AddDays(14),
            Status = "borrowed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Borrowings.AddRange(loan1, loan2);
        await context.SaveChangesAsync();

        // 9. Seed Reservations
        // Standard user reserves İnce Memed (position 1)
        var res1 = new Reservation
        {
            UserId = standardUser.Id,
            BookId = book4.Id,
            ReservedAt = DateTime.UtcNow,
            Status = "pending",
            QueuePosition = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Admin reserves İnce Memed (position 2)
        var res2 = new Reservation
        {
            UserId = adminUser.Id,
            BookId = book4.Id,
            ReservedAt = DateTime.UtcNow,
            Status = "pending",
            QueuePosition = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Reservations.AddRange(res1, res2);
        await context.SaveChangesAsync();

        Console.WriteLine("Database seeded successfully with all roles, users, Turkish classics, activities, and reservations!");
        
        // Add log messages to logs controller on startup
        LogsController.Log("Database initialized and schema drop/created.", "info");
        LogsController.Log("Default system settings seeded.", "info");
        LogsController.Log("Roles and core users seeded.", "info");
        LogsController.Log("Database seeded with Turkish classics and leaderboard transactions!", "info");
    }
    catch (Exception ex)
    {
        Console.WriteLine("An error occurred during database seeding: " + ex.Message);
    }
}

app.Run();
