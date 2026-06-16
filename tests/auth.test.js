const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

describe('Auth API', () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user before each test
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'EMPLOYEE',
      },
    });
  });

  describe('POST /api/auth/login', () => {
    it('nên đăng nhập thành công với thông tin đúng', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'EMPLOYEE',
      });
    });

    it('nên báo lỗi nếu sai mật khẩu', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email hoặc mật khẩu không chính xác');
    });

    it('nên báo lỗi nếu email không tồn tại', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email hoặc mật khẩu không chính xác');
    });

    it('nên báo lỗi nếu thiếu email hoặc password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email và mật khẩu không được bỏ trống');
    });
  });
});
