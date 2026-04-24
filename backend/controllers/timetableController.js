const Timetable = require('../models/Timetable');
const User = require('../models/User');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { period: 1, startTime: '08:30', endTime: '09:15', isBreak: false },
  { period: 2, startTime: '09:15', endTime: '10:00', isBreak: false },
  { period: 3, startTime: '10:00', endTime: '10:45', isBreak: false },
  { period: 'TEA', startTime: '10:45', endTime: '11:00', isBreak: true, breakName: 'Tea Break' },
  { period: 4, startTime: '11:00', endTime: '11:45', isBreak: false },
  { period: 5, startTime: '11:45', endTime: '12:30', isBreak: false },
  { period: 'LUNCH', startTime: '12:30', endTime: '13:30', isBreak: true, breakName: 'Lunch Break' },
  { period: 6, startTime: '13:30', endTime: '14:15', isBreak: false },
  { period: 7, startTime: '14:15', endTime: '15:00', isBreak: false }
];

const SUBJECTS_BY_GRADE = {
  common_9_10: [
    'Mathematics',
    'English',
    'Biology',
    'Chemistry',
    'Physics',
    'Geography',
    'History',
    'Civics',
    'Information Communication Technology (ICT)',
    'Amharic',
    'Physical and Health Education (HPE)'
  ],
  natural_11_12: [
    'Mathematics',
    'English',
    'Biology',
    'Chemistry',
    'Physics',
    'Civics',
    'Information Communication Technology (ICT)',
    'Amharic',
    'Physical and Health Education (HPE)'
  ],
  social_11_12: [
    'Mathematics',
    'English',
    'Geography',
    'History',
    'Economics',
    'Civics',
    'Information Communication Technology (ICT)',
    'Amharic',
    'Physical and Health Education (HPE)'
  ]
};

const normalizeSubjectName = (subject = '') => {
  const s = String(subject).trim().toLowerCase();
  if (!s) return '';
  if (s.includes('math')) return 'Mathematics';
  if (s.includes('english')) return 'English';
  if (s.includes('biology')) return 'Biology';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('physics')) return 'Physics';
  if (s.includes('geography')) return 'Geography';
  if (s.includes('history')) return 'History';
  if (s.includes('civics')) return 'Civics';
  if (s.includes('ict') || s.includes('information communication')) return 'Information Communication Technology (ICT)';
  if (s.includes('amharic')) return 'Amharic';
  if (s.includes('physical') || s.includes('hpe') || s.includes('health')) return 'Physical and Health Education (HPE)';
  if (s.includes('economics')) return 'Economics';
  return subject;
};

const getSubjectsFor = (className, stream) => {
  const gradeNum = parseInt(String(className), 10);
  if (gradeNum === 11 || gradeNum === 12) {
    if (String(stream).toLowerCase() === 'social') return SUBJECTS_BY_GRADE.social_11_12;
    return SUBJECTS_BY_GRADE.natural_11_12;
  }
  return SUBJECTS_BY_GRADE.common_9_10;
};

const getTargetWeeklyCounts = (subjects, className) => {
  const counts = {};
  const gradeNum = parseInt(String(className), 10);
  const isSocialScience11_12 = (gradeNum === 11 || gradeNum === 12) && 
    subjects.includes('Economics'); // Economics is only in social science stream
  const isGrade9_10 = gradeNum === 9 || gradeNum === 10;
  
  subjects.forEach((subject) => {
    if (subject === 'Mathematics' || subject === 'English') {
      counts[subject] = 5;
    } else if (
      subject === 'Civics' ||
      subject === 'Information Communication Technology (ICT)' ||
      subject === 'Physical and Health Education (HPE)' ||
      (!isGrade9_10 && subject === 'Amharic') || // Amharic: 2 periods for 11-12, 3 for 9-10
      (!isSocialScience11_12 && (subject === 'History' || subject === 'Geography'))
    ) {
      counts[subject] = 2;
    } else if (isGrade9_10 && subject === 'Amharic') {
      counts[subject] = 3; // Amharic: 3 periods for grades 9-10
    } else {
      counts[subject] = 4;
    }
  });
  return counts;
};

const getVersionGroup = ({ className, stream, academicYear, semester }) =>
  `${className}::${stream || ''}::${academicYear}::${semester}`;

const sortByLeastCount = (counts) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject);

/**
 * Create a new timetable
 */
exports.createTimetable = async (req, res) => {
  try {
    const {
      class: className,
      section,
      stream,
      academicYear,
      semester,
      schedule,
      status = 'Draft',
      generatedBySystem = false,
      generationWarnings = []
    } = req.body;

    const normalizedClass = className;
    const normalizedStream = stream || section || '';
    const versionGroup = getVersionGroup({
      className: normalizedClass,
      stream: normalizedStream,
      academicYear,
      semester
    });

    // Check for duplicate timetable
    const existing = await Timetable.findOne({ 
      class: normalizedClass, 
      stream: normalizedStream,
      academicYear, 
      semester,
      status: 'Draft'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A draft timetable already exists for this class/stream/academic year'
      });
    }

    const latest = await Timetable.findOne({ versionGroup }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    const timetable = new Timetable({
      class: normalizedClass,
      section: section || normalizedStream || undefined,
      stream: normalizedStream || undefined,
      academicYear,
      semester,
      schedule,
      status,
      version: nextVersion,
      versionGroup,
      generatedBySystem,
      generationWarnings,
      createdBy: req.user.id
    });

    await timetable.save();

    res.status(201).json({
      success: true,
      message: 'Timetable created successfully',
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create timetable',
      error: error.message
    });
  }
};

/**
 * Get all timetables
 */
exports.getTimetables = async (req, res) => {
  try {
    const {
      class: className,
      classId,
      stream,
      section,
      academicYear,
      semester,
      status,
      isActive,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (className) query.class = className;
    if (classId) query.class = classId;
    if (stream !== undefined) query.stream = stream;
    if (section !== undefined && stream === undefined) query.section = section;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (req.user.role !== 'SystemAdmin' && req.user.role !== 'SchoolAdmin') {
      query.status = 'Published';
      query.isActive = true;
    }

    const timetables = await Timetable.find(query)
      .populate('schedule.teacher', 'firstName lastName')
      .sort({ class: 1, academicYear: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Timetable.countDocuments(query);

    res.json({
      success: true,
      data: timetables,
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
      message: 'Failed to fetch timetables',
      error: error.message
    });
  }
};

/**
 * Get timetable by ID
 */
exports.getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('schedule.teacher', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    if (
      req.user.role !== 'SystemAdmin' &&
      req.user.role !== 'SchoolAdmin' &&
      (timetable.status !== 'Published' || !timetable.isActive)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this timetable'
      });
    }

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable',
      error: error.message
    });
  }
};

/**
 * Update timetable
 */
exports.updateTimetable = async (req, res) => {
  try {
    const { class: className, section, stream, academicYear, semester, schedule, isActive, status } = req.body;

    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    if (timetable.isLocked && req.user.role !== 'SystemAdmin') {
      return res.status(400).json({
        success: false,
        message: 'Published timetable is locked and cannot be edited'
      });
    }

    if (className) timetable.class = className;
    if (section !== undefined) timetable.section = section;
    if (stream !== undefined) timetable.stream = stream;
    if (academicYear) timetable.academicYear = academicYear;
    if (semester) timetable.semester = semester;
    if (schedule) timetable.schedule = schedule;
    if (isActive !== undefined) timetable.isActive = isActive;
    if (status) timetable.status = status;

    await timetable.save();

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update timetable',
      error: error.message
    });
  }
};

/**
 * Delete timetable
 */
exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    if (timetable.status === 'Published' || timetable.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Published or locked timetables cannot be deleted'
      });
    }

    await Timetable.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete timetable',
      error: error.message
    });
  }
};

/**
 * Add a class period to timetable
 */
exports.addPeriod = async (req, res) => {
  try {
    const { day, period, subject, teacher, room, startTime, endTime } = req.body;

    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    // Check for conflicts
    const conflict = timetable.schedule.find(entry => 
      entry.day === day &&
      entry.period === period &&
      entry.teacher.toString() === teacher
    );

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'Teacher already has a class at this time'
      });
    }

    // Check if room is occupied
    const roomConflict = timetable.schedule.find(entry =>
      entry.day === day &&
      entry.period === period &&
      entry.room === room
    );

    if (roomConflict) {
      return res.status(400).json({
        success: false,
        message: 'Room is already booked for this time'
      });
    }

    timetable.schedule.push({
      day,
      period,
      subject,
      teacher,
      room,
      startTime,
      endTime
    });

    await timetable.save();

    res.json({
      success: true,
      message: 'Period added successfully',
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add period',
      error: error.message
    });
  }
};

/**
 * Remove a class period from timetable
 */
exports.removePeriod = async (req, res) => {
  try {
    const { day, period } = req.body;

    const timetable = await Timetable.findById(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    timetable.schedule = timetable.schedule.filter(
      entry => !(entry.day === day && entry.period === period)
    );

    await timetable.save();

    res.json({
      success: true,
      message: 'Period removed successfully',
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove period',
      error: error.message
    });
  }
};

/**
 * Get teacher schedule
 */
exports.getTeacherSchedule = async (req, res) => {
  try {
    const { academicYear, semester } = req.query;

    if (!academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Academic year and semester are required'
      });
    }

    const schedule = await Timetable.getTeacherSchedule(
      req.user.id,
      academicYear,
      semester
    );

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher schedule',
      error: error.message
    });
  }
};

/**
 * Get class schedule
 */
exports.getClassSchedule = async (req, res) => {
  try {
    const { class: className, academicYear, semester } = req.query;

    if (!className || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Class, academic year, and semester are required'
      });
    }

    const timetable = await Timetable.getClassSchedule(
      className,
      academicYear,
      semester
    );

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found for this class'
      });
    }

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class schedule',
      error: error.message
    });
  }
};

/**
 * Check for conflicts in a timetable
 */
exports.checkConflicts = async (req, res) => {
  try {
    const { className, section, academicYear, semester, newSchedule } = req.body;

    const timetable = await Timetable.findOne({
      class: className,
      section,
      academicYear,
      semester
    });

    if (!timetable) {
      return res.json({
        success: true,
        data: { conflicts: [], hasConflicts: false }
      });
    }

    const conflicts = [];

    newSchedule.forEach(newEntry => {
      timetable.schedule.forEach(existingEntry => {
        if (
          newEntry.day === existingEntry.day &&
          newEntry.period === existingEntry.period
        ) {
          if (newEntry.teacher === existingEntry.teacher.toString()) {
            conflicts.push({
              type: 'TEACHER_CONFLICT',
              message: `Teacher conflict: ${existingEntry.subject} at ${newEntry.day} period ${newEntry.period}`
            });
          }
          if (newEntry.room && newEntry.room === existingEntry.room) {
            conflicts.push({
              type: 'ROOM_CONFLICT',
              message: `Room conflict: ${existingEntry.subject} at ${newEntry.day} period ${newEntry.period}`
            });
          }
        }
      });
    });

    res.json({
      success: true,
      data: {
        conflicts,
        hasConflicts: conflicts.length > 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check conflicts',
      error: error.message
    });
  }
};

/**
 * Pre-check before timetable generation
 */
exports.precheckGeneration = async (req, res) => {
  try {
    const { class: className, stream = '', academicYear, semester } = req.body;

    if (!className || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'class, academicYear and semester are required'
      });
    }

    const subjects = getSubjectsFor(className, stream);
    const targetCounts = getTargetWeeklyCounts(subjects, className);
    const requiredSlots = Object.values(targetCounts).reduce((sum, n) => sum + n, 0);
    const availableSlots = DAYS.length * PERIODS.length;

    const teachers = await User.find({ role: 'Teacher', status: 'Active' })
      .select('firstName lastName teacherProfile.subjects');
    if (!teachers.length) {
      return res.status(400).json({
        success: false,
        message: 'No active teachers found. Cannot generate timetable.'
      });
    }
    const rooms = [`G${className}${stream ? `-${stream}` : ''}`];

    const missingTeachers = subjects.filter((subject) => {
      const normalized = normalizeSubjectName(subject);
      return !teachers.some((t) =>
        (t.teacherProfile?.subjects || []).some((s) => normalizeSubjectName(s) === normalized)
      );
    });

    const warnings = [];
    if (requiredSlots > availableSlots) {
      warnings.push(
        `Requested weekly load is ${requiredSlots} periods but only ${availableSlots} are available. Generator will downscale automatically.`
      );
    }

    const result = {
      class: className,
      stream: stream || null,
      academicYear,
      semester,
      availableSlots,
      requiredSlots,
      missingTeachers,
      missingRooms: rooms.length ? [] : ['No room defined'],
      impossibleLoad: requiredSlots > availableSlots,
      warnings
    };

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to run precheck',
      error: error.message
    });
  }
};

/**
 * Generate timetable automatically and save as draft version
 */
exports.generateTimetable = async (req, res) => {
  try {
    const { class: className, stream = '', academicYear, semester, force = false } = req.body;

    if (!className || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'class, academicYear and semester are required'
      });
    }

    const subjects = getSubjectsFor(className, stream);
    const targetCounts = getTargetWeeklyCounts(subjects, className);
    const availableSlots = DAYS.length * PERIODS.length;
    let requiredSlots = Object.values(targetCounts).reduce((sum, n) => sum + n, 0);

    const warnings = [];
    if (requiredSlots > availableSlots) {
      warnings.push(
        `Total requested periods (${requiredSlots}) exceed available periods (${availableSlots}); downscaling less-priority subjects.`
      );
      if (!force) {
        // keep auto downscale even without force to avoid hard failure in MVP
      }
      const adjustableSubjects = sortByLeastCount(targetCounts).filter(
        (s) => s !== 'Mathematics' && s !== 'English'
      );
      let pointer = 0;
      while (requiredSlots > availableSlots && adjustableSubjects.length) {
        const subject = adjustableSubjects[pointer % adjustableSubjects.length];
        if (targetCounts[subject] > 1) {
          targetCounts[subject] -= 1;
          requiredSlots -= 1;
        }
        pointer += 1;
        if (pointer > 500) break;
      }
    } else if (requiredSlots < availableSlots) {
      // Fill empty slots by adding extra periods to lower-priority subjects
      warnings.push(
        `Total requested periods (${requiredSlots}) less than available periods (${availableSlots}); adding extra periods to fill schedule.`
      );
      const adjustableSubjects = sortByLeastCount(targetCounts).filter(
        (s) => s !== 'Mathematics' && s !== 'English'
      );
      let pointer = 0;
      while (requiredSlots < availableSlots && adjustableSubjects.length) {
        const subject = adjustableSubjects[pointer % adjustableSubjects.length];
        targetCounts[subject] += 1;
        requiredSlots += 1;
        pointer += 1;
        if (pointer > 500) break;
      }
    }

    const teachers = await User.find({ role: 'Teacher', status: 'Active' })
      .select('firstName lastName teacherProfile.subjects');

    const teacherPool = {};
    subjects.forEach((subject) => {
      const normalized = normalizeSubjectName(subject);
      teacherPool[subject] = teachers.filter((t) =>
        (t.teacherProfile?.subjects || []).some((s) => normalizeSubjectName(s) === normalized)
      );
      if (!teacherPool[subject].length) {
        warnings.push(`No teacher mapped for ${subject}; using unassigned placeholder.`);
      }
    });

    const teacherLoad = {};
    const teacherBusy = new Set(); // `${teacherId}-${day}-${period}`
    const schedule = [];
    const subjectPlacedCount = {};
    const constraintWarnings = new Set();
    subjects.forEach((s) => { subjectPlacedCount[s] = 0; });

    const assignTeacherFor = (subject, day, periodNumber) => {
      const candidates = teacherPool[subject] || [];
      if (!candidates.length) return null;

      candidates.sort((a, b) => {
        const la = teacherLoad[a._id.toString()] || 0;
        const lb = teacherLoad[b._id.toString()] || 0;
        return la - lb;
      });

      for (const teacher of candidates) {
        const key = `${teacher._id}-${day}-${periodNumber}`;
        if (!teacherBusy.has(key)) {
          teacherBusy.add(key);
          const tId = teacher._id.toString();
          teacherLoad[tId] = (teacherLoad[tId] || 0) + 1;
          return {
            id: tId,
            name: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
          };
        }
      }
      return null;
    };

    for (const day of DAYS) {
      for (const periodInfo of PERIODS) {
        if (periodInfo.isBreak) continue; // Skip break periods

        const dayEntries = schedule.filter((e) => e.day === day).sort((a, b) => a.period - b.period);
        const previousSubject = dayEntries.length ? dayEntries[dayEntries.length - 1].subject : null;
        const daySubjects = new Set(dayEntries.map((entry) => entry.subject));

        const candidates = Object.keys(targetCounts)
          .filter((subject) => subjectPlacedCount[subject] < targetCounts[subject])
          .sort(() => Math.random() - 0.5); // Randomize subject selection

        let picked = null;
        for (const subject of candidates) {
          if (daySubjects.has(subject)) continue; // keep each subject to at most once per day
          if (subject === previousSubject) continue; // avoid back-to-back same subject
          picked = subject;
          break;
        }
        if (!picked && candidates.length) {
          const unplaceableSubjects = candidates.filter((subject) => daySubjects.has(subject));
          unplaceableSubjects.forEach((subject) => {
            if (targetCounts[subject] > DAYS.length) {
              constraintWarnings.add(
                `Subject ${subject} needs ${targetCounts[subject]} weekly periods, which exceeds the ${DAYS.length} available days for the one-subject-per-day rule.`
              );
            }
          });
          continue;
        }
        if (!picked) continue;

        const teacherAssigned = assignTeacherFor(picked, day, periodInfo.period);
        if (!teacherAssigned) {
          warnings.push(`Teacher conflict for ${picked} on ${day} period ${periodInfo.period}; assigned as unallocated.`);
        }
        const fallbackTeacherId = teachers[0]._id;

        schedule.push({
          day,
          period: periodInfo.period,
          subject: picked,
          teacher: teacherAssigned?.id || fallbackTeacherId,
          room: `G${className}${stream ? `-${stream}` : ''}`,
          startTime: periodInfo.startTime,
          endTime: periodInfo.endTime
        });
        subjectPlacedCount[picked] += 1;
      }
    }

    warnings.push(...constraintWarnings);

    const versionGroup = getVersionGroup({ className, stream, academicYear, semester });
    const latest = await Timetable.findOne({ versionGroup }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : 1;

    const timetable = new Timetable({
      class: className,
      section: stream || undefined,
      stream: stream || undefined,
      academicYear,
      semester,
      schedule,
      status: 'Draft',
      version: nextVersion,
      versionGroup,
      isLocked: false,
      generatedBySystem: true,
      generationWarnings: warnings,
      createdBy: req.user.id
    });

    await timetable.save();
    const populated = await Timetable.findById(timetable._id).populate('schedule.teacher', 'firstName lastName');

    return res.json({
      success: true,
      message: 'Timetable generated and saved as draft',
      data: {
        timetable: populated,
        summary: {
          slotsGenerated: schedule.length,
          warnings
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate timetable',
      error: error.message
    });
  }
};

/**
 * Publish a draft timetable and optionally lock it
 */
exports.publishTimetable = async (req, res) => {
  try {
    const { lock = true } = req.body || {};
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    timetable.status = 'Published';
    timetable.isLocked = !!lock;
    timetable.isActive = true;
    await timetable.save();

    return res.json({
      success: true,
      message: 'Timetable published successfully',
      data: timetable
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to publish timetable',
      error: error.message
    });
  }
};

/**
 * Lock or unlock timetable
 */
exports.setTimetableLock = async (req, res) => {
  try {
    const { isLocked } = req.body;
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    timetable.isLocked = !!isLocked;
    await timetable.save();
    return res.json({
      success: true,
      message: `Timetable ${timetable.isLocked ? 'locked' : 'unlocked'} successfully`,
      data: timetable
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update lock status',
      error: error.message
    });
  }
};

/**
 * Unpublish a timetable (change status back to Draft)
 */
exports.unpublishTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }

    if (timetable.status !== 'Published') {
      return res.status(400).json({
        success: false,
        message: 'Only published timetables can be unpublished'
      });
    }

    timetable.status = 'Draft';
    timetable.isLocked = false;
    timetable.isActive = false;
    await timetable.save();

    return res.json({
      success: true,
      message: 'Timetable unpublished successfully',
      data: timetable
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to unpublish timetable',
      error: error.message
    });
  }
};

/**
 * List timetable versions for class-stream-year-semester
 */
exports.getTimetableVersions = async (req, res) => {
  try {
    const { class: className, stream = '', academicYear, semester } = req.query;
    if (!className || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'class, academicYear and semester are required'
      });
    }

    const versionGroup = getVersionGroup({ className, stream, academicYear, semester });
    const versions = await Timetable.find({ versionGroup })
      .select('class stream section semester academicYear version status isLocked createdAt generatedBySystem')
      .sort({ version: -1 });

    return res.json({ success: true, data: versions });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch versions',
      error: error.message
    });
  }
};

/**
 * Compare two timetable versions by IDs
 */
exports.compareTimetableVersions = async (req, res) => {
  try {
    const { leftId, rightId } = req.body;
    if (!leftId || !rightId) {
      return res.status(400).json({ success: false, message: 'leftId and rightId are required' });
    }

    const [left, right] = await Promise.all([
      Timetable.findById(leftId),
      Timetable.findById(rightId)
    ]);
    if (!left || !right) {
      return res.status(404).json({ success: false, message: 'One or both versions not found' });
    }

    const key = (entry) => `${entry.day}-${entry.period}`;
    const leftMap = new Map(left.schedule.map((e) => [key(e), e]));
    const rightMap = new Map(right.schedule.map((e) => [key(e), e]));
    const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);
    const changes = [];

    for (const k of allKeys) {
      const l = leftMap.get(k);
      const r = rightMap.get(k);
      if (!l || !r) {
        changes.push({ slot: k, type: 'ADDED_OR_REMOVED', left: l || null, right: r || null });
        continue;
      }
      if (
        l.subject !== r.subject ||
        String(l.teacher) !== String(r.teacher) ||
        String(l.room || '') !== String(r.room || '')
      ) {
        changes.push({ slot: k, type: 'CHANGED', left: l, right: r });
      }
    }

    return res.json({
      success: true,
      data: {
        leftVersion: left.version,
        rightVersion: right.version,
        changeCount: changes.length,
        changes
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compare versions',
      error: error.message
    });
  }
};

/**
 * Rollback by cloning a previous version into a new draft version
 */
exports.rollbackTimetableVersion = async (req, res) => {
  try {
    const source = await Timetable.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source version not found' });
    }

    const latest = await Timetable.findOne({ versionGroup: source.versionGroup }).sort({ version: -1 });
    const nextVersion = latest ? latest.version + 1 : source.version + 1;

    const cloned = new Timetable({
      class: source.class,
      section: source.section,
      stream: source.stream,
      academicYear: source.academicYear,
      semester: source.semester,
      schedule: source.schedule,
      isActive: source.isActive,
      status: 'Draft',
      version: nextVersion,
      versionGroup: source.versionGroup,
      isLocked: false,
      generatedBySystem: false,
      generationWarnings: [`Rolled back from version ${source.version}`],
      createdBy: req.user.id
    });
    await cloned.save();

    return res.json({
      success: true,
      message: `Rollback complete. Created draft version ${nextVersion}`,
      data: cloned
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to rollback version',
      error: error.message
    });
  }
};

/**
 * Get all unique classes
 */
exports.getClasses = async (req, res) => {
  try {
    const classes = await Timetable.distinct('class');

    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
};

/**
 * Get academic years
 */
exports.getAcademicYears = async (req, res) => {
  try {
    const years = await Timetable.distinct('academicYear');

    res.json({
      success: true,
      data: years
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic years',
      error: error.message
    });
  }
};
