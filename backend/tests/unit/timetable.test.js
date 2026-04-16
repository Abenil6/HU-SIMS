const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser } = require('../helpers/testHelpers');
const { createTimetableData } = require('../helpers/testFactories');
const Timetable = require('../../models/Timetable');

describe('Timetable Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const teacher = await createTeacherUser(app);
    teacherUser = teacher.user;
    teacherToken = teacher.token;
  });

  describe('POST /api/timetable - Create timetable entry', () => {
    it('should create timetable entry with valid data', async () => {
      const timetableData = createTimetableData({
        teacher: teacherUser._id
      });

      const response = await request(app)
        .post('/api/timetable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(timetableData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/timetable')
        .send(createTimetableData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/timetable - Get timetable', () => {
    it('should retrieve timetable entries', async () => {
      const response = await request(app)
        .get('/api/timetable')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/timetable/:id - Update timetable entry', () => {
    it('should update timetable entry', async () => {
      const entry = await Timetable.create({
        class: 'Grade 10 A',
        day: 'Monday',
        period: 1,
        subject: 'Mathematics',
        teacher: teacherUser._id,
        startTime: '08:00',
        endTime: '08:45'
      });

      const response = await request(app)
        .put(`/api/timetable/${entry._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room: 'Room 102' });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/timetable/:id - Delete timetable entry', () => {
    it('should delete timetable entry', async () => {
      const entry = await Timetable.create({
        class: 'Grade 10 A',
        day: 'Tuesday',
        period: 2,
        subject: 'Science',
        teacher: teacherUser._id,
        startTime: '09:00',
        endTime: '09:45'
      });

      const response = await request(app)
        .delete(`/api/timetable/${entry._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
