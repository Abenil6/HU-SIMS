const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser } = require('../helpers/testHelpers');
const { createExamScheduleData } = require('../helpers/testFactories');
const ExamSchedule = require('../../models/ExamSchedule');

describe('Exam Schedule Controller', () => {
  let adminToken;
  let teacherToken;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminToken = admin.token;

    const teacher = await createTeacherUser(app);
    teacherToken = teacher.token;
  });

  describe('POST /api/exam-schedules', () => {
    it('creates an exam schedule with valid data', async () => {
      const response = await request(app)
        .post('/api/exam-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createExamScheduleData({ room: 'Room 101', invigilator: 'Jane Doe' }));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe('Mathematics');
    });

    it('rejects a conflicting room at the same time', async () => {
      const date = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await ExamSchedule.create({
        ...createExamScheduleData({
          examName: 'Physics Midterm Exam',
          subject: 'Physics',
          date,
          room: 'Room 102',
          invigilator: 'Teacher One'
        })
      });

      const response = await request(app)
        .post('/api/exam-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          createExamScheduleData({
            examName: 'Chemistry Midterm Exam',
            subject: 'Chemistry',
            date,
            room: 'Room 102',
            invigilator: 'Teacher Two'
          })
        );

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Room "Room 102" is already assigned at that time/);
    });

    it('rejects more than two exams in the same day for one grade and stream', async () => {
      const date = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await ExamSchedule.create([
        createExamScheduleData({
          examName: 'Biology Midterm Exam',
          subject: 'Biology',
          date,
          startTime: '08:00',
          endTime: '10:00',
          room: 'Room 103',
          invigilator: 'Teacher Three'
        }),
        createExamScheduleData({
          examName: 'English Midterm Exam',
          subject: 'English',
          date,
          startTime: '11:00',
          endTime: '13:00',
          room: 'Room 104',
          invigilator: 'Teacher Four'
        })
      ]);

      const response = await request(app)
        .post('/api/exam-schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          createExamScheduleData({
            examName: 'History Midterm Exam',
            subject: 'History',
            date,
            startTime: '14:00',
            endTime: '16:00',
            room: 'Room 105',
            invigilator: 'Teacher Five'
          })
        );

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/only have 2 exams per day/);
    });
  });

  describe('GET /api/exam-schedules', () => {
    it('retrieves exam schedules for authorized users', async () => {
      const response = await request(app)
        .get('/api/exam-schedules')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('filters by exam type', async () => {
      const response = await request(app)
        .get('/api/exam-schedules')
        .query({ examType: 'Midterm' })
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((schedule) => {
        expect(schedule.examType).toBe('Midterm');
      });
    });
  });

  describe('PUT /api/exam-schedules/:id', () => {
    it('updates an exam schedule', async () => {
      const schedule = await ExamSchedule.create(
        createExamScheduleData({
          examName: 'Geography Midterm Exam',
          subject: 'Geography',
          room: 'Room 106',
          invigilator: 'Teacher Six'
        })
      );

      const response = await request(app)
        .put(`/api/exam-schedules/${schedule._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ room: 'Exam Hall 2', notes: 'Updated room allocation' });

      expect(response.status).toBe(200);
      expect(response.body.data.room).toBe('Exam Hall 2');
      expect(response.body.data.notes).toBe('Updated room allocation');
    });
  });

  describe('DELETE /api/exam-schedules/:id', () => {
    it('deletes an exam schedule', async () => {
      const schedule = await ExamSchedule.create(
        createExamScheduleData({
          examName: 'Economics Final Exam',
          subject: 'Economics',
          examType: 'Final',
          room: 'Room 107',
          invigilator: 'Teacher Seven'
        })
      );

      const response = await request(app)
        .delete(`/api/exam-schedules/${schedule._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
