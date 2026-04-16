const mongoose = require('mongoose');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const AcademicRecord = require('../models/AcademicRecord');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Announcement = require('../models/Announcement');
const Certificate = require('../models/Certificate');
const AbsenceAlert = require('../models/AbsenceAlert');
const path = require('path');
const { sendVerificationEmail, generateToken } = require('../utils/emailService');
const { findUserByFlexibleId, findUserByFlexibleIdWithPopulate } = require('../utils/userLookup');
const {
  saveAcademicDocumentFile,
  resolveAcademicDocumentAbsolutePath,
  deleteAcademicDocumentFile
} = require('../utils/academicDocumentStorage');
const { normalizeUserResponse } = require('../utils/userResponse');

const VALID_ACADEMIC_DOCUMENT_CATEGORIES = new Set([
  'Grade 8 Ministry Result',
  'Previous Grade Report'
]);

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const splitFullName = (fullName) => {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Parent', lastName: 'Guardian' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Guardian' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const inferGenderFromRelationship = (relationship) => {
  const normalizedRelationship = String(relationship || '').trim().toLowerCase();

  if (normalizedRelationship === 'father') return 'Male';
  if (normalizedRelationship === 'mother') return 'Female';

  return undefined;
};

const buildUniqueUsername = async (email, fallbackPrefix = 'user') => {
  const emailPrefix = String(email || '')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24);
  const base = emailPrefix || fallbackPrefix;

  let username;
  let exists = true;

  while (exists) {
    username = `${base}_${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
    exists = await User.exists({ username });
  }

  return username;
};

const createVerificationTokenForUser = async (userId) => {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await new VerificationToken({
    userId,
    token,
    type: 'email_verification',
    expiresAt
  }).save();

  return token;
};

const normalizeGuardianCandidate = (guardian) => {
  if (!guardian) return null;

  const email = normalizeEmail(guardian.email);
  if (!email) return null;

  return {
    fullName: String(guardian.fullName || '').trim(),
    relationship: String(guardian.relationship || '').trim(),
    phone: String(guardian.phone || '').trim(),
    email,
    occupation: String(guardian.occupation || '').trim(),
    address: String(guardian.address || '').trim()
  };
};

const mergeGuardianDetails = (current, incoming) => ({
  ...current,
  fullName: current.fullName || incoming.fullName,
  relationship: current.relationship || incoming.relationship,
  phone: current.phone || incoming.phone,
  occupation: current.occupation || incoming.occupation,
  address: current.address || incoming.address
});

const sanitizeAcademicDocuments = (documents) => {
  if (!Array.isArray(documents)) return [];

  return documents
    .filter(Boolean)
    .slice(0, 8)
    .map((document) => {
      const category = String(document.category || '').trim();
      const title = String(document.title || '').trim();
      const fileName = String(document.fileName || '').trim();
      const storageKey = String(document.storageKey || '').trim();
      const fileUrl = String(document.fileUrl || '').trim();
      const fileType = String(document.fileType || '').trim();
      const fileData = typeof document.fileData === 'string' ? document.fileData.trim() : '';
      const fileSize = Number(document.fileSize);

      if (
        !VALID_ACADEMIC_DOCUMENT_CATEGORIES.has(category) ||
        !fileName ||
        (!storageKey && !fileUrl && !fileData)
      ) {
        return null;
      }

      return {
        category,
        title: title || fileName,
        fileName,
        storageKey: storageKey || undefined,
        fileUrl: fileUrl || undefined,
        fileType: fileType || undefined,
        fileSize: Number.isFinite(fileSize) ? fileSize : undefined,
        fileData: fileData || undefined,
        uploadedAt: new Date()
      };
    })
    .filter(Boolean);
};

const parseJsonField = (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return undefined;
  }

  if (typeof rawValue === 'object') {
    return rawValue;
  }

  if (typeof rawValue !== 'string') {
    throw new Error('Invalid JSON payload');
  }

  return JSON.parse(rawValue);
};

const saveAcademicDocumentsFromUpload = async (files, metadata) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const documents = [];
  const maxDocuments = Math.min(files.length, 8);

  for (let index = 0; index < maxDocuments; index += 1) {
    const file = files[index];
    const rawMeta = Array.isArray(metadata) ? metadata[index] : undefined;
    const category = String(rawMeta?.category || 'Previous Grade Report').trim();
    const title = String(rawMeta?.title || '').trim();

    if (!VALID_ACADEMIC_DOCUMENT_CATEGORIES.has(category)) {
      throw new Error(`Invalid academic document category: ${category}`);
    }

    const storedFile = await saveAcademicDocumentFile(file);
    const fallbackTitle = storedFile.fileName.replace(/\.[^.]+$/, '');

    documents.push({
      category,
      title: title || fallbackTitle,
      fileName: storedFile.fileName,
      storageKey: storedFile.storageKey,
      fileUrl: storedFile.fileUrl,
      fileType: storedFile.fileType,
      fileSize: storedFile.fileSize,
      uploadedAt: new Date()
    });
  }

  return documents;
};

const hasOwnField = (object, key) =>
  Boolean(object && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key));

const mergeStudentUpdates = (student, updates) => {
  if (!updates || typeof updates !== 'object') return;

  if (hasOwnField(updates, 'firstName')) student.firstName = updates.firstName;
  if (hasOwnField(updates, 'lastName')) student.lastName = updates.lastName;
  if (hasOwnField(updates, 'phone')) student.phone = updates.phone;
  if (hasOwnField(updates, 'profileImage')) student.profileImage = updates.profileImage;

  if (!student.studentProfile) student.studentProfile = {};
  if (updates.studentProfile && typeof updates.studentProfile === 'object') {
    const fields = Object.keys(updates.studentProfile);
    fields.forEach((field) => {
      student.studentProfile[field] = updates.studentProfile[field];
    });
  }
};

const getGuardianCandidatesFromRequest = (requestBody, student, options = {}) => {
  const includeFallbackFromStudent = options.includeFallbackFromStudent !== false;
  const primaryInRequest = hasOwnField(requestBody, 'primaryGuardian');
  const secondaryInRequest = hasOwnField(requestBody, 'secondaryGuardian');

  let primaryGuardian;
  let secondaryGuardian;

  if (primaryInRequest) {
    primaryGuardian = requestBody.primaryGuardian;
  } else if (includeFallbackFromStudent) {
    primaryGuardian = student?.studentProfile?.primaryGuardian;
  }

  if (secondaryInRequest) {
    secondaryGuardian = requestBody.secondaryGuardian;
  } else if (includeFallbackFromStudent) {
    secondaryGuardian = student?.studentProfile?.secondaryGuardian;
  }

  const guardianCandidates = [primaryGuardian, secondaryGuardian]
    .map(normalizeGuardianCandidate)
    .filter(Boolean);
  const guardianMap = new Map();

  guardianCandidates.forEach((guardian) => {
    const existingGuardian = guardianMap.get(guardian.email);
    guardianMap.set(
      guardian.email,
      existingGuardian ? mergeGuardianDetails(existingGuardian, guardian) : guardian
    );
  });

  return {
    primaryGuardian,
    secondaryGuardian,
    uniqueGuardians: Array.from(guardianMap.values()),
    shouldSyncGuardians: primaryInRequest || secondaryInRequest,
    primaryInRequest,
    secondaryInRequest
  };
};

const applyGuardianProfileFieldsToStudent = (
  student,
  primaryGuardian,
  secondaryGuardian,
  options = {}
) => {
  const { primaryInRequest = true, secondaryInRequest = true } = options;
  if (!student.studentProfile) student.studentProfile = {};

  if (primaryInRequest) {
    student.studentProfile.primaryGuardian = primaryGuardian
      ? {
          fullName: primaryGuardian.fullName,
          relationship: primaryGuardian.relationship,
          phone: primaryGuardian.phone,
          email: primaryGuardian.email,
          occupation: primaryGuardian.occupation,
          address: primaryGuardian.address
        }
      : undefined;
  }

  if (secondaryInRequest) {
    student.studentProfile.secondaryGuardian = secondaryGuardian
      ? {
          fullName: secondaryGuardian.fullName,
          relationship: secondaryGuardian.relationship,
          phone: secondaryGuardian.phone,
          email: secondaryGuardian.email,
          occupation: secondaryGuardian.occupation,
          address: secondaryGuardian.address
        }
      : undefined;
  }

  if (primaryInRequest) {
    student.studentProfile.fatherName = primaryGuardian?.relationship === 'Father'
      ? primaryGuardian.fullName
      : undefined;
    student.studentProfile.fatherOccupation = primaryGuardian?.relationship === 'Father'
      ? primaryGuardian.occupation
      : undefined;
    student.studentProfile.fatherPhone = primaryGuardian?.relationship === 'Father'
      ? primaryGuardian.phone
      : undefined;
    student.studentProfile.fatherEmail = primaryGuardian?.relationship === 'Father'
      ? primaryGuardian.email
      : undefined;
  }

  if (secondaryInRequest) {
    student.studentProfile.motherName = secondaryGuardian?.relationship === 'Mother'
      ? secondaryGuardian.fullName
      : undefined;
    student.studentProfile.motherOccupation = secondaryGuardian?.relationship === 'Mother'
      ? secondaryGuardian.occupation
      : undefined;
    student.studentProfile.motherPhone = secondaryGuardian?.relationship === 'Mother'
      ? secondaryGuardian.phone
      : undefined;
    student.studentProfile.motherEmail = secondaryGuardian?.relationship === 'Mother'
      ? secondaryGuardian.email
      : undefined;
  }
};

const ensureStudentParentLink = (student, parentId) => {
  if (!student.studentProfile) student.studentProfile = {};
  if (!Array.isArray(student.studentProfile.linkedParents)) {
    student.studentProfile.linkedParents = [];
  }

  const alreadyLinked = student.studentProfile.linkedParents.some(
    (currentParentId) => currentParentId.toString() === parentId.toString()
  );

  if (!alreadyLinked) {
    student.studentProfile.linkedParents.push(parentId);
    return true;
  }

  return false;
};

const ensureParentStudentLink = (parent, studentId) => {
  if (!parent.parentProfile) parent.parentProfile = {};
  if (!Array.isArray(parent.parentProfile.linkedChildren)) {
    parent.parentProfile.linkedChildren = [];
  }

  const alreadyLinked = parent.parentProfile.linkedChildren.some(
    (childId) => childId.toString() === studentId.toString()
  );

  if (!alreadyLinked) {
    parent.parentProfile.linkedChildren.push(studentId);
    return true;
  }

  return false;
};

const syncGuardianParentAccounts = async ({
  uniqueGuardians,
  student,
  actorId
}) => {
  const existingGuardianUsers = uniqueGuardians.length > 0
    ? await User.find({ email: { $in: uniqueGuardians.map((guardian) => guardian.email) } })
    : [];
  const conflictingGuardianUsers = existingGuardianUsers.filter((user) => user.role !== 'Parent');

  if (conflictingGuardianUsers.length > 0) {
    throw new Error(`Guardian email already belongs to a non-parent account: ${conflictingGuardianUsers[0].email}`);
  }

  const existingParentsByEmail = new Map(
    existingGuardianUsers.map((user) => [normalizeEmail(user.email), user])
  );

  const linkedParentIds = [];

  for (const guardian of uniqueGuardians) {
    let parent = existingParentsByEmail.get(guardian.email);
    let parentNeedsSave = false;

    if (!parent) {
      const { firstName: parentFirstName, lastName: parentLastName } = splitFullName(guardian.fullName);
      const parentUsername = await buildUniqueUsername(guardian.email, 'parent');

      parent = new User({
        email: guardian.email,
        username: parentUsername,
        role: 'Parent',
        firstName: parentFirstName,
        lastName: parentLastName,
        phone: guardian.phone || undefined,
        status: 'Pending',
        isVerified: false,
        mustSetPassword: true,
        createdBy: actorId,
        parentProfile: {
          gender: inferGenderFromRelationship(guardian.relationship),
          occupation: guardian.occupation || undefined,
          relationship: guardian.relationship || undefined,
          homeAddress: guardian.address
            ? {
                street: guardian.address
              }
            : undefined,
          linkedChildren: [student._id]
        }
      });

      await parent.save();
      existingParentsByEmail.set(guardian.email, parent);

      const parentToken = await createVerificationTokenForUser(parent._id);
      try {
        await sendVerificationEmail(guardian.email, parentToken, parent.firstName || 'Parent');
      } catch (emailError) {
        console.log('Parent email could not be sent:', emailError.message);
      }
    } else {
      if (!parent.parentProfile) {
        parent.parentProfile = {};
        parentNeedsSave = true;
      }

      if (guardian.phone && !parent.phone) {
        parent.phone = guardian.phone;
        parentNeedsSave = true;
      }

      if (guardian.relationship && !parent.parentProfile.relationship) {
        parent.parentProfile.relationship = guardian.relationship;
        parentNeedsSave = true;
      }

      if (guardian.occupation && !parent.parentProfile.occupation) {
        parent.parentProfile.occupation = guardian.occupation;
        parentNeedsSave = true;
      }

      if (guardian.address && !parent.parentProfile.homeAddress?.street) {
        parent.parentProfile.homeAddress = {
          ...(parent.parentProfile.homeAddress || {}),
          street: guardian.address
        };
        parentNeedsSave = true;
      }

      if (ensureParentStudentLink(parent, student._id)) {
        parentNeedsSave = true;
      }

      if (parentNeedsSave) {
        await parent.save();
      }
    }

    ensureStudentParentLink(student, parent._id);
    linkedParentIds.push(parent._id.toString());
  }

  return linkedParentIds;
};

const removeStudentFromParents = async (student, parentIdsToRemove = []) => {
  if (!Array.isArray(parentIdsToRemove) || parentIdsToRemove.length === 0) return;

  const normalizedRemovalSet = new Set(parentIdsToRemove.map((id) => id.toString()));
  const parents = await User.find({ _id: { $in: Array.from(normalizedRemovalSet) }, role: 'Parent' });

  for (const parent of parents) {
    if (!parent.parentProfile || !Array.isArray(parent.parentProfile.linkedChildren)) continue;
    parent.parentProfile.linkedChildren = parent.parentProfile.linkedChildren.filter(
      (childId) => childId.toString() !== student._id.toString()
    );
    await parent.save();
  }

  if (!student.studentProfile) return;
  if (!Array.isArray(student.studentProfile.linkedParents)) return;

  student.studentProfile.linkedParents = student.studentProfile.linkedParents.filter(
    (parentId) => !normalizedRemovalSet.has(parentId.toString())
  );
};

const getLegacyDocumentPayload = (document) => {
  const rawData = typeof document?.fileData === 'string' ? document.fileData.trim() : '';
  if (!rawData) return null;

  if (rawData.startsWith('data:')) {
    const firstComma = rawData.indexOf(',');
    if (firstComma === -1) return null;
    const header = rawData.slice(0, firstComma);
    const base64Body = rawData.slice(firstComma + 1);
    const mimeMatch = header.match(/^data:([^;]+);base64$/i);
    if (!mimeMatch || !base64Body) return null;

    return {
      buffer: Buffer.from(base64Body, 'base64'),
      contentType: document.fileType || mimeMatch[1] || 'application/octet-stream'
    };
  }

  try {
    return {
      buffer: Buffer.from(rawData, 'base64'),
      contentType: document.fileType || 'application/octet-stream'
    };
  } catch (_error) {
    return null;
  }
};

const canAccessStudentDocuments = (requestUser, student) => {
  if (!requestUser || !student) return false;
  if (['SystemAdmin', 'SchoolAdmin', 'Teacher'].includes(requestUser.role)) return true;
  if (requestUser.role === 'Student') {
    return String(requestUser.id) === String(student._id);
  }
  if (requestUser.role === 'Parent') {
    const linkedParents = Array.isArray(student.studentProfile?.linkedParents)
      ? student.studentProfile.linkedParents
      : [];
    return linkedParents.some((parentId) => String(parentId) === String(requestUser.id));
  }
  return false;
};

/**
 * Create student (Admin function)
 * Student is created without password - they must verify email and set password
 */
exports.createStudent = async (req, res) => {
  try {
    const isMultipartRequest = req.is('multipart/form-data');
    const rawBody = req.body || {};
    let requestBody = rawBody;
    let multipartAcademicMeta = [];

    if (isMultipartRequest) {
      try {
        requestBody = parseJsonField(rawBody.payload) || {};
        const parsedMeta = parseJsonField(rawBody.academicDocumentsMeta);
        multipartAcademicMeta = Array.isArray(parsedMeta) ? parsedMeta : [];
      } catch (_error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid multipart payload. Expected JSON fields for payload and academicDocumentsMeta.'
        });
      }
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      profileImage,
      gender,
      dob,
      nationality,
      grandfatherName,
      placeOfBirth,
      grade,
      stream,
      academicYear,
      admissionDate,
      enrollmentType,
      previousSchool,
      previousGradeCompleted,
      entranceExamResult,
      academicDocuments,
      address,
      emergencyContact
    } = requestBody;
    const primaryGuardian = requestBody.primaryGuardian;
    const secondaryGuardian = requestBody.secondaryGuardian;

    if (!firstName || !lastName || !email || !grade) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, email and grade are required'
      });
    }

    let normalizedAcademicDocuments = sanitizeAcademicDocuments(academicDocuments);

    if (isMultipartRequest && Array.isArray(req.files) && req.files.length > 0) {
      try {
        normalizedAcademicDocuments = await saveAcademicDocumentsFromUpload(
          req.files,
          multipartAcademicMeta
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Failed to process academic document upload'
        });
      }
    }

    const normalizedStudentEmail = normalizeEmail(email);
    const guardianCandidates = [primaryGuardian, secondaryGuardian]
      .map(normalizeGuardianCandidate)
      .filter(Boolean);
    const guardianMap = new Map();

    guardianCandidates.forEach((guardian) => {
      const existingGuardian = guardianMap.get(guardian.email);
      guardianMap.set(
        guardian.email,
        existingGuardian ? mergeGuardianDetails(existingGuardian, guardian) : guardian
      );
    });

    const uniqueGuardians = Array.from(guardianMap.values());

    if (uniqueGuardians.some((guardian) => guardian.email === normalizedStudentEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Guardian email must be different from the student email'
      });
    }

    const existingUser = await User.findOne({ email: normalizedStudentEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const existingGuardianUsers = uniqueGuardians.length > 0
      ? await User.find({ email: { $in: uniqueGuardians.map((guardian) => guardian.email) } })
      : [];
    const conflictingGuardianUsers = existingGuardianUsers.filter((user) => user.role !== 'Parent');

    if (conflictingGuardianUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Guardian email already belongs to a non-parent account: ${conflictingGuardianUsers[0].email}`
      });
    }

    const existingParentsByEmail = new Map(
      existingGuardianUsers.map((user) => [normalizeEmail(user.email), user])
    );
    const username = await buildUniqueUsername(normalizedStudentEmail, 'student');

    const student = new User({
      email: normalizedStudentEmail,
      username,
      role: 'Student',
      firstName,
      lastName,
      phone,
      profileImage,
      status: 'Pending',
      isVerified: false,
      mustSetPassword: true,
      createdBy: req.user?.id,
      studentProfile: {
        grade,
        stream,
        gender,
        dateOfBirth: dob || undefined,
        nationality: nationality || undefined,
        grandfatherName: grandfatherName || undefined,
        placeOfBirth: placeOfBirth
          ? {
              woreda: placeOfBirth.woreda,
              zone: placeOfBirth.zone,
              region: placeOfBirth.region
            }
          : undefined,
        academicYear: academicYear || undefined,
        admissionDate: admissionDate || undefined,
        enrollmentType: enrollmentType || undefined,
        homeAddress: address
          ? {
              street: address.street,
              city: address.city,
              state: address.region
            }
          : undefined,
        emergencyContact: emergencyContact
          ? {
              name: emergencyContact.name,
              phone: emergencyContact.phone,
              relationship: emergencyContact.relationship,
              email: emergencyContact.email
            }
          : undefined,
        previousSchool: previousSchool
          ? {
              name: previousSchool.name,
              address: previousSchool.address,
              phone: previousSchool.phone
            }
          : undefined,
        previousGrades: previousGradeCompleted || undefined,
        entranceExamResult: entranceExamResult || undefined,
        academicDocuments:
          normalizedAcademicDocuments.length > 0 ? normalizedAcademicDocuments : undefined,
        fatherName: primaryGuardian?.relationship === 'Father'
          ? primaryGuardian.fullName
          : undefined,
        fatherOccupation: primaryGuardian?.relationship === 'Father'
          ? primaryGuardian.occupation
          : undefined,
        fatherPhone: primaryGuardian?.relationship === 'Father'
          ? primaryGuardian.phone
          : undefined,
        fatherEmail: primaryGuardian?.relationship === 'Father'
          ? primaryGuardian.email
          : undefined,
        motherName: secondaryGuardian?.relationship === 'Mother'
          ? secondaryGuardian.fullName
          : undefined,
        motherOccupation: secondaryGuardian?.relationship === 'Mother'
          ? secondaryGuardian.occupation
          : undefined,
        motherPhone: secondaryGuardian?.relationship === 'Mother'
          ? secondaryGuardian.phone
          : undefined,
        motherEmail: secondaryGuardian?.relationship === 'Mother'
          ? secondaryGuardian.email
          : undefined,
        primaryGuardian: primaryGuardian
          ? {
              fullName: primaryGuardian.fullName,
              relationship: primaryGuardian.relationship,
              phone: primaryGuardian.phone,
              email: primaryGuardian.email,
              occupation: primaryGuardian.occupation,
              address: primaryGuardian.address
            }
          : undefined,
        secondaryGuardian: secondaryGuardian
          ? {
              fullName: secondaryGuardian.fullName,
              relationship: secondaryGuardian.relationship,
              phone: secondaryGuardian.phone,
              email: secondaryGuardian.email,
              occupation: secondaryGuardian.occupation,
              address: secondaryGuardian.address
            }
          : undefined
      }
    });

    await student.save();

    const token = await createVerificationTokenForUser(student._id);

    try {
      await sendVerificationEmail(normalizedStudentEmail, token, firstName);
    } catch (emailError) {
      console.log('Email could not be sent:', emailError.message);
    }

    for (const guardian of uniqueGuardians) {
      let parent = existingParentsByEmail.get(guardian.email);
      let parentNeedsSave = false;

      if (!parent) {
        const { firstName: parentFirstName, lastName: parentLastName } = splitFullName(guardian.fullName);
        const parentUsername = await buildUniqueUsername(guardian.email, 'parent');

        parent = new User({
          email: guardian.email,
          username: parentUsername,
          role: 'Parent',
          firstName: parentFirstName,
          lastName: parentLastName,
          phone: guardian.phone || undefined,
          status: 'Pending',
          isVerified: false,
          mustSetPassword: true,
          createdBy: req.user?.id,
          parentProfile: {
            gender: inferGenderFromRelationship(guardian.relationship),
            occupation: guardian.occupation || undefined,
            relationship: guardian.relationship || undefined,
            homeAddress: guardian.address
              ? {
                  street: guardian.address
                }
              : undefined,
            linkedChildren: [student._id]
          }
        });

        await parent.save();
        existingParentsByEmail.set(guardian.email, parent);

        const parentToken = await createVerificationTokenForUser(parent._id);
        try {
          await sendVerificationEmail(guardian.email, parentToken, parent.firstName || 'Parent');
        } catch (emailError) {
          console.log('Parent email could not be sent:', emailError.message);
        }
      } else {
        if (!parent.parentProfile) {
          parent.parentProfile = {};
          parentNeedsSave = true;
        }

        if (guardian.phone && !parent.phone) {
          parent.phone = guardian.phone;
          parentNeedsSave = true;
        }

        if (guardian.relationship && !parent.parentProfile.relationship) {
          parent.parentProfile.relationship = guardian.relationship;
          parentNeedsSave = true;
        }

        if (guardian.occupation && !parent.parentProfile.occupation) {
          parent.parentProfile.occupation = guardian.occupation;
          parentNeedsSave = true;
        }

        if (guardian.address && !parent.parentProfile.homeAddress?.street) {
          parent.parentProfile.homeAddress = {
            ...(parent.parentProfile.homeAddress || {}),
            street: guardian.address
          };
          parentNeedsSave = true;
        }

        if (!Array.isArray(parent.parentProfile.linkedChildren)) {
          parent.parentProfile.linkedChildren = [];
          parentNeedsSave = true;
        }

        const parentAlreadyLinked = parent.parentProfile.linkedChildren.some(
          (childId) => childId.toString() === student._id.toString()
        );

        if (!parentAlreadyLinked) {
          parent.parentProfile.linkedChildren.push(student._id);
          parentNeedsSave = true;
        }
      }

      if (!Array.isArray(student.studentProfile.linkedParents)) {
        student.studentProfile.linkedParents = [];
      }

      const studentAlreadyLinked = student.studentProfile.linkedParents.some(
        (parentId) => parentId.toString() === parent._id.toString()
      );

      if (!studentAlreadyLinked) {
        student.studentProfile.linkedParents.push(parent._id);
      }

      if (parentNeedsSave) {
        await parent.save();
      }
    }

    if (uniqueGuardians.length > 0) {
      await student.save();
    }

    const studentResponse = await User.findById(student._id)
      .select('-password')
      .populate('studentProfile.linkedParents', 'firstName lastName email phone parentProfile');

    res.status(201).json({
      success: true,
      message:
        uniqueGuardians.length > 0
          ? 'Student created successfully. Verification emails sent to student and linked parents.'
          : 'Student created successfully. Verification email sent.',
      data: normalizeUserResponse(studentResponse.toObject())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message
    });
  }
};

/**
 * Get student's own profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const student = await findUserByFlexibleId(req.user.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: normalizeUserResponse(student.toObject())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Get student's own grades/academic records
 */
exports.getMyGrades = async (req, res) => {
  try {
    const { academicYear, semester } = req.query;

    const query = { student: req.user.id };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades',
      error: error.message
    });
  }
};

/**
 * Calculate average marks and rank for student
 */
exports.calculateAverage = async (req, res) => {
  try {
    const { academicYear, semester } = req.query;

    const query = { student: req.user.id, status: 'Approved' };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query);

    // Get student profile for ranking
    const student = await findUserByFlexibleId(req.user.id);
    const studentGrade = student?.studentProfile?.grade;
    const studentStream = student?.studentProfile?.stream || student?.studentProfile?.section;

    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          averageMarks: 0,
          totalSubjects: 0,
          totalMarks: 0,
          rank: null,
          totalStudents: 0
        }
      });
    }

    // Calculate average marks
    let totalMarks = 0;
    records.forEach(record => {
      totalMarks += record.totalMarks || 0;
    });

    const averageMarks = records.length > 0 ? (totalMarks / records.length).toFixed(2) : 0;

    // Calculate rank within class/section
    let rank = null;
    let totalStudents = 0;

    if (studentGrade) {
      // Get all students in the same grade
      const classStudents = await User.find({
        role: 'Student',
        'studentProfile.grade': studentGrade
      });

      totalStudents = classStudents.length;

      // Calculate average for each student
      const studentAverages = await Promise.all(
        classStudents.map(async (s) => {
          const studentRecords = await AcademicRecord.find({
            student: s._id,
            academicYear: academicYear || '2025-2026',
            semester: semester || '1',
            status: 'Approved'
          });

          if (studentRecords.length === 0) return null;

          const total = studentRecords.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
          return {
            studentId: s._id,
            average: total / studentRecords.length
          };
        })
      );

      // Filter out nulls and sort by average (descending)
      const validAverages = studentAverages.filter(a => a !== null && a.average > 0);
      validAverages.sort((a, b) => b.average - a.average);

      // Find rank
      const currentRank = validAverages.findIndex(a => a.studentId.toString() === req.user.id);
      if (currentRank !== -1) {
        rank = currentRank + 1;
      }
      totalStudents = validAverages.length;
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          grade: studentGrade,
          stream: studentStream
        },
        averageMarks,
        totalSubjects: records.length,
        totalMarks: Math.round(totalMarks),
        rank,
        totalStudents,
        academicYear,
        semester
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate average',
      error: error.message
    });
  }
};

/**
 * Get student's own attendance records
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const { month, year, status } = req.query;

    const query = { student: req.user.id };

    if (month) {
      const startDate = new Date(year || new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (status) query.status = status;

    const rawRecords = await Attendance.find(query)
      .populate('teacher', 'firstName lastName')
      .sort({ date: -1 })
      .lean();

    const records = rawRecords.map((record) => ({
      ...record,
      teacher: normalizeUserResponse(record.teacher || null),
    }));

    // Calculate summary
    const total = records.length;
    const present = records.filter(a => a.status === 'Present').length;
    const absent = records.filter(a => a.status === 'Absent').length;
    const late = records.filter(a => a.status === 'Late').length;
    const excused = records.filter(a => a.status === 'Excused').length;

    res.json({
      success: true,
      data: {
        records,
        summary: {
          total,
          present,
          absent,
          late,
          excused,
          attendanceRate: total > 0 ? ((present / total) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
};

/**
 * Get student's own timetable/schedule
 */
exports.getMySchedule = async (req, res) => {
  try {
    const { week } = req.query;
    
    const student = await findUserByFlexibleId(req.user.id);
    
    if (!student || !student.studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const grade = student.studentProfile.grade;
    const stream = student.studentProfile.stream || student.studentProfile.section;

    // Get timetables for this class
    const Timetable = require('../models/Timetable');
    const classCandidates = [grade, `Grade ${grade}`, `grade ${grade}`].filter(Boolean);
    const query = { class: { $in: classCandidates }, section: stream };
    
    if (week) query.week = week;

    const timetables = await Timetable.find(query)
      .populate('periods.subject', 'name code')
      .populate('periods.teacher', 'firstName lastName');

    res.json({
      success: true,
      data: {
        grade,
        stream,
        timetables
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message
    });
  }
};

/**
 * Get announcements targeted to students
 */
exports.getMyAnnouncements = async (req, res) => {
  try {
    const now = new Date();

    const announcements = await Announcement.find({
      published: true,
      targetRoles: 'Student',
      $or: [
        { publishStartDate: { $exists: false } },
        { publishStartDate: { $lte: now } }
      ]
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

/**
 * Get student's linked parents
 */
exports.getMyParents = async (req, res) => {
  try {
    const student = await findUserByFlexibleIdWithPopulate(req.user.id, 'studentProfile.linkedParents');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: {
        linkedParents: student.studentProfile?.linkedParents || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parents',
      error: error.message
    });
  }
};

/**
 * Get student's certificates
 */
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};

/**
 * Get student's reports
 */
exports.getMyReports = async (req, res) => {
  try {
    const { type } = req.query;

    const query = { student: req.user.id };
    if (type) query.reportType = type;

    const reports = await Report.find(query)
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
};

/**
 * Download or preview a protected academic document
 */
exports.downloadAcademicDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;
    const disposition = String(req.query.disposition || 'attachment').toLowerCase();
    const contentDisposition = disposition === 'inline' ? 'inline' : 'attachment';

    const student = await User.findOne({ _id: id, role: 'Student' }).select(
      'studentProfile.academicDocuments studentProfile.linkedParents'
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (!canAccessStudentDocuments(req.user, student)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this academic document'
      });
    }

    const documents = Array.isArray(student.studentProfile?.academicDocuments)
      ? student.studentProfile.academicDocuments
      : [];
    const document = documents.find((item) => String(item?._id) === String(documentId));

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Academic document not found'
      });
    }

    const safeFileName = path.basename(document.fileName || `${document.category || 'document'}.pdf`);
    const contentType = document.fileType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${contentDisposition}; filename="${safeFileName}"`);

    if (document.storageKey) {
      const absolutePath = resolveAcademicDocumentAbsolutePath(document.storageKey);
      return res.sendFile(absolutePath);
    }

    const legacyPayload = getLegacyDocumentPayload(document);
    if (!legacyPayload) {
      return res.status(404).json({
        success: false,
        message: 'Stored academic document content is missing'
      });
    }

    return res.send(legacyPayload.buffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to download academic document',
      error: error.message
    });
  }
};

/**
 * Convert flat object with dot notation keys to nested object
 * e.g., {"address.street": "Main St"} -> {address: {street: "Main St"}}
 */
function convertDotNotationToNested(flatData) {
  const result = {};
  
  for (const key in flatData) {
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = flatData[key];
    } else {
      result[key] = flatData[key];
    }
  }
  
  return result;
}

/**
 * Map frontend student fields to MongoDB studentProfile structure
 */
function mapStudentFieldsToProfile(data) {
  const mapped = {};

  if (hasOwnField(data, 'firstName')) mapped.firstName = data.firstName;
  if (hasOwnField(data, 'lastName')) mapped.lastName = data.lastName;
  if (hasOwnField(data, 'phone')) mapped.phone = data.phone;

  // Map studentProfile fields
  mapped.studentProfile = {};
  
  if (data.gender) mapped.studentProfile.gender = data.gender;
  if (data.dob) mapped.studentProfile.dateOfBirth = data.dob;
  if (data.grade) mapped.studentProfile.grade = data.grade;
  if (data.stream) mapped.studentProfile.stream = data.stream;
  if (data.enrollmentDate) mapped.studentProfile.academicYear = data.enrollmentDate;
  
  // Map address to homeAddress
  if (data.address) {
    mapped.studentProfile.homeAddress = {
      street: data.address.street,
      city: data.address.city,
      state: data.address.state || data.address.region,
      country: data.address.country
    };
  }
  
  // Map emergencyContact
  if (data.emergencyContact) {
    mapped.studentProfile.emergencyContact = {
      name: data.emergencyContact.name,
      phone: data.emergencyContact.phone,
      relationship: data.emergencyContact.relationship
    };
  }

  return mapped;
}

/**
 * Update student (Admin/Teacher function)
 */
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID provided'
      });
    }

    const student = await User.findOne({ _id: id, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const previousGuardianEmails = new Set(
      [student.studentProfile?.primaryGuardian?.email, student.studentProfile?.secondaryGuardian?.email]
        .map(normalizeEmail)
        .filter(Boolean)
    );

    const isMultipartRequest = req.is('multipart/form-data');
    const rawBody = req.body || {};
    let requestBody = rawBody;
    let multipartAcademicMeta = [];
    let academicDocumentIdsToDelete = [];

    if (isMultipartRequest) {
      try {
        requestBody = parseJsonField(rawBody.payload) || {};
        const parsedMeta = parseJsonField(rawBody.academicDocumentsMeta);
        multipartAcademicMeta = Array.isArray(parsedMeta) ? parsedMeta : [];
        const parsedDeleteIds = parseJsonField(rawBody.academicDocumentIdsToDelete);
        academicDocumentIdsToDelete = Array.isArray(parsedDeleteIds)
          ? parsedDeleteIds.map((entry) => String(entry || '').trim()).filter(Boolean)
          : [];
      } catch (_error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid multipart payload. Expected JSON fields for payload, academicDocumentsMeta, and academicDocumentIdsToDelete.'
        });
      }
    }

    const nestedData = convertDotNotationToNested(requestBody);
    const updates = mapStudentFieldsToProfile(nestedData);

    // Prevent changing critical fields through this endpoint
    delete updates.password;
    delete updates.role;
    delete updates.email;
    delete updates.createdBy;

    mergeStudentUpdates(student, updates);

    const normalizedStudentEmail = normalizeEmail(student.email);
    const {
      primaryGuardian,
      secondaryGuardian,
      uniqueGuardians,
      shouldSyncGuardians,
      primaryInRequest,
      secondaryInRequest
    } = getGuardianCandidatesFromRequest(nestedData, student, {
      includeFallbackFromStudent: true
    });

    if (uniqueGuardians.some((guardian) => guardian.email === normalizedStudentEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Guardian email must be different from the student email'
      });
    }

    if (!student.studentProfile) student.studentProfile = {};
    let currentAcademicDocuments = Array.isArray(student.studentProfile.academicDocuments)
      ? [...student.studentProfile.academicDocuments]
      : [];

    if (!isMultipartRequest && Array.isArray(nestedData.academicDocumentIdsToDelete)) {
      academicDocumentIdsToDelete = nestedData.academicDocumentIdsToDelete
        .map((entry) => String(entry || '').trim())
        .filter(Boolean);
    }

    if (academicDocumentIdsToDelete.length > 0) {
      const deleteIdSet = new Set(academicDocumentIdsToDelete);
      const documentsToDelete = currentAcademicDocuments.filter((document) =>
        deleteIdSet.has(String(document?._id))
      );

      for (const document of documentsToDelete) {
        if (document?.storageKey) {
          await deleteAcademicDocumentFile(document.storageKey);
        }
      }

      currentAcademicDocuments = currentAcademicDocuments.filter(
        (document) => !deleteIdSet.has(String(document?._id))
      );
    }

    if (!isMultipartRequest && Array.isArray(nestedData.academicDocuments)) {
      currentAcademicDocuments = sanitizeAcademicDocuments(nestedData.academicDocuments);
    }

    if (isMultipartRequest && Array.isArray(req.files) && req.files.length > 0) {
      const uploadedDocuments = await saveAcademicDocumentsFromUpload(req.files, multipartAcademicMeta);
      currentAcademicDocuments = [...currentAcademicDocuments, ...uploadedDocuments].slice(0, 8);
    }

    student.studentProfile.academicDocuments =
      currentAcademicDocuments.length > 0 ? currentAcademicDocuments : [];

    if (hasOwnField(nestedData, 'primaryGuardian') || hasOwnField(nestedData, 'secondaryGuardian')) {
      applyGuardianProfileFieldsToStudent(student, primaryGuardian, secondaryGuardian, {
        primaryInRequest,
        secondaryInRequest
      });
    }

    if (shouldSyncGuardians) {
      const incomingGuardianEmails = new Set(uniqueGuardians.map((guardian) => guardian.email));

      const syncedParentIds = await syncGuardianParentAccounts({
        uniqueGuardians,
        student,
        actorId: req.user?.id
      });

      const parentIdsToRemove = [];
      if (Array.isArray(student.studentProfile.linkedParents)) {
        const parents = await User.find({
          _id: { $in: student.studentProfile.linkedParents },
          role: 'Parent'
        }).select('_id email');

        parents.forEach((parent) => {
          const parentEmail = normalizeEmail(parent.email);
          if (
            previousGuardianEmails.has(parentEmail) &&
            !incomingGuardianEmails.has(parentEmail) &&
            !syncedParentIds.includes(parent._id.toString())
          ) {
            parentIdsToRemove.push(parent._id);
          }
        });
      }

      await removeStudentFromParents(student, parentIdsToRemove);
    }

    await student.save();

    const studentResponse = await User.findById(student._id)
      .select('-password')
      .populate('studentProfile.linkedParents', 'firstName lastName email phone parentProfile');

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: normalizeUserResponse(studentResponse.toObject())
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
};

/**
 * Delete student (Admin function)
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID provided'
      });
    }

    // Check authorization - only SystemAdmin and SchoolAdmin can delete students
    if (!['SystemAdmin', 'SchoolAdmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete students'
      });
    }

    const student = await User.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Verify the user is actually a student
    if (student.role !== 'Student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Clean up related records
    await AcademicRecord.deleteMany({ student: id });
    await Attendance.deleteMany({ student: id });
    await Certificate.deleteMany({ student: id });
    await Report.deleteMany({ student: id });
    await AbsenceAlert.deleteMany({ student: id });

    // Remove student from messages (delete messages where student is sender or recipient)
    const Message = require('../models/Message');
    await Message.deleteMany({
      $or: [
        { sender: id },
        { recipients: id }
      ]
    });

    // Remove student from parents' linkedChildren arrays
    if (student.studentProfile?.linkedParents?.length > 0) {
      await User.updateMany(
        { _id: { $in: student.studentProfile.linkedParents } },
        { $pull: { 'parentProfile.linkedChildren': id } }
      );
    }

    // Finally delete the student
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message
    });
  }
};

/**
 * Link a parent to a student (Admin function)
 */
exports.linkParent = async (req, res) => {
  try {
    const { parentId } = req.body;
    const studentId = req.params.id;

    if (!parentId) {
      return res.status(400).json({
        success: false,
        message: 'Parent ID is required'
      });
    }

    // Find the student
    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the parent
    const parent = await User.findOne({ _id: parentId, role: 'Parent' });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Initialize arrays if they don't exist
    if (!student.studentProfile) {
      student.studentProfile = {};
    }
    if (!parent.parentProfile) {
      parent.parentProfile = {};
    }
    if (!student.studentProfile.linkedParents) {
      student.studentProfile.linkedParents = [];
    }
    if (!parent.parentProfile.linkedChildren) {
      parent.parentProfile.linkedChildren = [];
    }

    const alreadyLinked = student.studentProfile.linkedParents.some(
      p => p.toString() === parentId
    );
    const parentAlreadyHasStudent = parent.parentProfile.linkedChildren.some(
      c => c.toString() === studentId
    );

    // Keep link creation idempotent and heal one-sided links if they exist.
    let studentUpdated = false;
    let parentUpdated = false;

    if (!alreadyLinked) {
      student.studentProfile.linkedParents.push(parentId);
      studentUpdated = true;
    }

    if (!parentAlreadyHasStudent) {
      parent.parentProfile.linkedChildren.push(studentId);
      parentUpdated = true;
    }

    if (studentUpdated) await student.save();
    if (parentUpdated) await parent.save();

    // Populate parent details for response
    const populatedStudent = await User.findById(studentId)
      .populate('studentProfile.linkedParents', 'firstName lastName email phone');

    res.json({
      success: true,
      message: studentUpdated || parentUpdated
        ? 'Parent linked successfully'
        : 'Parent is already linked to this student',
      data: populatedStudent
    });
  } catch (error) {
    console.error('Link parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link parent',
      error: error.message
    });
  }
};

/**
 * Unlink a parent from a student (Admin function)
 */
exports.unlinkParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const studentId = req.params.id;

    // Find the student
    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find the parent
    const parent = await User.findOne({ _id: parentId, role: 'Parent' });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // Remove parent from student's linked parents
    if (student.studentProfile?.linkedParents) {
      student.studentProfile.linkedParents = student.studentProfile.linkedParents.filter(
        p => p.toString() !== parentId
      );
      await student.save();
    }

    // Remove student from parent's linked children
    if (parent.parentProfile?.linkedChildren) {
      parent.parentProfile.linkedChildren = parent.parentProfile.linkedChildren.filter(
        c => c.toString() !== studentId
      );
      await parent.save();
    }

    res.json({
      success: true,
      message: 'Parent unlinked successfully'
    });
  } catch (error) {
    console.error('Unlink parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink parent',
      error: error.message
    });
  }
};
