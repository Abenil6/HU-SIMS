const Message = require('../models/Message');
const User = require('../models/User');

const ACTIVE_USER_QUERY = { status: 'Active', isVerified: true };
const INTERNAL_ADMIN_QUERY = { status: { $ne: 'Inactive' } };

const normalizeId = (value) => String(value?._id || value?.id || value || '');

const normalizeCategory = (value = 'General') => {
  const category = String(value).trim().toLowerCase();
  switch (category) {
    case 'academic':
      return 'Academic';
    case 'attendance':
      return 'Attendance';
    case 'emergency':
      return 'Emergency';
    case 'announcement':
      return 'Announcement';
    case 'reminder':
      return 'Reminder';
    default:
      return 'General';
  }
};

const buildReplySubject = (subject) => {
  const normalizedSubject = String(subject || 'Message').trim();
  if (/^re\s*:/i.test(normalizedSubject)) {
    return normalizedSubject;
  }

  return `Re: ${normalizedSubject}`;
};

const matchesTeacherClass = (student, classAssignment = {}) => {
  const studentProfile = student?.studentProfile || {};
  const studentGrade = String(studentProfile.grade || student.grade || '');
  const studentStream = String(
    studentProfile.stream || studentProfile.section || student.stream || '',
  ).trim();
  const assignmentGrade = String(classAssignment.grade || '');
  const assignmentStream = String(
    classAssignment.stream || classAssignment.section || '',
  ).trim();

  if (!studentGrade || !assignmentGrade || studentGrade !== assignmentGrade) {
    return false;
  }

  if (!assignmentStream) {
    return true;
  }

  return studentStream === assignmentStream;
};

const getTeacherClassAssignments = (teacher) =>
  Array.isArray(teacher?.teacherProfile?.classes)
    ? teacher.teacherProfile.classes
    : [];

const toRecipientSummary = (user, extra = {}) => {
  const summary = {
    id: normalizeId(user),
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    role: user.role,
    email: user.email,
    ...extra,
  };

  // Add student class information
  if (user.role === 'Student' && user.studentProfile) {
    summary.grade = user.studentProfile.grade;
    summary.stream = user.studentProfile.stream || user.studentProfile.section || '';
  }

  // Add parent linked students information
  if (user.role === 'Parent') {
    summary.linkedStudentInfo = user.linkedStudentInfo || [];
  }

  // Add teacher subjects information
  if (user.role === 'Teacher' && user.teacherProfile) {
    summary.subjects = user.teacherProfile.subjects || [];
    if (user.teacherProfile.subject && !summary.subjects.includes(user.teacherProfile.subject)) {
      summary.subjects.push(user.teacherProfile.subject);
    }
  }

  return summary;
};

const getStudentsForTeacher = async (teacher) => {
  const assignments = getTeacherClassAssignments(teacher);
  if (!assignments.length) return [];

  const students = await User.find({
    ...ACTIVE_USER_QUERY,
    role: 'Student',
  }).select('firstName lastName email role studentProfile');

  return students.filter((student) =>
    assignments.some((assignment) => matchesTeacherClass(student, assignment)),
  );
};

const getTeachersForStudent = async (student) => {
  const studentProfile = student?.studentProfile || {};
  const studentGrade = String(studentProfile.grade || student.grade || '');

  if (!studentGrade) return [];

  const teachers = await User.find({
    ...ACTIVE_USER_QUERY,
    role: 'Teacher',
  }).select('firstName lastName email role teacherProfile');

  return teachers.filter((teacher) =>
    getTeacherClassAssignments(teacher).some((assignment) =>
      matchesTeacherClass(student, assignment),
    ),
  );
};

const getParentsForStudents = async (students) => {
  const parentIds = new Set();
  const studentMap = new Map();

  students.forEach((student) => {
    const linkedParents = Array.isArray(student?.studentProfile?.linkedParents)
      ? student.studentProfile.linkedParents
      : [];
    linkedParents.forEach((parentId) => {
      const parentIdStr = normalizeId(parentId);
      parentIds.add(parentIdStr);
      if (!studentMap.has(parentIdStr)) {
        studentMap.set(parentIdStr, []);
      }
      studentMap.get(parentIdStr).push({
        id: normalizeId(student),
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        grade: student.studentProfile?.grade,
        stream: student.studentProfile?.stream || student.studentProfile?.section || '',
      });
    });
  });

  if (!parentIds.size) return [];

  const parents = await User.find({
    ...ACTIVE_USER_QUERY,
    role: 'Parent',
    _id: { $in: [...parentIds] },
  }).select('firstName lastName email role parentProfile');

  // Add linked student information to each parent
  return parents.map((parent) => {
    const parentIdStr = normalizeId(parent);
    const linkedStudents = studentMap.get(parentIdStr) || [];
    return {
      ...parent.toObject(),
      linkedStudentInfo: linkedStudents,
    };
  });
};

const getChildrenForParent = async (parent) => {
  const childIds = Array.isArray(parent?.parentProfile?.linkedChildren)
    ? parent.parentProfile.linkedChildren.map((childId) => normalizeId(childId))
    : [];

  if (!childIds.length) return [];

  return User.find({
    ...ACTIVE_USER_QUERY,
    role: 'Student',
    _id: { $in: childIds },
  }).select('firstName lastName email role studentProfile');
};

const getAllowedRecipientsForUser = async (sender) => {
  const senderRole = sender?.role;

  if (senderRole === 'Student') {
    const teachers = await getTeachersForStudent(sender);
    return teachers.map((teacher) =>
      toRecipientSummary(teacher, { relationship: 'Class teacher contact' }),
    );
  }

  if (senderRole === 'Teacher') {
    const [students, admins] = await Promise.all([
      getStudentsForTeacher(sender),
      User.find({
        ...ACTIVE_USER_QUERY,
        role: 'SchoolAdmin',
      }).select('firstName lastName email role'),
    ]);

    const parents = await getParentsForStudents(students);

    return [
      ...students.map((student) =>
        toRecipientSummary(student, {
          relationship: `Student in assigned class`,
        }),
      ),
      ...parents.map((parent) =>
        toRecipientSummary(parent, {
          relationship: 'Parent of assigned student',
        }),
      ),
      ...admins.map((admin) =>
        toRecipientSummary(admin, { relationship: 'School administration' }),
      ),
    ];
  }

  if (senderRole === 'Parent') {
    const children = await getChildrenForParent(sender);
    const teacherMap = new Map();

    for (const child of children) {
      const childTeachers = await getTeachersForStudent(child);
      childTeachers.forEach((teacher) => {
        teacherMap.set(normalizeId(teacher), teacher);
      });
    }

    return [...teacherMap.values()].map((teacher) =>
      toRecipientSummary(teacher, { relationship: 'Teacher of linked child' }),
    );
  }

  if (senderRole === 'SchoolAdmin') {
    const [schoolAdmins, teachers, students, parents] = await Promise.all([
      User.find({
        ...INTERNAL_ADMIN_QUERY,
        role: 'SchoolAdmin',
        _id: { $ne: sender._id },
      }).select('firstName lastName email role adminProfile'),
      User.find({
        ...ACTIVE_USER_QUERY,
        role: 'Teacher',
      }).select('firstName lastName email role teacherProfile'),
      User.find({
        ...ACTIVE_USER_QUERY,
        role: 'Student',
      }).select('firstName lastName email role studentProfile'),
      User.find({
        ...ACTIVE_USER_QUERY,
        role: 'Parent',
      }).select('firstName lastName email role parentProfile'),
    ]);

    return [
      ...schoolAdmins.map((admin) =>
        toRecipientSummary(admin, { relationship: 'School administration' }),
      ),
      ...teachers.map((teacher) =>
        toRecipientSummary(teacher, { relationship: 'Teacher' }),
      ),
      ...students.map((student) =>
        toRecipientSummary(student, { relationship: 'Student' }),
      ),
      ...parents.map((parent) =>
        toRecipientSummary(parent, { relationship: 'Parent' }),
      ),
    ];
  }

  if (senderRole === 'SystemAdmin') {
    const users = await User.find({
      ...ACTIVE_USER_QUERY,
      role: { $in: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] },
      _id: { $ne: sender._id },
    }).select('firstName lastName email role');

    return users.map((user) =>
      toRecipientSummary(user, {
        relationship:
          user.role === 'SystemAdmin'
            ? 'System administrator'
            : user.role === 'SchoolAdmin'
              ? 'School administration'
              : user.role,
      }),
    );
  }

  return [];
};

const resolveSenderContext = async (authUser) => {
  if (authUser?.role && (authUser?._id || authUser?.id)) {
    return authUser;
  }

  if (authUser?._id || authUser?.id) {
    return User.findById(authUser._id || authUser.id).select(
      'firstName lastName email role studentProfile parentProfile teacherProfile adminProfile',
    );
  }

  return null;
};

const isDeletedForUser = (message, userId) =>
  Array.isArray(message?.deletedBy) &&
  message.deletedBy.some((entry) => normalizeId(entry.user) === String(userId));

const enrichMessageForUser = (message, currentUserId) => {
  const sender = message.sender || {};
  const recipients = Array.isArray(message.recipients) ? message.recipients : [];
  const primaryRecipient = recipients[0] || null;
  const isRead = message.readBy.some(
    (entry) => normalizeId(entry.user) === String(currentUserId),
  );
  const isStarred = message.starredBy.some(
    (entry) => normalizeId(entry.user) === String(currentUserId),
  );

  return {
    _id: message._id,
    id: normalizeId(message),
    senderId: normalizeId(sender),
    senderName:
      `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'System',
    senderRole: sender.role || 'System',
    recipientId: normalizeId(primaryRecipient),
    recipientName: primaryRecipient
      ? `${primaryRecipient.firstName || ''} ${primaryRecipient.lastName || ''}`.trim()
      : '',
    recipientRole: primaryRecipient?.role || '',
    recipients: recipients.map((recipient) => ({
      id: normalizeId(recipient),
      name: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
      role: recipient.role,
      email: recipient.email,
    })),
    subject: message.subject,
    content: message.content,
    category: message.category,
    isRead,
    isStarred,
    createdAt: message.createdAt,
  };
};

const userCanAccessMessage = (message, userId) =>
  !isDeletedForUser(message, userId) &&
  (
    normalizeId(message.sender) === String(userId) ||
    message.recipients.some((recipient) => normalizeId(recipient) === String(userId))
  );

const buildMessageVisibilityQuery = (userId) => ({
  isActive: true,
  'deletedBy.user': { $ne: userId },
  $or: [
    { sender: userId },
    { recipients: userId },
  ],
});

/**
 * Send direct message
 */
exports.sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, subject, content, category = 'General', priority = 'Normal' } = req.body;

    if (!recipientId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'recipientId and content are required',
      });
    }

    const sender = await resolveSenderContext(req.user);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user context is unavailable',
      });
    }

    if (normalizeId(sender) === String(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a message to yourself',
      });
    }

    const allowedRecipients = await getAllowedRecipientsForUser(sender);
    const recipientAllowed = allowedRecipients.find(
      (candidate) => candidate.id === String(recipientId),
    );

    if (!recipientAllowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to message this recipient',
      });
    }

    const message = new Message({
      sender: req.user.id,
      recipients: [recipientId],
      messageType: 'Direct',
      category: normalizeCategory(category),
      subject,
      content: String(content).trim(),
      priority,
    });

    await message.save();

    const savedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: enrichMessageForUser(savedMessage, req.user.id),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

/**
 * Send broadcast message (Admin/Teacher only)
 */
exports.sendBroadcast = async (req, res) => {
  try {
    const { subject, content, category = 'Announcement', priority = 'Normal', filters } = req.body;
    const sender = await resolveSenderContext(req.user);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user context is unavailable',
      });
    }

    if (!['SchoolAdmin', 'SystemAdmin', 'Teacher'].includes(String(sender.role || ''))) {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and administrators can send broadcast messages',
      });
    }

    const query = { ...ACTIVE_USER_QUERY };
    if (filters?.grade) query['studentProfile.grade'] = filters.grade;
    if (filters?.section) query['studentProfile.section'] = filters.section;
    if (filters?.role) query.role = filters.role;

    let recipients = await User.find(query).select('_id');

    if (sender.role === 'Teacher') {
      const allowedRecipients = await getAllowedRecipientsForUser(sender);
      const allowedRecipientIds = new Set(allowedRecipients.map((recipient) => String(recipient.id)));
      recipients = recipients.filter((recipient) => allowedRecipientIds.has(String(recipient._id)));
    }

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found for the selected filters',
      });
    }

    const message = new Message({
      sender: req.user.id,
      recipients: recipients.map((recipient) => recipient._id),
      messageType: 'Broadcast',
      category: normalizeCategory(category),
      subject,
      content,
      priority,
      broadcastFilters: filters,
    });

    await message.save();

    res.status(201).json({
      success: true,
      message: `Broadcast sent to ${recipients.length} recipients`,
      data: {
        messageId: normalizeId(message),
        recipientCount: recipients.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error.message,
    });
  }
};

/**
 * Get inbox
 */
exports.getInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const numericPage = parseInt(page, 10);
    const numericLimit = parseInt(limit, 10);

    const messages = await Message.find({
      recipients: req.user.id,
      sender: { $ne: req.user.id },
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
    })
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email')
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit);

    const total = await Message.countDocuments({
      recipients: req.user.id,
      sender: { $ne: req.user.id },
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
    });

    const unreadCount = await Message.countDocuments({
      recipients: req.user.id,
      sender: { $ne: req.user.id },
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
      'readBy.user': { $ne: req.user.id },
    });

    res.json({
      success: true,
      data: messages.map((message) => enrichMessageForUser(message, req.user.id)),
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inbox',
      error: error.message,
    });
  }
};

/**
 * Get sent messages
 */
exports.getSentMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const numericPage = parseInt(page, 10);
    const numericLimit = parseInt(limit, 10);

    const messages = await Message.find({
      sender: req.user.id,
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
    })
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email')
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit);

    const total = await Message.countDocuments({
      sender: req.user.id,
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
    });

    res.json({
      success: true,
      data: messages.map((message) => enrichMessageForUser(message, req.user.id)),
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sent messages',
      error: error.message,
    });
  }
};

/**
 * Get allowed recipients for current user
 */
exports.getAllowedRecipients = async (req, res) => {
  try {
    const sender = await resolveSenderContext(req.user);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Authenticated user context is unavailable',
      });
    }

    const recipients = await getAllowedRecipientsForUser(sender);

    res.json({
      success: true,
      data: recipients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipients',
      error: error.message,
    });
  }
};

/**
 * Get message by ID
 */
exports.getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (!userCanAccessMessage(message, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message',
      });
    }

    if (
      message.recipients.some((recipient) => normalizeId(recipient) === String(req.user.id)) &&
      !message.readBy.some((entry) => normalizeId(entry.user) === String(req.user.id))
    ) {
      message.readBy.push({ user: req.user.id, readAt: new Date() });
      await message.save();
    }

    res.json({
      success: true,
      data: enrichMessageForUser(message, req.user.id),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message',
      error: error.message,
    });
  }
};

/**
 * Reply to message
 */
exports.replyToMessage = async (req, res) => {
  try {
    const { content, category = 'General', recipientId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'content is required',
      });
    }

    const originalMessage = await Message.findOne({
      _id: req.params.id,
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
      $or: [
        { sender: req.user.id },
        { recipients: req.user.id },
      ],
    });

    if (!originalMessage) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reply to this message',
      });
    }

    const currentUserId = String(req.user.id);
    const threadParticipantIds = [
      normalizeId(originalMessage.sender),
      ...originalMessage.recipients.map((recipient) => normalizeId(recipient)),
    ]
      .filter(Boolean)
      .filter((participantId) => participantId !== currentUserId)
      .filter((participantId, index, values) => values.indexOf(participantId) === index);

    const requestedRecipientId = String(recipientId || '').trim();
    let participants = threadParticipantIds;

    if (requestedRecipientId && threadParticipantIds.includes(requestedRecipientId)) {
      participants = [requestedRecipientId];
    } else if (originalMessage.messageType !== 'Direct') {
      const originalSenderId = normalizeId(originalMessage.sender);
      participants =
        originalSenderId && originalSenderId !== currentUserId
          ? [originalSenderId]
          : [];
    }

    if (!participants.length) {
      return res.status(403).json({
        success: false,
        message: 'No valid recipients found for reply',
      });
    }

    const reply = new Message({
      sender: req.user.id,
      recipients: participants,
      messageType: originalMessage.messageType,
      category: normalizeCategory(category),
      subject: buildReplySubject(originalMessage.subject),
      content: String(content).trim(),
      replyTo: originalMessage._id,
    });

    await reply.save();

    const savedReply = await Message.findById(reply._id)
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email');

    res.status(201).json({
      success: true,
      message: 'Reply sent',
      data: enrichMessageForUser(savedReply, req.user.id),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message,
    });
  }
};

/**
 * Mark message as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const isRecipient = message.recipients.some(
      (recipient) => normalizeId(recipient) === String(req.user.id),
    );
    if (!isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Only recipients can mark messages as read',
      });
    }

    if (!message.readBy.some((entry) => normalizeId(entry.user) === String(req.user.id))) {
      message.readBy.push({ user: req.user.id, readAt: new Date() });
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message,
    });
  }
};

/**
 * Star message
 */
exports.starMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (!userCanAccessMessage(message, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this message',
      });
    }

    if (!message.starredBy.some((entry) => normalizeId(entry.user) === String(req.user.id))) {
      message.starredBy.push({ user: req.user.id, starredAt: new Date() });
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message starred',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to star message',
      error: error.message,
    });
  }
};

/**
 * Unstar message
 */
exports.unstarMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (!userCanAccessMessage(message, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this message',
      });
    }

    message.starredBy = message.starredBy.filter(
      (entry) => normalizeId(entry.user) !== String(req.user.id),
    );
    await message.save();

    res.json({
      success: true,
      message: 'Message unstarred',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unstar message',
      error: error.message,
    });
  }
};

/**
 * Delete message (soft delete)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (!userCanAccessMessage(message, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message',
      });
    }

    if (!message.deletedBy.some((entry) => normalizeId(entry.user) === String(req.user.id))) {
      message.deletedBy.push({ user: req.user.id, deletedAt: new Date() });
    }

    const participants = new Set([
      normalizeId(message.sender),
      ...message.recipients.map((recipient) => normalizeId(recipient)),
    ]);
    const deletedParticipants = new Set(
      message.deletedBy.map((entry) => normalizeId(entry.user)),
    );

    if ([...participants].every((participantId) => deletedParticipants.has(participantId))) {
      message.isActive = false;
    }

    await message.save();

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message,
    });
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipients: req.user.id,
      sender: { $ne: req.user.id },
      isActive: true,
      'deletedBy.user': { $ne: req.user.id },
      'readBy.user': { $ne: req.user.id },
    });

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
};

/**
 * Mark message as unread
 */
exports.markAsUnread = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    const isRecipient = message.recipients.some(
      (recipient) => normalizeId(recipient) === String(req.user.id),
    );
    if (!isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Only recipients can mark messages as unread',
      });
    }

    message.readBy = message.readBy.filter(
      (entry) => normalizeId(entry.user) !== String(req.user.id),
    );
    await message.save();

    res.json({
      success: true,
      message: 'Message marked as unread',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as unread',
      error: error.message,
    });
  }
};

/**
 * Get starred messages
 */
exports.getStarredMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const numericPage = parseInt(page, 10);
    const numericLimit = parseInt(limit, 10);
    const query = {
      ...buildMessageVisibilityQuery(req.user.id),
      'starredBy.user': req.user.id,
    };

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email')
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: messages.map((message) => enrichMessageForUser(message, req.user.id)),
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch starred messages',
      error: error.message,
    });
  }
};

/**
 * Bulk delete messages
 */
exports.bulkDeleteMessages = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required',
      });
    }

    const messages = await Message.find({
      _id: { $in: ids },
      ...buildMessageVisibilityQuery(req.user.id),
    });

    for (const message of messages) {
      if (!message.deletedBy.some((entry) => normalizeId(entry.user) === String(req.user.id))) {
        message.deletedBy.push({ user: req.user.id, deletedAt: new Date() });
      }

      const participants = new Set([
        normalizeId(message.sender),
        ...message.recipients.map((recipient) => normalizeId(recipient)),
      ]);
      const deletedParticipants = new Set(
        message.deletedBy.map((entry) => normalizeId(entry.user)),
      );

      if ([...participants].every((participantId) => deletedParticipants.has(participantId))) {
        message.isActive = false;
      }

      await message.save();
    }

    res.json({
      success: true,
      message: 'Messages deleted',
      data: {
        requested: ids.length,
        deleted: messages.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete messages',
      error: error.message,
    });
  }
};

/**
 * Get conversation summaries for direct messages
 */
exports.getConversations = async (req, res) => {
  try {
    const messages = await Message.find({
      ...buildMessageVisibilityQuery(req.user.id),
      messageType: 'Direct',
    })
      .populate('sender', 'firstName lastName role email')
      .populate('recipients', 'firstName lastName role email')
      .sort({ createdAt: -1 });

    const conversationMap = new Map();
    const currentUserId = String(req.user.id);

    for (const message of messages) {
      const participants = [
        message.sender,
        ...message.recipients,
      ].filter(Boolean);
      const counterparties = participants.filter(
        (participant) => normalizeId(participant) !== currentUserId,
      );

      if (!counterparties.length) {
        continue;
      }

      for (const participant of counterparties) {
        const participantId = normalizeId(participant);
        const existingConversation = conversationMap.get(participantId);
        const unreadIncrement =
          message.recipients.some((recipient) => normalizeId(recipient) === currentUserId) &&
          !message.readBy.some((entry) => normalizeId(entry.user) === currentUserId)
            ? 1
            : 0;

        if (!existingConversation) {
          conversationMap.set(participantId, {
            id: participantId,
            participants: [
              {
                id: participantId,
                name:
                  `${participant.firstName || ''} ${participant.lastName || ''}`.trim()
                  || participant.email,
                role: participant.role,
              },
            ],
            lastMessage: enrichMessageForUser(message, req.user.id),
            unreadCount: unreadIncrement,
          });
          continue;
        }

        existingConversation.unreadCount += unreadIncrement;
      }
    }

    res.json({
      success: true,
      data: [...conversationMap.values()],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
};
