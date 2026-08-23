using System;
using System.Collections.Concurrent;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace LibraryAPI.Controllers
{
    [Authorize(Roles = "ADMIN")]
    [ApiController]
    [Route("logs")]
    public class LogsController : ControllerBase
    {
        // Thread-safe in-memory collection of log entries
        private static readonly ConcurrentQueue<LogEntry> _logs = new ConcurrentQueue<LogEntry>();

        public static void Log(string message, string level = "info")
        {
            _logs.Enqueue(new LogEntry
            {
                Message = message,
                Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                Level = level
            });

            // Keep only the last 1000 logs in memory to prevent memory leaks
            while (_logs.Count > 1000)
            {
                _logs.TryDequeue(out _);
            }
        }

        [HttpGet]
        public IActionResult GetLogs()
        {
            try
            {
                // Returns logs in reverse chronological order
                var list = _logs.Reverse().ToList();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class LogEntry
    {
        public string Message { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        public string Level { get; set; } = "info";
    }
}
