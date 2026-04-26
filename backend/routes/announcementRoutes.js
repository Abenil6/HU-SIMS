const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateAnnouncementId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateAnnouncementQuery = validateQuery({
  type: { type: 'string', enum: ['General', 'Academic', 'Event', 'Holiday', 'Emergency', 'Fee'] },
  published: { type: 'boolean' },
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 200 },
}, { allowUnknown: true });

const validateAnnouncementCreate = validateBody({
  title: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 200 },
  content: { required: true, type: 'string', trim: true, minLength: 5, maxLength: 10000 },
  type: { type: 'string', enum: ['General', 'Academic', 'Event', 'Holiday', 'Emergency', 'Fee'] },
  priority: { type: 'string', enum: ['Low', 'Normal', 'High', 'Urgent'] },
  targetRoles: { type: 'array', items: { type: 'string' }, maxItems: 10 },
  targetGrades: { type: 'array', items: { type: 'string' }, maxItems: 30 },
  publishStartDate: { type: 'date' },
  publishEndDate: { type: 'date' },
}, { allowUnknown: true });

const validateAnnouncementUpdate = validateBody({
  title: { type: 'string', trim: true, minLength: 2, maxLength: 200 },
  content: { type: 'string', trim: true, minLength: 5, maxLength: 10000 },
  type: { type: 'string', enum: ['General', 'Academic', 'Event', 'Holiday', 'Emergency', 'Fee'] },
  priority: { type: 'string', enum: ['Low', 'Normal', 'High', 'Urgent'] },
  targetRoles: { type: 'array', items: { type: 'string' }, maxItems: 10 },
  targetGrades: { type: 'array', items: { type: 'string' }, maxItems: 30 },
  published: { type: 'boolean' },
  publishStartDate: { type: 'date' },
  publishEndDate: { type: 'date' },
}, { allowUnknown: true });

const validateDashboardActivityQuery = validateQuery({
  limit: { type: 'number', min: 1, max: 200 },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [General, Academic, Event, Holiday, Emergency, Fee]
 *         priority:
 *           type: string
 *           enum: [Low, Normal, High, Urgent]
 *         targetRoles:
 *           type: array
 *           items:
 *             type: string
 *         targetGrades:
 *           type: array
 *           items:
 *             type: string
 *         published:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ==================== PUBLIC/PROTECTED ANNOUNCEMENTS ====================

/**
 * @swagger
 * /api/announcements/public:
 *   get:
 *     summary: Get published announcements for landing page (no auth required)
 *     tags: [Announcements]
 *     responses:
 *       200:
 *         description: List of published announcements
 */
router.get('/public', announcementController.getPublicAnnouncements);

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get announcements visible to current user
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of announcements
 */
router.get('/', protect, announcementController.getMyAnnouncements);

// ==================== ADMIN ANNOUNCEMENTS ====================

/**
 * @swagger
 * /api/announcements/admin:
 *   get:
 *     summary: Get all announcements (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: published
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of all announcements
 */
router.get('/admin', protect, authorize('SchoolAdmin'), validateAnnouncementQuery, announcementController.getAnnouncements);

/**
 * @swagger
 * /api/announcements/admin:
 *   post:
 *     summary: Create a new announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [General, Academic, Event, Holiday, Emergency, Fee]
 *               priority:
 *                 type: string
 *                 enum: [Low, Normal, High, Urgent]
 *               targetRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetGrades:
 *                 type: array
 *                 items:
 *                   type: string
 *               publishStartDate:
 *                 type: string
 *                 format: date-time
 *               publishEndDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Announcement created
 */
router.post('/admin', protect, authorize('SchoolAdmin'), validateAnnouncementCreate, announcementController.createAnnouncement);

/**
 * @swagger
 * /api/announcements/admin/{id}:
 *   get:
 *     summary: Get announcement by ID
 *     tags: [Announcements]
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
 *         description: Announcement details
 */
router.get('/admin/:id', protect, authorize('SchoolAdmin'), validateAnnouncementId, announcementController.getAnnouncementById);

/**
 * @swagger
 * /api/announcements/admin/{id}:
 *   put:
 *     summary: Update announcement
 *     tags: [Announcements]
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
 *         description: Announcement updated
 */
router.put('/admin/:id', protect, authorize('SchoolAdmin'), validateAnnouncementId, validateAnnouncementUpdate, announcementController.updateAnnouncement);

/**
 * @swagger
 * /api/announcements/admin/{id}:
 *   delete:
 *     summary: Delete announcement
 *     tags: [Announcements]
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
 *         description: Announcement deleted
 */
router.delete('/admin/:id', protect, authorize('SchoolAdmin'), validateAnnouncementId, announcementController.deleteAnnouncement);

/**
 * @swagger
 * /api/announcements/admin/{id}/toggle-publish:
 *   post:
 *     summary: Toggle announcement published status
 *     tags: [Announcements]
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
 *         description: Status toggled
 */
router.post('/admin/:id/toggle-publish', protect, authorize('SchoolAdmin'), validateAnnouncementId, announcementController.togglePublish);

// ==================== DASHBOARD ====================

/**
 * @swagger
 * /api/announcements/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard/stats', protect, authorize('SchoolAdmin', 'Teacher'), announcementController.getDashboardStats);

/**
 * @swagger
 * /api/announcements/dashboard/activity:
 *   get:
 *     summary: Get recent activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recent activity list
 */
router.get('/dashboard/activity', protect, authorize('SchoolAdmin'), validateDashboardActivityQuery, announcementController.getRecentActivity);

router.get('/:id', protect, validateAnnouncementId, announcementController.getAnnouncementById);
router.put('/:id/read', protect, validateAnnouncementId, announcementController.markAsRead);

module.exports = router;
