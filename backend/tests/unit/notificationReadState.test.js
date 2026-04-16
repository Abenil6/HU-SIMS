const request = require('supertest');
const app = require('../../server');
const { createStudentUser } = require('../helpers/testHelpers');

describe('Notification Read State Controller', () => {
  let studentUser;
  let studentToken;

  beforeAll(async () => {
    const student = await createStudentUser(app);
    studentUser = student.user;
    studentToken = student.token;
  });

  describe('POST /api/notification-read-states/read', () => {
    it('stores a notification read state for the current user', async () => {
      const response = await request(app)
        .post('/api/notification-read-states/read')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ key: 'grade:record-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('grade:record-1');
      expect(response.body.data.readAt).toBeTruthy();
    });

    it('rejects empty notification keys', async () => {
      const response = await request(app)
        .post('/api/notification-read-states/read')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ key: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notification-read-states', () => {
    it('returns only the current user read states', async () => {
      await request(app)
        .post('/api/notification-read-states/read')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ key: 'grade:record-2' });

      const otherStudent = await createStudentUser(app);
      await request(app)
        .post('/api/notification-read-states/read')
        .set('Authorization', `Bearer ${otherStudent.token}`)
        .send({ key: 'grade:record-3' });

      const response = await request(app)
        .get('/api/notification-read-states')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data['grade:record-2']).toBeTruthy();
      expect(response.body.data['grade:record-3']).toBeUndefined();
    });

    it('filters by requested keys', async () => {
      await request(app)
        .post('/api/notification-read-states/read')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ key: 'timetable:item-1' });

      const response = await request(app)
        .get('/api/notification-read-states')
        .query({ keys: 'timetable:item-1,missing:item' })
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data['timetable:item-1']).toBeTruthy();
      expect(response.body.data['missing:item']).toBeUndefined();
    });
  });
});
