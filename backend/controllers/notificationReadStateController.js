const NotificationReadState = require('../models/NotificationReadState');

const MAX_KEYS = 500;

const normalizeKeys = (value) => {
  if (!value) return [];

  const rawKeys = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((entry) => entry.trim());

  return [...new Set(rawKeys.filter(Boolean))].slice(0, MAX_KEYS);
};

exports.getMyReadStates = async (req, res) => {
  try {
    const keys = normalizeKeys(req.query.keys);
    const query = { user: req.user.id };

    if (keys.length > 0) {
      query.key = { $in: keys };
    }

    const readStates = await NotificationReadState.find(query)
      .sort({ updatedAt: -1 })
      .limit(keys.length > 0 ? keys.length : MAX_KEYS)
      .lean();

    const readMap = readStates.reduce((accumulator, entry) => {
      accumulator[entry.key] = entry.readAt || entry.updatedAt || entry.createdAt;
      return accumulator;
    }, {});

    res.json({
      success: true,
      data: readMap,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification read state',
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const key = String(req.body?.key || '').trim();

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Notification key is required',
      });
    }

    const readAt = new Date();

    const readState = await NotificationReadState.findOneAndUpdate(
      { user: req.user.id, key },
      { $set: { readAt } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        key: readState.key,
        readAt: readState.readAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

exports.markManyAsRead = async (req, res) => {
  try {
    const keys = normalizeKeys(req.body?.keys);

    if (keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one notification key is required',
      });
    }

    const readAt = new Date();

    const operations = keys.map((key) => ({
      updateOne: {
        filter: { user: req.user.id, key },
        update: { $set: { readAt } },
        upsert: true,
      },
    }));

    await NotificationReadState.bulkWrite(operations, { ordered: false });

    res.json({
      success: true,
      message: 'Notifications marked as read',
      data: {
        keys,
        readAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message,
    });
  }
};
