const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser, createStudentUser } = require('../helpers/testHelpers');
const { createMessageData } = require('../helpers/testFactories');
const Message = require('../../models/Message');

describe('Message Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;
  let studentUser, studentToken;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const teacher = await createTeacherUser(app);
    teacherUser = teacher.user;
    teacherToken = teacher.token;

    const student = await createStudentUser(app);
    studentUser = student.user;
    studentToken = student.token;
  });

  describe('POST /api/messages - Send message', () => {
    it('should send message to recipient', async () => {
      const messageData = createMessageData({
        sender: teacherUser._id,
        recipient: studentUser._id
      });

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(messageData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject sending without authentication', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send(createMessageData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/messages/received - Get received messages', () => {
    it('should retrieve received messages', async () => {
      const response = await request(app)
        .get('/api/messages/received')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/messages/sent - Get sent messages', () => {
    it('should retrieve sent messages', async () => {
      const response = await request(app)
        .get('/api/messages/sent')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/messages/:id/read - Mark message as read', () => {
    it('should mark message as read', async () => {
      const message = await Message.create({
        sender: teacherUser._id,
        recipient: studentUser._id,
        subject: 'Test',
        body: 'Test message',
        readStatus: false
      });

      const response = await request(app)
        .put(`/api/messages/${message._id}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/messages/:id - Delete message', () => {
    it('should delete message', async () => {
      const message = await Message.create({
        sender: teacherUser._id,
        recipient: studentUser._id,
        subject: 'Delete Test',
        body: 'Test message'
      });

      const response = await request(app)
        .delete(`/api/messages/${message._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
