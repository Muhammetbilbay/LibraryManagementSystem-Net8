using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LibraryAPI.Data;
using LibraryAPI.Models;
using Microsoft.AspNetCore.Authorization;

namespace LibraryAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public DashboardController(LibraryDbContext context)
        {
            _context = context;
        }

        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics()
        {
            try
            {
                int totalTitles = await _context.Books.CountAsync();
                int totalBooksQuantity = await _context.Books.SumAsync(b => (int?)b.TotalQuantity) ?? 0;
                int activeLoans = await _context.Borrowings.CountAsync(b => b.Status == "borrowed");
                int availableBooks = await _context.Books.SumAsync(b => (int?)b.Stock) ?? 0;
                int activeReservations = await _context.Reservations.CountAsync(r => r.Status == "pending");
                
                int overdueLoans = await _context.Borrowings.CountAsync(b => 
                    b.Status == "borrowed" && b.DueAt < DateTime.UtcNow);

                return Ok(new
                {
                    totalTitles,
                    totalBooksQuantity,
                    activeLoans,
                    availableBooks,
                    activeReservations,
                    overdueLoans
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("trend")]
        public async Task<IActionResult> GetTrendData()
        {
            try
            {
                var labels = new List<string>();
                var data = new List<int>();

                var trCulture = new CultureInfo("tr-TR");

                for (int i = 5; i >= 0; i--)
                {
                    var targetMonth = DateTime.UtcNow.AddMonths(-i);
                    var monthLabel = targetMonth.ToString("MMMM", trCulture);

                    var startOfMonth = new DateTime(targetMonth.Year, targetMonth.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    var endOfMonth = new DateTime(targetMonth.Year, targetMonth.Month, DateTime.DaysInMonth(targetMonth.Year, targetMonth.Month), 23, 59, 59, DateTimeKind.Utc);

                    var count = await _context.Borrowings.CountAsync(b => 
                        b.BorrowedAt >= startOfMonth && b.BorrowedAt <= endOfMonth);

                    labels.Add(monthLabel);
                    data.Add(count);
                }

                return Ok(new { labels, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategoryStats()
        {
            try
            {
                var stats = await _context.Categories
                    .Include(c => c.Books)
                    .Select(c => new { name = c.Name, count = c.Books.Count })
                    .Where(c => c.count > 0)
                    .ToListAsync();

                var labels = stats.Select(s => s.name).ToList();
                var data = stats.Select(s => s.count).ToList();

                return Ok(new { labels, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("leaderboard")]
        public async Task<IActionResult> GetLeaderboard()
        {
            try
            {
                // 1. Most read books
                var topBookStats = await _context.Borrowings
                    .GroupBy(b => b.BookId)
                    .Select(g => new { BookId = g.Key, Count = g.Count() })
                    .OrderByDescending(g => g.Count)
                    .Take(3)
                    .ToListAsync();

                var topBookIds = topBookStats.Select(t => t.BookId).ToList();
                var topBooksDetails = await _context.Books
                    .Where(b => topBookIds.Contains(b.Id))
                    .ToListAsync();

                var formattedBooks = topBookStats.Select(stat =>
                {
                    var book = topBooksDetails.FirstOrDefault(b => b.Id == stat.BookId);
                    return new
                    {
                        title = book != null ? book.Title : "Bilinmeyen Kitap",
                        isbn = book != null ? book.Isbn : "",
                        count = stat.Count
                    };
                }).ToList();

                // 2. Most active members
                var topUserStats = await _context.Borrowings
                    .GroupBy(b => b.UserId)
                    .Select(g => new { UserId = g.Key, Count = g.Count() })
                    .OrderByDescending(g => g.Count)
                    .Take(3)
                    .ToListAsync();

                var topUserIds = topUserStats.Select(t => t.UserId).ToList();
                var topUsersDetails = await _context.Users
                    .Where(u => topUserIds.Contains(u.Id))
                    .ToListAsync();

                var formattedUsers = topUserStats.Select(stat =>
                {
                    var user = topUsersDetails.FirstOrDefault(u => u.Id == stat.UserId);
                    return new
                    {
                        name = user != null ? $"{user.Name} {user.Surname}".Trim() : "Bilinmeyen Üye",
                        email = user != null ? user.Email : "",
                        count = stat.Count
                    };
                }).ToList();

                return Ok(new
                {
                    books = formattedBooks,
                    users = formattedUsers
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("recent")]
        public async Task<IActionResult> GetRecentActivities()
        {
            try
            {
                var recentBorrowings = await _context.Borrowings
                    .Include(b => b.Book)
                    .Include(b => b.User)
                    .OrderByDescending(b => b.BorrowedAt)
                    .Take(5)
                    .ToListAsync();

                var activities = recentBorrowings.Select(b =>
                {
                    var userName = b.User != null ? $"{b.User.Name} {b.User.Surname}".Trim() : "Bilinmeyen Üye";
                    var bookTitle = b.Book != null ? b.Book.Title : "Bilinmeyen Kitap";
                    
                    var actionText = b.Status == "returned"
                        ? $"{userName}, \"{bookTitle}\" kitabını iade etti."
                        : $"{userName}, \"{bookTitle}\" kitabını ödünç aldı.";

                    return new
                    {
                        id = b.Id,
                        action = actionText,
                        time = b.ReturnedAt ?? b.BorrowedAt,
                        type = b.Status
                    };
                })
                .OrderByDescending(a => a.time)
                .ToList();

                return Ok(activities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
