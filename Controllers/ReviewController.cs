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
    [Route("reviews")]
    public class ReviewController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public ReviewController(LibraryDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
        {
            try
            {
                if (request.BookId == Guid.Empty || request.Rating == null)
                {
                    return BadRequest(new { error = "BookId and rating are required." });
                }

                if (request.Rating < 1 || request.Rating > 5)
                {
                    return BadRequest(new { error = "Rating must be an integer between 1 and 5." });
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { error = "Token has no valid user ID claim." });
                }

                var book = await _context.Books.FindAsync(request.BookId);
                if (book == null)
                {
                    return NotFound(new { error = "Book not found." });
                }

                // Check if user already reviewed this book
                var existingReview = await _context.Reviews.FirstOrDefaultAsync(r => r.UserId == userId && r.BookId == request.BookId);
                if (existingReview != null)
                {
                    return BadRequest(new { error = "You have already reviewed this book." });
                }

                var review = new Review
                {
                    UserId = userId,
                    BookId = request.BookId,
                    Rating = request.Rating.Value,
                    Comment = request.Comment,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Reviews.Add(review);
                await _context.SaveChangesAsync();

                // Reload review with user info
                var completeReview = await _context.Reviews
                    .Include(r => r.User)
                    .Select(r => new
                    {
                        id = r.Id,
                        userId = r.UserId,
                        bookId = r.BookId,
                        rating = r.Rating,
                        comment = r.Comment,
                        createdAt = r.CreatedAt,
                        updatedAt = r.UpdatedAt,
                        user = r.User != null ? new { id = r.User.Id, name = r.User.Name, email = r.User.Email } : null
                    })
                    .FirstOrDefaultAsync(r => r.id == review.Id);

                return StatusCode(201, completeReview);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> ListReviews([FromQuery] Guid? bookId)
        {
            try
            {
                var query = _context.Reviews
                    .Include(r => r.Book)
                    .Include(r => r.User)
                    .AsQueryable();

                if (bookId.HasValue)
                {
                    query = query.Where(r => r.BookId == bookId.Value);
                }

                var reviews = await query
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        id = r.Id,
                        userId = r.UserId,
                        bookId = r.BookId,
                        rating = r.Rating,
                        comment = r.Comment,
                        createdAt = r.CreatedAt,
                        updatedAt = r.UpdatedAt,
                        book = r.Book != null ? new { id = r.Book.Id, title = r.Book.Title } : null,
                        user = r.User != null ? new { id = r.User.Id, name = r.User.Name, email = r.User.Email } : null
                    })
                    .ToListAsync();

                return Ok(reviews);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReview(Guid id)
        {
            try
            {
                var review = await _context.Reviews.FindAsync(id);
                if (review == null)
                {
                    return NotFound(new { error = "Review not found." });
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { error = "Token has no valid user ID claim." });
                }

                var isAdmin = User.IsInRole("ADMIN");

                if (review.UserId != userId && !isAdmin)
                {
                    return StatusCode(403, new { error = "Unauthorized to delete this review." });
                }

                _context.Reviews.Remove(review);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Review deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class CreateReviewRequest
    {
        public Guid BookId { get; set; }
        public int? Rating { get; set; }
        public string? Comment { get; set; }
    }
}
