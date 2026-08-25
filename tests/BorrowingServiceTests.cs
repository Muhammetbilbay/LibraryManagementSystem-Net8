using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LibraryAPI.Controllers;
using LibraryAPI.Data;
using LibraryAPI.Models;
using Xunit;

namespace LibraryAPI.Tests
{
    public class BorrowingServiceTests
    {
        private LibraryDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<LibraryDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new LibraryDbContext(options);
        }

        private void SetupControllerUser(ControllerBase controller, Guid userId)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, "test@example.com")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        [Fact]
        public async Task BorrowBook_ShouldSucceed_WhenBookInStock()
        {
            // Arrange
            using var context = GetDbContext();
            var controller = new BorrowingController(context);
            
            var userId = Guid.NewGuid();
            SetupControllerUser(controller, userId);

            var book = new Book
            {
                Title = "Nutuk",
                Isbn = "1234567890",
                Stock = 5,
                TotalQuantity = 5
            };
            context.Books.Add(book);

            var user = new User
            {
                Id = userId,
                Name = "Muhammet",
                Email = "test@example.com"
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var request = new BorrowRequest { BookId = book.Id };

            // Act
            var result = await controller.BorrowBook(request);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(201, statusCodeResult.StatusCode);

            // Verify stock decreased
            var updatedBook = await context.Books.FindAsync(book.Id);
            Assert.Equal(4, updatedBook!.Stock);
        }

        [Fact]
        public async Task BorrowBook_ShouldFail_WhenBookOutOfStock()
        {
            // Arrange
            using var context = GetDbContext();
            var controller = new BorrowingController(context);
            
            var userId = Guid.NewGuid();
            SetupControllerUser(controller, userId);

            var book = new Book
            {
                Title = "OutOfStockBook",
                Isbn = "1234567890",
                Stock = 0,
                TotalQuantity = 5
            };
            context.Books.Add(book);
            await context.SaveChangesAsync();

            var request = new BorrowRequest { BookId = book.Id };

            // Act
            var result = await controller.BorrowBook(request);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(400, badRequestResult.StatusCode);
        }

        [Fact]
        public async Task ReturnBook_ShouldSucceed_WhenBorrowingActive()
        {
            // Arrange
            using var context = GetDbContext();
            var controller = new BorrowingController(context);
            
            var userId = Guid.NewGuid();
            SetupControllerUser(controller, userId);

            var book = new Book
            {
                Title = "Nutuk",
                Isbn = "1234567890",
                Stock = 4,
                TotalQuantity = 5
            };
            context.Books.Add(book);

            var user = new User
            {
                Id = userId,
                Name = "Muhammet",
                Email = "test@example.com"
            };
            context.Users.Add(user);

            var borrowing = new Borrowing
            {
                UserId = userId,
                BookId = book.Id,
                BorrowedAt = DateTime.UtcNow.AddDays(-5),
                DueAt = DateTime.UtcNow.AddDays(9),
                Status = "borrowed"
            };
            context.Borrowings.Add(borrowing);
            await context.SaveChangesAsync();

            // Act
            var result = await controller.ReturnBook(borrowing.Id);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);

            // Verify borrowing marked returned and stock increased
            var updatedBorrowing = await context.Borrowings.FindAsync(borrowing.Id);
            Assert.Equal("returned", updatedBorrowing!.Status);

            var updatedBook = await context.Books.FindAsync(book.Id);
            Assert.Equal(5, updatedBook!.Stock);
        }
    }
}
