const express = require('express');
const router = express.Router();
const notificationReadStateController = require('../controllers/notificationReadStateController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', notificationReadStateController.getMyReadStates);
router.post('/read', notificationReadStateController.markAsRead);
router.post('/read-many', notificationReadStateController.markManyAsRead);

module.exports = router;
