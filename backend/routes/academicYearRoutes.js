const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');
const { protect, authorize, checkPermission, PERMISSIONS, RESOURCES } = require('../middleware/authMiddleware');
const { validateBody, validateParams } = require('../utils/validateInput');

const validateAcademicYearId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateAcademicYearSemesterParams = validateParams({
  id: { required: true, type: 'objectId' },
  semesterName: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 50 },
});

const validateAcademicYearBody = validateBody({
  year: { required: true, type: 'string', trim: true, minLength: 4, maxLength: 30 },
  startDate: { required: true, type: 'date' },
  endDate: { required: true, type: 'date' },
  isActive: { type: 'boolean' },
  semesters: { type: 'array', maxItems: 10 },
}, { allowUnknown: true });

const validateAcademicYearSemesterBody = validateBody({
  startDate: { type: 'date' },
  endDate: { type: 'date' },
}, { allowUnknown: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     AcademicYear:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         year:
 *           type: string
 *           description: Academic year (e.g., "2025-2026")
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 *         semesters:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     AcademicYearCreate:
 *       type: object
 *       required:
 *         - year
 *         - startDate
 *         - endDate
 *       properties:
 *         year:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 */

router.use(protect);

/**
 * @swagger
 * /api/academic-years:
 *   get:
 *     summary: Get all academic years
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of academic years
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', academicYearController.getAcademicYears);

/**
 * @swagger
 * /api/academic-years:
 *   post:
 *     summary: Create new academic year (SystemAdmin, SchoolAdmin)
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademicYearCreate'
 *     responses:
 *       201:
 *         description: Academic year created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authorize(['SystemAdmin', 'SchoolAdmin']), validateAcademicYearBody, academicYearController.createAcademicYear);

/**
 * @swagger
 * /api/academic-years/active:
 *   get:
 *     summary: Get active academic year
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active academic year
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active academic year found
 */
router.get('/active', academicYearController.getActiveAcademicYear);

/**
 * @swagger
 * /api/academic-years/{id}:
 *   get:
 *     summary: Get academic year by ID
 *     tags: [Academic Years]
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
 *         description: Academic year details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Academic year not found
 */
router.get('/:id', checkPermission(PERMISSIONS.READ, RESOURCES.USERS), validateAcademicYearId, academicYearController.getAcademicYearById);

/**
 * @swagger
 * /api/academic-years/{id}:
 *   put:
 *     summary: Update academic year (SystemAdmin, SchoolAdmin)
 *     tags: [Academic Years]
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
 *             $ref: '#/components/schemas/AcademicYearCreate'
 *     responses:
 *       200:
 *         description: Academic year updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Academic year not found
 */
router.put('/:id', authorize(['SystemAdmin', 'SchoolAdmin']), validateAcademicYearId, validateAcademicYearBody, academicYearController.updateAcademicYear);

/**
 * @swagger
 * /api/academic-years/{id}:
 *   delete:
 *     summary: Delete academic year (SystemAdmin, SchoolAdmin)
 *     tags: [Academic Years]
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
 *         description: Academic year deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Academic year not found
 */
router.delete('/:id', authorize(['SystemAdmin', 'SchoolAdmin']), validateAcademicYearId, academicYearController.deleteAcademicYear);

/**
 * @swagger
 * /api/academic-years/{id}/activate:
 *   put:
 *     summary: Set academic year as active (SystemAdmin, SchoolAdmin)
 *     tags: [Academic Years]
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
 *         description: Academic year set as active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Academic year not found
 */
router.put('/:id/activate', authorize(['SystemAdmin', 'SchoolAdmin']), validateAcademicYearId, academicYearController.setAsActive);

/**
 * @swagger
 * /api/academic-years/{id}/semester/{semesterName}:
 *   put:
 *     summary: Update semester information (SystemAdmin, SchoolAdmin)
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: semesterName
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
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Semester updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Academic year or semester not found
 */
router.put('/:id/semester/:semesterName', authorize(['SystemAdmin', 'SchoolAdmin']), validateAcademicYearSemesterParams, validateAcademicYearSemesterBody, academicYearController.updateSemester);

module.exports = router;
