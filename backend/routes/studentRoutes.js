const express = require('express');
const router = express.Router();
const multer = require('multer');
const studentController = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { ALLOWED_ACADEMIC_DOCUMENT_MIME_TYPES } = require('../utils/academicDocumentStorage');

const academicDocumentsUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_ACADEMIC_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  }
});

const parseStudentAcademicDocumentsMultipart = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  return academicDocumentsUpload.array('academicDocuments', 8)(req, res, (error) => {
    if (!error) return next();

    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each academic document must be 5 MB or smaller'
      : error.code === 'LIMIT_FILE_COUNT'
        ? 'You can upload at most 8 academic documents'
        : error.message || 'Invalid academic document upload';

    return res.status(400).json({
      success: false,
      message
    });
  });
};

/**
 * @swagger
 * components:
 *   schemas:
 *     StudentProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         studentProfile:
 *           type: object
 */

// ==================== STUDENT SELF-SERVICE ====================

/**
 * @swagger
 * /api/students/profile:
 *   get:
 *     summary: Get student's own profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile
 */
router.get('/profile', protect, studentController.getMyProfile);

/**
 * @swagger
 * /api/students/grades:
 *   get:
 *     summary: Get student's own grades
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of grades
 */
router.get('/grades', protect, studentController.getMyGrades);

/**
 * @swagger
 * /api/students/average:
 *   get:
 *     summary: Calculate student's average marks (no GPA)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Average marks calculation
 */
router.get('/average', protect, studentController.calculateAverage);

/**
 * @swagger
 * /api/students/attendance:
 *   get:
 *     summary: Get student's own attendance records
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance records
 */
router.get('/attendance', protect, studentController.getMyAttendance);

/**
 * @swagger
 * /api/students/schedule:
 *   get:
 *     summary: Get student's timetable/schedule
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student schedule
 */
router.get('/schedule', protect, studentController.getMySchedule);

/**
 * @swagger
 * /api/students/announcements:
 *   get:
 *     summary: Get announcements for students
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of announcements
 */
router.get('/announcements', protect, studentController.getMyAnnouncements);

/**
 * @swagger
 * /api/students/parents:
 *   get:
 *     summary: Get student's linked parents
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked parents
 */
router.get('/parents', protect, studentController.getMyParents);

/**
 * @swagger
 * /api/students/certificates:
 *   get:
 *     summary: Get student's certificates
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of certificates
 */
router.get('/certificates', protect, studentController.getMyCertificates);

/**
 * @swagger
 * /api/students/reports:
 *   get:
 *     summary: Get student's reports
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/reports', protect, studentController.getMyReports);

// ==================== ADMIN ROUTES ====================
// Create student (admin only)
router.post(
  '/',
  protect,
  authorize('SystemAdmin', 'SchoolAdmin'),
  parseStudentAcademicDocumentsMultipart,
  studentController.createStudent
);

// Download/preview protected academic document
router.get(
  '/:id/academic-documents/:documentId/download',
  protect,
  studentController.downloadAcademicDocument
);

// Update student (admin/teacher only)
router.put(
  '/:id',
  protect,
  authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'),
  parseStudentAcademicDocumentsMultipart,
  studentController.updateStudent
);

// Delete student (admin only)
router.delete('/:id', protect, authorize('SystemAdmin', 'SchoolAdmin'), studentController.deleteStudent);

// Link parent to student (admin only)
router.post('/:id/link-parent', protect, authorize('SystemAdmin', 'SchoolAdmin'), studentController.linkParent);

// Unlink parent from student (admin only)
router.delete('/:id/unlink-parent/:parentId', protect, authorize('SystemAdmin', 'SchoolAdmin'), studentController.unlinkParent);

module.exports = router;
