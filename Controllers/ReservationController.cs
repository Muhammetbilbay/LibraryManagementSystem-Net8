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
    [Route("reservations")]
    public class ReservationController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public ReservationController(LibraryDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequest request)
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

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var book = await _context.Books.FindAsync(request.BookId);
                if (book == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = "Book not found." });
                }

                // Check if user already has a pending reservation for this book
                var existingReservation = await _context.Reservations.FirstOrDefaultAsync(r =>
                    r.UserId == userId && r.BookId == request.BookId && r.Status == "pending");

                if (existingReservation != null)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "You already have a pending reservation for this book." });
                }

                // Calculate queue position
                var pendingCount = await _context.Reservations.CountAsync(r =>
                    r.BookId == request.BookId && r.Status == "pending");

                var queuePosition = pendingCount + 1;

                var reservation = new Reservation
                {
                    UserId = userId,
                    BookId = request.BookId,
                    Status = "pending",
                    QueuePosition = queuePosition,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Reservations.Add(reservation);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var currentUserEmail = _context.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefault();
                LogsController.Log($"Reservation created for user: {currentUserEmail ?? userId.ToString()}, Book: {book.Title}, Position: {queuePosition}");

                return StatusCode(201, new
                {
                    message = "Book reserved successfully.",
                    reservation = new
                    {
                        id = reservation.Id,
                        userId = reservation.UserId,
                        bookId = reservation.BookId,
                        status = reservation.Status,
                        queuePosition = reservation.QueuePosition,
                        createdAt = reservation.CreatedAt,
                        updatedAt = reservation.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPatch("{id}/cancel")]
        public async Task<IActionResult> CancelReservation(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { error = "Token has no valid user ID claim." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var reservation = await _context.Reservations.FindAsync(id);
                if (reservation == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = "Reservation not found." });
                }

                if (reservation.Status != "pending")
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "Only pending reservations can be cancelled." });
                }

                bool isAdmin = User.IsInRole("ADMIN");
                if (reservation.UserId != userId && !isAdmin)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(403, new { error = "Unauthorized to cancel this reservation." });
                }

                var bookId = reservation.BookId;
                var cancelledPosition = reservation.QueuePosition;

                // Update status to cancelled
                reservation.Status = "cancelled";
                reservation.QueuePosition = 0;
                reservation.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                // Shift queue positions of remaining pending reservations
                var remainingReservations = await _context.Reservations
                    .Where(r => r.BookId == bookId && r.Status == "pending" && r.QueuePosition > cancelledPosition)
                    .ToListAsync();

                foreach (var remaining in remainingReservations)
                {
                    remaining.QueuePosition -= 1;
                    remaining.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var currentUserEmail = _context.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefault();
                LogsController.Log($"Reservation cancelled by user: {currentUserEmail ?? userId.ToString()}, Reservation ID: {id}");

                return Ok(new
                {
                    message = "Reservation cancelled successfully.",
                    reservation = new
                    {
                        id = reservation.Id,
                        userId = reservation.UserId,
                        bookId = reservation.BookId,
                        status = reservation.Status,
                        queuePosition = reservation.QueuePosition,
                        createdAt = reservation.CreatedAt,
                        updatedAt = reservation.UpdatedAt
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
        public async Task<IActionResult> ListReservations()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { error = "Token has no valid user ID claim." });
                }

                bool isStaffOrAdmin = User.IsInRole("ADMIN") || User.IsInRole("STAFF");

                var query = _context.Reservations
                    .Include(r => r.Book)
                    .Include(r => r.User)
                    .AsQueryable();

                if (!isStaffOrAdmin)
                {
                    query = query.Where(r => r.UserId == userId);
                }

                var list = await query
                    .OrderByDescending(r => r.ReservedAt)
                    .Select(r => new
                    {
                        id = r.Id,
                        userId = r.UserId,
                        bookId = r.BookId,
                        reservedAt = r.ReservedAt,
                        status = r.Status,
                        queuePosition = r.QueuePosition,
                        createdAt = r.CreatedAt,
                        updatedAt = r.UpdatedAt,
                        book = r.Book != null ? new { id = r.Book.Id, title = r.Book.Title } : null,
                        user = r.User != null ? new { id = r.User.Id, name = r.User.Name, surname = r.User.Surname, email = r.User.Email } : null
                    })
                    .ToListAsync();

                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class CreateReservationRequest
    {
        public Guid BookId { get; set; }
    }
}
