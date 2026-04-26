const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), classController.getClasses);
router.get('/:id', authorize('SystemAdmin', 'SchoolAdmin', 'Teacher'), classController.getClassById);
router.post('/', authorize('SystemAdmin', 'SchoolAdmin'), classController.createClass);
router.put('/:id', authorize('SystemAdmin', 'SchoolAdmin'), classController.updateClass);
router.delete('/:id', authorize('SystemAdmin', 'SchoolAdmin'), classController.deleteClass);

module.exports = router;
