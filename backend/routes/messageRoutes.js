const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateMessageId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateInboxQuery = validateQuery({
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 200 },
  unreadOnly: { type: 'boolean' },
}, { allowUnknown: true });

const validateMessageCreate = validateBody({
  recipient: { required: true, type: 'objectId' },
  subject: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 250 },
  body: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 10000 },
}, { allowUnknown: true });

const validateBroadcastCreate = validateBody({
  targetRoles: { required: true, type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
  subject: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 250 },
  body: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 10000 },
}, { allowUnknown: true });

const validateMessageReply = validateBody({
  body: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 10000 },
}, { allowUnknown: true });

const validateBulkDelete = validateBody({
  ids: { required: true, type: 'array', minItems: 1, maxItems: 500, items: { type: 'string' } },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         sender:
 *           type: string
 *           description: Sender user ID
 *         recipient:
 *           type: string
 *           description: Recipient user ID
 *         subject:
 *           type: string
 *         body:
 *           type: string
 *         readStatus:
 *           type: boolean
 *         readAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *     MessageCreate:
 *       type: object
 *       required:
 *         - recipient
 *         - subject
 *         - body
 *       properties:
 *         recipient:
 *           type: string
 *         subject:
 *           type: string
 *         body:
 *           type: string
 *     BroadcastMessage:
 *       type: object
 *       required:
 *         - targetRoles
 *         - subject
 *         - body
 *       properties:
 *         targetRoles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [SystemAdmin, SchoolAdmin, Teacher, Student, Parent]
 *         subject:
 *           type: string
 *         body:
 *           type: string
 */

router.use(protect);

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send direct message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageCreate'
 *     responses:
 *       201:
 *         description: Message sent
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateMessageCreate, messageController.sendDirectMessage);

/**
 * @swagger
 * /api/messages/broadcast:
 *   post:
 *     summary: Send broadcast message to multiple users
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BroadcastMessage'
 *     responses:
 *       201:
 *         description: Broadcast message sent
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/broadcast', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateBroadcastCreate, messageController.sendBroadcast);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get inbox messages
 *     tags: [Messages]
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
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of received messages
 *       401:
 *         description: Unauthorized
 */
router.get('/', validateInboxQuery, messageController.getInbox);

/**
 * @swagger
 * /api/messages/sent:
 *   get:
 *     summary: Get sent messages
 *     tags: [Messages]
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
 *     responses:
 *       200:
 *         description: List of sent messages
 *       401:
 *         description: Unauthorized
 */
router.get('/sent', validateInboxQuery, messageController.getSentMessages);
router.get('/starred', messageController.getStarredMessages);
router.get('/conversations', messageController.getConversations);
router.get('/recipients', messageController.getAllowedRecipients);

/**
 * @swagger
 * /api/messages/unread:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread message count
 *       401:
 *         description: Unauthorized
 */
router.get('/unread', messageController.getUnreadCount);
router.put('/:id/read', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateMessageId, messageController.markAsRead);
router.put('/:id/unread', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateMessageId, messageController.markAsUnread);
router.put('/:id/star', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateMessageId, messageController.starMessage);
router.put('/:id/unstar', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateMessageId, messageController.unstarMessage);
router.post('/bulk-delete', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateBulkDelete, messageController.bulkDeleteMessages);

/**
 * @swagger
 * /api/messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
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
 *         description: Message details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Message not found
 */
router.get('/:id', validateMessageId, messageController.getMessageById);

/**
 * @swagger
 * /api/messages/{id}/reply:
 *   post:
 *     summary: Reply to message
 *     tags: [Messages]
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
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply sent
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Message not found
 */
router.post('/:id/reply', checkPermission(PERMISSIONS.WRITE, RESOURCES.MESSAGES), validateMessageId, validateMessageReply, messageController.replyToMessage);

/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
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
 *         description: Message deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Message not found
 */
router.delete('/:id', validateMessageId, messageController.deleteMessage);

module.exports = router;
