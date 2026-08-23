using System;
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
    [Route("users")]
    public class UsersController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public UsersController(LibraryDbContext context)
        {
            _context = context;
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpGet]
        public async Task<IActionResult> ListUsers()
        {
            try
            {
                var users = await _context.Users
                    .Include(u => u.Roles)
                    .OrderBy(u => u.Name)
                    .Select(u => new
                    {
                        id = u.Id,
                        name = u.Name,
                        surname = u.Surname,
                        email = u.Email,
                        phone = u.Phone,
                        memberNo = u.MemberNo,
                        debtBalance = u.DebtBalance,
                        createdAt = u.CreatedAt,
                        roles = u.Roles.Select(r => new { name = r.Name }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetUserHistory(Guid id)
        {
            try
            {
                var borrowings = await _context.Borrowings
                    .Where(b => b.UserId == id)
                    .Include(b => b.Book)
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
                        book = b.Book != null ? new { id = b.Book.Id, title = b.Book.Title } : null
                    })
                    .ToListAsync();

                return Ok(borrowings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPut("{id}/debt")]
        public async Task<IActionResult> UpdateUserDebt(Guid id, [FromBody] UpdateUserDebtRequest request)
        {
            try
            {
                if (request.DebtBalance == null)
                {
                    return BadRequest(new { error = "debtBalance is required." });
                }

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { error = "User not found." });
                }

                user.DebtBalance = request.DebtBalance.Value;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN")]
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Role) || !new[] { "USER", "STAFF", "ADMIN" }.Contains(request.Role))
                {
                    return BadRequest(new { error = "Geçersiz rol. USER, STAFF veya ADMIN olmalıdır." });
                }

                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { error = "Kullanıcı bulunamadı." });
                }

                // Prevent changing own role
                var currentUserIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(currentUserIdClaim) && Guid.TryParse(currentUserIdClaim, out Guid currentUserId))
                {
                    if (user.Id == currentUserId)
                    {
                        return StatusCode(403, new { error = "Kendi rolünüzü değiştiremezsiniz." });
                    }
                }

                var roleRecord = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.Role);
                if (roleRecord == null)
                {
                    return NotFound(new { error = "Rol bulunamadı." });
                }

                // Remove existing roles
                var userRoles = await _context.UserRoles.Where(ur => ur.UserId == id).ToListAsync();
                _context.UserRoles.RemoveRange(userRoles);
                await _context.SaveChangesAsync();

                // Assign new role
                var newUserRole = new UserRole { UserId = id, RoleId = roleRecord.Id };
                _context.UserRoles.Add(newUserRole);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Rol başarıyla {request.Role} olarak güncellendi.",
                    userId = id,
                    newRole = request.Role
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class UpdateUserDebtRequest
    {
        public decimal? DebtBalance { get; set; }
    }

    public class UpdateUserRoleRequest
    {
        public string Role { get; set; } = string.Empty;
    }
}
