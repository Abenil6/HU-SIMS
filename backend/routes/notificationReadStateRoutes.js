const express = require('express');
const router = express.Router();
const notificationReadStateController = require('../controllers/notificationReadStateController');
const { protect } = require('../middleware/authMiddleware');
const { validateBody, validateQuery } = require('../utils/validateInput');

const validateReadStateQuery = validateQuery({
  keys: { type: 'string', trim: true, maxLength: 5000 },
}, { allowUnknown: true });

const validateMarkAsRead = validateBody({
  key: { required: true, type: 'string', trim: true, minLength: 1, maxLength: 500 },
}, { allowUnknown: true });

const validateMarkManyAsRead = validateBody({
  keys: { required: true, type: 'array', minItems: 1, maxItems: 500, items: { type: 'string' } },
}, { allowUnknown: true });

router.use(protect);

router.get('/', validateReadStateQuery, notificationReadStateController.getMyReadStates);
router.post('/read', validateMarkAsRead, notificationReadStateController.markAsRead);
router.post('/read-many', validateMarkManyAsRead, notificationReadStateController.markManyAsRead);

module.exports = router;
