const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateParentId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateParentLookupParams = validateParams({
  parentId: { required: true, type: 'objectId' },
});

const validateChildParam = validateParams({
  childId: { required: true, type: 'objectId' },
});

const validateStudentParam = validateParams({
  studentId: { required: true, type: 'objectId' },
});

const validateUnlinkStudentParams = validateParams({
  id: { required: true, type: 'objectId' },
  studentId: { required: true, type: 'objectId' },
});

const validateParentListQuery = validateQuery({
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 200 },
  search: { type: 'string', trim: true, maxLength: 120 },
}, { allowUnknown: true });

const validateCreateParent = validateBody({
  firstName: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 100 },
  lastName: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 100 },
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
  phone: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateUpdateParent = validateBody({
  firstName: { type: 'string', trim: true, minLength: 2, maxLength: 100 },
  lastName: { type: 'string', trim: true, minLength: 2, maxLength: 100 },
  email: { type: 'string', trim: true, format: 'email', maxLength: 120 },
  phone: { type: 'string', trim: true, maxLength: 30 },
  status: { type: 'string' },
}, { allowUnknown: true });

const validateSendMessage = validateBody({
  teacherId: { required: true, type: 'objectId' },
  childId: { type: 'objectId' },
  subject: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 250 },
  message: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 10000 },
}, { allowUnknown: true });

const validateLinkStudent = validateBody({
  studentId: { required: true, type: 'objectId' },
}, { allowUnknown: true });

/**
 * @swagger
 * /api/parents:
 *   post:
 *     summary: Create a parent (Admin only)
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Parent created successfully
 *   get:
 *     summary: Get all parents
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of parents
 */
router.post('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateCreateParent, parentController.createParent);

/**
 * @swagger
 * /api/parents:
 *   get:
 *     summary: Get all parents
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of parents
 */
router.get('/', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), validateParentListQuery, parentController.getParents);

/**
 * @swagger
 * /api/parents/profile:
 *   get:
 *     summary: Get parent's own profile
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parent profile
 */
router.get('/profile', protect, parentController.getMyProfile);

/**
 * @swagger
 * /api/parents/children:
 *   get:
 *     summary: Get parent's linked children
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked children
 */
router.get('/children', protect, parentController.getMyChildren);

/**
 * @swagger
 * /api/parents/children/{childId}:
 *   get:
 *     summary: Get a single child's information
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child's information
 */
router.get('/children/:childId', protect, validateChildParam, parentController.getChild);

/**
 * @swagger
 * /api/parents/link-requests:
 *   get:
 *     summary: Get parent's link requests status
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of link requests
 */
router.get('/link-requests', protect, parentController.getMyLinkRequests);

/**
 * @swagger
 * /api/parents/children/{childId}/grades:
 *   get:
 *     summary: Get child's grades
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child's grades
 */
router.get('/children/:childId/grades', protect, validateChildParam, parentController.getChildGrades);

/**
 * @swagger
 * /api/parents/children/{childId}/average:
 *   get:
 *     summary: Get child's average marks (no GPA)
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child's average marks
 */
router.get('/children/:childId/average', protect, validateChildParam, parentController.getChildAverage);

/**
 * @swagger
 * /api/parents/children/{childId}/attendance:
 *   get:
 *     summary: Get child's attendance
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child's attendance records
 */
router.get('/children/:childId/attendance', protect, validateChildParam, parentController.getChildAttendance);

/**
 * @swagger
 * /api/parents/children/{childId}/certificates:
 *   get:
 *     summary: Get child's certificates
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child's certificates
 */
router.get('/children/:childId/certificates', protect, validateChildParam, parentController.getChildCertificates);

/**
 * @swagger
 * /api/parents/children/{childId}/reports:
 *   get:
 *     summary: Get child's reports
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Child's reports
 */
router.get('/children/:childId/reports', protect, validateChildParam, parentController.getChildReports);

/**
 * @swagger
 * /api/parents/announcements:
 *   get:
 *     summary: Get announcements for parents
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of announcements
 */
router.get('/announcements', protect, parentController.getMyAnnouncements);

/**
 * @swagger
 * /api/parents/messages:
 *   post:
 *     summary: Send message to teacher
 *     tags: [Parents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacherId
 *               - subject
 *               - message
 *             properties:
 *               teacherId:
 *                 type: string
 *               childId:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/messages', protect, validateSendMessage, parentController.sendMessageToTeacher);

// ==================== ADMIN PARENT MANAGEMENT ====================
// Keep parameterized routes at the end to avoid shadowing static paths above.
router.get('/student/:studentId', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), validateStudentParam, parentController.getParentByStudent);
router.get('/:parentId/children', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher', 'Parent'), validateParentLookupParams, parentController.getChildren);
router.get('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), validateParentId, parentController.getParent);
router.put('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateParentId, validateUpdateParent, parentController.updateParent);
router.delete('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateParentId, parentController.deleteParent);
router.post('/:id/link-student', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateParentId, validateLinkStudent, parentController.linkStudent);
router.delete('/:id/unlink-student/:studentId', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUnlinkStudentParams, parentController.unlinkStudent);

module.exports = router;
