const express = require('express');
const router = express.Router();
const absenceAlertController = require('../controllers/absenceAlertController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     AbsenceAlert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         student:
 *           type: string
 *           description: Student ID
 *         date:
 *           type: string
 *           format: date
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [Pending, Acknowledged, Resolved]
 *         notificationSent:
 *           type: boolean
 *         notifiedParents:
 *           type: array
 *           items:
 *             type: string
 *         parentResponse:
 *           type: string
 *         resolution:
 *           type: string
 *     AbsenceAlertCreate:
 *       type: object
 *       required:
 *         - student
 *         - date
 *       properties:
 *         student:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         reason:
 *           type: string
 */

router.use(protect);

/**
 * @swagger
 * /api/absence-alerts/parent:
 *   get:
 *     summary: Get alerts for parent's children
 *     tags: [Absence Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of absence alerts
 *       401:
 *         description: Unauthorized
 */
router.get('/parent', absenceAlertController.getParentAlerts);

/**
 * @swagger
 * /api/absence-alerts/{id}/read:
 *   post:
 *     summary: Mark alert as read by parent
 *     tags: [Absence Alerts]
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
 *         description: Alert marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 */
router.post('/:id/read', absenceAlertController.markAsRead);

/**
 * @swagger
 * /api/absence-alerts/{id}/respond:
 *   post:
 *     summary: Parent responds to alert
 *     tags: [Absence Alerts]
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
 *               response:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response recorded
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/respond', absenceAlertController.respondToAlert);

/**
 * @swagger
 * /api/absence-alerts/student:
 *   get:
 *     summary: Get alerts for student
 *     tags: [Absence Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of absence alerts
 *       401:
 *         description: Unauthorized
 */
router.get('/student', absenceAlertController.getStudentAlerts);

/**
 * @swagger
 * /api/absence-alerts:
 *   get:
 *     summary: Get all absence alerts (Admin/Teacher)
 *     tags: [Absence Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of absence alerts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), absenceAlertController.getAbsenceAlerts);

/**
 * @swagger
 * /api/absence-alerts:
 *   post:
 *     summary: Create absence alert
 *     tags: [Absence Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AbsenceAlertCreate'
 *     responses:
 *       201:
 *         description: Alert created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), absenceAlertController.createAbsenceAlert);

/**
 * @swagger
 * /api/absence-alerts/batch:
 *   post:
 *     summary: Create multiple absence alerts
 *     tags: [Absence Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alerts:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AbsenceAlertCreate'
 *     responses:
 *       201:
 *         description: Alerts created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/batch', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), absenceAlertController.batchCreateAlerts);

/**
 * @swagger
 * /api/absence-alerts/{id}/notify:
 *   post:
 *     summary: Send notification to parents
 *     tags: [Absence Alerts]
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
 *         description: Notification sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Alert not found
 */
router.post('/:id/notify', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), absenceAlertController.sendNotification);

/**
 * @swagger
 * /api/absence-alerts/{id}/resolve:
 *   post:
 *     summary: Resolve absence alert
 *     tags: [Absence Alerts]
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
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert resolved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Alert not found
 */
router.post('/:id/resolve', checkPermission(PERMISSIONS.WRITE, RESOURCES.ATTENDANCE), absenceAlertController.resolveAlert);

/**
 * @swagger
 * /api/absence-alerts/stats:
 *   get:
 *     summary: Get absence alert statistics
 *     tags: [Absence Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Alert statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats', checkPermission(PERMISSIONS.READ, RESOURCES.ATTENDANCE), absenceAlertController.getAlertStats);

module.exports = router;
