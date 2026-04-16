const { normalizeUserId } = require('./userLookup');

const toPlainUser = (user) => {
  if (!user) return user;
  if (typeof user.toObject === 'function') {
    return user.toObject();
  }
  return user;
};

const normalizeUserResponse = (user) => {
  if (!user) return user;

  const plainUser = toPlainUser(user);
  const normalizedId = normalizeUserId(plainUser);
  const studentProfile = plainUser.studentProfile && typeof plainUser.studentProfile === 'object'
    ? plainUser.studentProfile
    : undefined;

  return {
    ...plainUser,
    _id: normalizedId,
    id: normalizedId,
    studentId: plainUser.studentId || studentProfile?.studentId || undefined,
    grade: plainUser.grade || studentProfile?.grade || undefined,
    stream: plainUser.stream || studentProfile?.stream || studentProfile?.section || undefined,
  };
};

const normalizeUserListResponse = (users) =>
  Array.isArray(users) ? users.map((user) => normalizeUserResponse(user)) : [];

module.exports = {
  normalizeUserResponse,
  normalizeUserListResponse,
};
