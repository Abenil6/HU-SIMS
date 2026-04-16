const Certificate = require('../models/Certificate');
const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
const Attendance = require('../models/Attendance');
const { PERMISSIONS, RESOURCES } = require('../models/Permission');

/**
 * Create certificate
 */
exports.createCertificate = async (req, res) => {
  try {
    const {
      certificateType,
      studentId,
      academicYear,
      title,
      recipientName,
      description,
      fatherName,
      motherName,
      completionDetails,
      transferDetails,
      signerName,
      signerTitle,
      notes
    } = req.body;

    // Verify student exists
    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const certificate = new Certificate({
      certificateType,
      student: studentId,
      academicYear,
      issuedBy: req.user.id,
      title,
      recipientName,
      description,
      fatherName: fatherName || student.fatherName,
      motherName: motherName || student.motherName,
      completionDetails,
      transferDetails,
      signedBy: {
        name: signerName,
        title: signerTitle
      },
      notes,
      status: 'Draft'
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate created successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create certificate',
      error: error.message
    });
  }
};

/**
 * Generate completion certificate automatically
 */
exports.generateCompletionCertificate = async (req, res) => {
  try {
    const { studentId, academicYear, signerName, signerTitle } = req.body;

    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get academic performance
    const records = await AcademicRecord.find({
      student: studentId,
      academicYear,
      status: 'Approved'
    });

    // Get attendance
    const startDate = new Date(`${academicYear.split('-')[0]}-09-01`);
    const endDate = new Date(`${academicYear.split('-')[1]}-07-31`);
    
    const attendanceRecords = await Attendance.find({
      student: studentId,
      date: { $gte: startDate, $lte: endDate }
    });

    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter(a => a.status === 'Present').length;
    const attendancePercentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 100;

    // Calculate average marks
    const averageMarks = records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.totalMarks, 0) / records.length)
      : 0;

    const certificate = await Certificate.generateCompletionCertificate(student, academicYear, req.user, {
      academicPerformance: `${averageMarks}%`,
      attendancePercentage,
      signerName: signerName || 'School Principal',
      signerTitle: signerTitle || 'Principal'
    });

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate',
      error: error.message
    });
  }
};

/**
 * Generate transfer certificate automatically
 */
exports.generateTransferCertificate = async (req, res) => {
  try {
    const {
      studentId,
      academicYear,
      dateOfAdmission,
      classWhenJoining,
      characterAndConduct,
      reasonForLeaving,
      academicRecord,
      signerName,
      signerTitle
    } = req.body;

    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const certificate = await Certificate.generateTransferCertificate(student, academicYear, req.user, {
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      dateOfBirth: req.body.dateOfBirth || student.dateOfBirth,
      dateOfAdmission: dateOfAdmission || student.studentProfile?.admissionDate,
      classWhenJoining: classWhenJoining || student.studentProfile?.grade,
      classWhenLeaving: student.studentProfile?.grade,
      characterAndConduct: characterAndConduct || 'Good',
      reasonForLeaving: reasonForLeaving || 'Transfer',
      academicRecord: academicRecord || '',
      signerName: signerName || 'School Principal',
      signerTitle: signerTitle || 'Principal'
    });

    res.status(201).json({
      success: true,
      message: 'Transfer Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate transfer certificate',
      error: error.message
    });
  }
};

/**
 * Generate character certificate automatically
 */
exports.generateCharacterCertificate = async (req, res) => {
  try {
    const { studentId, academicYear, signerName, signerTitle } = req.body;

    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const certificate = await Certificate.generateCharacterCertificate(student, academicYear, req.user, {
      signerName: signerName || 'School Principal',
      signerTitle: signerTitle || 'Principal'
    });

    res.status(201).json({
      success: true,
      message: 'Character Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate character certificate',
      error: error.message
    });
  }
};

/**
 * Generate bonafide certificate automatically
 */
exports.generateBonafideCertificate = async (req, res) => {
  try {
    const { studentId, academicYear, signerName, signerTitle } = req.body;

    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const certificate = await Certificate.generateBonafideCertificate(student, academicYear, req.user, {
      signerName: signerName || 'School Principal',
      signerTitle: signerTitle || 'Principal'
    });

    res.status(201).json({
      success: true,
      message: 'Bonafide Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate bonafide certificate',
      error: error.message
    });
  }
};

/**
 * Issue certificate
 */
exports.issueCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    certificate.status = 'Issued';
    certificate.issueDate = new Date();
    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate issued',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to issue certificate',
      error: error.message
    });
  }
};

/**
 * Cancel certificate
 */
exports.cancelCertificate = async (req, res) => {
  try {
    const { reason } = req.body;

    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    certificate.status = 'Cancelled';
    certificate.notes = `Cancelled: ${reason}`;
    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate cancelled',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel certificate',
      error: error.message
    });
  }
};

/**
 * Get all certificates
 */
exports.getCertificates = async (req, res) => {
  try {
    const { certificateType, status, academicYear, studentId, page = 1, limit = 20 } = req.query;

    const query = {};

    // Students/Parents can only see their own certificates
    if (req.user.role === 'Student') {
      query.student = req.user.id;
    } else if (req.user.role === 'Parent') {
      query.student = { $in: req.user.parentProfile?.linkedChildren || [] };
    }

    if (certificateType) query.certificateType = certificateType;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (studentId && ['SystemAdmin', 'SchoolAdmin', 'Teacher'].includes(req.user.role)) {
      query.student = studentId;
    }

    const certificates = await Certificate.find(query)
      .populate('student', 'firstName lastName email')
      .populate('issuedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments(query);

    res.json({
      success: true,
      data: certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
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
 * Get certificate by ID
 */
exports.getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'firstName lastName email studentProfile fatherName motherName dateOfBirth')
      .populate('issuedBy', 'firstName lastName');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Check authorization
    const isOwner = certificate.student._id.toString() === req.user.id;
    const isIssuer = certificate.issuedBy._id.toString() === req.user.id;
    const isParent = req.user.role === 'Parent' && 
      req.user.parentProfile?.linkedChildren?.includes(certificate.student._id);
    const isAdmin = ['SystemAdmin', 'SchoolAdmin'].includes(req.user.role);

    if (!isOwner && !isIssuer && !isParent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this certificate'
      });
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
};

/**
 * Verify certificate
 */
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber, verificationCode } = req.body;

    const query = {};
    if (certificateNumber) query.certificateNumber = certificateNumber;
    if (verificationCode) query.verificationCode = verificationCode;

    const certificate = await Certificate.findOne(query)
      .populate('student', 'firstName lastName')
      .populate('issuedBy', 'firstName lastName');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      data: {
        valid: certificate.status === 'Issued',
        certificateNumber: certificate.certificateNumber,
        student: certificate.recipientName,
        fatherName: certificate.fatherName,
        motherName: certificate.motherName,
        type: certificate.certificateType,
        issueDate: certificate.issueDate,
        status: certificate.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
};

/**
 * Export certificate as JSON
 */
exports.exportCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'firstName lastName email studentProfile fatherName motherName dateOfBirth')
      .populate('issuedBy', 'firstName lastName');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    const exportData = {
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
      type: certificate.certificateType,
      title: certificate.title,
      recipientName: certificate.recipientName,
      fatherName: certificate.fatherName,
      motherName: certificate.motherName,
      description: certificate.description,
      academicYear: certificate.academicYear,
      issueDate: certificate.issueDate,
      signedBy: certificate.signedBy,
      status: certificate.status,
      transferDetails: certificate.transferDetails,
      completionDetails: certificate.completionDetails,
      student: {
        name: certificate.student.firstName + ' ' + certificate.student.lastName,
        grade: certificate.student.studentProfile?.grade,
        section: certificate.student.studentProfile?.section,
        dateOfBirth: certificate.student.dateOfBirth
      }
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export certificate',
      error: error.message
    });
  }
};
