const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const materialController = require('../controllers/materialController');
const { protect } = require('../middleware/authMiddleware');
const { validateBody, validateParams } = require('../utils/validateInput');

const router = express.Router();

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'materials');
const submissionsUploadDirectory = path.join(__dirname, '..', 'uploads', 'material-submissions');
fs.mkdirSync(uploadDirectory, { recursive: true });
fs.mkdirSync(submissionsUploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeBase || 'material'}${extension}`);
  },
});

const upload = multer({ storage });
const submissionsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, submissionsUploadDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeBase || 'submission'}${extension}`);
  },
});
const submissionUpload = multer({ storage: submissionsStorage });

const validateMaterialId = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateSubmissionParams = validateParams({
  id: { required: true, type: 'objectId' },
  submissionId: { required: true, type: 'objectId' },
});

const validateMaterialCreate = validateBody({
  title: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 200 },
  description: { type: 'string', trim: true, maxLength: 2000 },
  type: { required: true, type: 'string', enum: ['study_material', 'assignment', 'resource'] },
  subject: { required: true, type: 'string', trim: true, maxLength: 120 },
  grade: { required: true, type: 'string', trim: true, maxLength: 20 },
  section: { type: 'string', trim: true, maxLength: 60 },
  dueDate: { type: 'date' },
}, { allowUnknown: true });

const validateMaterialUpdate = validateBody({
  title: { type: 'string', trim: true, minLength: 2, maxLength: 200 },
  description: { type: 'string', trim: true, maxLength: 2000 },
  type: { type: 'string', enum: ['study_material', 'assignment', 'resource'] },
  subject: { type: 'string', trim: true, maxLength: 120 },
  grade: { type: 'string', trim: true, maxLength: 20 },
  section: { type: 'string', trim: true, maxLength: 60 },
  dueDate: { type: 'date' },
  status: { type: 'string', enum: ['draft', 'published', 'archived'] },
}, { allowUnknown: true });

const validateAssignmentSubmission = validateBody({
  submissionText: { type: 'string', trim: true, maxLength: 10000 },
}, { allowUnknown: true });

const validateSubmissionReview = validateBody({
  score: { type: 'number', min: 0, max: 100 },
  feedback: { type: 'string', trim: true, maxLength: 5000 },
  status: { type: 'string', enum: ['Reviewed', 'Returned'] },
}, { allowUnknown: true });

router.use(protect);

router.get('/subjects', materialController.getMaterialSubjects);
router.get('/grades', materialController.getMaterialGrades);
router.get('/submissions/me', materialController.getMySubmissions);
router.get('/', materialController.getMaterials);
router.get('/:id/submissions', validateMaterialId, materialController.getMaterialSubmissions);
router.get('/:id/submissions/:submissionId/download', validateSubmissionParams, materialController.downloadSubmission);
router.get('/:id/download', validateMaterialId, materialController.downloadMaterial);
router.post('/:id/submissions', validateMaterialId, submissionUpload.single('file'), validateAssignmentSubmission, materialController.submitAssignment);
router.put('/:id/submissions/:submissionId/review', validateSubmissionParams, validateSubmissionReview, materialController.reviewSubmission);
router.post(
  '/',
  materialController.ensureTeacherCanManageMaterial,
  upload.single('file'),
  validateMaterialCreate,
  materialController.createMaterial,
);
router.get('/:id', validateMaterialId, materialController.getMaterial);
router.put(
  '/:id',
  validateMaterialId,
  materialController.ensureTeacherCanManageMaterial,
  upload.single('file'),
  validateMaterialUpdate,
  materialController.updateMaterial,
);
router.delete('/:id', validateMaterialId, materialController.deleteMaterial);
router.post('/:id/publish', validateMaterialId, materialController.publishMaterial);
router.post('/:id/archive', validateMaterialId, materialController.archiveMaterial);
router.post('/:id/view', validateMaterialId, materialController.markMaterialViewed);

module.exports = router;
