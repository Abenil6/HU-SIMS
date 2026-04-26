const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateUserId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateStudentId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateUsersQuery = validateQuery({
  role: { type: 'string', enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] },
  status: { type: 'string', trim: true, maxLength: 30 },
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: 500 },
  search: { type: 'string', trim: true, maxLength: 120 },
  grade: { type: 'string', trim: true, maxLength: 30 },
  stream: { type: 'string', trim: true, maxLength: 30 },
  section: { type: 'string', trim: true, maxLength: 30 },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateCreateUser = validateBody({
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
  username: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 80 },
  role: { required: true, type: 'string', enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] },
  firstName: { type: 'string', trim: true, maxLength: 100 },
  lastName: { type: 'string', trim: true, maxLength: 100 },
  phone: { type: 'string', trim: true, maxLength: 30 },
  grade: { type: 'string', trim: true, maxLength: 30 },
  section: { type: 'string', trim: true, maxLength: 30 },
  stream: { type: 'string', trim: true, maxLength: 30 },
  subject: { type: 'string', trim: true, maxLength: 120 },
}, { allowUnknown: true });

const validateBulkCreateStudents = validateBody({
  students: { required: true, type: 'array', minItems: 1, maxItems: 5000 },
  defaultGrade: { type: 'string', trim: true, maxLength: 30 },
  defaultSection: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateUpdateUser = validateBody({
  email: { type: 'string', trim: true, format: 'email', maxLength: 120 },
  username: { type: 'string', trim: true, minLength: 2, maxLength: 80 },
  firstName: { type: 'string', trim: true, maxLength: 100 },
  lastName: { type: 'string', trim: true, maxLength: 100 },
  status: { type: 'string', trim: true, maxLength: 30 },
  role: { type: 'string', enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] },
}, { allowUnknown: true });

const validateRequestLink = validateBody({
  studentId: { required: true, type: 'objectId' },
}, { allowUnknown: true });

const validateManageLink = validateBody({
  parentId: { required: true, type: 'objectId' },
  action: { required: true, type: 'string', enum: ['approve', 'reject'] },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID
 *         email:
 *           type: string
 *           description: User email
 *         username:
 *           type: string
 *           description: Username
 *         role:
 *           type: string
 *           enum: [SystemAdmin, SchoolAdmin, Teacher, Student, Parent]
 *           description: User role
 *         status:
 *           type: string
 *           enum: [Active, Inactive, Pending]
 *           description: Account status
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *     UserCreate:
 *       type: object
 *       required:
 *         - email
 *         - username
 *         - role
 *       properties:
 *         email:
 *           type: string
 *         username:
 *           type: string
 *         role:
 *           type: string
 *           enum: [SystemAdmin, SchoolAdmin, Teacher, Student, Parent]
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         grade:
 *           type: string
 *         section:
 *           type: string
 *           description: Legacy; use stream for Grade 11-12 (Natural/Social)
 *         stream:
 *           type: string
 *           description: For Grade 11-12 only (Natural, Social)
 *         subject:
 *           type: string
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
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
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUsersQuery, adminUserController.getAllUsers);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateCreateUser, adminUserController.createUser);

/**
 * @swagger
 * /api/admin/users/bulk:
 *   post:
 *     summary: Bulk create students from CSV data
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               students:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     firstName: { type: string }
 *                     lastName: { type: string }
 *                     email: { type: string }
 *                     grade: { type: string }
 *                     section: { type: string }
 *               defaultGrade: { type: string }
 *               defaultSection: { type: string }
 *     responses:
 *       200:
 *         description: Bulk upload result
 */
router.post('/bulk', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateBulkCreateStudents, adminUserController.bulkCreateStudents);

// ==================== STUDENT MANAGEMENT ====================

/**
 * @swagger
 * /api/admin/users/students:
 *   get:
 *     summary: Get all students with pagination and filters
 *     tags: [Admin Users]
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
 *         name: grade
 *         schema:
 *           type: string
 *         description: Filter by grade
 *       - in: query
 *         name: stream
 *         schema:
 *           type: string
 *         description: Filter by stream
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of students
 */
router.get('/students', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), validateUsersQuery, adminUserController.getStudents);

/**
 * @swagger
 * /api/admin/users/students-by-class:
 *   get:
 *     summary: Get students filtered by grade and stream (or section)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grade
 *         schema:
 *           type: string
 *         description: Grade level (9, 10, 11, 12)
 *       - in: query
 *         name: section
 *         schema:
 *           type: string
 *         description: Section or stream (Natural/Social for Grade 11-12)
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of students
 */
router.get('/students-by-class', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), validateUsersQuery, adminUserController.getStudentsByClass);

// ==================== USER BY ID ====================

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin Users]
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
 *         description: User details
 */
router.get('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUserId, adminUserController.getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Admin Users]
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
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUserId, validateUpdateUser, adminUserController.updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin Users]
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
 *         description: User deleted successfully
 */
router.delete('/:id', protect, authorize('SystemAdmin'), validateUserId, adminUserController.deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/resend-verify:
 *   post:
 *     summary: Resend verification email
 *     tags: [Admin Users]
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
 *         description: Verification email sent
 */
router.post('/:id/resend-verify', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUserId, adminUserController.resendVerification);

/**
 * @swagger
 * /api/admin/users/{id}/deactivate:
 *   post:
 *     summary: Deactivate user
 *     tags: [Admin Users]
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
 *         description: User deactivated
 */
router.post('/:id/deactivate', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUserId, adminUserController.deactivateUser);

/**
 * @swagger
 * /api/admin/users/{id}/activate:
 *   post:
 *     summary: Activate user
 *     tags: [Admin Users]
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
 *         description: User activated
 */
router.post('/:id/activate', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUserId, adminUserController.activateUser);

/**
 * @swagger
 * /api/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Admin Users]
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
 *         description: Password reset email sent
 */
router.post('/:id/reset-password', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateUserId, adminUserController.resetUserPassword);

// ==================== PARENT-STUDENT LINKING ====================

/**
 * @swagger
 * /api/admin/users/{id}/request-link:
 *   post:
 *     summary: Request to link parent to a student
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Link request sent
 */
router.post('/:id/request-link', protect, authorize('Parent', 'SystemAdmin', 'SchoolAdmin'), validateUserId, validateRequestLink, adminUserController.requestParentLink);

/**
 * @swagger
 * /api/admin/users/students/{id}/manage-link:
 *   post:
 *     summary: Approve or reject a parent link request
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *     responses:
 *       200:
 *         description: Request processed
 */
router.post('/students/:id/manage-link', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Student'), validateStudentId, validateManageLink, adminUserController.manageParentLink);

/**
 * @swagger
 * /api/admin/users/students/{id}/parent-requests:
 *   get:
 *     summary: Get pending parent link requests for a student
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: List of pending requests
 */
router.get('/students/:id/parent-requests', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Student'), validateStudentId, adminUserController.getParentLinkRequests);

/**
 * @swagger
 * /api/admin/users/students/{id}/parent-links:
 *   get:
 *     summary: Get linked parents for a student
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: List of linked parents
 */
router.get('/students/:id/parent-links', protect, authorize('SystemAdmin', 'SchoolAdmin', 'Student', 'Parent'), validateStudentId, adminUserController.getStudentParentLinks);

module.exports = router;
