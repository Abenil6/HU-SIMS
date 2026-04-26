const SchoolClass = require('../models/SchoolClass');
const User = require('../models/User');

const normalizeGrade = (value) => String(value || '').replace(/^Grade\s+/i, '').trim();
const normalizeStream = (value) => String(value || '').trim();

const toResponse = (doc, studentCount = 0) => {
  const classTeacher = doc.classTeacher || null;
  return {
    id: String(doc._id),
    _id: String(doc._id),
    name: doc.name,
    grade: `Grade ${normalizeGrade(doc.grade)}`,
    stream: doc.stream || '',
    academicYear: doc.academicYear || '',
    capacity: doc.capacity,
    students: studentCount,
    classTeacher: classTeacher
      ? `${classTeacher.firstName || ''} ${classTeacher.lastName || ''}`.trim()
      : '-',
    classTeacherId: classTeacher ? String(classTeacher._id || classTeacher) : '',
    subjects: Array.isArray(doc.subjects) ? doc.subjects : [],
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const buildStudentCountMap = async () => {
  const rows = await User.aggregate([
    { $match: { role: 'Student' } },
    {
      $project: {
        grade: { $ifNull: ['$studentProfile.grade', '$grade'] },
        stream: {
          $ifNull: [
            '$studentProfile.stream',
            { $ifNull: ['$studentProfile.section', { $ifNull: ['$stream', '$section'] }] },
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          grade: '$grade',
          stream: '$stream',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    const grade = normalizeGrade(row?._id?.grade);
    const stream = normalizeStream(row?._id?.stream);
    map.set(`${grade}::${stream}`, row.count || 0);
  });
  return map;
};

exports.getClasses = async (req, res) => {
  try {
    const { grade, stream, status, search, academicYear, page = 1, limit = 20 } = req.query;
    const query = {};

    if (grade) query.grade = normalizeGrade(grade);
    if (stream !== undefined) query.stream = normalizeStream(stream);
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { grade: { $regex: search, $options: 'i' } },
        { stream: { $regex: search, $options: 'i' } },
      ];
    }

    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.max(parseInt(limit, 10) || 20, 1);

    const [classes, total, studentCountMap] = await Promise.all([
      SchoolClass.find(query)
        .populate('classTeacher', 'firstName lastName')
        .sort({ grade: 1, stream: 1, name: 1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit),
      SchoolClass.countDocuments(query),
      buildStudentCountMap(),
    ]);

    const data = classes.map((doc) => {
      const key = `${normalizeGrade(doc.grade)}::${normalizeStream(doc.stream)}`;
      return toResponse(doc, studentCountMap.get(key) || 0);
    });

    res.json({
      success: true,
      data,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch classes', error: error.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, grade, stream = '', academicYear = '', capacity = 45, classTeacher, subjects = [], status = 'Active' } = req.body;
    const normalizedGrade = normalizeGrade(grade);
    const normalizedStream = normalizeStream(stream);

    if (!name || !normalizedGrade) {
      return res.status(400).json({ success: false, message: 'name and grade are required' });
    }

    const schoolClass = await SchoolClass.create({
      name: String(name).trim(),
      grade: normalizedGrade,
      stream: normalizedStream,
      academicYear: String(academicYear || '').trim(),
      capacity: Number(capacity) || 45,
      classTeacher: classTeacher || null,
      subjects: Array.isArray(subjects) ? subjects : [],
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      createdBy: req.user.id,
    });

    const populated = await SchoolClass.findById(schoolClass._id).populate('classTeacher', 'firstName lastName');
    return res.status(201).json({ success: true, message: 'Class created successfully', data: toResponse(populated, 0) });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : 500;
    res.status(status).json({ success: false, message: 'Failed to create class', error: error.message });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const schoolClass = await SchoolClass.findById(req.params.id).populate('classTeacher', 'firstName lastName');
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const studentCountMap = await buildStudentCountMap();
    const key = `${normalizeGrade(schoolClass.grade)}::${normalizeStream(schoolClass.stream)}`;
    return res.json({ success: true, data: toResponse(schoolClass, studentCountMap.get(key) || 0) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch class', error: error.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const schoolClass = await SchoolClass.findById(req.params.id);
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const fields = ['name', 'academicYear', 'capacity', 'status'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        schoolClass[field] = req.body[field];
      }
    });

    if (req.body.grade !== undefined) schoolClass.grade = normalizeGrade(req.body.grade);
    if (req.body.stream !== undefined) schoolClass.stream = normalizeStream(req.body.stream);
    if (req.body.classTeacher !== undefined) schoolClass.classTeacher = req.body.classTeacher || null;
    if (req.body.subjects !== undefined) schoolClass.subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];

    await schoolClass.save();
    const populated = await SchoolClass.findById(schoolClass._id).populate('classTeacher', 'firstName lastName');

    const studentCountMap = await buildStudentCountMap();
    const key = `${normalizeGrade(populated.grade)}::${normalizeStream(populated.stream)}`;

    return res.json({ success: true, message: 'Class updated successfully', data: toResponse(populated, studentCountMap.get(key) || 0) });
  } catch (error) {
    const status = error?.code === 11000 ? 409 : 500;
    res.status(status).json({ success: false, message: 'Failed to update class', error: error.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const schoolClass = await SchoolClass.findById(req.params.id);
    if (!schoolClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    await SchoolClass.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete class', error: error.message });
  }
};
