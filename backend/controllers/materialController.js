const fs = require('fs');
const path = require('path');
const Material = require('../models/Material');
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
  if (isAdminUser(req.user)) {
    return next();
  }

  if (req.user.role !== 'Teacher') {
    return res.status(403).json({
      success: false,
      message: 'Only teachers and school administrators can manage materials',
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
  try {
    const { title, description, type, subject, grade, section, dueDate } = req.body;

    const normalizedGrade = normalizeGradeValue(grade);
    const normalizedSection = normalizeClassScopeValue(section);
    const teacher = req.teacherProfileDoc || (await User.findById(req.user.id).select('role teacherProfile'));

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
    }

    const material = await Material.create({
      title: String(title).trim(),
      description: String(description || '').trim(),
      type,
      subject: String(subject).trim(),
      grade: normalizedGrade,
      section: normalizedSection,
      teacherId: req.user.id,
      fileUrl: req.file ? `/uploads/materials/${req.file.filename}` : '',
      fileName: req.file?.originalname || '',
      fileSize: req.file?.size || 0,
      fileMimeType: req.file?.mimetype || '',
      dueDate: dueDate || null,
      status: 'draft',
    });

    const savedMaterial = await Material.findById(material._id).populate('teacherId', 'firstName lastName');
    res.status(201).json(toMaterialResponse(savedMaterial));
  } catch (error) {
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

    if (!isAdminUser(req.user) && String(material.teacherId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update materials you uploaded',
      });
    }

    const teacher = req.teacherProfileDoc || (await User.findById(req.user.id).select('role teacherProfile'));
    const nextSubject = req.body.subject ?? material.subject;
    const nextGrade = normalizeGradeValue(req.body.grade ?? material.grade);
    const nextSection = normalizeClassScopeValue(req.body.section ?? material.section);

    if (req.user.role === 'Teacher') {
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

    if (req.file) {
      material.fileUrl = `/uploads/materials/${req.file.filename}`;
      material.fileName = req.file.originalname;
      material.fileSize = req.file.size;
      material.fileMimeType = req.file.mimetype;
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

    if (!isAdminUser(req.user) && String(material.teacherId) !== String(req.user.id)) {
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

    if (!isAdminUser(req.user) && String(material.teacherId) !== String(req.user.id)) {
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

    if (!isAdminUser(req.user) && String(material.teacherId) !== String(req.user.id)) {
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

    const filePath = path.join(__dirname, '..', material.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Stored file could not be found',
      });
    }

    return res.download(filePath, material.fileName || path.basename(filePath));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download material',
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
