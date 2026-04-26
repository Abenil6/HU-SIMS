const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateContactMessageId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validatePublicContactForm = validateBody({
  name: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 120 },
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
  subject: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 200 },
  message: { required: true, type: 'string', trim: true, minLength: 5, maxLength: 5000 },
}, { allowUnknown: true });

const validateContactAdminQuery = validateQuery({
  status: { type: 'string', enum: ['New', 'Read', 'Replied', 'Archived'] },
  priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 200 },
}, { allowUnknown: true });

const validateContactStatusUpdate = validateBody({
  status: { type: 'string', enum: ['New', 'Read', 'Replied', 'Archived'] },
  priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
}, { allowUnknown: true });

const validateContactResponse = validateBody({
  response: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 10000 },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     ContactMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         subject:
 *           type: string
 *         message:
 *           type: string
 *         status:
 *           type: string
 *           enum: [New, Read, Replied, Archived]
 *         priority:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ==================== PUBLIC CONTACT FORM ====================

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit a contact form message (no auth required)
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *       400:
 *         description: Validation error
 */
router.post('/', validatePublicContactForm, contactController.submitContactForm);

// ==================== ADMIN CONTACT MANAGEMENT ====================

/**
 * @swagger
 * /api/contact/admin:
 *   get:
 *     summary: Get all contact messages (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [New, Read, Replied, Archived]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High, Urgent]
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
 *         description: List of contact messages
 */
router.get('/admin', protect, authorize('SchoolAdmin', 'SystemAdmin'), validateContactAdminQuery, contactController.getAllContactMessages);

/**
 * @swagger
 * /api/contact/admin/stats:
 *   get:
 *     summary: Get contact message statistics (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact statistics
 */
router.get('/admin/stats', protect, authorize('SchoolAdmin', 'SystemAdmin'), contactController.getContactStats);

/**
 * @swagger
 * /api/contact/admin/{id}:
 *   get:
 *     summary: Get a single contact message by ID (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message details
 */
router.get('/admin/:id', protect, authorize('SchoolAdmin', 'SystemAdmin'), validateContactMessageId, contactController.getContactMessageById);

/**
 * @swagger
 * /api/contact/admin/{id}:
 *   put:
 *     summary: Update contact message status (Admin only)
 *     tags: [Contact]
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
 *               status:
 *                 type: string
 *                 enum: [New, Read, Replied, Archived]
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Urgent]
 *     responses:
 *       200:
 *         description: Contact message updated
 */
router.put('/admin/:id', protect, authorize('SchoolAdmin', 'SystemAdmin'), validateContactMessageId, validateContactStatusUpdate, contactController.updateContactMessageStatus);

/**
 * @swagger
 * /api/contact/admin/{id}/respond:
 *   post:
 *     summary: Respond to a contact message (Admin only)
 *     tags: [Contact]
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
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response sent successfully
 */
router.post('/admin/:id/respond', protect, authorize('SchoolAdmin', 'SystemAdmin'), validateContactMessageId, validateContactResponse, contactController.respondToContactMessage);

/**
 * @swagger
 * /api/contact/admin/{id}:
 *   delete:
 *     summary: Delete a contact message (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message deleted
 */
router.delete('/admin/:id', protect, authorize('SchoolAdmin', 'SystemAdmin'), validateContactMessageId, contactController.deleteContactMessage);

module.exports = router;
