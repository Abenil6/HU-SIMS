const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateTimetableId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateTimetableQuery = validateQuery({
  class: { type: 'string', trim: true, maxLength: 120 },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  semester: { type: 'string', enum: ['Semester 1', 'Semester 2'] },
}, { allowUnknown: true });

const validateTimetableBody = validateBody({
  class: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 120 },
  section: { type: 'string', trim: true, maxLength: 60 },
  academicYear: { required: true, type: 'string', trim: true, maxLength: 30 },
  semester: { required: true, type: 'string', enum: ['Semester 1', 'Semester 2'] },
  schedule: { type: 'array', minItems: 1, maxItems: 500 },
}, { allowUnknown: true });

const validateGenerationBody = validateBody({
  class: { type: 'string', trim: true, maxLength: 120 },
  grade: { type: 'string', trim: true, maxLength: 30 },
  section: { type: 'string', trim: true, maxLength: 60 },
  academicYear: { required: true, type: 'string', trim: true, maxLength: 30 },
  semester: { required: true, type: 'string', enum: ['Semester 1', 'Semester 2'] },
}, { allowUnknown: true });

const validateCompareBody = validateBody({
  sourceVersionId: { required: true, type: 'objectId' },
  targetVersionId: { required: true, type: 'objectId' },
}, { allowUnknown: true });

const validateConflictBody = validateBody({
  class: { type: 'string', trim: true, maxLength: 120 },
  teacher: { type: 'objectId' },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  semester: { type: 'string', enum: ['Semester 1', 'Semester 2'] },
}, { allowUnknown: true });

const validatePeriodsBody = validateBody({
  period: { type: 'number', min: 1, max: 20 },
  day: { type: 'string', trim: true, maxLength: 20 },
  subject: { type: 'string', trim: true, maxLength: 120 },
  teacher: { type: 'objectId' },
}, { allowUnknown: true });

router.use(protect);

/**
 * @swagger
 * /api/timetable:
 *   get:
 *     summary: Get all timetables
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: class
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
 *     responses:
 *       200:
 *         description: List of timetables
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), validateTimetableQuery, timetableController.getTimetables);

/**
 * @swagger
 * /api/timetable:
 *   post:
 *     summary: Create timetable
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class:
 *                 type: string
 *               section:
 *                 type: string
 *                 description: Section or stream (for Grade 11-12)
 *               academicYear:
 *                 type: string
 *               semester:
 *                 type: string
 *                 enum: [Semester 1, Semester 2]
 *               schedule:
 *                 type: array
 *     responses:
 *       201:
 *         description: Timetable created
 */
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), validateTimetableBody, timetableController.createTimetable);

// Generation flow
router.post('/generate/precheck', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), validateGenerationBody, timetableController.precheckGeneration);
router.post('/generate', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), validateGenerationBody, timetableController.generateTimetable);
router.get('/versions', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getTimetableVersions);
router.post('/versions/compare', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), validateCompareBody, timetableController.compareTimetableVersions);
router.get('/schedule/teacher', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), validateTimetableQuery, timetableController.getTeacherSchedule);
router.get('/schedule/class', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), validateTimetableQuery, timetableController.getClassSchedule);
router.post('/check-conflicts', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), validateConflictBody, timetableController.checkConflicts);
router.get('/classes', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getClasses);
router.get('/years', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getAcademicYears);

/**
 * @swagger
 * /api/timetable/{id}:
 *   get:
 *     summary: Get timetable by ID
 *     tags: [Timetable]
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
 *         description: Timetable details
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), validateTimetableId, timetableController.getTimetableById);

/**
 * @swagger
 * /api/timetable/{id}:
 *   put:
 *     summary: Update timetable
 *     tags: [Timetable]
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
 *         description: Timetable updated
 */
router.put('/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), validateTimetableId, validateTimetableBody, timetableController.updateTimetable);
router.post('/:id/publish', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), validateTimetableId, timetableController.publishTimetable);
router.post('/:id/unpublish', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), validateTimetableId, timetableController.unpublishTimetable);
router.post('/:id/lock', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), validateTimetableId, timetableController.setTimetableLock);
router.post('/:id/rollback', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), validateTimetableId, timetableController.rollbackTimetableVersion);

/**
 * @swagger
 * /api/timetable/{id}:
 *   delete:
 *     summary: Delete timetable
 *     tags: [Timetable]
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
 *         description: Timetable deleted
 */
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.TIMETABLES), validateTimetableId, timetableController.deleteTimetable);

/**
 * @swagger
 * /api/timetable/{id}/periods:
 *   post:
 *     summary: Add period to timetable
 *     tags: [Timetable]
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
 *         description: Period added
 */
router.post('/:id/periods', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), validateTimetableId, validatePeriodsBody, timetableController.addPeriod);

/**
 * @swagger
 * /api/timetable/{id}/periods:
 *   delete:
 *     summary: Remove period from timetable
 *     tags: [Timetable]
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
 *         description: Period removed
 */
router.delete('/:id/periods', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), validateTimetableId, validatePeriodsBody, timetableController.removePeriod);

/**
 * @swagger
 * /api/timetable/schedule/teacher:
 *   get:
 *     summary: Get teacher schedule
 *     tags: [Timetable]
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
 *         description: Teacher schedule
 */

/**
 * @swagger
 * /api/timetable/schedule/class:
 *   get:
 *     summary: Get class schedule
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: class
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
 *     responses:
 *       200:
 *         description: Class schedule
 */

/**
 * @swagger
 * /api/timetable/check-conflicts:
 *   post:
 *     summary: Check for timetable conflicts
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conflicts check result
 */

/**
 * @swagger
 * /api/timetable/classes:
 *   get:
 *     summary: Get all unique classes
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of classes
 */

/**
 * @swagger
 * /api/timetable/years:
 *   get:
 *     summary: Get all academic years
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of academic years
 */
module.exports = router;
