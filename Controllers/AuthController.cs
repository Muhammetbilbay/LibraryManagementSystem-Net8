using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using LibraryAPI.Data;
using LibraryAPI.Models;
using Microsoft.AspNetCore.Authorization;

namespace LibraryAPI.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly LibraryDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(LibraryDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { error = "Name, email, and password are required." });
                }

                if (request.Password.Length < 5)
                {
                    return BadRequest(new { error = "Şifre en az 5 karakter uzunluğunda olmalıdır." });
                }

                // Check if user already exists
                var existingUser = await _context.Users.AnyAsync(u => u.Email == request.Email);
                if (existingUser)
                {
                    return BadRequest(new { error = "User with this email already exists." });
                }

                // Auto-generate member number
                string assignedMemberNo = request.MemberNo ?? "";
                if (string.IsNullOrEmpty(assignedMemberNo))
                {
                    const string prefix = "STD";
                    int userCount = await _context.Users.CountAsync();
                    assignedMemberNo = $"{prefix}{(userCount + 1).ToString("D3")}";

                    int attempt = userCount + 1;
                    while (await _context.Users.AnyAsync(u => u.MemberNo == assignedMemberNo))
                    {
                        attempt++;
                        assignedMemberNo = $"{prefix}{attempt.ToString("D3")}";
                    }
                }
                else
                {
                    var existingMemberNo = await _context.Users.AnyAsync(u => u.MemberNo == request.MemberNo);
                    if (existingMemberNo)
                    {
                        return BadRequest(new { error = "Member Number already assigned to another user." });
                    }
                }

                // Ensure roles exist
                var userRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "USER");
                if (userRole == null)
                {
                    userRole = new Role { Name = "USER" };
                    _context.Roles.Add(userRole);
                    await _context.SaveChangesAsync();
                }

                // Hash password
                string hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password, 10);

                var user = new User
                {
                    Name = request.Name,
                    Surname = request.Surname,
                    Email = request.Email,
                    Phone = request.Phone,
                    MemberNo = assignedMemberNo,
                    Password = hashedPassword,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                var userRoleJoin = new UserRole { UserId = user.Id, RoleId = userRole.Id };
                _context.UserRoles.Add(userRoleJoin);
                await _context.SaveChangesAsync();

                // Log Activity
                LogsController.Log($"Register action completed for user: {user.Email} with role: USER, memberNo: {user.MemberNo}");

                return StatusCode(201, new
                {
                    message = "Registration successful.",
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        surname = user.Surname,
                        email = user.Email,
                        phone = user.Phone,
                        memberNo = user.MemberNo,
                        role = "USER"
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred during registration. Details: " + ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { error = "Email and password are required." });
                }

                var user = await _context.Users
                    .Include(u => u.Roles)
                    .FirstOrDefaultAsync(u => u.Email == request.Email || u.MemberNo == request.Email);

                if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                {
                    return Unauthorized(new { error = "Invalid email/member-no or password." });
                }

                var rolesList = user.Roles.Select(r => r.Name).ToList();
                var token = GenerateJwtToken(user, rolesList);

                // Log Activity
                LogsController.Log($"Login action completed for user: {user.Email}");

                return Ok(new
                {
                    message = "Login successful.",
                    token,
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        surname = user.Surname,
                        email = user.Email,
                        phone = user.Phone,
                        memberNo = user.MemberNo,
                        debtBalance = user.DebtBalance,
                        roles = rolesList
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred during login. Details: " + ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Email))
                {
                    return BadRequest(new { error = "Email is required." });
                }

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
                if (user == null)
                {
                    return NotFound(new { error = "User not found with this email." });
                }

                // Generate 6-digit numeric reset code
                var rand = new Random();
                string resetCode = rand.Next(100000, 999999).ToString();
                user.ResetPasswordToken = resetCode;
                user.ResetPasswordExpires = DateTime.UtcNow.AddHours(1);
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Log Activity
                LogsController.Log($"Password reset requested for: {request.Email}. Code generated: {resetCode}");

                return Ok(new
                {
                    message = "Verification code generated.",
                    resetCode
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Code) || string.IsNullOrEmpty(request.NewPassword))
                {
                    return BadRequest(new { error = "Email, code, and newPassword are required." });
                }

                if (request.NewPassword.Length < 5)
                {
                    return BadRequest(new { error = "Şifre en az 5 karakter uzunluğunda olmalıdır." });
                }

                var user = await _context.Users.FirstOrDefaultAsync(u =>
                    u.Email == request.Email &&
                    u.ResetPasswordToken == request.Code &&
                    u.ResetPasswordExpires > DateTime.UtcNow);

                if (user == null)
                {
                    return BadRequest(new { error = "Invalid or expired verification code." });
                }

                user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, 10);
                user.ResetPasswordToken = null;
                user.ResetPasswordExpires = null;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Log Activity
                LogsController.Log($"Password reset successful for user: {request.Email}");

                return Ok(new { message = "Password reset successful." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
                {
                    return Unauthorized(new { error = "Token has no valid user ID claim." });
                }

                var user = await _context.Users
                    .Include(u => u.Roles)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return NotFound(new { error = "User not found." });
                }

                var rolesList = user.Roles.Select(r => r.Name).ToList();
                return Ok(new
                {
                    user = new
                    {
                        id = user.Id,
                        name = user.Name,
                        surname = user.Surname,
                        email = user.Email,
                        phone = user.Phone,
                        memberNo = user.MemberNo,
                        debtBalance = user.DebtBalance,
                        roles = rolesList
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private string GenerateJwtToken(User user, List<string> roles)
        {
            var jwtSecret = _configuration["JWT_SECRET"] ?? "super_secret_key_123456_longer_version_to_prevent_errors_if_possible";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email)
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class RegisterRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Surname { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? MemberNo { get; set; }
        public string Password { get; set; } = string.Empty;
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
