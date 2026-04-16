const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');

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
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getTimetables);

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
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), timetableController.createTimetable);

// Generation flow
router.post('/generate/precheck', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), timetableController.precheckGeneration);
router.post('/generate', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), timetableController.generateTimetable);
router.get('/versions', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getTimetableVersions);
router.post('/versions/compare', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.compareTimetableVersions);

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
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getTimetableById);

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
router.put('/:id', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), timetableController.updateTimetable);
router.post('/:id/publish', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), timetableController.publishTimetable);
router.post('/:id/lock', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), timetableController.setTimetableLock);
router.post('/:id/rollback', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), timetableController.rollbackTimetableVersion);

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
router.delete('/:id', checkPermission(PERMISSIONS.DELETE, RESOURCES.TIMETABLES), timetableController.deleteTimetable);

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
router.post('/:id/periods', checkPermission(PERMISSIONS.WRITE, RESOURCES.TIMETABLES), timetableController.addPeriod);

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
router.delete('/:id/periods', checkPermission(PERMISSIONS.EDIT, RESOURCES.TIMETABLES), timetableController.removePeriod);

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
router.get('/schedule/teacher', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getTeacherSchedule);

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
router.get('/schedule/class', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getClassSchedule);

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
router.post('/check-conflicts', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.checkConflicts);

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
router.get('/classes', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getClasses);

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
router.get('/years', checkPermission(PERMISSIONS.READ, RESOURCES.TIMETABLES), timetableController.getAcademicYears);

module.exports = router;
