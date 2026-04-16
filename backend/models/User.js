const mongoose = require('mongoose');

const normalizeUserShape = (_doc, ret) => {
  if (!ret || typeof ret !== 'object') return ret;

  const normalizedId = String(ret._id || ret.id || '');
  if (normalizedId) {
    ret._id = normalizedId;
    ret.id = normalizedId;
  }

  if (ret.studentProfile && typeof ret.studentProfile === 'object') {
    ret.studentId = ret.studentId || ret.studentProfile.studentId || undefined;
    ret.grade = ret.grade || ret.studentProfile.grade || undefined;
    ret.stream = ret.stream || ret.studentProfile.stream || ret.studentProfile.section || undefined;
  }

  return ret;
};

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'],
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending'],
      default: 'Pending'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    // For self-service password setup
    mustSetPassword: {
      type: Boolean,
      default: true
    },
    // Basic fields for all users
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phone: {
      type: String
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    address: {
      street: String,
      city: String,
      region: String
    },
    profileImage: {
      type: String
    },
    signature: {
      type: String
    },
    appearanceSettings: {
      darkMode: {
        type: Boolean,
        default: false
      },
      colorTheme: {
        type: String,
        default: 'green'
      },
      fontSize: {
        type: String,
        default: 'medium'
      },
      density: {
        type: String,
        default: 'comfortable'
      },
      borderRadius: {
        type: String,
        default: 'medium'
      },
      sidebarCollapsed: {
        type: Boolean,
        default: false
      },
      showAnimations: {
        type: Boolean,
        default: true
      }
    },
    
    // ==================== STUDENT SPECIFIC FIELDS ====================
    studentProfile: {
      // Student ID - simple sequential ID
      studentId: {
        type: String,
        unique: true,
        sparse: true
      },
      
      // Personal Information
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
      },
      grandfatherName: String,
      placeOfBirth: {
        woreda: String,
        zone: String,
        region: String
      },
      nationality: String,
      homeAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
      },
      emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
      },
      
      // Academic Information
      grade: String,  // Grade 9-12
      // Section is deprecated in the new school structure.
      // Use `stream` for Grade 11-12 (Natural/Social). Keep `section` for backward compatibility.
      section: String,
      stream: String,
      academicYear: String,
      admissionDate: Date,
      enrollmentType: {
        type: String,
        enum: ['New Admission', 'Transfer Student']
      },
      previousSchool: {
        name: String,
        address: String,
        phone: String
      },
      previousGrades: String,  // Could be JSON or reference to documents
      entranceExamResult: String,
      academicDocuments: [{
        category: {
          type: String,
          enum: ['Grade 8 Ministry Result', 'Previous Grade Report']
        },
        title: String,
        fileName: String,
        storageKey: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        // Legacy support for older documents saved as base64 payloads
        fileData: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }],

      // Parent/Guardian Information
      fatherName: String,
      fatherOccupation: String,
      fatherPhone: String,
      fatherEmail: String,
      motherName: String,
      motherOccupation: String,
      motherPhone: String,
      motherEmail: String,
      primaryGuardian: {
        fullName: String,
        relationship: String,
        phone: String,
        email: String,
        occupation: String,
        address: String
      },
      secondaryGuardian: {
        fullName: String,
        relationship: String,
        phone: String,
        email: String,
        occupation: String,
        address: String
      },
      
      // Additional Information
      allergies: [String],
      healthConditions: [String],
      specialNeeds: String,
      medicalNotes: String,
      
      // Student ID from previous school
      previousStudentId: String,
      
      // Linked Parents (array of parent IDs)
      linkedParents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      
      // Parent linking requests (pending)
      parentLinkRequests: [{
        parentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        status: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected'],
          default: 'Pending'
        },
        requestedAt: {
          type: Date,
          default: Date.now
        }
      }]
    },
    
    // ==================== PARENT SPECIFIC FIELDS ====================
    parentProfile: {
      // Personal Information
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
      },
      nationality: String,
      homeAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
      },
      relationship: String,
      occupation: String,
      workplace: String,
      
      // Contact Preferences
      preferredContactMethod: {
        type: String,
        enum: ['Email', 'Phone', 'SMS', 'WhatsApp'],
        default: 'Email'
      },
      
      // Linked Children
      linkedChildren: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      
      // Child linking requests (pending)
      childLinkRequests: [{
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        status: {
          type: String,
          enum: ['Pending', 'Approved', 'Rejected'],
          default: 'Pending'
        },
        requestedAt: {
          type: Date,
          default: Date.now
        }
      }]
    },
    
    // ==================== ADMIN SPECIFIC FIELDS ====================
    adminProfile: {
      department: String,
      position: String,
      hireDate: Date,
      permissions: [String]
    },
    
    // ==================== TEACHER SPECIFIC FIELDS ====================
    teacherProfile: {
      department: String,
      subject: String,
      subjects: [String],
      qualifications: [String],
      specialization: String,
      hireDate: Date,
      classes: [{
        grade: String,
        // `section` is kept for backward compatibility; use `stream` in Grade 11-12.
        section: String,
        stream: String
      }]
    },
    
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastLogin: {
      type: Date
    },
    passwordChangedAt: {
      type: Date
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    }
  },
  { timestamps: true }
);

// Pre-save hook to generate student ID for new students
userSchema.pre('save', async function() {
  if (this.isNew && this.role === 'Student' && !this.studentProfile?.studentId) {
    try {
      // Find the highest existing student ID
      const lastStudent = await mongoose.model('User').findOne(
        { role: 'Student', 'studentProfile.studentId': { $exists: true } },
        { 'studentProfile.studentId': 1 }
      ).sort({ 'studentProfile.studentId': -1 });
      
      let nextNumber = 1;
      if (lastStudent && lastStudent.studentProfile?.studentId) {
        // Extract number from existing ID (e.g., "STU005" -> 5)
        const match = lastStudent.studentProfile.studentId.match(/(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      // Generate new ID with padding (STU001, STU002, etc.)
      const studentId = `STU${nextNumber.toString().padStart(3, '0')}`;
      
      if (!this.studentProfile) {
        this.studentProfile = {};
      }
      this.studentProfile.studentId = studentId;
    } catch (error) {
      console.error('Error generating student ID:', error);
    }
  }
});

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'studentProfile.grade': 1 });
userSchema.index({ 'parentProfile.linkedChildren': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Method to check if user can manage another user
userSchema.methods.canManage = function(targetUser) {
  if (this.role === 'SystemAdmin') return true;
  if (this.role === 'SchoolAdmin') {
    return ['Teacher', 'Student', 'Parent'].includes(targetUser.role);
  }
  return false;
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: normalizeUserShape,
});

userSchema.set('toObject', {
  virtuals: true,
  transform: normalizeUserShape,
});

module.exports = mongoose.model('User', userSchema);
