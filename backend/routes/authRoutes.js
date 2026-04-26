const express = require('express');
const router = express.Router();
const {
  login,
  verifyEmailAndSetPassword,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  verifyTwoFactorLogin,
  logout,
  getMe,
  updateMe,
  updateAppearance,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateBody } = require('../utils/validateInput');

const validateLogin = validateBody({
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
  password: { required: true, type: 'string', minLength: 1, maxLength: 256 },
});

const validateTwoFactor = validateBody({
  challengeToken: { required: true, type: 'string', minLength: 8, maxLength: 2000 },
  code: { required: true, type: 'string', minLength: 4, maxLength: 10, trim: true },
});

const validateTokenAndPassword = validateBody({
  token: { required: true, type: 'string', minLength: 8, maxLength: 4096, trim: true },
  password: { required: true, type: 'string', minLength: 8, maxLength: 256 },
});

const validateEmailOnly = validateBody({
  email: { required: true, type: 'string', trim: true, format: 'email', maxLength: 120 },
});

const validateProfileUpdate = validateBody({
  firstName: { type: 'string', trim: true, maxLength: 100 },
  lastName: { type: 'string', trim: true, maxLength: 100 },
  email: { type: 'string', trim: true, format: 'email', maxLength: 120 },
  phone: { type: 'string', trim: true, maxLength: 30 },
  profileImage: { type: 'string', maxLength: 5000 },
}, { allowUnknown: true });

const validateChangePassword = validateBody({
  currentPassword: { required: true, type: 'string', minLength: 1, maxLength: 256 },
  newPassword: { required: true, type: 'string', minLength: 8, maxLength: 256 },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: johndoe@example.com
 *         password:
 *           type: string
 *           example: secret123
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         token:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             username:
 *               type: string
 *             role:
 *               type: string
 *               enum: [SystemAdmin, SchoolAdmin, Teacher, Student, Parent]
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             phone:
 *               type: string
 *             profileImage:
 *               type: string
 *     VerifyEmailRequest:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 8
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 8
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *         newPassword:
 *           type: string
 *           minLength: 8
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 */
router.post('/login', validateLogin, login);
router.post('/verify-2fa', validateTwoFactor, verifyTwoFactorLogin);
router.post('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email and set password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email', validateTokenAndPassword, verifyEmailAndSetPassword);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified
 */
router.post('/resend-verification', validateEmailOnly, resendVerificationEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: If account exists, reset email sent
 */
router.post('/forgot-password', validateEmailOnly, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', validateTokenAndPassword, resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authorized
 *   put:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user profile
 */
router.get('/me', protect, getMe);
router.put('/me', protect, validateProfileUpdate, updateMe);
router.put('/appearance', protect, updateAppearance);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (authenticated user)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.post('/change-password', protect, validateChangePassword, changePassword);

module.exports = router;
