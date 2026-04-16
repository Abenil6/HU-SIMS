const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser, createStudentUser } = require('../helpers/testHelpers');
const { createAnnouncementData } = require('../helpers/testFactories');
const Announcement = require('../../models/Announcement');

describe('Announcement Controller', () => {
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

  describe('POST /api/announcements - Create announcement', () => {
    it('should create announcement with valid data', async () => {
      const announcementData = createAnnouncementData({
        createdBy: adminUser._id
      });

      const response = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(announcementData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/announcements')
        .send(createAnnouncementData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/announcements - Get announcements', () => {
    it('should retrieve announcements for user role', async () => {
      const response = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/announcements/:id - Update announcement', () => {
    it('should update announcement', async () => {
      const announcement = await Announcement.create({
        title: 'Test Announcement',
        content: 'Test content',
        targetRoles: ['Student'],
        createdBy: adminUser._id
      });

      const response = await request(app)
        .put(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Announcement' });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/announcements/:id - Delete announcement', () => {
    it('should delete announcement', async () => {
      const announcement = await Announcement.create({
        title: 'Delete Test',
        content: 'Test content',
        targetRoles: ['Student'],
        createdBy: adminUser._id
      });

      const response = await request(app)
        .delete(`/api/announcements/${announcement._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
