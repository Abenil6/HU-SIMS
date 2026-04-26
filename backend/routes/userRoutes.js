const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody } = require('../utils/validateInput');

const validateCreateUser = validateBody({
  username: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 80 },
  password: { required: true, type: 'string', minLength: 8, maxLength: 256 },
  role: { required: true, type: 'string', enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] },
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
}, { allowUnknown: true });

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [SystemAdmin, SchoolAdmin, Teacher, Student, Parent]
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: User creation failed
 */
router.post('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), validateCreateUser, createUser);
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', protect, authorize('SystemAdmin', 'SchoolAdmin'), getUsers);


module.exports = router;
