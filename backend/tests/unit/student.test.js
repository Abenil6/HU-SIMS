const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const { createAdminUser, createTeacherUser, createStudentUser, createParentUser } = require('../helpers/testHelpers');
const { createStudentData } = require('../helpers/testFactories');

describe('Student Controller', () => {
  let adminUser, adminToken;
  let studentUser, studentToken;

  beforeEach(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;

    const student = await createStudentUser(app);
    studentUser = student.user;
    studentToken = student.token;
  });

  describe('POST /api/students - Create student', () => {
    it('should create student with valid data', async () => {
      const studentData = createStudentData();

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(studentData);

      expect([200, 201]).toContain(response.status);
    });

    it('should store uploaded academic documents during student creation', async () => {
      const studentData = createStudentData({
        email: `student.docs.${Date.now()}@school.com`,
        grade: '9',
      });

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .field(
          'payload',
          JSON.stringify({
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            email: studentData.email,
            grade: studentData.grade
          })
        )
        .field(
          'academicDocumentsMeta',
          JSON.stringify([
            {
              category: 'Grade 8 Ministry Result',
              title: 'Grade 8 Ministry Result'
            },
            {
              category: 'Previous Grade Report',
              title: 'Grade 7 Report Card'
            }
          ])
        )
        .attach('academicDocuments', Buffer.from('%PDF-1.4 sample ministry result'), {
          filename: 'grade-8-result.pdf',
          contentType: 'application/pdf'
        })
        .attach('academicDocuments', Buffer.from('fake-image-bytes'), {
          filename: 'grade-7-report.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(201);

      const createdStudent = await User.findById(response.body.data._id);
      expect(createdStudent.studentProfile.academicDocuments).toHaveLength(2);
      expect(createdStudent.studentProfile.academicDocuments[0].category).toBe('Grade 8 Ministry Result');
      expect(createdStudent.studentProfile.academicDocuments[1].category).toBe('Previous Grade Report');
      expect(createdStudent.studentProfile.academicDocuments[0].storageKey).toBeTruthy();
      expect(createdStudent.studentProfile.academicDocuments[0].fileUrl).toContain('res.cloudinary.com');
    });

    it('should auto-create parent accounts from guardian emails and link them', async () => {
      const timestamp = Date.now();
      const studentData = createStudentData({
        email: `student.guardians.${timestamp}@school.com`,
        firstName: 'Mahi',
        lastName: 'Bekele',
        grade: '10',
        primaryGuardian: {
          fullName: 'Abebe Bekele',
          relationship: 'Father',
          phone: '+251900000111',
          email: `father.${timestamp}@school.com`,
          occupation: 'Engineer',
          address: 'Addis Ababa'
        },
        secondaryGuardian: {
          fullName: 'Tigist Bekele',
          relationship: 'Mother',
          phone: '+251900000222',
          email: `mother.${timestamp}@school.com`,
          occupation: 'Teacher',
          address: 'Addis Ababa'
        }
      });

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(studentData);

      expect(response.status).toBe(201);
      expect(response.body?.data?.studentProfile?.linkedParents).toHaveLength(2);

      const createdStudent = await User.findById(response.body.data._id);
      const createdParents = await User.find({
        email: {
          $in: [
            studentData.primaryGuardian.email,
            studentData.secondaryGuardian.email
          ]
        }
      });

      expect(createdStudent.studentProfile.linkedParents).toHaveLength(2);
      expect(createdParents).toHaveLength(2);
      createdParents.forEach((parent) => {
        expect(parent.role).toBe('Parent');
        expect(parent.parentProfile.linkedChildren.map((childId) => childId.toString()))
          .toContain(createdStudent._id.toString());
      });
    });

    it('should reuse an existing parent account when guardian email already belongs to a parent', async () => {
      const existingParent = await createParentUser(app);
      const studentData = createStudentData({
        email: `student.reuse.${Date.now()}@school.com`,
        grade: '11',
        primaryGuardian: {
          fullName: `${existingParent.user.firstName} ${existingParent.user.lastName}`,
          relationship: 'Father',
          phone: '+251900000333',
          email: existingParent.user.email,
          occupation: 'Architect',
          address: 'Hawassa'
        }
      });

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(studentData);

      expect(response.status).toBe(201);

      const parentCount = await User.countDocuments({ email: existingParent.user.email, role: 'Parent' });
      const reloadedParent = await User.findById(existingParent.user._id);

      expect(parentCount).toBe(1);
      expect(reloadedParent.parentProfile.linkedChildren.map((childId) => childId.toString()))
        .toContain(response.body.data._id);
    });

    it('should reject student creation when a guardian email belongs to a non-parent account', async () => {
      const conflictingTeacher = await createTeacherUser(app);
      const studentData = createStudentData({
        email: `student.conflict.${Date.now()}@school.com`,
        grade: '9',
        primaryGuardian: {
          fullName: 'Conflicting Guardian',
          relationship: 'Guardian',
          phone: '+251900000444',
          email: conflictingTeacher.user.email,
          occupation: 'Teacher',
          address: 'Adama'
        }
      });

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(studentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Guardian email already belongs to a non-parent account/i);

      const createdStudent = await User.findOne({ email: studentData.email });
      expect(createdStudent).toBeNull();
    });

    it('should reject creation without authentication', async () => {
      const studentData = createStudentData();

      const response = await request(app)
        .post('/api/students')
        .send(studentData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/students/profile - Get own profile', () => {
    it('should retrieve the logged-in student profile', async () => {
      const response = await request(app)
        .get('/api/students/profile')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body?.data?._id?.toString()).toBe(studentUser._id.toString());
    });
  });

  describe('PUT /api/students/:id - Update student', () => {
    it('should update student information', async () => {
      const response = await request(app)
        .put(`/api/students/${studentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ grade: 'Grade 11' });

      expect([200, 201]).toContain(response.status);
    });

    it('should replace/delete academic documents during student update', async () => {
      const createResponse = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .field(
          'payload',
          JSON.stringify({
            firstName: 'Document',
            lastName: 'Holder',
            email: `document.holder.${Date.now()}@school.com`,
            grade: '9'
          })
        )
        .field(
          'academicDocumentsMeta',
          JSON.stringify([
            {
              category: 'Grade 8 Ministry Result',
              title: 'Old Grade 8 Result'
            }
          ])
        )
        .attach('academicDocuments', Buffer.from('%PDF-1.4 old'), {
          filename: 'old-grade-8.pdf',
          contentType: 'application/pdf'
        });

      expect(createResponse.status).toBe(201);
      const createdStudentId = createResponse.body.data._id;
      const existingDocumentId = createResponse.body.data.studentProfile.academicDocuments[0]._id;

      const updateResponse = await request(app)
        .put(`/api/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field(
          'payload',
          JSON.stringify({
            firstName: 'Document',
            lastName: 'Holder',
            grade: '9'
          })
        )
        .field(
          'academicDocumentIdsToDelete',
          JSON.stringify([existingDocumentId])
        )
        .field(
          'academicDocumentsMeta',
          JSON.stringify([
            {
              category: 'Previous Grade Report',
              title: 'New Report'
            }
          ])
        )
        .attach('academicDocuments', Buffer.from('%PDF-1.4 new'), {
          filename: 'new-report.pdf',
          contentType: 'application/pdf'
        });

      expect(updateResponse.status).toBe(200);

      const updatedStudent = await User.findById(createdStudentId);
      expect(updatedStudent.studentProfile.academicDocuments).toHaveLength(1);
      expect(updatedStudent.studentProfile.academicDocuments[0].title).toBe('New Report');
      expect(updatedStudent.studentProfile.academicDocuments[0].category).toBe('Previous Grade Report');
    });

    it('should sync guardian-parent links when guardians change on update', async () => {
      const ts = Date.now();
      const createResponse = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createStudentData({
          email: `guardian.sync.student.${ts}@school.com`,
          grade: '10',
          primaryGuardian: {
            fullName: 'Old Father',
            relationship: 'Father',
            phone: '+251911111111',
            email: `old.father.${ts}@school.com`,
            occupation: 'Farmer',
            address: 'Addis Ababa'
          },
          secondaryGuardian: {
            fullName: 'Old Mother',
            relationship: 'Mother',
            phone: '+251922222222',
            email: `old.mother.${ts}@school.com`,
            occupation: 'Teacher',
            address: 'Addis Ababa'
          }
        }));

      expect(createResponse.status).toBe(201);
      const createdStudentId = createResponse.body.data._id;

      const updateResponse = await request(app)
        .put(`/api/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          primaryGuardian: {
            fullName: 'New Father',
            relationship: 'Father',
            phone: '+251933333333',
            email: `new.father.${ts}@school.com`,
            occupation: 'Engineer',
            address: 'Adama'
          },
          secondaryGuardian: null
        });

      expect(updateResponse.status).toBe(200);

      const updatedStudent = await User.findById(createdStudentId);
      const linkedParentIds = updatedStudent.studentProfile.linkedParents.map((id) => id.toString());
      const oldFather = await User.findOne({ email: `old.father.${ts}@school.com` });
      const oldMother = await User.findOne({ email: `old.mother.${ts}@school.com` });
      const newFather = await User.findOne({ email: `new.father.${ts}@school.com` });

      expect(newFather).toBeTruthy();
      expect(linkedParentIds).toContain(newFather._id.toString());
      expect(linkedParentIds).not.toContain(oldFather._id.toString());
      expect(linkedParentIds).not.toContain(oldMother._id.toString());
    });
  });

  describe('GET /api/students/:id/academic-documents/:documentId/download', () => {
    it('should download protected academic documents for authorized users', async () => {
      const createResponse = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .field(
          'payload',
          JSON.stringify({
            firstName: 'Protected',
            lastName: 'Document',
            email: `protected.document.${Date.now()}@school.com`,
            grade: '9'
          })
        )
        .field(
          'academicDocumentsMeta',
          JSON.stringify([
            {
              category: 'Grade 8 Ministry Result',
              title: 'Protected Grade 8'
            }
          ])
        )
        .attach('academicDocuments', Buffer.from('%PDF-1.4 protected'), {
          filename: 'protected-grade-8.pdf',
          contentType: 'application/pdf'
        });

      expect(createResponse.status).toBe(201);
      const createdStudentId = createResponse.body.data._id;
      const documentId = createResponse.body.data.studentProfile.academicDocuments[0]._id;

      const response = await request(app)
        .get(`/api/students/${createdStudentId}/academic-documents/${documentId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment;');
      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('should block direct public access to academic document static path', async () => {
      const response = await request(app)
        .get('/uploads/students/academic-documents/2026/01/some-file.pdf');

      expect(response.status).toBe(403);
      expect(response.body?.message).toMatch(/require authenticated access/i);
    });
  });

  describe('DELETE /api/students/:id - Delete student', () => {
    it('should delete student', async () => {
      const tempStudent = await createStudentUser(app);

      const response = await request(app)
        .delete(`/api/students/${tempStudent.user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
