const Material = require('../models/Material');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const User = require('../models/User');

const normalizeGradeValue = (value) =>
  String(value || '')
    .replace(/^Grade\s+/i, '')
    .trim();

const normalizeClassScopeValue = (value) => String(value || '').trim();
const normalizeSubjectValue = (value) => String(value || '').trim().toLowerCase();
const parseClassSelection = (value) => {
  const [grade = '', section = ''] = String(value || '').split('::');
  return {
    grade: normalizeGradeValue(grade),
    section: normalizeClassScopeValue(section),
  };
};

const isAdminUser = (user) => ['SchoolAdmin', 'SystemAdmin'].includes(String(user?.role || ''));

const getTeacherAssignments = (teacher) =>
  Array.isArray(teacher?.teacherProfile?.classes) ? teacher.teacherProfile.classes : [];

const getTeacherSubjects = (teacher) => {
  const subjects = Array.isArray(teacher?.teacherProfile?.subjects)
    ? teacher.teacherProfile.subjects
    : [];
  const singularSubject = teacher?.teacherProfile?.subject ? [teacher.teacherProfile.subject] : [];

  return [...new Set([...subjects, ...singularSubject].map((subject) => String(subject || '').trim()).filter(Boolean))];
};

const teacherAssignedToClass = (teacher, grade, section) =>
  getTeacherAssignments(teacher).some((assignment) => {
    const assignmentGrade = normalizeGradeValue(assignment.grade);
    const assignmentScope = normalizeClassScopeValue(assignment.stream || assignment.section);
    const normalizedGrade = normalizeGradeValue(grade);
    const normalizedSection = normalizeClassScopeValue(section);

    if (!assignmentGrade || assignmentGrade !== normalizedGrade) {
      return false;
    }

    if (!normalizedSection) {
      return true;
    }

    return assignmentScope === normalizedSection;
  });

const teacherAssignedToSubject = (teacher, subject) =>
  getTeacherSubjects(teacher).some(
    (assignedSubject) => normalizeSubjectValue(assignedSubject) === normalizeSubjectValue(subject),
  );

const studentMatchesMaterialClass = (student, material) => {
  const studentGrade = normalizeGradeValue(student?.studentProfile?.grade);
  const studentSection = normalizeClassScopeValue(
    student?.studentProfile?.stream || student?.studentProfile?.section,
  );
  const materialGrade = normalizeGradeValue(material?.grade);
  const materialSection = normalizeClassScopeValue(material?.section);

  if (!studentGrade || !materialGrade || studentGrade !== materialGrade) {
    return false;
  }

  if (!materialSection) {
    return true;
  }

  return studentSection === materialSection;
};

const toSubmissionResponse = (submission) => {
  const source = submission.toObject ? submission.toObject() : submission;
  const student = source.studentId || {};
  const reviewer = source.reviewedBy || {};

  return {
    id: String(source._id || ''),
    _id: String(source._id || ''),
    materialId: String(source.materialId?._id || source.materialId || ''),
    studentId: String(student._id || source.studentId || ''),
    studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
    submissionText: source.submissionText || '',
    fileUrl: source.fileUrl || '',
    fileName: source.fileName || '',
    fileSize: source.fileSize || 0,
    status: source.status,
    score: Number.isFinite(source.score) ? source.score : null,
    feedback: source.feedback || '',
    submittedAt: source.submittedAt || source.createdAt,
    isLate: Boolean(source.isLate),
    reviewedAt: source.reviewedAt || null,
    reviewedById: reviewer?._id ? String(reviewer._id) : null,
    reviewedByName: reviewer?._id ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() : '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const toMaterialResponse = (material) => {
  const source = material.toObject ? material.toObject() : material;
  const teacher = source.teacherId || {};
  const materialId = String(source._id || source.id || '');

  return {
    id: materialId,
    _id: materialId,
    title: source.title,
    description: source.description,
    type: source.type,
    subject: source.subject,
    grade: source.grade,
    section: source.section || '',
    teacherId: String(teacher._id || source.teacherId || ''),
    teacherName:
      `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || source.teacherName || 'Teacher',
    fileUrl: source.fileUrl || '',
    fileName: source.fileName || '',
    fileSize: source.fileSize || 0,
    dueDate: source.dueDate,
    attachments: Array.isArray(source.attachments) ? source.attachments : [],
    status: source.status,
    views: source.views || 0,
    downloads: source.downloads || 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const ensureTeacherCanManageMaterial = async (req, res, next) => {
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({
      success: false,
      message: 'Only teachers can manage materials',
    });
  }

  const teacher = await User.findById(req.user.id).select('role teacherProfile');
  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: 'Teacher profile not found',
    });
  }

  req.teacherProfileDoc = teacher;
  return next();
};

exports.getMaterials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      subject,
      grade,
      type,
      status,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (subject) query.subject = subject;
    if (grade) {
      const selectedClass = parseClassSelection(grade);
      query.grade = selectedClass.grade;
      if (selectedClass.section) {
        query.section = selectedClass.section;
      }
    }
    if (type) query.type = type;
    if (status) query.status = status;

    if (req.user.role === 'Teacher') {
      query.teacherId = req.user.id;
    }

    if (req.user.role === 'Student') {
      const student = await User.findById(req.user.id).select('studentProfile');
      const studentGrade = normalizeGradeValue(student?.studentProfile?.grade);
      const studentSection = normalizeClassScopeValue(
        student?.studentProfile?.stream || student?.studentProfile?.section,
      );
      query.grade = studentGrade;
      query.status = 'published';
      if (studentSection) {
        query.section = studentSection;
      }
    }

    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.max(parseInt(limit, 10) || 10, 1);

    const [materials, total] = await Promise.all([
      Material.find(query)
        .populate('teacherId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit),
      Material.countDocuments(query),
    ]);

    res.json({
      materials: materials.map(toMaterialResponse),
      total,
      page: numericPage,
      limit: numericLimit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
      error: error.message,
    });
  }
};

exports.getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate('teacherId', 'firstName lastName');
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    if (req.user.role === 'Teacher' && String(material.teacherId?._id || material.teacherId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view materials you uploaded',
      });
    }

    if (req.user.role === 'Student') {
      if (material.status !== 'published') {
        return res.status(403).json({
          success: false,
          message: 'You can only view published materials',
        });
      }
      const student = await User.findById(req.user.id).select('studentProfile');
      if (!student || !studentMatchesMaterialClass(student, material)) {
        return res.status(403).json({
          success: false,
          message: 'You can only view materials for your class',
        });
      }
    }

    res.json(toMaterialResponse(material));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material',
      error: error.message,
    });
  }
};

exports.createMaterial = async (req, res) => {
  const startedAt = Date.now();
  const traceId = `material-upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const logStep = (step, extra = {}) => {
    console.log('[materials.create]', {
      traceId,
      step,
      elapsedMs: Date.now() - startedAt,
      userId: req.user?.id,
      role: req.user?.role,
      hasFile: Boolean(req.file),
      hasUploadedFile: Boolean(req.uploadedFile?.fileUrl),
      ...extra,
    });
  };

  try {
    logStep('start');
    const { title, description, type, subject, grade, section, dueDate } = req.body;

    const normalizedGrade = normalizeGradeValue(grade);
    const normalizedSection = normalizeClassScopeValue(section);
    logStep('normalized-input');
    const teacher = req.teacherProfileDoc || (await User.findById(req.user.id).select('role teacherProfile'));
    logStep('teacher-profile-loaded');

    if (!title || !type || !subject || !normalizedGrade) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, subject, and class are required',
      });
    }

    if (req.user.role === 'Teacher') {
      if (!teacherAssignedToSubject(teacher, subject)) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload materials for your assigned subjects',
        });
      }

      if (!teacherAssignedToClass(teacher, normalizedGrade, normalizedSection)) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload materials for your assigned classes',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can create materials',
      });
    }

    const uploadedFile = req.uploadedFile || null;
    logStep('before-material-create', {
      hasCloudFile: Boolean(uploadedFile?.fileUrl),
    });
    const material = await Material.create({
      title: String(title).trim(),
      description: String(description || '').trim(),
      type,
      subject: String(subject).trim(),
      grade: normalizedGrade,
      section: normalizedSection,
      teacherId: req.user.id,
      fileUrl: uploadedFile?.fileUrl || '',
      fileName: uploadedFile?.fileName || '',
      fileSize: uploadedFile?.fileSize || 0,
      fileMimeType: uploadedFile?.fileMimeType || '',
      dueDate: dueDate || null,
      status: 'draft',
    });
    logStep('material-created', { materialId: String(material._id) });

    const savedMaterial = await Material.findById(material._id).populate('teacherId', 'firstName lastName');
    logStep('material-populated');
    res.status(201).json(toMaterialResponse(savedMaterial));
  } catch (error) {
    logStep('error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create material',
      error: error.message,
    });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    if (String(material.teacherId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update materials you uploaded',
      });
    }

    const teacher = req.teacherProfileDoc || (await User.findById(req.user.id).select('role teacherProfile'));
    const nextSubject = req.body.subject ?? material.subject;
    const nextGrade = normalizeGradeValue(req.body.grade ?? material.grade);
    const nextSection = normalizeClassScopeValue(req.body.section ?? material.section);

    if (req.user.role !== 'Teacher') {
      if (!teacherAssignedToSubject(teacher, nextSubject)) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload materials for your assigned subjects',
        });
      }

      if (!teacherAssignedToClass(teacher, nextGrade, nextSection)) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload materials for your assigned classes',
        });
      }
    }

    const updatableFields = ['title', 'description', 'type', 'subject', 'dueDate', 'status'];
    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        material[field] = req.body[field];
      }
    });
    material.grade = nextGrade;
    material.section = nextSection;

    if (req.uploadedFile) {
      material.fileUrl = req.uploadedFile.fileUrl;
      material.fileName = req.uploadedFile.fileName;
      material.fileSize = req.uploadedFile.fileSize;
      material.fileMimeType = req.uploadedFile.fileMimeType;
    }

    await material.save();
    const savedMaterial = await Material.findById(material._id).populate('teacherId', 'firstName lastName');
    res.json(toMaterialResponse(savedMaterial));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update material',
      error: error.message,
    });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    if (String(material.teacherId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete materials you uploaded',
      });
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete material',
      error: error.message,
    });
  }
};

exports.publishMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    if (String(material.teacherId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish materials you uploaded',
      });
    }

    material.status = 'published';
    await material.save();

    const savedMaterial = await Material.findById(material._id).populate('teacherId', 'firstName lastName');
    res.json(toMaterialResponse(savedMaterial));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to publish material',
      error: error.message,
    });
  }
};

exports.archiveMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    if (String(material.teacherId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only archive materials you uploaded',
      });
    }

    material.status = 'archived';
    await material.save();

    const savedMaterial = await Material.findById(material._id).populate('teacherId', 'firstName lastName');
    res.json(toMaterialResponse(savedMaterial));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to archive material',
      error: error.message,
    });
  }
};

exports.markMaterialViewed = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true },
    ).populate('teacherId', 'firstName lastName');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    res.json(toMaterialResponse(material));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update material view count',
      error: error.message,
    });
  }
};

exports.downloadMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true },
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    if (!material.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'No attachment found for this material',
      });
    }

    if (!isAbsoluteHttpUrl(material.fileUrl)) {
      return res.status(404).json({
        success: false,
        message: 'Stored file URL is invalid. Material must be re-uploaded to cloud storage.',
      });
    }

    return res.redirect(material.fileUrl);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download material',
      error: error.message,
    });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assignments',
      });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    if (material.type !== 'assignment') {
      return res.status(400).json({
        success: false,
        message: 'Submissions are only supported for assignment materials',
      });
    }

    if (material.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Assignment is not published yet',
      });
    }

    const student = await User.findById(req.user.id).select('studentProfile');
    if (!student || !studentMatchesMaterialClass(student, material)) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit assignments for your class',
      });
    }

    const submissionText = String(req.body.submissionText || '').trim();
    if (!submissionText && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Submission text or attachment is required',
      });
    }

    const isLate = material.dueDate ? new Date() > new Date(material.dueDate) : false;

    const update = {
      submissionText,
      submittedAt: new Date(),
      isLate,
      status: 'Submitted',
      score: null,
      feedback: '',
      reviewedBy: null,
      reviewedAt: null,
    };

    if (req.uploadedSubmissionFile) {
      update.fileUrl = req.uploadedSubmissionFile.fileUrl;
      update.fileName = req.uploadedSubmissionFile.fileName;
      update.fileSize = req.uploadedSubmissionFile.fileSize;
      update.fileMimeType = req.uploadedSubmissionFile.fileMimeType;
    }

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { materialId: material._id, studentId: req.user.id },
      {
        $set: update,
        $setOnInsert: {
          materialId: material._id,
          studentId: req.user.id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate('studentId', 'firstName lastName');

    return res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: toSubmissionResponse(submission),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit assignment',
      error: error.message,
    });
  }
};

exports.getMaterialSubmissions = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    const canManageMaterial = String(material.teacherId) === String(req.user.id);
    if (!canManageMaterial) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view submissions for this material',
      });
    }

    const submissions = await AssignmentSubmission.find({ materialId: material._id })
      .populate('studentId', 'firstName lastName email studentProfile')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });

    return res.json({
      success: true,
      data: submissions.map(toSubmissionResponse),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message,
    });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their submissions',
      });
    }

    const submissions = await AssignmentSubmission.find({ studentId: req.user.id })
      .populate('materialId', 'title type subject grade section dueDate teacherId')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });

    return res.json({
      success: true,
      data: submissions.map((submission) => {
        const item = toSubmissionResponse(submission);
        const material = submission.materialId || {};
        return {
          ...item,
          material: {
            id: String(material._id || ''),
            title: material.title || '',
            subject: material.subject || '',
            grade: material.grade || '',
            section: material.section || '',
            dueDate: material.dueDate || null,
          },
        };
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message,
    });
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const { score, feedback = '', status } = req.body;
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    const canManageMaterial = String(material.teacherId) === String(req.user.id);
    if (!canManageMaterial) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this submission',
      });
    }

    const submission = await AssignmentSubmission.findOne({
      _id: req.params.submissionId,
      materialId: material._id,
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    if (score !== undefined && score !== null) {
      const parsedScore = Number(score);
      if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return res.status(400).json({
          success: false,
          message: 'Score must be a number between 0 and 100',
        });
      }
      submission.score = parsedScore;
    }

    submission.feedback = String(feedback || '').trim();
    submission.status = status === 'Returned' ? 'Returned' : 'Reviewed';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();

    await submission.save();
    await submission.populate('studentId', 'firstName lastName email');
    await submission.populate('reviewedBy', 'firstName lastName');

    return res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: toSubmissionResponse(submission),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to review submission',
      error: error.message,
    });
  }
};

exports.downloadSubmission = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    const submission = await AssignmentSubmission.findOne({
      _id: req.params.submissionId,
      materialId: material._id,
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    const canAccess =
      String(material.teacherId) === String(req.user.id) ||
      String(submission.studentId) === String(req.user.id);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this submission',
      });
    }

    if (!submission.fileUrl) {
      return res.status(404).json({
        success: false,
        message: 'No attachment found for this submission',
      });
    }

    if (!isAbsoluteHttpUrl(submission.fileUrl)) {
      return res.status(404).json({
        success: false,
        message: 'Stored submission URL is invalid. Submission file must be re-uploaded to cloud storage.',
      });
    }

    return res.redirect(submission.fileUrl);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to download submission',
      error: error.message,
    });
  }
};

exports.getMaterialSubjects = async (_req, res) => {
  try {
    const subjects = await Material.distinct('subject');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message,
    });
  }
};

exports.getMaterialGrades = async (_req, res) => {
  try {
    const grades = await Material.distinct('grade');
    res.json(grades.sort());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades',
      error: error.message,
    });
  }
};

exports.ensureTeacherCanManageMaterial = ensureTeacherCanManageMaterial;
