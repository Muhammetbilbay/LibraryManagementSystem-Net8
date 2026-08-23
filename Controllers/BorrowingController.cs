using System;
using System.Linq;
using System.Security.Claims;
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
    [Route("borrowings")]
    public class BorrowingController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public BorrowingController(LibraryDbContext context)
        {
            _context = context;
        }

        [HttpPost("borrow")]
        public async Task<IActionResult> BorrowBook([FromBody] BorrowRequest request)
        {
            if (request.BookId == Guid.Empty)
            {
                return BadRequest(new { error = "BookId is required." });
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { error = "Token has no valid user ID claim." });
            }

            // Using EF Core transaction to handle operations atomically
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Retrieve and lock the book using EF Core
                var book = await _context.Books.FindAsync(request.BookId);
                if (book == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = "Book not found." });
                }

                if (book.Stock <= 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "Book is out of stock. You can reserve it instead." });
                }

                // Check if user already borrowed this book and hasn't returned it
                var activeBorrow = await _context.Borrowings.FirstOrDefaultAsync(b =>
                    b.UserId == userId && b.BookId == request.BookId && b.Status == "borrowed");
                if (activeBorrow != null)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "You have already borrowed this book and not returned it yet." });
                }

                // Get settings
                var setting = await _context.Settings.FirstOrDefaultAsync();
                if (setting == null)
                {
                    setting = new Setting
                    {
                        MaxBorrowDays = 14,
                        DailyPenaltyFee = 5.00m,
                        MaxBooksLimit = 3,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Settings.Add(setting);
                    await _context.SaveChangesAsync();
                }

                // Count active borrowings for this user
                var activeCount = await _context.Borrowings.CountAsync(b => b.UserId == userId && b.Status == "borrowed");
                if (activeCount >= setting.MaxBooksLimit)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new
                    {
                        error = $"You have reached the maximum borrow limit of {setting.MaxBooksLimit} books. Please return a book first."
                    });
                }

                // Check pending reservations for this book
                var pendingReservations = await _context.Reservations
                    .Where(r => r.BookId == request.BookId && r.Status == "pending")
                    .OrderBy(r => r.QueuePosition)
                    .ToListAsync();

                if (pendingReservations.Count > 0)
                {
                    var topReservedUser = pendingReservations[0];
                    bool isTopReserver = topReservedUser.UserId == userId;

                    // If current user is not first in queue and there isn't enough stock
                    if (!isTopReserver && book.Stock <= pendingReservations.Count)
                    {
                        await transaction.RollbackAsync();
                        return BadRequest(new
                        {
                            error = "This book is currently reserved. You must join the reservation queue."
                        });
                    }

                    // Fulfill reservation for top reserver
                    if (isTopReserver)
                    {
                        topReservedUser.Status = "fulfilled";
                        topReservedUser.QueuePosition = 0;
                        topReservedUser.UpdatedAt = DateTime.UtcNow;

                        // Shift others in the queue
                        for (int i = 1; i < pendingReservations.Count; i++)
                        {
                            pendingReservations[i].QueuePosition -= 1;
                            pendingReservations[i].UpdatedAt = DateTime.UtcNow;
                        }
                        
                        var userEmail = _context.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefault();
                        LogsController.Log($"Reservation fulfilled for user: {userEmail ?? userId.ToString()} on book: {book.Title}");
                    }
                }

                // Create borrowing entry
                var borrowedAt = DateTime.UtcNow;
                var dueAt = borrowedAt.AddDays(setting.MaxBorrowDays);

                var borrowing = new Borrowing
                {
                    UserId = userId,
                    BookId = request.BookId,
                    BorrowedAt = borrowedAt,
                    DueAt = dueAt,
                    Status = "borrowed",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Borrowings.Add(borrowing);

                // Decrement stock
                book.Stock -= 1;
                book.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var currentUserEmail = _context.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefault();
                LogsController.Log($"Borrowing created. User: {currentUserEmail ?? userId.ToString()}, Book: {book.Title}");

                return StatusCode(201, new
                {
                    message = "Book borrowed successfully.",
                    borrowing = new
                    {
                        id = borrowing.Id,
                        bookTitle = book.Title,
                        borrowedAt,
                        dueAt,
                        status = borrowing.Status
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPatch("{id}/return")]
        public async Task<IActionResult> ReturnBook(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { error = "Token has no valid user ID claim." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var borrowing = await _context.Borrowings.FindAsync(id);
                if (borrowing == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = "Borrowing record not found." });
                }

                if (borrowing.Status == "returned")
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "Book has already been returned." });
                }

                bool isStaffOrAdmin = User.IsInRole("ADMIN") || User.IsInRole("STAFF");
                if (borrowing.UserId != userId && !isStaffOrAdmin)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(403, new { error = "You are not authorized to return this borrowing." });
                }

                decimal penaltyApplied = 0.00m;
                var returnTime = DateTime.UtcNow;
                var dueTime = borrowing.DueAt;

                if (returnTime > dueTime)
                {
                    var elapsedSpan = returnTime - dueTime;
                    int elapsedDays = (int)Math.Ceiling(elapsedSpan.TotalDays);

                    var setting = await _context.Settings.FirstOrDefaultAsync();
                    if (setting == null)
                    {
                        setting = new Setting
                        {
                            MaxBorrowDays = 14,
                            DailyPenaltyFee = 5.00m,
                            MaxBooksLimit = 3,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Settings.Add(setting);
                        await _context.SaveChangesAsync();
                    }

                    penaltyApplied = elapsedDays * setting.DailyPenaltyFee;

                    var user = await _context.Users.FindAsync(borrowing.UserId);
                    if (user != null)
                    {
                        user.DebtBalance += penaltyApplied;
                        user.UpdatedAt = DateTime.UtcNow;
                        
                        LogsController.Log($"Penalty of {penaltyApplied:F2} TRY applied to user {user.Email} for {elapsedDays} days delay.");
                    }
                }

                // Update borrowing status
                borrowing.ReturnedAt = returnTime;
                borrowing.Status = "returned";
                borrowing.UpdatedAt = DateTime.UtcNow;

                // Increment book stock
                var book = await _context.Books.FindAsync(borrowing.BookId);
                if (book != null)
                {
                    book.Stock += 1;
                    book.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var currentUserEmail = _context.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefault();
                LogsController.Log($"Borrowing returned. User: {currentUserEmail ?? userId.ToString()}, Book ID: {borrowing.BookId}");

                return Ok(new
                {
                    message = "Book returned successfully.",
                    penaltyApplied,
                    borrowing = new
                    {
                        id = borrowing.Id,
                        userId = borrowing.UserId,
                        bookId = borrowing.BookId,
                        borrowedAt = borrowing.BorrowedAt,
                        dueAt = borrowing.DueAt,
                        returnedAt = borrowing.ReturnedAt,
                        status = borrowing.Status,
                        createdAt = borrowing.CreatedAt,
                        updatedAt = borrowing.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> ListBorrowings()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { error = "Token has no valid user ID claim." });
                }

                bool isStaffOrAdmin = User.IsInRole("ADMIN") || User.IsInRole("STAFF");

                var query = _context.Borrowings
                    .Include(b => b.Book)
                    .Include(b => b.User)
                    .AsQueryable();

                if (!isStaffOrAdmin)
                {
                    query = query.Where(b => b.UserId == userId);
                }

                var borrowings = await query
                    .OrderByDescending(b => b.BorrowedAt)
                    .Select(b => new
                    {
                        id = b.Id,
                        userId = b.UserId,
                        bookId = b.BookId,
                        borrowedAt = b.BorrowedAt,
                        dueAt = b.DueAt,
                        returnedAt = b.ReturnedAt,
                        status = b.Status,
                        createdAt = b.CreatedAt,
                        updatedAt = b.UpdatedAt,
                        book = b.Book != null ? new
                        {
                            id = b.Book.Id,
                            title = b.Book.Title,
                            isbn = b.Book.Isbn,
                            shelfPosition = b.Book.ShelfPosition
                        } : null,
                        user = b.User != null ? new
                        {
                            id = b.User.Id,
                            name = b.User.Name,
                            surname = b.User.Surname,
                            email = b.User.Email,
                            memberNo = b.User.MemberNo
                        } : null
                    })
                    .ToListAsync();

                return Ok(borrowings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class BorrowRequest
    {
        public Guid BookId { get; set; }
    }
}
