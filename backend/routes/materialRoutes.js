const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const materialController = require('../controllers/materialController');
const { protect } = require('../middleware/authMiddleware');

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

router.use(protect);

router.get('/subjects', materialController.getMaterialSubjects);
router.get('/grades', materialController.getMaterialGrades);
router.get('/submissions/me', materialController.getMySubmissions);
router.get('/', materialController.getMaterials);
router.get('/:id/submissions', materialController.getMaterialSubmissions);
router.get('/:id/submissions/:submissionId/download', materialController.downloadSubmission);
router.get('/:id/download', materialController.downloadMaterial);
router.post('/:id/submissions', submissionUpload.single('file'), materialController.submitAssignment);
router.put('/:id/submissions/:submissionId/review', materialController.reviewSubmission);
router.post(
  '/',
  materialController.ensureTeacherCanManageMaterial,
  upload.single('file'),
  materialController.createMaterial,
);
router.get('/:id', materialController.getMaterial);
router.put(
  '/:id',
  materialController.ensureTeacherCanManageMaterial,
  upload.single('file'),
  materialController.updateMaterial,
);
router.delete('/:id', materialController.deleteMaterial);
router.post('/:id/publish', materialController.publishMaterial);
router.post('/:id/archive', materialController.archiveMaterial);
router.post('/:id/view', materialController.markMaterialViewed);

module.exports = router;
