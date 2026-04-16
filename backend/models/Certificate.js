const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateType: {
      type: String,
      enum: ['Completion', 'Achievement', 'Attendance', 'GoodConduct', 'Transcript', 'Transfer', 'Character', 'Bonafide'],
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    academicYear: {
      type: String,
      required: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Certificate content
    title: {
      type: String,
      required: true
    },
    recipientName: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    // Parent names (required for Transfer Certificates)
    fatherName: {
      type: String
    },
    motherName: {
      type: String
    },
    // For completion certificates
    completionDetails: {
      grade: String,
      section: String,
      academicPerformance: String,
      attendancePercentage: Number,
      completedOn: Date
    },
    // For transfer certificates
    transferDetails: {
      dateOfBirth: Date,
      dateOfAdmission: Date,
      dateOfLeaving: Date,
      classWhenJoining: String,
      classWhenLeaving: String,
      characterAndConduct: String,
      reasonForLeaving: String,
      academicRecord: String
    },
    // Certificate metadata
    issueDate: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date
    },
    // Signature information
    signedBy: {
      name: String,
      title: String,
      signature: String  // Could be image path
    },
    // Certificate ID for verification
    certificateNumber: {
      type: String,
      unique: true
    },
    // Verification QR code (future)
    verificationCode: {
      type: String
    },
    // Status
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Cancelled', 'Replaced'],
      default: 'Draft'
    },
    // Notes
    notes: {
      type: String
    },
    // Related documents
    attachments: [{
      filename: String,
      path: String
    }]
  },
  { timestamps: true }
);

// Indexes
certificateSchema.index({ student: 1, academicYear: 1 });
certificateSchema.index({ certificateType: 1, status: 1 });
certificateSchema.index({ certificateNumber: 1 });
certificateSchema.index({ issuedBy: 1 });

// Generate certificate number before saving
certificateSchema.pre('save', async function(next) {
  if (!this.certificateNumber) {
    const count = await mongoose.model('Certificate').countDocuments();
    this.certificateNumber = `CERT-${Date.now()}-${(count + 1).toString().padStart(5, '0')}`;
  }
  
  if (!this.verificationCode) {
    this.verificationCode = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  next();
});

// Static method to generate completion certificate
certificateSchema.statics.generateCompletionCertificate = async function(student, academicYear, issuer, options = {}) {
  const cert = new this({
    certificateType: 'Completion',
    student: student._id,
    academicYear,
    issuedBy: issuer._id,
    title: 'Certificate of Completion',
    recipientName: `${student.firstName} ${student.lastName}`,
    description: `This is to certify that ${student.firstName} ${student.lastName} has successfully completed the academic year ${academicYear}.`,
    fatherName: student.fatherName,
    motherName: student.motherName,
    completionDetails: {
      grade: student.studentProfile?.grade,
      section: student.studentProfile?.section,
      academicPerformance: options.academicPerformance,
      attendancePercentage: options.attendancePercentage,
      completedOn: new Date()
    },
    signedBy: {
      name: options.signerName || 'School Principal',
      title: options.signerTitle || 'Principal'
    },
    status: 'Issued'
  });

  await cert.save();
  return cert;
};

// Static method to generate transfer certificate
certificateSchema.statics.generateTransferCertificate = async function(student, academicYear, issuer, options = {}) {
  const cert = new this({
    certificateType: 'Transfer',
    student: student._id,
    academicYear,
    issuedBy: issuer._id,
    title: 'Transfer Certificate',
    recipientName: `${student.firstName} ${student.lastName}`,
    description: `This is to certify that ${student.firstName} ${student.lastName} was a student of this school.`,
    fatherName: options.fatherName || student.fatherName,
    motherName: options.motherName || student.motherName,
    transferDetails: {
      dateOfBirth: options.dateOfBirth || student.dateOfBirth,
      dateOfAdmission: options.dateOfAdmission || student.studentProfile?.admissionDate,
      dateOfLeaving: new Date(),
      classWhenJoining: options.classWhenJoining || student.studentProfile?.grade,
      classWhenLeaving: options.classWhenLeaving || student.studentProfile?.grade,
      characterAndConduct: options.characterAndConduct || 'Good',
      reasonForLeaving: options.reasonForLeaving || 'Transfer',
      academicRecord: options.academicRecord || ''
    },
    signedBy: {
      name: options.signerName || 'School Principal',
      title: options.signerTitle || 'Principal'
    },
    status: 'Issued'
  });

  await cert.save();
  return cert;
};

// Static method to generate character certificate
certificateSchema.statics.generateCharacterCertificate = async function(student, academicYear, issuer, options = {}) {
  const cert = new this({
    certificateType: 'Character',
    student: student._id,
    academicYear,
    issuedBy: issuer._id,
    title: 'Character Certificate',
    recipientName: `${student.firstName} ${student.lastName}`,
    description: `This is to certify that ${student.firstName} ${student.lastName} has borne a good moral character during his/her studies at this institution.`,
    fatherName: student.fatherName,
    motherName: student.motherName,
    signedBy: {
      name: options.signerName || 'School Principal',
      title: options.signerTitle || 'Principal'
    },
    status: 'Issued'
  });

  await cert.save();
  return cert;
};

// Static method to generate bonafide certificate
certificateSchema.statics.generateBonafideCertificate = async function(student, academicYear, issuer, options = {}) {
  const cert = new this({
    certificateType: 'Bonafide',
    student: student._id,
    academicYear,
    issuedBy: issuer._id,
    title: 'Bonafide Certificate',
    recipientName: `${student.firstName} ${student.lastName}`,
    description: `This is to certify that ${student.firstName} ${student.lastName} is a bonafide student of this institution.`,
    fatherName: student.fatherName,
    motherName: student.motherName,
    completionDetails: {
      grade: student.studentProfile?.grade,
      section: student.studentProfile?.section
    },
    signedBy: {
      name: options.signerName || 'School Principal',
      title: options.signerTitle || 'Principal'
    },
    status: 'Issued'
  });

  await cert.save();
  return cert;
};

// Static method to get student certificates
certificateSchema.statics.getStudentCertificates = async function(studentId, status = 'Issued') {
  return await this.find({
    student: studentId,
    status
  })
    .populate('issuedBy', 'firstName lastName')
    .sort({ issueDate: -1 });
};

module.exports = mongoose.model('Certificate', certificateSchema);
