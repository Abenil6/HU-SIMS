const SchoolClass = require('../models/SchoolClass');
const User = require('../models/User');

const { normalizeGrade, normalizeStream } = require('../utils/normalization');

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

const deriveClassesFromStudents = async () => {
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
        studentCount: { $sum: 1 },
      },
    },
  ]);

  return rows.map((row) => {
    const grade = normalizeGrade(row?._id?.grade);
    const stream = normalizeStream(row?._id?.stream);
    const displayName = stream ? `${grade} - ${stream}` : grade;

    return {
      _id: `derived_${grade}_${stream}`,
      id: `derived_${grade}_${stream}`,
      name: displayName,
      grade: `Grade ${grade}`,
      stream: stream || '',
      academicYear: '',
      capacity: 45,
      students: row.studentCount || 0,
      classTeacher: '-',
      classTeacherId: '',
      subjects: [],
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDerived: true,
    };
  });
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
      const normalizedSearch = search.replace(/^Grade\s+/i, '').replace(/\s*Science$/i, '').trim();
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { grade: { $regex: search, $options: 'i' } },
        { grade: { $regex: normalizedSearch, $options: 'i' } },
        { stream: { $regex: search, $options: 'i' } },
        { stream: { $regex: normalizedSearch, $options: 'i' } },
      ];
    }

    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.max(parseInt(limit, 10) || 20, 1);

    const [explicitClasses, studentCountMap, allDerivedClasses] = await Promise.all([
      SchoolClass.find(query)
        .populate('classTeacher', 'firstName lastName')
        .sort({ grade: 1, stream: 1, name: 1 }),
      buildStudentCountMap(),
      deriveClassesFromStudents(),
    ]);

    const explicitData = explicitClasses.map((doc) => {
      const key = `${normalizeGrade(doc.grade)}::${normalizeStream(doc.stream)}`;
      return toResponse(doc, studentCountMap.get(key) || 0);
    });

    // Identify which grade/stream combinations from students are NOT covered by explicit classes
    const explicitKeys = new Set(
      explicitData.map((c) => `${normalizeGrade(c.grade)}::${normalizeStream(c.stream)}`)
    );

    let filteredDerived = allDerivedClasses.filter((c) => {
      const key = `${normalizeGrade(c.grade)}::${normalizeStream(c.stream)}`;
      return !explicitKeys.has(key);
    });

    // Apply filters to derived classes (since they were fetched without the query filters)
    if (grade) {
      const normGrade = normalizeGrade(grade);
      filteredDerived = filteredDerived.filter((c) => normalizeGrade(c.grade) === normGrade);
    }
    if (stream !== undefined) {
      const normStream = normalizeStream(stream);
      filteredDerived = filteredDerived.filter((c) => normalizeStream(c.stream) === normStream);
    }
    if (status && status !== 'Active') {
      // Derived classes are always considered 'Active'
      filteredDerived = [];
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDerived = filteredDerived.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.grade.toLowerCase().includes(searchLower) ||
          c.stream.toLowerCase().includes(searchLower)
      );
    }

    // Combine explicit and missing derived classes
    let combined = [...explicitData, ...filteredDerived];

    // Final Sort
    combined.sort((a, b) => {
      const gA = normalizeGrade(a.grade);
      const gB = normalizeGrade(b.grade);
      if (gA !== gB) return gA.localeCompare(gB, undefined, { numeric: true });
      return (a.stream || '').localeCompare(b.stream || '');
    });

    const total = combined.length;
    const data = combined.slice((numericPage - 1) * numericLimit, numericPage * numericLimit);

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
