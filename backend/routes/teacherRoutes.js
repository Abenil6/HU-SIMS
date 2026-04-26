const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateTeacherId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateTeacherClassParams = validateParams({
  grade: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 20 },
  section: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 50 },
});

const validateTeacherCreate = validateBody({
  firstName: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 100 },
  lastName: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 100 },
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
  qualification: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 200 },
  phone: { type: 'string', trim: true, maxLength: 30 },
  gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
  specialization: { type: 'string', trim: true, maxLength: 120 },
  subjects: { type: 'array', maxItems: 50, items: { type: 'string' } },
  classes: { type: 'array', maxItems: 50 },
  address: { type: 'object' },
}, { allowUnknown: true });

const validateTeacherUpdate = validateBody({
  firstName: { type: 'string', trim: true, minLength: 2, maxLength: 100 },
  lastName: { type: 'string', trim: true, minLength: 2, maxLength: 100 },
  email: { type: 'string', trim: true, format: 'email', maxLength: 120 },
  phone: { type: 'string', trim: true, maxLength: 30 },
  status: { type: 'string' },
  teacherProfile: { type: 'object' },
}, { allowUnknown: true });

const validateTeacherListQuery = validateQuery({
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 200 },
  search: { type: 'string', trim: true, maxLength: 120 },
  subject: { type: 'string', trim: true, maxLength: 120 },
  status: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateTeacherGradesQuery = validateQuery({
  status: { type: 'string', trim: true, maxLength: 30 },
  classGrade: { type: 'string', trim: true, maxLength: 30 },
  section: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateAddGrade = validateBody({
  studentId: { required: true, type: 'objectId' },
  subject: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 120 },
  grade: { required: true, type: 'number', min: 0, max: 100 },
  assessmentType: { type: 'string', trim: true, maxLength: 50 },
  comments: { type: 'string', trim: true, maxLength: 2000 },
}, { allowUnknown: true });

const validateBulkAddGrades = validateBody({
  grades: { required: true, type: 'array', minItems: 1, maxItems: 500 },
}, { allowUnknown: true });

const validateMarkAttendance = validateBody({
  class: { type: 'string', trim: true, maxLength: 120 },
  date: { type: 'date' },
  records: { type: 'array', minItems: 1, maxItems: 500 },
}, { allowUnknown: true });

const validateClassReport = validateBody({
  class: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 120 },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  semester: { type: 'string', enum: ['Semester 1', 'Semester 2'] },
}, { allowUnknown: true });

/**
 * @swagger
 * /api/teachers:
 *   post:
 *     summary: Create a new teacher (Admin only)
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - qualification
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *               qualification:
 *                 type: string
 *               specialization:
 *                 type: string
 *               subjects:
 *                 type: array
 *                 items:
 *                   type: string
 *               classes:
 *                 type: array
 *               address:
 *                 type: object
 *     responses:
 *       201:
 *         description: Teacher created successfully
 *       400:
 *         description: Email already exists
 */
router.post('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateTeacherCreate, teacherController.createTeacher);

/**
 * @swagger
 * /api/teachers:
 *   get:
 *     summary: Get all teachers (Admin only)
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of teachers
 */
router.get('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateTeacherListQuery, teacherController.getTeachers);

/**
 * @swagger
 * /api/teachers/{id}:
 *   put:
 *     summary: Update a teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *               teacherProfile:
 *                 type: object
 *     responses:
 *       200:
 *         description: Teacher updated
 */
router.put('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateTeacherId, validateTeacherUpdate, teacherController.updateTeacher);
router.delete('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateTeacherId, teacherController.deleteTeacher);

/**
 * @swagger
 * /api/teachers/profile:
 *   get:
 *     summary: Get teacher's own profile
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher profile
 */
router.get('/profile', protect, teacherController.getMyProfile);

/**
 * @swagger
 * /api/teachers/classes:
 *   get:
 *     summary: Get teacher's assigned classes
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned classes
 */
router.get('/classes', protect, teacherController.getMyClasses);

/**
 * @swagger
 * /api/teachers/students:
 *   get:
 *     summary: Get students assigned to the teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned students
 */
router.get('/students', protect, teacherController.getMyStudents);

/**
 * @swagger
 * /api/teachers/classes/{grade}/{section}/students:
 *   get:
 *     summary: Get students in a class (section or stream for Grade 11-12)
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grade
 *         required: true
 *         schema:
 *           type: string
 *         description: Grade level (9, 10, 11, 12)
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *         description: Section or stream (Natural/Social for Grade 11-12)
 *     responses:
 *       200:
 *         description: List of students
 */
router.get('/classes/:grade/:section/students', protect, validateTeacherClassParams, teacherController.getClassStudents);

/**
 * @swagger
 * /api/teachers/schedule:
 *   get:
 *     summary: Get teacher's schedule
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher schedule
 */
router.get('/schedule', protect, teacherController.getMySchedule);

/**
 * @swagger
 * /api/teachers/grades:
 *   get:
 *     summary: Get teacher's grades
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: classGrade
 *         schema:
 *           type: string
 *       - in: query
 *         name: section
 *         schema:
 *           type: string
 *         description: Section or stream (for Grade 11-12)
 *     responses:
 *       200:
 *         description: List of grades
 */
router.get('/grades', protect, validateTeacherGradesQuery, teacherController.getMyGrades);

/**
 * @swagger
 * /api/teachers/grades:
 *   post:
 *     summary: Add grade for a student
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - subject
 *               - grade
 *             properties:
 *               studentId:
 *                 type: string
 *               subject:
 *                 type: string
 *               grade:
 *                 type: number
 *               assessmentType:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Grade added
 */
router.post('/grades', protect, validateAddGrade, teacherController.addGrade);

/**
 * @swagger
 * /api/teachers/grades/bulk:
 *   post:
 *     summary: Bulk add grades for a class
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Grades added
 */
router.post('/grades/bulk', protect, validateBulkAddGrades, teacherController.bulkAddGrades);

/**
 * @swagger
 * /api/teachers/attendance:
 *   get:
 *     summary: Get teacher's attendance records
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance records
 */
router.get('/attendance', protect, teacherController.getMyAttendance);

/**
 * @swagger
 * /api/teachers/attendance:
 *   post:
 *     summary: Mark attendance for a class
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Attendance marked
 */
router.post('/attendance', protect, validateMarkAttendance, teacherController.markAttendance);

/**
 * @swagger
 * /api/teachers/reports/class:
 *   post:
 *     summary: Generate class progress report
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Report generated
 */
router.post('/reports/class', protect, validateClassReport, teacherController.generateClassReport);

/**
 * @swagger
 * /api/teachers/announcements:
 *   get:
 *     summary: Get announcements for teachers
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of announcements
 */
router.get('/announcements', protect, teacherController.getMyAnnouncements);

/**
 * @swagger
 * /api/teachers/approvals/pending:
 *   get:
 *     summary: Get pending grade approvals
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending approvals
 */
router.get('/approvals/pending', protect, teacherController.getPendingApprovals);

module.exports = router;
