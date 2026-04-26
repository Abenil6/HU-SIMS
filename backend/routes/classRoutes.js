const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateBody, validateParams } = require('../utils/validateInput');

const validateClassIdParam = validateParams({
  id: { required: true, type: 'objectId' },
});

const validateCreateClass = validateBody({
  name: { required: true, type: 'string', trim: true, minLength: 2, maxLength: 120 },
  grade: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 20 },
  stream: { type: 'string', trim: true, maxLength: 50 },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  capacity: { type: 'number', min: 1, max: 500 },
  classTeacher: { type: 'objectId' },
  subjects: { type: 'array', maxItems: 50, items: { type: 'string' } },
  status: { type: 'string', enum: ['Active', 'Inactive'] },
}, { allowUnknown: true });

const validateUpdateClass = validateBody({
  name: { type: 'string', trim: true, minLength: 2, maxLength: 120 },
  grade: { type: 'string', trim: true, minLength: 1, maxLength: 20 },
  stream: { type: 'string', trim: true, maxLength: 50 },
  academicYear: { type: 'string', trim: true, maxLength: 30 },
  capacity: { type: 'number', min: 1, max: 500 },
  classTeacher: { type: 'objectId' },
  subjects: { type: 'array', maxItems: 50, items: { type: 'string' } },
  status: { type: 'string', enum: ['Active', 'Inactive'] },
}, { allowUnknown: true });

router.use(protect);

router.get('/', authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), classController.getClasses);
router.get('/:id', validateClassIdParam, authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), classController.getClassById);
router.post('/', authorize('SystemAdmin', 'SchoolAdmin'), validateCreateClass, classController.createClass);
router.put('/:id', validateClassIdParam, authorize('SystemAdmin', 'SchoolAdmin'), validateUpdateClass, classController.updateClass);
router.delete('/:id', validateClassIdParam, authorize('SystemAdmin', 'SchoolAdmin'), classController.deleteClass);

module.exports = router;
