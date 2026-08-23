using System;
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
    [Route("settings")]
    public class SettingsController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public SettingsController(LibraryDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            try
            {
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
                return Ok(setting);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN")]
        [HttpPut]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
        {
            try
            {
                var setting = await _context.Settings.FirstOrDefaultAsync();
                if (setting == null)
                {
                    setting = new Setting
                    {
                        MaxBorrowDays = request.MaxBorrowDays ?? 14,
                        DailyPenaltyFee = request.DailyPenaltyFee ?? 5.00m,
                        MaxBooksLimit = request.MaxBooksLimit ?? 3,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Settings.Add(setting);
                }
                else
                {
                    if (request.MaxBorrowDays.HasValue) setting.MaxBorrowDays = request.MaxBorrowDays.Value;
                    if (request.DailyPenaltyFee.HasValue) setting.DailyPenaltyFee = request.DailyPenaltyFee.Value;
                    if (request.MaxBooksLimit.HasValue) setting.MaxBooksLimit = request.MaxBooksLimit.Value;
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return Ok(setting);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class UpdateSettingsRequest
    {
        public int? MaxBorrowDays { get; set; }
        public decimal? DailyPenaltyFee { get; set; }
        public int? MaxBooksLimit { get; set; }
    }
}
