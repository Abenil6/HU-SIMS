const express = require('express');
const router = express.Router();
const academicRecordController = require('../controllers/academicRecordController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateAcademicRecordId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateRecordsQuery = validateQuery({
  student: { type: 'objectId' },
  studentId: { type: 'objectId' },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  semester: { type: 'string', enum: ['Semester 1', 'Semester 2'] },
  status: { type: 'string', trim: true, maxLength: 40 },
  grade: { type: 'string', trim: true, maxLength: 30 },
  subject: { type: 'string', trim: true, maxLength: 120 },
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 200 },
}, { allowUnknown: true });

const validateAcademicRecordCreate = validateBody({
  student: { required: true, type: 'objectId' },
  subject: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 120 },
  academicYear: { required: true, type: 'string', trim: true, maxLength: 30 },
  semester: { required: true, type: 'string', enum: ['Semester 1', 'Semester 2'] },
  marks: { type: 'object' },
  comments: { type: 'string', trim: true, maxLength: 2000 },
}, { allowUnknown: true });

const validateGradeCreate = validateBody({
  studentId: { required: true, type: 'objectId' },
  subject: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 120 },
  score: { required: true, type: 'number', min: 0, max: 1000 },
  maxScore: { type: 'number', min: 1, max: 1000 },
  percentage: { type: 'number', min: 0, max: 100 },
  weight: { type: 'number', min: 0, max: 100 },
  semester: { type: 'string', enum: ['Semester 1', 'Semester 2'] },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateGradeBulkCreate = validateBody({
  grades: { required: true, type: 'array', minItems: 1, maxItems: 2000 },
}, { allowUnknown: true });

const validateRecordUpdate = validateBody({
  marks: { type: 'object' },
  comments: { type: 'string', trim: true, maxLength: 2000 },
  score: { type: 'number', min: 0, max: 1000 },
  maxScore: { type: 'number', min: 1, max: 1000 },
  weight: { type: 'number', min: 0, max: 100 },
}, { allowUnknown: true });

const validateRejectBody = validateBody({
  reason: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 2000 },
}, { allowUnknown: true });

const validateHonorRollUpdate = validateBody({
  academicYear: { required: true, type: 'string', trim: true, maxLength: 30 },
  semester: { required: true, type: 'string', enum: ['Semester 1', 'Semester 2'] },
}, { allowUnknown: true });

const validatePerformanceQuery = validateQuery({
  studentId: { type: 'objectId' },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  semester: { type: 'string', enum: ['Semester 1', 'Semester 2'] },
  honorRollType: { type: 'string', trim: true, maxLength: 40 },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Marks:
 *       type: object
 *       properties:
 *         midExam:
 *           type: number
 *           minimum: 0
 *           maximum: 20
 *           description: Mid Exam (out of 20)
 *         finalExam:
 *           type: number
 *           minimum: 0
 *           maximum: 40
 *           description: Final Exam (out of 40)
 *         classQuiz:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *           description: Class Quiz (out of 10)
 *         continuousAssessment:
 *           type: number
 *           minimum: 0
 *           maximum: 10
 *           description: Continuous Assessment (out of 10)
 *         assignment:
 *           type: number
 *           minimum: 0
 *           maximum: 20
 *           description: Assignment (out of 20)
 *     AcademicRecordCreate:
 *       type: object
 *       required:
 *         - student
 *         - subject
 *         - academicYear
 *         - semester
 *       properties:
 *         student:
 *           type: string
 *           description: Student ID
 *         subject:
 *           type: string
 *         academicYear:
 *           type: string
 *           example: "2025-2026"
 *         semester:
 *           type: string
 *           enum: ["Semester 1", "Semester 2"]
 *         marks:
 *           $ref: '#/components/schemas/Marks'
 *         comments:
 *           type: string
 */

router.use(protect);

/**
 * @swagger
 * /api/academic-records:
 *   get:
 *     summary: Get all academic records
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *           enum: [Semester 1, Semester 2]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of academic records
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validateRecordsQuery, academicRecordController.getAcademicRecords);

/**
 * @swagger
 * /api/academic-records:
 *   post:
 *     summary: Create academic record with marks components
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademicRecordCreate'
 *     responses:
 *       201:
 *         description: Academic record created
 */
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordCreate, academicRecordController.createAcademicRecord);

// ==================== GRADES ENDPOINTS (Alias for Academic Records) ====================

/**
 * @swagger
 * /api/academic-records/grades:
 *   get:
 *     summary: Get all grades (academic records) with filters
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: grade
 *         schema:
 *           type: string
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of grades
 */
router.get('/grades', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validateRecordsQuery, academicRecordController.getAcademicRecords);

/**
 * @swagger
 * /api/academic-records/grades:
 *   post:
 *     summary: Create a new grade (academic record)
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               subject:
 *                 type: string
 *               score:
 *                 type: number
 *               maxScore:
 *                 type: number
 *               percentage:
 *                 type: number
 *               weight:
 *                 type: number
 *               semester:
 *                 type: string
 *               academicYear:
 *                 type: string
 *     responses:
 *       201:
 *         description: Grade created successfully
 */
router.post('/grades', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateGradeCreate, academicRecordController.createAcademicRecordFromGrade);

/**
 * @swagger
 * /api/academic-records/grades/bulk:
 *   post:
 *     summary: Bulk create grades
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grades:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     subject:
 *                       type: string
 *                     score:
 *                       type: number
 *                     maxScore:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     weight:
 *                       type: number
 *                     semester:
 *                       type: string
 *                     academicYear:
 *                       type: string
 *     responses:
 *       201:
 *         description: Grades created successfully
 */
router.post('/grades/bulk', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateGradeBulkCreate, academicRecordController.bulkCreateGrades);

/**
 * @swagger
 * /api/academic-records/grades/{id}:
 *   put:
 *     summary: Update grade
 *     tags: [Academic Records]
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
 *               score:
 *                 type: number
 *               maxScore:
 *                 type: number
 *               weight:
 *                 type: number
 *     responses:
 *       200:
 *         description: Grade updated successfully
 */
router.put('/grades/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, validateRecordUpdate, academicRecordController.updateAcademicRecord);

/**
 * @swagger
 * /api/academic-records/grades/{id}:
 *   delete:
 *     summary: Delete grade
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grade deleted successfully
 */
router.delete('/grades/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, academicRecordController.deleteAcademicRecord);

/**
 * @swagger
 * /api/academic-records/{id}:
 *   get:
 *     summary: Get academic record by ID
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Academic record details
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, academicRecordController.getAcademicRecordById);

/**
 * @swagger
 * /api/academic-records/{id}:
 *   put:
 *     summary: Update academic record marks
 *     tags: [Academic Records]
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
 *               marks:
 *                 $ref: '#/components/schemas/Marks'
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Academic record updated
 */
router.put('/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, validateRecordUpdate, academicRecordController.updateAcademicRecord);

/**
 * @swagger
 * /api/academic-records/{id}:
 *   delete:
 *     summary: Delete academic record
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Academic record deleted
 */
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, academicRecordController.deleteAcademicRecord);

/**
 * @swagger
 * /api/academic-records/{id}/submit:
 *   post:
 *     summary: Submit grade for approval
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grade submitted
 */
router.post('/:id/submit', checkPermission(PERMISSIONS.WRITE, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, academicRecordController.submitForApproval);

/**
 * @swagger
 * /api/academic-records/{id}/approve:
 *   post:
 *     summary: Approve grade (Admin)
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grade approved
 */
router.post('/:id/approve', checkPermission(PERMISSIONS.APPROVE, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, academicRecordController.approveGrade);

/**
 * @swagger
 * /api/academic-records/{id}/reject:
 *   post:
 *     summary: Reject grade (Admin)
 *     tags: [Academic Records]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade rejected
 */
router.post('/:id/reject', checkPermission(PERMISSIONS.APPROVE, RESOURCES.ACADEMIC_RECORDS), validateAcademicRecordId, validateRejectBody, academicRecordController.rejectGrade);

/**
 * @swagger
 * /api/academic-records/{id}/unlock:
 *   post:
 *     summary: Unlock grade for editing (Admin)
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grade unlocked
 */
router.post('/:id/unlock', authorize('SchoolAdmin'), validateAcademicRecordId, academicRecordController.unlockGrade);

/**
 * @swagger
 * /api/academic-records/{id}/lock:
 *   post:
 *     summary: Lock grade (Admin)
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grade locked
 */
router.post('/:id/lock', authorize('SchoolAdmin'), validateAcademicRecordId, academicRecordController.lockGrade);

/**
 * @swagger
 * /api/academic-records/approvals/pending:
 *   get:
 *     summary: Get pending approvals (Admin)
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending approvals
 */
router.get('/approvals/pending', authorize('SchoolAdmin'), academicRecordController.getPendingApprovals);

/**
 * @swagger
 * /api/academic-records/performance/student:
 *   get:
 *     summary: Get student performance
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student performance data
 */
router.get('/performance/student', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validatePerformanceQuery, academicRecordController.getStudentPerformance);

/**
 * @swagger
 * /api/academic-records/performance/class:
 *   get:
 *     summary: Get class performance statistics
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *           enum: [Semester 1, Semester 2]
 *     responses:
 *       200:
 *         description: Class performance statistics
 */
router.get('/performance/class', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validatePerformanceQuery, academicRecordController.getClassPerformance);

/**
 * @swagger
 * /api/academic-records/honor-roll/status:
 *   get:
 *     summary: Get student honor roll status
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Honor roll status
 */
router.get('/honor-roll/status', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validatePerformanceQuery, academicRecordController.getHonorRollStatus);

/**
 * @swagger
 * /api/academic-records/honor-roll/update:
 *   post:
 *     summary: Update honor roll status for a semester (Admin/Teacher)
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               academicYear:
 *                 type: string
 *               semester:
 *                 type: string
 *     responses:
 *       200:
 *         description: Honor roll status updated
 */
router.post('/honor-roll/update', authorize(['SchoolAdmin', 'Teacher']), validateHonorRollUpdate, academicRecordController.updateHonorRollStatus);

/**
 * @swagger
 * /api/academic-records/honor-roll/list:
 *   get:
 *     summary: Get honor roll list for a semester
 *     tags: [Academic Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *       - in: query
 *         name: honorRollType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Honor roll list
 */
router.get('/honor-roll/list', checkPermission(PERMISSIONS.READ, RESOURCES.ACADEMIC_RECORDS), validatePerformanceQuery, academicRecordController.getHonorRollList);

module.exports = router;
