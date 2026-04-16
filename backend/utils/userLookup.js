const User = require('../models/User');

function normalizeUserId(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }

  return String(value);
}

async function findUserByFlexibleId(id) {
  const normalizedId = normalizeUserId(id);
  if (!normalizedId) return null;

  const user = await User.findById(normalizedId);
  if (user) return user;

  const rawUser = await User.collection.findOne({ _id: normalizedId });
  return rawUser ? User.hydrate(rawUser) : null;
}

async function findUserByFlexibleIdWithPopulate(id, populate) {
  const user = await findUserByFlexibleId(id);
  if (!user) return null;

  if (populate) {
    await user.populate(populate);
  }

  return user;
}

async function updateUserByFlexibleId(id, updates) {
  const normalizedId = normalizeUserId(id);
  if (!normalizedId) return null;

  let user = await User.findByIdAndUpdate(
    normalizedId,
    { $set: updates || {} },
    {
      new: true,
      runValidators: true,
    }
  );

  if (user) return user;

  user = await findUserByFlexibleId(normalizedId);
  if (!user) return null;

  Object.entries(updates || {}).forEach(([key, value]) => {
    user.set(key, value);
  });

  await user.save();
  return user;
}

module.exports = {
  normalizeUserId,
  findUserByFlexibleId,
  findUserByFlexibleIdWithPopulate,
  updateUserByFlexibleId,
};
