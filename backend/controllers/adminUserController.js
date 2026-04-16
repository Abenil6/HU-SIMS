const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const bcrypt = require('bcryptjs');
const { sendVerificationEmail, generateToken } = require('../utils/emailService');
const { normalizeUserResponse, normalizeUserListResponse } = require('../utils/userResponse');

const normalizeClassValue = (value = '') =>
  String(value || '').trim();

const normalizeStatusValue = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';

  const statusMap = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    suspended: 'Suspended',
    deleted: 'Deleted',
  };

  return statusMap[normalized] || value;
};

const gradeRequiresStreamOrSection = (grade) => {
  const gradeNumber = Number.parseInt(String(grade || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(gradeNumber) && gradeNumber >= 11;
};

const buildTeacherAssignmentFilters = (teacher) => {
  const assignments = Array.isArray(teacher?.teacherProfile?.classes)
    ? teacher.teacherProfile.classes
    : [];

  return assignments
    .map((assignment) => {
      const grade = normalizeClassValue(assignment?.grade);
      const streamOrSection = normalizeClassValue(
        assignment?.stream || assignment?.section,
      );

      if (!grade) return null;

      if (!streamOrSection || !gradeRequiresStreamOrSection(grade)) {
        return { 'studentProfile.grade': grade };
      }

      return {
        'studentProfile.grade': grade,
        $or: [
          { 'studentProfile.stream': streamOrSection },
          { 'studentProfile.section': streamOrSection },
        ],
      };
    })
    .filter(Boolean);
};

/**
 * Create a new user (SystemAdmin/SchoolAdmin function)
 * User is created without password - they must verify email and set password
 */
exports.createUser = async (req, res) => {
  try {
    const { 
      email, username, role, firstName, lastName, phone,
      // Student fields
      grade, stream, section, academicYear, dateOfBirth, gender, nationality,
      homeAddress, emergencyContact, fatherName, fatherPhone, fatherEmail,
      motherName, motherPhone, motherEmail, allergies, healthConditions, specialNeeds,
      // Teacher fields
      subject, subjects, department,
      // Parent fields
      occupation
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Build user object based on role
    const userData = {
      email,
      username,
      role,
      firstName,
      lastName,
      phone,
      status: 'Pending',
      isVerified: false,
      mustSetPassword: true,
      createdBy: req.user.id
    };

    // Add role-specific fields
    if (role === 'Student') {
      userData.studentProfile = {
        grade,
        stream: stream || section,
        academicYear,
        dateOfBirth,
        gender,
        nationality,
        homeAddress,
        emergencyContact,
        fatherName,
        fatherPhone,
        fatherEmail,
        motherName,
        motherPhone,
        motherEmail,
        allergies: allergies || [],
        healthConditions: healthConditions || [],
        specialNeeds
      };
    } else if (role === 'Teacher') {
      userData.teacherProfile = {
        subjects: subject ? [subject] : subjects || [],
        department
      };
    } else if (role === 'Parent') {
      userData.parentProfile = {
        occupation
      };
    } else if (role === 'SchoolAdmin') {
      userData.adminProfile = {
        department: department || 'Administration'
      };
    }

    const user = new User(userData);
    await user.save();

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verification = new VerificationToken({
      userId: user._id,
      token,
      type: 'email_verification',
      expiresAt
    });
    await verification.save();

    // Send verification email (suppress error if email fails)
    try {
      await sendVerificationEmail(email, token, firstName);
    } catch (emailError) {
      console.log('Email could not be sent:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Verification email sent.',
      user: normalizeUserResponse({
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified
      })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * Bulk create students from CSV data (Admin function)
 * Expects: { students: [{ firstName, lastName, email, grade?, stream? }], defaultGrade?, defaultStream? }
 */
exports.bulkCreateStudents = async (req, res) => {
  try {
    const { students = [], defaultGrade, defaultStream } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Students array is required and must not be empty'
      });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const email = (row.email || '').trim();
      const firstName = (row.firstName || row.first_name || '').trim();
      const lastName = (row.lastName || row.last_name || '').trim();
      const grade = row.grade || defaultGrade || 'Grade 9';
      const normalizedGrade = String(grade).replace(/^Grade\s+/i, '').trim();
      const requiresStream = normalizedGrade === '11' || normalizedGrade === '12';
      const stream = (row.stream || row.section || defaultStream || '').trim();

      if (!email || !firstName || !lastName) {
        results.push({
          row: i + 1,
          firstName,
          lastName,
          email,
          grade,
          stream: requiresStream ? stream : '',
          status: 'Error',
          message: 'Missing required fields (firstName, lastName, email)'
        });
        failCount++;
        continue;
      }

      if (requiresStream && !stream) {
        results.push({
          row: i + 1,
          firstName,
          lastName,
          email,
          grade,
          stream: '',
          status: 'Error',
          message: 'Stream is required for Grade 11 and 12'
        });
        failCount++;
        continue;
      }

      try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          results.push({
            row: i + 1,
            firstName,
            lastName,
            email,
            grade,
            stream: requiresStream ? stream : '',
            status: 'Error',
            message: 'Email already exists'
          });
          failCount++;
          continue;
        }

        const username = email.split('@')[0] + '_' + Date.now();
        const userData = {
          email,
          username,
          role: 'Student',
          firstName,
          lastName,
          status: 'Pending',
          isVerified: false,
          mustSetPassword: true,
          createdBy: req.user.id,
          studentProfile: {
            grade: grade.startsWith('Grade') ? grade : `Grade ${grade}`,
            stream: requiresStream ? stream : undefined,
            academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
          }
        };

        const user = new User(userData);
        await user.save();

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const verification = new VerificationToken({
          userId: user._id,
          token,
          type: 'email_verification',
          expiresAt
        });
        await verification.save();

        try {
          await sendVerificationEmail(email, token, firstName);
        } catch (e) {
          console.log('Email could not be sent:', e.message);
        }

        results.push({
          row: i + 1,
          firstName,
          lastName,
          email,
          grade: userData.studentProfile.grade,
          stream: userData.studentProfile.stream || '',
          status: 'Success'
        });
        successCount++;
      } catch (err) {
        results.push({
          row: i + 1,
          firstName,
          lastName,
          email,
          grade,
          stream: requiresStream ? stream : '',
          status: 'Error',
          message: err.message || 'Failed to create user'
        });
        failCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk upload complete: ${successCount} succeeded, ${failCount} failed`,
      successCount,
      failed: failCount,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bulk upload failed',
      error: error.message
    });
  }
};

/**
 * Get all users (Admin function)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, grade, search, page = 1, limit = 20 } = req.query;
    const normalizedStatus = normalizeStatusValue(status);
    
    const query = {};
    if (role) query.role = role;
    if (normalizedStatus) query.status = normalizedStatus;
    if (grade) query['studentProfile.grade'] = grade;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const baseQuery = { ...query };
    const activeQuery = normalizedStatus
      ? { ...baseQuery }
      : { ...baseQuery, status: 'Active' };
    const verifiedQuery = { ...baseQuery, isVerified: true };

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const [users, total, active, verified] = await Promise.all([
      User.find(baseQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      User.countDocuments(baseQuery),
      User.countDocuments(activeQuery),
      User.countDocuments(verifiedQuery)
    ]);

    res.json({
      success: true,
      data: normalizeUserListResponse(users),
      stats: {
        total,
        active,
        verified
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: normalizeUserResponse(user.toObject())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

/**
 * Update user (Admin function)
 */
exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    
    // Prevent changing critical fields through this endpoint
    delete updates.password;
    delete updates.role;
    delete updates.email;
    delete updates.createdBy;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: normalizeUserResponse(user.toObject())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Delete user (Admin function)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete associated verification tokens
    await VerificationToken.deleteMany({ userId: user._id });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * Activate user
 */
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'Active' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User activated successfully',
      data: normalizeUserResponse(user.toObject())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: error.message
    });
  }
};

/**
 * Deactivate user
 */
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'Inactive' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
};

/**
 * Resend verification email
 */
exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old verification token
    await VerificationToken.deleteMany({ userId: user._id });

    // Generate new token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verification = new VerificationToken({
      userId: user._id,
      token,
      type: 'email_verification',
      expiresAt
    });
    await verification.save();

    // Send verification email
    await sendVerificationEmail(user.email, token, user.firstName);

    res.json({
      success: true,
      message: 'Verification email resent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
};

/**
 * Parent-Student Linking
 */

// Request to link parent to student
exports.requestParentLink = async (req, res) => {
  try {
    const { studentId } = req.body;
    const parentId = req.params.id;

    // Get parent and student
    const parent = await User.findOne({ _id: parentId, role: 'Parent' });
    const student = await User.findOne({ _id: studentId, role: 'Student' });

    if (!parent || !student) {
      return res.status(404).json({
        success: false,
        message: 'Parent or student not found'
      });
    }

    // Add request to parent's child link requests
    parent.parentProfile.childLinkRequests.push({
      studentId,
      status: 'Pending'
    });
    await parent.save();

    // Add request to student's parent link requests
    student.studentProfile.parentLinkRequests.push({
      parentId,
      status: 'Pending'
    });
    await student.save();

    res.json({
      success: true,
      message: 'Link request sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send link request',
      error: error.message
    });
  }
};

// Approve/Reject parent link request
exports.manageParentLink = async (req, res) => {
  try {
    const { studentId, parentId, action } = req.body; // action: 'approve' or 'reject'

    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Find and update the request
    const request = student.studentProfile.parentLinkRequests.find(
      r => r.parentId.toString() === parentId
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = action === 'approve' ? 'Approved' : 'Rejected';

    // If approved, add to linked parents
    if (action === 'approve') {
      if (!student.studentProfile) {
        student.studentProfile = {};
      }
      if (!student.studentProfile.linkedParents) {
        student.studentProfile.linkedParents = [];
      }
      const alreadyLinkedToStudent = student.studentProfile.linkedParents.some(
        p => p.toString() === parentId.toString()
      );
      if (!alreadyLinkedToStudent) {
        student.studentProfile.linkedParents.push(parentId);
      }

      // Also update parent's linked children
      const parent = await User.findOne({ _id: parentId, role: 'Parent' });
      if (parent) {
        if (!parent.parentProfile) {
          parent.parentProfile = {};
        }
        if (!parent.parentProfile.linkedChildren) {
          parent.parentProfile.linkedChildren = [];
        }
        const parentAlreadyHasStudent = parent.parentProfile.linkedChildren.some(
          c => c.toString() === studentId.toString()
        );
        if (!parentAlreadyHasStudent) {
          parent.parentProfile.linkedChildren.push(studentId);
        }
        
        // Remove from pending requests
        if (!parent.parentProfile.childLinkRequests) {
          parent.parentProfile.childLinkRequests = [];
        }
        parent.parentProfile.childLinkRequests = parent.parentProfile.childLinkRequests.filter(
          r => r.studentId.toString() !== studentId
        );
        await parent.save();
      }
    }

    await student.save();

    res.json({
      success: true,
      message: `Request ${action}d successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to manage link request',
      error: error.message
    });
  }
};

// Get pending parent link requests for a student
exports.getParentLinkRequests = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'Student' });
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const requests = student.studentProfile.parentLinkRequests.filter(
      r => r.status === 'Pending'
    );

    // Populate parent details
    const populatedRequests = await Promise.all(
      requests.map(async (request) => {
        const parent = await User.findById(request.parentId).select('firstName lastName email phone');
        return {
          parentId: request.parentId,
          status: request.status,
          requestedAt: request.requestedAt,
          parentDetails: parent
        };
      })
    );

    res.json({
      success: true,
      data: populatedRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
};

/**
 * Reset user password (Admin function)
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustSetPassword = false;
    user.isVerified = true;
    user.status = 'Active';
    
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

/**
 * Get all students with pagination and filters
 */
exports.getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, grade, stream, status } = req.query;
    const normalizedStatus = normalizeStatusValue(status);
    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Number.parseInt(limit, 10) || 20;

    const query = { role: 'Student' };
    const andFilters = [];

    if (search) {
      andFilters.push({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (grade) {
      const normalizedGrade = String(grade).replace(/^Grade\s+/i, '').trim();
      if (normalizedGrade) {
        andFilters.push({
          $or: [
            { 'studentProfile.grade': normalizedGrade },
            { 'studentProfile.grade': `Grade ${normalizedGrade}` },
          ],
        });
      }
    }

    if (stream) {
      andFilters.push({
        $or: [
          { 'studentProfile.stream': stream },
          { 'studentProfile.section': stream },
        ],
      });
    }

    if (normalizedStatus) {
      query.status = normalizedStatus;
    }

    if (req.user?.role === 'Teacher') {
      const assignmentFilters = buildTeacherAssignmentFilters(req.user);
      if (!assignmentFilters.length) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: 0,
            pages: 0,
          },
        });
      }

      andFilters.push({ $or: assignmentFilters });
    }

    if (andFilters.length) {
      query.$and = andFilters;
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: normalizeUserListResponse(students),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * Get students by grade/section
 */
exports.getStudentsByClass = async (req, res) => {
  try {
    const { grade, section, academicYear } = req.query;

    const query = { role: 'Student' };
    if (grade) query['studentProfile.grade'] = grade;
    if (section) query['studentProfile.section'] = section;
    if (academicYear) query['studentProfile.academicYear'] = academicYear;

    const students = await User.find(query)
      .select('firstName lastName email phone studentProfile')
      .sort({ 'studentProfile.grade': 1, 'studentProfile.section': 1, lastName: 1 });

    res.json({
      success: true,
      data: normalizeUserListResponse(students)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * Get parent linking status for a student
 */
exports.getStudentParentLinks = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'Student' })
      .populate('studentProfile.linkedParents', 'firstName lastName email phone parentProfile.occupation');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({
      success: true,
      data: {
        linkedParents: student.studentProfile?.linkedParents || [],
        pendingRequests: student.studentProfile?.parentLinkRequests?.filter(r => r.status === 'Pending') || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parent links',
      error: error.message
    });
  }
};
