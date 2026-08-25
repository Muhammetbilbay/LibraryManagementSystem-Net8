using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using LibraryAPI.Controllers;
using LibraryAPI.Data;
using LibraryAPI.Models;
using Xunit;

namespace LibraryAPI.Tests
{
    public class AuthServiceTests
    {
        private LibraryDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<LibraryDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new LibraryDbContext(options);
        }

        private IConfiguration GetConfiguration()
        {
            var myConfiguration = new Dictionary<string, string>
            {
                {"JWT_SECRET", "super_secret_key_123456_longer_version_to_prevent_errors_if_possible"}
            };

            return new ConfigurationBuilder()
                .AddInMemoryCollection(myConfiguration!)
                .Build();
        }

        [Fact]
        public async Task Register_ShouldSuccessfullyRegisterUser()
        {
            // Arrange
            using var context = GetDbContext();
            var config = GetConfiguration();
            var controller = new AuthController(context, config);

            // Pre-seed roles
            context.Roles.Add(new Role { Name = "USER" });
            await context.SaveChangesAsync();

            var request = new RegisterRequest
            {
                Name = "Jane",
                Surname = "Doe",
                Email = "jane@example.com",
                Password = "password123"
            };

            // Act
            var result = await controller.Register(request);

            // Assert
            var statusCodeResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(201, statusCodeResult.StatusCode);

            var dbUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "jane@example.com");
            Assert.NotNull(dbUser);
            Assert.Equal("Jane", dbUser.Name);
            Assert.StartsWith("STD", dbUser.MemberNo);
        }

        [Fact]
        public async Task Register_ShouldFail_IfEmailExists()
        {
            // Arrange
            using var context = GetDbContext();
            var config = GetConfiguration();
            var controller = new AuthController(context, config);

            // Pre-seed roles & user
            context.Roles.Add(new Role { Name = "USER" });
            context.Users.Add(new User
            {
                Name = "Jane",
                Email = "jane@example.com",
                Password = "hashedpassword",
                MemberNo = "STD001"
            });
            await context.SaveChangesAsync();

            var request = new RegisterRequest
            {
                Name = "Another Jane",
                Email = "jane@example.com",
                Password = "password123"
            };

            // Act
            var result = await controller.Register(request);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(400, badRequestResult.StatusCode);
        }

        [Fact]
        public async Task Login_ShouldSucceed_WithValidCredentials()
        {
            // Arrange
            using var context = GetDbContext();
            var config = GetConfiguration();
            var controller = new AuthController(context, config);

            // Seed user with hashed password
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("password123", 10);
            var user = new User
            {
                Name = "John",
                Email = "john@example.com",
                Password = hashedPassword,
                MemberNo = "STD002"
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var request = new LoginRequest
            {
                Email = "john@example.com",
                Password = "password123"
            };

            // Act
            var result = await controller.Login(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);
        }

        [Fact]
        public async Task Login_ShouldFail_WithIncorrectPassword()
        {
            // Arrange
            using var context = GetDbContext();
            var config = GetConfiguration();
            var controller = new AuthController(context, config);

            // Seed user
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("password123", 10);
            var user = new User
            {
                Name = "John",
                Email = "john@example.com",
                Password = hashedPassword,
                MemberNo = "STD002"
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var request = new LoginRequest
            {
                Email = "john@example.com",
                Password = "wrongpassword"
            };

            // Act
            var result = await controller.Login(request);

            // Assert
            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal(401, unauthorizedResult.StatusCode);
        }
    }
}
