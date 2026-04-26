const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams, validateQuery } = require('../utils/validateInput');

const validateCertificateId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateCertificateQuery = validateQuery({
  studentId: { type: 'objectId' },
  certificateType: { type: 'string', enum: ['Completion', 'Transfer', 'Character', 'Bonafide'] },
  status: { type: 'string', enum: ['Draft', 'Issued', 'Cancelled', 'Replaced'] },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
}, { allowUnknown: true });

const validateCertificateCreate = validateBody({
  certificateType: { required: true, type: 'string', enum: ['Completion', 'Transfer', 'Character', 'Bonafide'] },
  studentId: { required: true, type: 'objectId' },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  title: { type: 'string', trim: true, maxLength: 200 },
  recipientName: { type: 'string', trim: true, maxLength: 150 },
  notes: { type: 'string', trim: true, maxLength: 5000 },
}, { allowUnknown: true });

const validateGenerateCertificate = validateBody({
  studentId: { required: true, type: 'objectId' },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  signerName: { type: 'string', trim: true, maxLength: 120 },
  signerTitle: { type: 'string', trim: true, maxLength: 120 },
  transferTo: { type: 'string', trim: true, maxLength: 200 },
}, { allowUnknown: true });

const validateVerifyCertificate = validateBody({
  certificateNumber: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 120 },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Certificate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         student:
 *           type: string
 *           description: Student ID
 *         certificateType:
 *           type: string
 *           enum: [Completion, Transfer, Character, Bonafide]
 *         certificateNumber:
 *           type: string
 *         issueDate:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [Draft, Issued, Cancelled, Replaced]
 *         notes:
 *           type: string
 *     CertificateCreate:
 *       type: object
 *       required:
 *         - certificateType
 *         - studentId
 *       properties:
 *         certificateType:
 *           type: string
 *           enum: [Completion, Transfer, Character, Bonafide]
 *         studentId:
 *           type: string
 *         academicYear:
 *           type: string
 *         title:
 *           type: string
 *         recipientName:
 *           type: string
 *         notes:
 *           type: string
 */

router.use(protect);

/**
 * @swagger
 * /api/certificates:
 *   post:
 *     summary: Create certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateCreate'
 *     responses:
 *       201:
 *         description: Certificate created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermission(PERMISSIONS.WRITE, RESOURCES.CERTIFICATES), validateCertificateCreate, certificateController.createCertificate);

/**
 * @swagger
 * /api/certificates/generate-completion:
 *   post:
 *     summary: Generate completion certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               signerName:
 *                 type: string
 *               signerTitle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Completion certificate generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/generate-completion', checkPermission(PERMISSIONS.WRITE, RESOURCES.CERTIFICATES), validateGenerateCertificate, certificateController.generateCompletionCertificate);

/**
 * @swagger
 * /api/certificates/generate-transfer:
 *   post:
 *     summary: Generate transfer certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               transferTo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transfer certificate generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/generate-transfer', checkPermission(PERMISSIONS.WRITE, RESOURCES.CERTIFICATES), validateGenerateCertificate, certificateController.generateTransferCertificate);

/**
 * @swagger
 * /api/certificates/generate-character:
 *   post:
 *     summary: Generate character certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               signerName:
 *                 type: string
 *               signerTitle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Character certificate generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/generate-character', checkPermission(PERMISSIONS.WRITE, RESOURCES.CERTIFICATES), validateGenerateCertificate, certificateController.generateCharacterCertificate);

/**
 * @swagger
 * /api/certificates/generate-bonafide:
 *   post:
 *     summary: Generate bonafide certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               signerName:
 *                 type: string
 *               signerTitle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bonafide certificate generated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/generate-bonafide', checkPermission(PERMISSIONS.WRITE, RESOURCES.CERTIFICATES), validateGenerateCertificate, certificateController.generateBonafideCertificate);

/**
 * @swagger
 * /api/certificates:
 *   get:
 *     summary: Get all certificates
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID (Admin only)
 *       - in: query
 *         name: certificateType
 *         schema:
 *           type: string
 *           enum: [Completion, Transfer, Character, Bonafide]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Issued, Cancelled]
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of certificates
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', checkPermission(PERMISSIONS.READ, RESOURCES.CERTIFICATES), validateCertificateQuery, certificateController.getCertificates);

/**
 * @swagger
 * /api/certificates/{id}:
 *   get:
 *     summary: Get certificate by ID
 *     tags: [Certificates]
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
 *         description: Certificate details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Certificate not found
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.CERTIFICATES), validateCertificateId, certificateController.getCertificateById);

/**
 * @swagger
 * /api/certificates/{id}/issue:
 *   post:
 *     summary: Issue certificate (Admin only)
 *     tags: [Certificates]
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
 *         description: Certificate issued
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Certificate not found
 */
router.post('/:id/issue', validateCertificateId, authorize('SchoolAdmin'), certificateController.issueCertificate);

/**
 * @swagger
 * /api/certificates/{id}/cancel:
 *   post:
 *     summary: Cancel certificate (Admin only)
 *     tags: [Certificates]
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
 *         description: Certificate canceled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Certificate not found
 */
router.post('/:id/cancel', validateCertificateId, authorize('SchoolAdmin'), certificateController.cancelCertificate);

/**
 * @swagger
 * /api/certificates/verify:
 *   post:
 *     summary: Verify certificate authenticity
 *     tags: [Certificates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - certificateNumber
 *             properties:
 *               certificateNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certificate verification result
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Certificate not found
 */
router.post('/verify', validateVerifyCertificate, certificateController.verifyCertificate);

/**
 * @swagger
 * /api/certificates/{id}/export:
 *   get:
 *     summary: Export certificate
 *     tags: [Certificates]
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
 *         description: Certificate exported
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Certificate not found
 */
router.get('/:id/export', checkPermission(PERMISSIONS.READ, RESOURCES.CERTIFICATES), validateCertificateId, certificateController.exportCertificate);

module.exports = router;
