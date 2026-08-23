const request = require('supertest');
const app = require('../src/app');
const { Book, User, Borrowing, Publisher } = require('../src/models');

describe('Borrowing Endpoints & Service', () => {
  let userToken;
  let adminToken;
  let testBook;
  let testPublisher;

  beforeAll(async () => {
    // Register test admin
    await request(app)
      .post('/auth/register')
      .send({
        name: 'Admin User',
        email: 'testadmin@example.com',
        password: 'password123',
        role: 'ADMIN'
      });

    // Login test admin
    const adminLoginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'testadmin@example.com',
        password: 'password123'
      });
    adminToken = adminLoginRes.body.token;

    // Register test user
    await request(app)
      .post('/auth/register')
      .send({
        name: 'Normal User',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'USER'
      });

    // Login test user
    const userLoginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123'
      });
    userToken = userLoginRes.body.token;

    // Create a publisher
    testPublisher = await Publisher.create({
      name: 'Test Publisher',
      address: 'Test Address'
    });
  });

  beforeEach(async () => {
    // Clear borrowing records
    await Borrowing.destroy({ where: {}, cascade: true });
    await Book.destroy({ where: {}, cascade: true });

    // Create a mock book with stock 2
    testBook = await Book.create({
      title: 'Testing Book',
      description: 'A book for integration tests.',
      stock: 2,
      publisherId: testPublisher.id
    });
  });

  describe('POST /borrowings', () => {
    it('should borrow a book successfully, decrement stock, and log activity', async () => {
      const res = await request(app)
        .post('/borrowings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: testBook.id });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Book borrowed successfully.');
      expect(res.body.borrowing).toHaveProperty('status', 'borrowed');

      // Verify book stock was decremented to 1
      const updatedBook = await Book.findByPk(testBook.id);
      expect(updatedBook.stock).toEqual(1);
    });

    it('should prevent double borrowing of the same book by the same user', async () => {
      // First borrow
      await request(app)
        .post('/borrowings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: testBook.id });

      // Second borrow attempt
      const res = await request(app)
        .post('/borrowings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: testBook.id });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'You have already borrowed this book and not returned it yet.');
    });

    it('should fail to borrow if book is out of stock', async () => {
      // Set stock to 0
      await testBook.update({ stock: 0 });

      const res = await request(app)
        .post('/borrowings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: testBook.id });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Book is out of stock. You can reserve it instead.');
    });
  });

  describe('PATCH /borrowings/:id/return', () => {
    it('should successfully return a book and increment stock', async () => {
      // Borrow book first
      const borrowRes = await request(app)
        .post('/borrowings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: testBook.id });

      const borrowingId = borrowRes.body.borrowing.id;

      // Return book
      const returnRes = await request(app)
        .patch(`/borrowings/${borrowingId}/return`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(returnRes.statusCode).toEqual(200);
      expect(returnRes.body).toHaveProperty('message', 'Book returned successfully.');
      expect(returnRes.body.borrowing).toHaveProperty('status', 'returned');

      // Verify stock was incremented back to 2
      const updatedBook = await Book.findByPk(testBook.id);
      expect(updatedBook.stock).toEqual(2);
    });
  });
});
