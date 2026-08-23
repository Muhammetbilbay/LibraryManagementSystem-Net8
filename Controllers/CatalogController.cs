using System;
using System.Collections.Generic;
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
    public class CatalogController : ControllerBase
    {
        private readonly LibraryDbContext _context;

        public CatalogController(LibraryDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // AUTHOR ENDPOINTS
        // ==========================================
        [HttpGet("authors")]
        public async Task<IActionResult> ListAuthors()
        {
            try
            {
                var authors = await _context.Authors.OrderBy(a => a.Name).ToListAsync();
                return Ok(authors);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("authors/{id}")]
        public async Task<IActionResult> GetAuthor(Guid id)
        {
            try
            {
                var author = await _context.Authors
                    .Include(a => a.Books)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (author == null) return NotFound(new { error = "Author not found." });

                return Ok(new
                {
                    id = author.Id,
                    name = author.Name,
                    biography = author.Biography,
                    books = author.Books.Select(b => new { id = b.Id, title = b.Title }).ToList()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPost("authors")]
        public async Task<IActionResult> CreateAuthor([FromBody] CreateAuthorRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Name)) return BadRequest(new { error = "Name is required." });

                var author = new Author
                {
                    Name = request.Name,
                    Biography = request.Biography,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Authors.Add(author);
                await _context.SaveChangesAsync();
                return StatusCode(201, author);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPut("authors/{id}")]
        public async Task<IActionResult> UpdateAuthor(Guid id, [FromBody] CreateAuthorRequest request)
        {
            try
            {
                var author = await _context.Authors.FindAsync(id);
                if (author == null) return NotFound(new { error = "Author not found." });

                if (!string.IsNullOrEmpty(request.Name)) author.Name = request.Name;
                if (request.Biography != null) author.Biography = request.Biography;
                author.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(author);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpDelete("authors/{id}")]
        public async Task<IActionResult> DeleteAuthor(Guid id)
        {
            try
            {
                var author = await _context.Authors.FindAsync(id);
                if (author == null) return NotFound(new { error = "Author not found." });

                _context.Authors.Remove(author);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Author deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ==========================================
        // CATEGORY ENDPOINTS
        // ==========================================
        [HttpGet("categories")]
        public async Task<IActionResult> ListCategories()
        {
            try
            {
                var categories = await _context.Categories.OrderBy(c => c.Name).ToListAsync();
                return Ok(categories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("categories/{id}")]
        public async Task<IActionResult> GetCategory(Guid id)
        {
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null) return NotFound(new { error = "Category not found." });
                return Ok(category);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Name)) return BadRequest(new { error = "Name is required." });

                var category = new Category
                {
                    Name = request.Name,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Categories.Add(category);
                await _context.SaveChangesAsync();
                return StatusCode(201, category);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CreateCategoryRequest request)
        {
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null) return NotFound(new { error = "Category not found." });

                if (!string.IsNullOrEmpty(request.Name)) category.Name = request.Name;
                category.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(category);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null) return NotFound(new { error = "Category not found." });

                _context.Categories.Remove(category);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Category deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ==========================================
        // PUBLISHER ENDPOINTS
        // ==========================================
        [HttpGet("publishers")]
        public async Task<IActionResult> ListPublishers()
        {
            try
            {
                var publishers = await _context.Publishers.OrderBy(p => p.Name).ToListAsync();
                return Ok(publishers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("publishers/{id}")]
        public async Task<IActionResult> GetPublisher(Guid id)
        {
            try
            {
                var publisher = await _context.Publishers.FindAsync(id);
                if (publisher == null) return NotFound(new { error = "Publisher not found." });
                return Ok(publisher);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPost("publishers")]
        public async Task<IActionResult> CreatePublisher([FromBody] CreatePublisherRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Name)) return BadRequest(new { error = "Name is required." });

                var publisher = new Publisher
                {
                    Name = request.Name,
                    Address = request.Address,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Publishers.Add(publisher);
                await _context.SaveChangesAsync();
                return StatusCode(201, publisher);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPut("publishers/{id}")]
        public async Task<IActionResult> UpdatePublisher(Guid id, [FromBody] CreatePublisherRequest request)
        {
            try
            {
                var publisher = await _context.Publishers.FindAsync(id);
                if (publisher == null) return NotFound(new { error = "Publisher not found." });

                if (!string.IsNullOrEmpty(request.Name)) publisher.Name = request.Name;
                if (request.Address != null) publisher.Address = request.Address;
                publisher.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(publisher);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpDelete("publishers/{id}")]
        public async Task<IActionResult> DeletePublisher(Guid id)
        {
            try
            {
                var publisher = await _context.Publishers.FindAsync(id);
                if (publisher == null) return NotFound(new { error = "Publisher not found." });

                _context.Publishers.Remove(publisher);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Publisher deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // ==========================================
        // BOOK ENDPOINTS
        // ==========================================
        [HttpGet("books")]
        public async Task<IActionResult> ListBooks(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null, // GUID or name
            [FromQuery] string? author = null,   // GUID or name
            [FromQuery] string? publisher = null,// GUID or name
            [FromQuery] string? status = null,   // 'rafta', 'oduncte'
            [FromQuery] string sortBy = "title",
            [FromQuery] string sortOrder = "ASC"
        )
        {
            try
            {
                var query = _context.Books
                    .Include(b => b.Authors)
                    .Include(b => b.Categories)
                    .Include(b => b.Publisher)
                    .Include(b => b.Reviews)
                    .AsQueryable();

                // Search query
                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(b => 
                        EF.Functions.ILike(b.Title, $"%{search}%") ||
                        (b.Description != null && EF.Functions.ILike(b.Description, $"%{search}%")) ||
                        (b.Isbn != null && EF.Functions.ILike(b.Isbn, $"%{search}%"))
                    );
                }

                // Category filter
                if (!string.IsNullOrEmpty(category))
                {
                    if (Guid.TryParse(category, out Guid catGuid))
                    {
                        query = query.Where(b => b.Categories.Any(c => c.Id == catGuid));
                    }
                    else
                    {
                        query = query.Where(b => b.Categories.Any(c => EF.Functions.ILike(c.Name, $"%{category}%")));
                    }
                }

                // Author filter
                if (!string.IsNullOrEmpty(author))
                {
                    if (Guid.TryParse(author, out Guid authGuid))
                    {
                        query = query.Where(b => b.Authors.Any(a => a.Id == authGuid));
                    }
                    else
                    {
                        query = query.Where(b => b.Authors.Any(a => EF.Functions.ILike(a.Name, $"%{author}%")));
                    }
                }

                // Publisher filter
                if (!string.IsNullOrEmpty(publisher))
                {
                    if (Guid.TryParse(publisher, out Guid pubGuid))
                    {
                        query = query.Where(b => b.PublisherId == pubGuid);
                    }
                    else
                    {
                        query = query.Where(b => b.Publisher != null && EF.Functions.ILike(b.Publisher.Name, $"%{publisher}%"));
                    }
                }

                // Status filter
                if (status == "rafta")
                {
                    query = query.Where(b => b.Stock > 0);
                }
                else if (status == "oduncte")
                {
                    query = query.Where(b => b.Stock == 0);
                }

                // Total items
                int totalItems = await query.CountAsync();

                // Sort Order & Sort By
                bool isDesc = sortOrder.ToUpper() == "DESC";
                if (sortBy.ToLower() == "publisher")
                {
                    query = isDesc
                        ? query.OrderByDescending(b => b.Publisher != null ? b.Publisher.Name : string.Empty)
                        : query.OrderBy(b => b.Publisher != null ? b.Publisher.Name : string.Empty);
                }
                else
                {
                    // Default sort by Title
                    query = isDesc ? query.OrderByDescending(b => b.Title) : query.OrderBy(b => b.Title);
                }

                // Pagination
                var books = await query
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .Select(b => new
                    {
                        id = b.Id,
                        title = b.Title,
                        isbn = b.Isbn,
                        description = b.Description,
                        stock = b.Stock,
                        totalQuantity = b.TotalQuantity,
                        shelfPosition = b.ShelfPosition,
                        publicationYear = b.PublicationYear,
                        publisherId = b.PublisherId,
                        createdAt = b.CreatedAt,
                        updatedAt = b.UpdatedAt,
                        deletedAt = b.DeletedAt,
                        authors = b.Authors.Select(a => new { id = a.Id, name = a.Name }).ToList(),
                        categories = b.Categories.Select(c => new { id = c.Id, name = c.Name }).ToList(),
                        publisher = b.Publisher != null ? new { id = b.Publisher.Id, name = b.Publisher.Name } : null,
                        reviews = b.Reviews.Select(r => new { id = r.Id, rating = r.Rating, comment = r.Comment }).ToList()
                    })
                    .ToListAsync();

                return Ok(new
                {
                    totalItems,
                    totalPages = (int)Math.Ceiling((double)totalItems / limit),
                    currentPage = page,
                    books
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("books/{id}")]
        public async Task<IActionResult> GetBook(Guid id)
        {
            try
            {
                var book = await _context.Books
                    .Include(b => b.Authors)
                    .Include(b => b.Categories)
                    .Include(b => b.Publisher)
                    .Include(b => b.Reviews)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (book == null) return NotFound(new { error = "Book not found." });

                return Ok(new
                {
                    id = book.Id,
                    title = book.Title,
                    isbn = book.Isbn,
                    description = book.Description,
                    stock = book.Stock,
                    totalQuantity = book.TotalQuantity,
                    shelfPosition = book.ShelfPosition,
                    publicationYear = book.PublicationYear,
                    publisherId = book.PublisherId,
                    createdAt = book.CreatedAt,
                    updatedAt = book.UpdatedAt,
                    deletedAt = book.DeletedAt,
                    authors = book.Authors.Select(a => new { id = a.Id, name = a.Name }).ToList(),
                    categories = book.Categories.Select(c => new { id = c.Id, name = c.Name }).ToList(),
                    publisher = book.Publisher != null ? new { id = book.Publisher.Id, name = book.Publisher.Name } : null,
                    reviews = book.Reviews.Select(r => new { id = r.Id, rating = r.Rating, comment = r.Comment }).ToList()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPost("books")]
        public async Task<IActionResult> CreateBook([FromBody] CreateBookRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Title)) return BadRequest(new { error = "Title is required." });

                if (request.PublisherId.HasValue && request.PublisherId != Guid.Empty)
                {
                    var pub = await _context.Publishers.FindAsync(request.PublisherId);
                    if (pub == null) return BadRequest(new { error = "Publisher not found." });
                }

                if (!string.IsNullOrEmpty(request.Isbn))
                {
                    var isbnExists = await _context.Books.AnyAsync(b => b.Isbn == request.Isbn);
                    if (isbnExists) return BadRequest(new { error = "ISBN must be unique." });
                }

                int bookStock = request.Stock ?? request.TotalQuantity ?? 0;
                int bookTotal = request.TotalQuantity ?? bookStock;

                var book = new Book
                {
                    Title = request.Title,
                    Description = request.Description,
                    Stock = bookStock,
                    TotalQuantity = bookTotal,
                    Isbn = request.Isbn,
                    ShelfPosition = request.ShelfPosition,
                    PublicationYear = request.PublicationYear,
                    PublisherId = request.PublisherId == Guid.Empty ? null : request.PublisherId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Books.Add(book);
                await _context.SaveChangesAsync();

                // Add Authors relations
                if (request.AuthorIds != null && request.AuthorIds.Count > 0)
                {
                    foreach (var authId in request.AuthorIds)
                    {
                        _context.BookAuthors.Add(new BookAuthor { BookId = book.Id, AuthorId = authId });
                    }
                }

                // Add Categories relations
                if (request.CategoryIds != null && request.CategoryIds.Count > 0)
                {
                    foreach (var catId in request.CategoryIds)
                    {
                        _context.BookCategories.Add(new BookCategory { BookId = book.Id, CategoryId = catId });
                    }
                }

                await _context.SaveChangesAsync();

                // Return completed
                return StatusCode(201, await GetBookDetails(book.Id));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpPut("books/{id}")]
        public async Task<IActionResult> UpdateBook(Guid id, [FromBody] CreateBookRequest request)
        {
            try
            {
                var book = await _context.Books.FindAsync(id);
                if (book == null) return NotFound(new { error = "Book not found." });

                if (request.PublisherId.HasValue && request.PublisherId != Guid.Empty)
                {
                    var pub = await _context.Publishers.FindAsync(request.PublisherId);
                    if (pub == null) return BadRequest(new { error = "Publisher not found." });
                }

                if (!string.IsNullOrEmpty(request.Isbn) && request.Isbn != book.Isbn)
                {
                    var isbnExists = await _context.Books.AnyAsync(b => b.Isbn == request.Isbn);
                    if (isbnExists) return BadRequest(new { error = "ISBN must be unique." });
                }

                book.Title = request.Title ?? book.Title;
                if (request.Description != null) book.Description = request.Description;
                if (request.Stock.HasValue) book.Stock = request.Stock.Value;
                if (request.TotalQuantity.HasValue) book.TotalQuantity = request.TotalQuantity.Value;
                if (request.Isbn != null) book.Isbn = request.Isbn;
                if (request.ShelfPosition != null) book.ShelfPosition = request.ShelfPosition;
                if (request.PublicationYear.HasValue) book.PublicationYear = request.PublicationYear.Value;
                if (request.PublisherId.HasValue) book.PublisherId = request.PublisherId == Guid.Empty ? null : request.PublisherId;
                book.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Sync Authors
                if (request.AuthorIds != null)
                {
                    var oldAuthors = await _context.BookAuthors.Where(ba => ba.BookId == id).ToListAsync();
                    _context.BookAuthors.RemoveRange(oldAuthors);
                    foreach (var authId in request.AuthorIds)
                    {
                        _context.BookAuthors.Add(new BookAuthor { BookId = id, AuthorId = authId });
                    }
                }

                // Sync Categories
                if (request.CategoryIds != null)
                {
                    var oldCategories = await _context.BookCategories.Where(bc => bc.BookId == id).ToListAsync();
                    _context.BookCategories.RemoveRange(oldCategories);
                    foreach (var catId in request.CategoryIds)
                    {
                        _context.BookCategories.Add(new BookCategory { BookId = id, CategoryId = catId });
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(await GetBookDetails(book.Id));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize(Roles = "ADMIN,STAFF")]
        [HttpDelete("books/{id}")]
        public async Task<IActionResult> DeleteBook(Guid id)
        {
            try
            {
                var book = await _context.Books.FindAsync(id);
                if (book == null) return NotFound(new { error = "Book not found." });

                book.DeletedAt = DateTime.UtcNow; // Soft delete
                await _context.SaveChangesAsync();
                return Ok(new { message = "Book deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private async Task<object?> GetBookDetails(Guid id)
        {
            return await _context.Books
                .Include(b => b.Authors)
                .Include(b => b.Categories)
                .Include(b => b.Publisher)
                .Include(b => b.Reviews)
                .Select(b => new
                {
                    id = b.Id,
                    title = b.Title,
                    isbn = b.Isbn,
                    description = b.Description,
                    stock = b.Stock,
                    totalQuantity = b.TotalQuantity,
                    shelfPosition = b.ShelfPosition,
                    publicationYear = b.PublicationYear,
                    publisherId = b.PublisherId,
                    createdAt = b.CreatedAt,
                    updatedAt = b.UpdatedAt,
                    deletedAt = b.DeletedAt,
                    authors = b.Authors.Select(a => new { id = a.Id, name = a.Name }).ToList(),
                    categories = b.Categories.Select(c => new { id = c.Id, name = c.Name }).ToList(),
                    publisher = b.Publisher != null ? new { id = b.Publisher.Id, name = b.Publisher.Name } : null,
                    reviews = b.Reviews.Select(r => new { id = r.Id, rating = r.Rating, comment = r.Comment }).ToList()
                })
                .FirstOrDefaultAsync(b => b.id == id);
        }
    }

    public class CreateAuthorRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Biography { get; set; }
    }

    public class CreateCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
    }

    public class CreatePublisherRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
    }

    public class CreateBookRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? Stock { get; set; }
        public int? TotalQuantity { get; set; }
        public string? Isbn { get; set; }
        public string? ShelfPosition { get; set; }
        public int? PublicationYear { get; set; }
        public Guid? PublisherId { get; set; }
        public List<Guid>? AuthorIds { get; set; }
        public List<Guid>? CategoryIds { get; set; }
    }
}
