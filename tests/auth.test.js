const request = require('supertest');
const app = require('../src/app');
const { User, Role } = require('../src/models');

describe('Auth Endpoints & Service', () => {
  beforeEach(async () => {
    // Clean users before each test
    await User.destroy({ where: {}, cascade: true });
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user with USER role', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
          role: 'USER'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Registration successful.');
      expect(res.body.user).toHaveProperty('email', 'jane@example.com');
      expect(res.body.user).toHaveProperty('role', 'USER');

      // Verify db entry
      const dbUser = await User.findOne({
        where: { email: 'jane@example.com' },
        include: [{ model: Role, as: 'roles' }]
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser.name).toEqual('Jane Doe');
      expect(dbUser.roles[0].name).toEqual('USER');
    });

    it('should fail registration if email already exists', async () => {
      // Pre-register
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123'
        });

      // Try duplicate
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Another Jane',
          email: 'jane@example.com',
          password: 'password999'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'User with this email already exists.');
    });

    it('should fail if required fields are missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'jane@example.com'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Name, email, and password are required.');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a user to log in
      await request(app)
        .post('/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          role: 'USER'
        });
    });

    it('should login successfully and return a JWT access token', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Login successful.');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'john@example.com');
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid email/member-no or password.');
    });
  });
});
