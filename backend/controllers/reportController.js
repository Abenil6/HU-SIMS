const Report = require('../models/Report');
const AcademicRecord = require('../models/AcademicRecord');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

const SEMESTERS = ['Semester 1', 'Semester 2'];
const BEHAVIOR_GRADES = ['A', 'B', 'C'];

const normalizeSemester = (value) => {
  if (!value) return null;
  if (value === '1' || value === 'Semester 1') return 'Semester 1';
  if (value === '2' || value === 'Semester 2') return 'Semester 2';
  return value;
};

const roundToTwo = (value) => Math.round((Number(value) || 0) * 100) / 100;

const calculateAverage = (values = []) => {
  const numericValues = values.filter((value) => Number.isFinite(Number(value)));
  if (numericValues.length === 0) return 0;
  return roundToTwo(
    numericValues.reduce((sum, value) => sum + Number(value), 0) / numericValues.length
  );
};

const marksToLetterGrade = (marks) => {
  if (marks >= 90) return 'A';
  if (marks >= 80) return 'B';
  if (marks >= 70) return 'C';
  if (marks >= 60) return 'D';
  return 'F';
};

const behaviorScore = { A: 3, B: 2, C: 1 };

const combineBehaviorGrades = (...grades) => {
  const validGrades = grades.filter((grade) => BEHAVIOR_GRADES.includes(grade));
  if (validGrades.length === 0) return null;

  const averageScore =
    validGrades.reduce((sum, grade) => sum + behaviorScore[grade], 0) / validGrades.length;

  if (averageScore >= 2.5) return 'A';
  if (averageScore >= 1.5) return 'B';
  return 'C';
};

const getStudentGradeLevel = (student) =>
  String(student?.studentProfile?.grade || student?.grade || '').trim();

const getStudentStream = (student) =>
  String(student?.studentProfile?.stream || student?.studentProfile?.section || student?.stream || student?.section || '').trim();

const getStudentFullName = (student) =>
  `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

const shouldGroupByStream = (gradeLevel) => ['11', '12'].includes(String(gradeLevel || '').trim());

const getStudentReportProfile = (student) => ({
  id: String(student?._id || ''),
  firstName: student?.firstName || '',
  lastName: student?.lastName || '',
  fullName: getStudentFullName(student),
  email: student?.email || '',
  grade: getStudentGradeLevel(student),
  stream: getStudentStream(student),
  section: student?.studentProfile?.section || student?.section || '',
});

const ensureBehaviorGrade = (value, fieldName) => {
  if (!value) return null;
  if (!BEHAVIOR_GRADES.includes(value)) {
    const error = new Error(`${fieldName} must be one of ${BEHAVIOR_GRADES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  return value;
};

const buildAttendanceSummary = async (studentId, academicYear) => {
  if (!academicYear || !academicYear.includes('-')) {
    return {
      totalDays: 0,
      present: 0,
      absent: 0,
      late: 0,
      percentage: 0,
    };
  }

  const [startYear, endYear] = academicYear.split('-');
  const attendanceRecords = await Attendance.find({
    student: studentId,
    date: {
      $gte: new Date(`${startYear}-09-01`),
      $lte: new Date(`${endYear}-07-31`),
    },
  });

  const totalDays = attendanceRecords.length;
  const present = attendanceRecords.filter((a) => a.status === 'Present').length;
  const absent = attendanceRecords.filter((a) => a.status === 'Absent').length;
  const late = attendanceRecords.filter((a) => a.status === 'Late').length;

  return {
    totalDays,
    present,
    absent,
    late,
    percentage: totalDays > 0 ? roundToTwo((present / totalDays) * 100) : 0,
  };
};

const getLinkedChildIds = async (parentId) => {
  const parent = await User.findOne({ _id: parentId, role: 'Parent' }).select('parentProfile.linkedChildren');
  const linkedChildren = parent?.parentProfile?.linkedChildren || [];
  return linkedChildren.map((child) => {
    // Handle both direct IDs and populated objects
    if (typeof child === 'object' && child !== null) {
      return child._id ? child._id.toString() : child.toString();
    }
    return child.toString();
  });
};

const assertCanAccessStudent = async (req, studentId) => {
  if (req.user.role === 'Student' && req.user.id !== String(studentId)) {
    const error = new Error('Not authorized to access this student report');
    error.statusCode = 403;
    throw error;
  }

  if (req.user.role === 'Parent') {
    const childIds = await getLinkedChildIds(req.user.id);
    if (!childIds.includes(String(studentId))) {
      const error = new Error('Not authorized to access this student report');
      error.statusCode = 403;
      throw error;
    }
  }
};

const buildStudentQueryScope = async (req) => {
  if (req.user.role === 'Student') {
    return { student: req.user.id, status: 'Final' };
  }

  if (req.user.role === 'Parent') {
    const childIds = await getLinkedChildIds(req.user.id);
    return { student: { $in: childIds }, status: 'Final' };
  }

  return {};
};

const getCohortStudents = async (student, gradeLevel) => {
  const query = {
    role: 'Student',
  };

  const resolvedGrade = String(gradeLevel || getStudentGradeLevel(student) || '').trim();
  if (resolvedGrade) {
    query.$or = [
      { 'studentProfile.grade': resolvedGrade },
      { grade: resolvedGrade },
    ];
  }

  const studentStream = getStudentStream(student);
  if (studentStream) {
    query.$and = [
      {
        $or: [
          { 'studentProfile.stream': studentStream },
          { 'studentProfile.section': studentStream },
          { stream: studentStream },
          { section: studentStream },
        ],
      },
    ];
  }

  return User.find(query).select('firstName lastName grade section stream studentProfile');
};

const calculateStudentRank = async ({ student, academicYear, semester = null, gradeLevel = null }) => {
  const cohortStudents = await getCohortStudents(student, gradeLevel);
  if (cohortStudents.length === 0) {
    return { rank: null, totalStudents: 0 };
  }

  const averages = await Promise.all(
    cohortStudents.map(async (cohortStudent) => {
      const query = {
        student: cohortStudent._id,
        academicYear,
        status: 'Approved',
      };

      if (semester) {
        query.semester = semester;
      }

      const records = await AcademicRecord.find(query).select('totalMarks');
      if (records.length === 0) {
        return null;
      }

      return {
        studentId: String(cohortStudent._id),
        average: calculateAverage(records.map((record) => record.totalMarks || 0)),
      };
    })
  );

  const rankedStudents = averages
    .filter((entry) => entry && Number.isFinite(entry.average))
    .sort((a, b) => b.average - a.average);

  const rank = rankedStudents.findIndex((entry) => entry.studentId === String(student._id));

  return {
    rank: rank === -1 ? null : rank + 1,
    totalStudents: rankedStudents.length,
  };
};

const buildSemesterSubjectRows = (records = []) =>
  records
    .map((record) => {
      const midExam = record.marks?.midExam || 0;
      const finalExam = record.marks?.finalExam || 0;
      const classQuiz = record.marks?.classQuiz || 0;
      const continuousAssessment = record.marks?.continuousAssessment || 0;
      const assignment = record.marks?.assignment || 0;
      const totalMarks = midExam + finalExam + classQuiz + continuousAssessment + assignment;
      return {
        subject: record.subject,
        total: roundToTwo(totalMarks),
        outOf: 100,
        grade: marksToLetterGrade(totalMarks),
        teacher: record.teacher
          ? `${record.teacher.firstName || ''} ${record.teacher.lastName || ''}`.trim()
          : '',
        breakdown: {
          midExam,
          finalExam,
          classQuiz,
          continuousAssessment,
          assignment,
        },
        comments: record.comments || '',
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));

const buildYearSubjectSummary = (semesterMaps) => {
  const subjectMap = new Map();

  for (const semester of SEMESTERS) {
    const subjectRows = semesterMaps[semester]?.subjects || [];
    for (const row of subjectRows) {
      if (!subjectMap.has(row.subject)) {
        subjectMap.set(row.subject, {
          subject: row.subject,
          semester1: null,
          semester2: null,
          yearlyAverage: null,
          yearlyGrade: null,
        });
      }

      const entry = subjectMap.get(row.subject);
      if (semester === 'Semester 1') entry.semester1 = row.total;
      if (semester === 'Semester 2') entry.semester2 = row.total;

      const yearlyAverage = calculateAverage([entry.semester1, entry.semester2]);
      entry.yearlyAverage = yearlyAverage || 0;
      entry.yearlyGrade = marksToLetterGrade(yearlyAverage || 0);
    }
  }

  return Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
};

const buildClassProgressGroups = (classData = []) => {
  const groups = new Map();

  for (const entry of classData) {
    const gradeLevel = String(entry.student?.grade || '').trim();
    const stream = String(entry.student?.stream || '').trim();
    const key = shouldGroupByStream(gradeLevel)
      ? `${gradeLevel}::${stream || 'No Stream'}`
      : `${gradeLevel || 'Unknown'}::all`;

    if (!groups.has(key)) {
      groups.set(key, {
        groupLabel:
          shouldGroupByStream(gradeLevel) && stream
            ? `Grade ${gradeLevel} - ${stream}`
            : gradeLevel
              ? `Grade ${gradeLevel}`
              : 'Unassigned',
        grade: gradeLevel,
        stream: shouldGroupByStream(gradeLevel) ? stream : '',
        students: [],
      });
    }

    groups.get(key).students.push(entry);
  }

  return Array.from(groups.values()).map((group) => {
    const students = [...group.students].sort((a, b) => b.overallAverage - a.overallAverage);
    students.forEach((student, index) => {
      student.rank = index + 1;
    });

    return {
      ...group,
      students,
      summary: {
        totalStudents: students.length,
        classAverage: calculateAverage(students.map((student) => student.overallAverage)),
        highestAverage:
          students.length > 0
            ? Math.max(...students.map((student) => student.overallAverage))
            : 0,
        lowestAverage:
          students.length > 0
            ? Math.min(...students.map((student) => student.overallAverage))
            : 0,
      },
    };
  });
};

const buildAcademicPerformanceReportData = (classData = []) => {
  const subjectMap = new Map();

  for (const entry of classData) {
    for (const subject of entry.subjects || []) {
      if (!subjectMap.has(subject.name)) {
        subjectMap.set(subject.name, []);
      }
      subjectMap.get(subject.name).push(Number(subject.total) || 0);
    }
  }

  const subjectStatistics = Array.from(subjectMap.entries())
    .map(([subject, marks]) => {
      const average = calculateAverage(marks);
      const passed = marks.filter((mark) => mark >= 50).length;
      return {
        subject,
        average,
        highest: marks.length ? Math.max(...marks) : 0,
        lowest: marks.length ? Math.min(...marks) : 0,
        passRate: marks.length ? roundToTwo((passed / marks.length) * 100) : 0,
      };
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const rankedStudents = [...classData].sort((a, b) => b.overallAverage - a.overallAverage);

  return {
    summary: {
      totalStudents: classData.length,
      overallAverage: calculateAverage(classData.map((student) => student.overallAverage)),
      highestAverage: classData.length > 0 ? Math.max(...classData.map((student) => student.overallAverage)) : 0,
      lowestAverage: classData.length > 0 ? Math.min(...classData.map((student) => student.overallAverage)) : 0,
      subjectCount: subjectStatistics.length,
    },
    subjectStatistics,
    topStudents: rankedStudents.slice(0, 5).map((student, index) => ({
      rank: index + 1,
      name: student.student?.name || '',
      average: student.overallAverage,
      stream: student.student?.stream || '',
    })),
    bottomStudents: rankedStudents.slice(-5).reverse().map((student, index) => ({
      rank: classData.length - index,
      name: student.student?.name || '',
      average: student.overallAverage,
      stream: student.student?.stream || '',
    })),
  };
};

const createReportNumber = (prefix, student, academicYear) => {
  const nameSeed = `${student?.lastName || 'STD'}${student?.firstName || ''}`
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6);

  return `${prefix}-${academicYear.replace(/[^0-9]/g, '')}-${nameSeed || 'STUDENT'}-${Date.now().toString().slice(-6)}`;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const quoteCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildExportData = (report) => ({
  reportType: report.reportType,
  academicYear: report.academicYear,
  semester: report.semester,
  generatedAt: report.createdAt,
  generatedBy: report.generatedBy
    ? `${report.generatedBy.firstName} ${report.generatedBy.lastName}`.trim()
    : 'System',
  student: report.student
    ? {
        name: getStudentFullName(report.student),
        email: report.student.email,
        grade: getStudentGradeLevel(report.student),
        stream: getStudentStream(report.student),
      }
    : undefined,
  official: report.official,
  signedBy: report.signedBy,
  signatureDate: report.signatureDate,
  signatureImage: report.signatureImage,
  data: report.data,
});

const buildReportFilename = (report, extension) => {
  const studentName = report.student ? getStudentFullName(report.student).replace(/\s+/g, '-').toLowerCase() : 'report';
  const type = String(report.reportType || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const year = String(report.academicYear || 'na').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `${type}-${studentName}-${year}.${extension}`;
};

const buildReportCsv = (report, exportData) => {
  const rows = [];

  if (report.reportType === 'StudentReportCard') {
    rows.push(['Student', exportData.student?.name || '']);
    rows.push(['Grade', exportData.student?.grade || '']);
    rows.push(['Stream/Section', exportData.student?.stream || '']);
    rows.push(['Academic Year', exportData.academicYear || '']);
    rows.push(['Overall Average', exportData.data?.yearlySummary?.overallAverage ?? '']);
    rows.push(['Rank', exportData.data?.yearlySummary?.rank ?? '']);
    rows.push(['Behavior', exportData.data?.yearlySummary?.behavior ?? '']);
    rows.push([]);
    rows.push(['Semester', 'Subject', 'Out Of', 'Marks', 'Grade', 'Teacher']);

    for (const semester of exportData.data?.semesters || []) {
      for (const subject of semester.subjects || []) {
        rows.push([
          semester.semester,
          subject.subject,
          subject.outOf,
          subject.total,
          subject.grade,
          subject.teacher,
        ]);
      }
    }
  } else if (report.reportType === 'StudentTranscript') {
    rows.push(['Student', exportData.student?.name || '']);
    rows.push(['Grade', exportData.student?.grade || '']);
    rows.push(['Cumulative Average', exportData.data?.cumulativeAverage ?? '']);
    rows.push(['Latest Rank', exportData.data?.latestRank ?? '']);
    rows.push([]);
    rows.push(['Academic Year', 'Grade', 'Semester', 'Subject', 'Out Of', 'Marks', 'Grade']);

    for (const year of exportData.data?.transcriptYears || []) {
      for (const semester of year.semesters || []) {
        for (const subject of semester.subjects || []) {
          rows.push([
            year.academicYear,
            year.gradeLevel,
            semester.semester,
            subject.subject,
            subject.outOf,
            subject.total,
            subject.grade,
          ]);
        }
      }
    }
  } else if (report.reportType === 'ClassProgress') {
    rows.push(['Class', report.class || '']);
    rows.push(['Academic Year', report.academicYear || '']);
    rows.push(['Semester', report.semester || '']);
    rows.push([]);
    rows.push(['Group', 'Rank', 'Student', 'Email', 'Stream', 'Average']);

    const groups =
      exportData.data?.groupedStudents?.length > 0
        ? exportData.data.groupedStudents
        : [{ groupLabel: report.class || 'Class', students: exportData.data?.students || [] }];

    for (const group of groups) {
      for (const student of group.students || []) {
        rows.push([
          group.groupLabel,
          student.rank,
          student.student?.name,
          student.student?.email,
          student.student?.stream || '',
          student.overallAverage,
        ]);
      }
    }
  } else if (report.reportType === 'PerformanceAnalytics') {
    rows.push(['Class', report.class || '']);
    rows.push(['Academic Year', report.academicYear || '']);
    rows.push(['Semester', report.semester || '']);
    rows.push([]);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Students', exportData.data?.summary?.totalStudents ?? '']);
    rows.push(['Overall Average', exportData.data?.summary?.overallAverage ?? '']);
    rows.push(['Highest Average', exportData.data?.summary?.highestAverage ?? '']);
    rows.push(['Lowest Average', exportData.data?.summary?.lowestAverage ?? '']);
    rows.push([]);
    rows.push(['Subject', 'Average', 'Highest', 'Lowest', 'Pass Rate']);

    for (const subject of exportData.data?.subjectStatistics || []) {
      rows.push([
        subject.subject,
        subject.average,
        subject.highest,
        subject.lowest,
        `${subject.passRate}%`,
      ]);
    }
  } else if (report.reportType === 'AttendanceSummary') {
    rows.push(['Academic Year', report.academicYear || '']);
    rows.push(['Semester', report.semester || '']);
    rows.push([]);
    rows.push(['Metric', 'Value']);
    const summary = exportData.data?.summary || {};
    rows.push(['Total Days', summary.totalDays ?? '']);
    rows.push(['Present', summary.present ?? '']);
    rows.push(['Absent', summary.absent ?? '']);
    rows.push(['Late', summary.late ?? '']);
    rows.push(['Excused', summary.excused ?? '']);
    rows.push(['Attendance %', summary.percentage ?? '']);
  } else {
    rows.push(['Report Type', exportData.reportType]);
    rows.push(['Academic Year', exportData.academicYear || '']);
    rows.push(['Semester', exportData.semester || '']);
    rows.push(['Generated By', exportData.generatedBy || '']);
  }

  return rows.map((row) => row.map(quoteCsv).join(',')).join('\n');
};

const renderMetadataBlock = (exportData) => `
  <div class="meta-grid">
    <div><strong>Student:</strong> ${escapeHtml(exportData.student?.name || 'N/A')}</div>
    <div><strong>Grade:</strong> ${escapeHtml(exportData.student?.grade || 'N/A')}</div>
    <div><strong>Stream/Section:</strong> ${escapeHtml(exportData.student?.stream || 'N/A')}</div>
    <div><strong>Academic Year:</strong> ${escapeHtml(exportData.academicYear || 'N/A')}</div>
    <div><strong>Generated:</strong> ${escapeHtml(new Date(exportData.generatedAt).toLocaleString())}</div>
    <div><strong>Status:</strong> ${escapeHtml(exportData.official ? 'Official' : 'Draft')}</div>
  </div>
`;

const buildReportHtml = (report, exportData) => {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #10233b; }
      h1, h2, h3 { margin: 0 0 12px; }
      p { margin: 8px 0; }
      .school-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1f4f82; }
      .school-info { flex: 1; }
      .school-name { font-size: 28px; font-weight: 700; color: #1f4f82; margin: 0 0 4px; }
      .school-subtitle { font-size: 14px; color: #42576c; margin: 0; }
      .logo-placeholder { width: 80px; height: 80px; background: #e4eef8; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #1f4f82; font-weight: 600; }
      .header { margin-bottom: 24px; }
      .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #e4eef8; color: #1f4f82; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
      .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 8px 20px; margin: 16px 0 24px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
      th, td { border: 1px solid #c6d4e1; padding: 8px 10px; text-align: left; font-size: 13px; }
      th { background: #edf4fb; }
      .summary { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 12px; margin: 16px 0 24px; }
      .card { border: 1px solid #d7e2ec; border-radius: 12px; padding: 12px; background: #fafcff; }
      .footer { margin-top: 28px; border-top: 1px solid #d7e2ec; padding-top: 16px; font-size: 12px; color: #42576c; }
      @media print { body { margin: 16px; } .print-hide { display: none; } }
    </style>
  `;

  const schoolHeader = `
    <div class="school-header">
      <div class="school-info">
        <h1 class="school-name">HU Non-Boarding School</h1>
        <p class="school-subtitle">Building a Digital Future</p>
      </div>
      <div class="logo-placeholder">LOGO</div>
    </div>
  `;

  const header = `
    <div class="header">
      <span class="badge">${escapeHtml(report.reportType)}</span>
      <h2>${escapeHtml(
        report.reportType === 'StudentReportCard'
          ? 'Student Report Card'
          : report.reportType === 'StudentTranscript'
            ? 'Student Transcript'
            : report.reportType === 'ClassProgress'
              ? 'Class Progress Report'
              : report.reportType === 'PerformanceAnalytics'
                ? 'Academic Performance Report'
                : report.reportType === 'AttendanceSummary'
                  ? 'Attendance Summary'
                  : report.reportType
      )}</h2>
      <p>School academic document prepared for printing, filing, and guardian communication.</p>
      ${renderMetadataBlock(exportData)}
    </div>
  `;

  if (report.reportType === 'StudentReportCard') {
    const semesterTables = (exportData.data?.semesters || [])
      .map(
        (semester) => `
          <h2>${escapeHtml(semester.semester)}</h2>
          <div class="summary">
            <div class="card"><strong>Average</strong><br />${escapeHtml(semester.average)}</div>
            <div class="card"><strong>Rank</strong><br />${escapeHtml(
              semester.rank ? `${semester.rank} / ${semester.totalStudents}` : 'N/A'
            )}</div>
            <div class="card"><strong>Behavior</strong><br />${escapeHtml(semester.behavior || 'N/A')}</div>
          </div>
          <table>
            <thead>
              <tr><th>Subject</th><th>Marks / 100</th><th>Grade</th><th>Teacher</th></tr>
            </thead>
            <tbody>
              ${(semester.subjects || [])
                .map(
                  (subject) => `
                    <tr>
                      <td>${escapeHtml(subject.subject)}</td>
                      <td>${escapeHtml(subject.total)}</td>
                      <td>${escapeHtml(subject.grade)}</td>
                      <td>${escapeHtml(subject.teacher)}</td>
                    </tr>
                  `
                )
                .join('') || '<tr><td colspan="4">No approved grades recorded.</td></tr>'}
            </tbody>
          </table>
        `
      )
      .join('');

    return `
      <html><head><meta charset="utf-8" />${baseStyles}<title>${escapeHtml(exportData.student?.name || 'Report Card')}</title></head>
      <body>
        ${schoolHeader}
        ${header}
        ${semesterTables}
        <h2>Yearly Summary</h2>
        <div class="summary">
          <div class="card"><strong>Overall Average</strong><br />${escapeHtml(exportData.data?.yearlySummary?.overallAverage)}</div>
          <div class="card"><strong>Rank</strong><br />${escapeHtml(
            exportData.data?.yearlySummary?.rank
              ? `${exportData.data?.yearlySummary?.rank} / ${exportData.data?.yearlySummary?.totalStudents}`
              : 'N/A'
          )}</div>
          <div class="card"><strong>Behavior</strong><br />${escapeHtml(exportData.data?.yearlySummary?.behavior || 'N/A')}</div>
        </div>
        <table>
          <thead>
            <tr><th>Subject</th><th>Semester 1</th><th>Semester 2</th><th>Average</th><th>Grade</th></tr>
          </thead>
          <tbody>
            ${(exportData.data?.yearlySummary?.subjects || [])
              .map(
                (subject) => `
                  <tr>
                    <td>${escapeHtml(subject.subject)}</td>
                    <td>${escapeHtml(subject.semester1 ?? '')}</td>
                    <td>${escapeHtml(subject.semester2 ?? '')}</td>
                    <td>${escapeHtml(subject.yearlyAverage ?? '')}</td>
                    <td>${escapeHtml(subject.yearlyGrade ?? '')}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <div><strong>Attendance:</strong> ${escapeHtml(exportData.data?.attendance?.percentage ?? 0)}%</div>
          ${exportData.signatureImage ? `
            <div style="margin-top: 16px;">
              <strong>Signature:</strong><br>
              <img src="${escapeHtml(exportData.signatureImage)}" alt="Official Signature" style="max-width: 200px; max-height: 80px; margin-top: 8px;" />
            </div>
          ` : `
            <div><strong>Signed By:</strong> ${escapeHtml(exportData.signedBy || 'Pending official signature')}</div>
            <div><strong>Signature Date:</strong> ${escapeHtml(exportData.signatureDate ? new Date(exportData.signatureDate).toLocaleDateString() : 'Pending')}</div>
          `}
        </div>
      </body></html>
    `;
  }

  if (report.reportType === 'StudentTranscript') {
    return `
      <html><head><meta charset="utf-8" />${baseStyles}<title>${escapeHtml(exportData.student?.name || 'Transcript')}</title></head>
      <body>
        ${schoolHeader}
        ${header}
        <div class="summary">
          <div class="card"><strong>Cumulative Average</strong><br />${escapeHtml(exportData.data?.cumulativeAverage)}</div>
          <div class="card"><strong>Latest Rank</strong><br />${escapeHtml(
            exportData.data?.latestRank
              ? `${exportData.data?.latestRank} / ${exportData.data?.latestRankPopulation}`
              : 'N/A'
          )}</div>
          <div class="card"><strong>Grades Covered</strong><br />${escapeHtml(
            (exportData.data?.gradesCovered || []).join(', ') || 'N/A'
          )}</div>
        </div>
        ${(exportData.data?.transcriptYears || [])
          .map(
            (year) => `
              <h2>${escapeHtml(year.academicYear)} - Grade ${escapeHtml(year.gradeLevel || 'N/A')}</h2>
              <div class="summary">
                <div class="card"><strong>Year Average</strong><br />${escapeHtml(year.yearlyAverage)}</div>
                <div class="card"><strong>Year Grade</strong><br />${escapeHtml(year.yearlyGrade)}</div>
                <div class="card"><strong>Rank</strong><br />${escapeHtml(
                  year.rank ? `${year.rank} / ${year.totalStudents}` : 'N/A'
                )}</div>
              </div>
              ${year.semesters
                .map(
                  (semester) => `
                    <h3>${escapeHtml(semester.semester)}</h3>
                    <table>
                      <thead>
                        <tr><th>Subject</th><th>Marks / 100</th><th>Grade</th><th>Teacher</th></tr>
                      </thead>
                      <tbody>
                        ${(semester.subjects || [])
                          .map(
                            (subject) => `
                              <tr>
                                <td>${escapeHtml(subject.subject)}</td>
                                <td>${escapeHtml(subject.total)}</td>
                                <td>${escapeHtml(subject.grade)}</td>
                                <td>${escapeHtml(subject.teacher)}</td>
                              </tr>
                            `
                          )
                          .join('') || '<tr><td colspan="4">No approved grades recorded.</td></tr>'}
                      </tbody>
                    </table>
                  `
                )
                .join('')}
            `
          )
          .join('')}
        <div class="footer">
          <div><strong>Official:</strong> ${escapeHtml(exportData.official ? 'Yes' : 'No')}</div>
          ${exportData.signatureImage ? `
            <div style="margin-top: 16px;">
              <strong>Signature:</strong><br>
              <img src="${escapeHtml(exportData.signatureImage)}" alt="Official Signature" style="max-width: 200px; max-height: 80px; margin-top: 8px;" />
            </div>
          ` : `
            <div><strong>Signed By:</strong> ${escapeHtml(exportData.signedBy || 'Pending official signature')}</div>
            <div><strong>Signature Date:</strong> ${escapeHtml(exportData.signatureDate ? new Date(exportData.signatureDate).toLocaleDateString() : 'Pending')}</div>
          `}
        </div>
      </body></html>
    `;
  }

  if (report.reportType === 'ClassProgress') {
    const groupedSections = (exportData.data?.groupedStudents || [])
      .map(
        (group) => `
          <h2>${escapeHtml(group.groupLabel)}</h2>
          <div class="summary">
            <div class="card"><strong>Students</strong><br />${escapeHtml(group.summary?.totalStudents ?? 0)}</div>
            <div class="card"><strong>Average</strong><br />${escapeHtml(group.summary?.classAverage ?? 0)}</div>
            <div class="card"><strong>Top Average</strong><br />${escapeHtml(group.summary?.highestAverage ?? 0)}</div>
          </div>
          <table>
            <thead>
              <tr><th>Rank</th><th>Student</th><th>Email</th><th>Stream</th><th>Average</th></tr>
            </thead>
            <tbody>
              ${(group.students || [])
                .map(
                  (student) => `
                    <tr>
                      <td>${escapeHtml(student.rank)}</td>
                      <td>${escapeHtml(student.student?.name || '')}</td>
                      <td>${escapeHtml(student.student?.email || '')}</td>
                      <td>${escapeHtml(student.student?.stream || 'N/A')}</td>
                      <td>${escapeHtml(student.overallAverage)}</td>
                    </tr>
                  `,
                )
                .join('') || '<tr><td colspan="5">No students found.</td></tr>'}
            </tbody>
          </table>
        `,
      )
      .join('');

    return `
      <html><head><meta charset="utf-8" />${baseStyles}<title>${escapeHtml(report.class || 'Class Progress')}</title></head>
      <body>
        ${schoolHeader}
        ${header}
        <div class="summary">
          <div class="card"><strong>Total Students</strong><br />${escapeHtml(exportData.data?.summary?.totalStudents ?? 0)}</div>
          <div class="card"><strong>Class Average</strong><br />${escapeHtml(exportData.data?.summary?.classAverage ?? 0)}</div>
          <div class="card"><strong>Highest Average</strong><br />${escapeHtml(exportData.data?.summary?.highestAverage ?? 0)}</div>
        </div>
        ${groupedSections}
      </body></html>
    `;
  }

  if (report.reportType === 'PerformanceAnalytics') {
    return `
      <html><head><meta charset="utf-8" />${baseStyles}<title>${escapeHtml(report.class || 'Academic Performance')}</title></head>
      <body>
        ${schoolHeader}
        ${header}
        <div class="summary">
          <div class="card"><strong>Total Students</strong><br />${escapeHtml(exportData.data?.summary?.totalStudents ?? 0)}</div>
          <div class="card"><strong>Overall Average</strong><br />${escapeHtml(exportData.data?.summary?.overallAverage ?? 0)}</div>
          <div class="card"><strong>Subjects</strong><br />${escapeHtml(exportData.data?.summary?.subjectCount ?? 0)}</div>
        </div>
        <h2>Subject Analysis</h2>
        <table>
          <thead>
            <tr><th>Subject</th><th>Average</th><th>Highest</th><th>Lowest</th><th>Pass Rate</th></tr>
          </thead>
          <tbody>
            ${(exportData.data?.subjectStatistics || [])
              .map(
                (subject) => `
                  <tr>
                    <td>${escapeHtml(subject.subject)}</td>
                    <td>${escapeHtml(subject.average)}</td>
                    <td>${escapeHtml(subject.highest)}</td>
                    <td>${escapeHtml(subject.lowest)}</td>
                    <td>${escapeHtml(`${subject.passRate}%`)}</td>
                  </tr>
                `,
              )
              .join('') || '<tr><td colspan="5">No subject statistics available.</td></tr>'}
          </tbody>
        </table>
      </body></html>
    `;
  }

  return `
    <html><head><meta charset="utf-8" />${baseStyles}<title>${escapeHtml(report.reportType)}</title></head>
    <body>
      ${schoolHeader}
      ${header}
      <pre>${escapeHtml(JSON.stringify(exportData.data, null, 2))}</pre>
    </body></html>
  `;
};

const getStudentOrThrow = async (studentId) => {
  const student = await User.findOne({ _id: studentId, role: 'Student' });
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }
  return student;
};

const buildReportCardData = async ({
  student,
  academicYear,
  semester,
  behaviorGrade,
  behaviorSemester1,
  behaviorSemester2,
}) => {
  const records = await AcademicRecord.find({
    student: student._id,
    academicYear,
    semester: { $in: SEMESTERS },
    status: 'Approved',
  }).populate('teacher', 'firstName lastName');

  const semesterMap = {};
  const selectedSemester = normalizeSemester(semester);
  const semestersToInclude = selectedSemester ? [selectedSemester] : SEMESTERS;

  for (const semesterName of semestersToInclude) {
    const semesterRecords = records.filter((record) => record.semester === semesterName);
    const subjects = buildSemesterSubjectRows(semesterRecords);
    const average = calculateAverage(subjects.map((subject) => subject.total));
    const ranking = await calculateStudentRank({
      student,
      academicYear,
      semester: semesterName,
      gradeLevel: getStudentGradeLevel(student),
    });

    semesterMap[semesterName] = {
      semester: semesterName,
      subjects,
      average,
      rank: ranking.rank,
      totalStudents: ranking.totalStudents,
      behavior: semesterName === 'Semester 1' ? behaviorSemester1 : behaviorSemester2,
      remarks:
        subjects.length > 0
          ? `Completed ${subjects.length} subject${subjects.length === 1 ? '' : 's'} in ${semesterName}.`
          : `No approved grades recorded for ${semesterName}.`,
    };
  }

  const yearlySubjects = buildYearSubjectSummary(semesterMap);
  const yearlyAverage = calculateAverage(yearlySubjects.map((subject) => subject.yearlyAverage));
  const yearlyRanking = await calculateStudentRank({
    student,
    academicYear,
    semester: selectedSemester,
    gradeLevel: getStudentGradeLevel(student),
  });

  return {
    reportNumber: createReportNumber('RC', student, academicYear),
    student: getStudentReportProfile(student),
    academicYear,
    semesters: semestersToInclude.map((semesterName) => semesterMap[semesterName]).filter(Boolean),
    yearlySummary: {
      subjects: yearlySubjects,
      overallAverage: yearlyAverage,
      overallGrade: marksToLetterGrade(yearlyAverage),
      rank: yearlyRanking.rank,
      totalStudents: yearlyRanking.totalStudents,
      behavior: selectedSemester
        ? behaviorGrade || (selectedSemester === 'Semester 1' ? behaviorSemester1 : behaviorSemester2)
        : combineBehaviorGrades(behaviorSemester1, behaviorSemester2),
    },
    attendance: await buildAttendanceSummary(student._id, academicYear),
    notes: [
      'Each subject is graded out of 100.',
      'Behavior is recorded from A to C.',
      'This report card is intended for communication with parents and guardians.',
    ],
  };
};

const buildTranscriptData = async ({ student }) => {
  const records = await AcademicRecord.find({
    student: student._id,
    status: 'Approved',
  }).populate('teacher', 'firstName lastName');

  const groupedByYear = new Map();

  for (const record of records) {
    const academicYear = record.academicYear || 'Unknown Year';
    const gradeLevel = String(record.gradeLevel || getStudentGradeLevel(student) || '').trim();
    const yearKey = `${academicYear}::${gradeLevel || 'Unknown Grade'}`;

    if (!groupedByYear.has(yearKey)) {
      groupedByYear.set(yearKey, {
        academicYear,
        gradeLevel,
        semesters: {
          'Semester 1': [],
          'Semester 2': [],
        },
      });
    }

    groupedByYear.get(yearKey).semesters[record.semester || 'Semester 1'].push(record);
  }

  const years = [];

  for (const yearEntry of groupedByYear.values()) {
    const semesterDetails = [];

    for (const semester of SEMESTERS) {
      const semesterRows = buildSemesterSubjectRows(yearEntry.semesters[semester] || []);
      semesterDetails.push({
        semester,
        subjects: semesterRows,
        average: calculateAverage(semesterRows.map((row) => row.total)),
      });
    }

    const yearlyAverage = calculateAverage(
      semesterDetails.flatMap((semester) => semester.subjects.map((subject) => subject.total))
    );

    const ranking = yearEntry.academicYear
      ? await calculateStudentRank({
          student,
          academicYear: yearEntry.academicYear,
          gradeLevel: yearEntry.gradeLevel,
        })
      : { rank: null, totalStudents: 0 };

    years.push({
      academicYear: yearEntry.academicYear,
      gradeLevel: yearEntry.gradeLevel,
      semesters: semesterDetails,
      yearlyAverage,
      yearlyGrade: marksToLetterGrade(yearlyAverage),
      rank: ranking.rank,
      totalStudents: ranking.totalStudents,
    });
  }

  years.sort((a, b) => a.academicYear.localeCompare(b.academicYear));

  const cumulativeAverage = calculateAverage(years.map((year) => year.yearlyAverage));
  const latestYear = years[years.length - 1] || null;

  return {
    reportNumber: createReportNumber('TR', student, latestYear?.academicYear || new Date().getFullYear().toString()),
    student: getStudentReportProfile(student),
    issuedAt: new Date(),
    gradesCovered: years.map((year) => year.gradeLevel).filter(Boolean),
    transcriptYears: years,
    cumulativeAverage,
    latestRank: latestYear?.rank ?? null,
    latestRankPopulation: latestYear?.totalStudents ?? 0,
    notes: [
      'Official transcript summary for Grades 9-12.',
      'Each semester grade is recorded out of 100.',
      'Final official issuance should include school signature and stamp.',
    ],
  };
};

const saveReport = async ({ reportType, student, academicYear, semester = 'Semester 1', generatedBy, data }) => {
  const report = new Report({
    reportType,
    student: student?._id,
    class: getStudentGradeLevel(student),
    academicYear,
    semester,
    generatedBy,
    data,
  });

  await report.save();
  return report;
};

const handleControllerError = (res, error, fallbackMessage) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: fallbackMessage,
    error: error.message,
  });
};

exports.generateStudentReportCard = async (req, res) => {
  try {
    const { studentId, academicYear, semester, behaviorGrade, behaviorSemester1, behaviorSemester2 } = req.body;

    if (!studentId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'studentId and academicYear are required',
      });
    }

    const student = await getStudentOrThrow(studentId);
    await assertCanAccessStudent(req, studentId);

    const selectedSemester = normalizeSemester(semester);
    const normalizedBehaviorGrade = ensureBehaviorGrade(
      behaviorGrade || 'B',
      'behaviorGrade'
    );
    const normalizedBehaviorSemester1 = ensureBehaviorGrade(
      selectedSemester === 'Semester 1' ? normalizedBehaviorGrade : behaviorSemester1 || 'B',
      'behaviorSemester1'
    );
    const normalizedBehaviorSemester2 = ensureBehaviorGrade(
      selectedSemester === 'Semester 2' ? normalizedBehaviorGrade : behaviorSemester2 || 'B',
      'behaviorSemester2'
    );

    const reportData = await buildReportCardData({
      student,
      academicYear,
      semester,
      behaviorGrade: normalizedBehaviorGrade,
      behaviorSemester1: normalizedBehaviorSemester1,
      behaviorSemester2: normalizedBehaviorSemester2,
    });

    const report = await saveReport({
      reportType: 'StudentReportCard',
      student,
      academicYear,
      semester: normalizeSemester(semester) || 'Semester 1',
      generatedBy: req.user.id,
      data: reportData,
    });

    res.status(201).json({
      success: true,
      message: 'Student report card generated successfully',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to generate report card');
  }
};

exports.generateStudentTranscript = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    const student = await getStudentOrThrow(studentId);
    await assertCanAccessStudent(req, studentId);

    const transcriptData = await buildTranscriptData({ student });
    const latestYear = transcriptData.transcriptYears[transcriptData.transcriptYears.length - 1];

    const report = await saveReport({
      reportType: 'StudentTranscript',
      student,
      academicYear: latestYear?.academicYear || req.body.academicYear || 'N/A',
      semester: 'Semester 1',
      generatedBy: req.user.id,
      data: transcriptData,
    });

    res.status(201).json({
      success: true,
      message: 'Transcript generated successfully',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to generate transcript');
  }
};

exports.generateClassProgressReport = async (req, res) => {
  try {
    const { class: className, academicYear, semester } = req.body;
    const normalizedClassName = String(className || '')
      .replace(/^Grade\s+/i, '')
      .trim();

    const students = await User.find({
      role: 'Student',
      $or: [
        { 'studentProfile.grade': normalizedClassName },
        { grade: normalizedClassName },
        { 'studentProfile.grade': className },
        { grade: className },
      ],
    });

    const classData = [];

    for (const student of students) {
      const records = await AcademicRecord.find({
        student: student._id,
        academicYear,
        semester: normalizeSemester(semester),
        status: 'Approved',
      });

      const subjects = records.map((record) => ({
        name: record.subject,
        total: roundToTwo(record.totalMarks),
        grade: marksToLetterGrade(record.totalMarks),
      }));

      const overallAverage = calculateAverage(subjects.map((subject) => subject.total));

      classData.push({
        student: {
          id: student._id,
          name: getStudentFullName(student),
          email: student.email,
          grade: getStudentGradeLevel(student),
          stream: getStudentStream(student),
        },
        subjects,
        overallAverage,
      });
    }

    classData.sort((a, b) => b.overallAverage - a.overallAverage);
    classData.forEach((entry, index) => {
      entry.overallRank = index + 1;
    });

    const groupedStudents = buildClassProgressGroups(classData);

    const report = new Report({
      reportType: 'ClassProgress',
      class: normalizedClassName || className,
      academicYear,
      semester: normalizeSemester(semester) || 'Semester 1',
      generatedBy: req.user.id,
      data: {
        students: classData,
        groupedStudents,
        summary: {
          totalStudents: classData.length,
          classAverage: calculateAverage(classData.map((student) => student.overallAverage)),
          highestAverage: classData.length > 0 ? Math.max(...classData.map((student) => student.overallAverage)) : 0,
          lowestAverage: classData.length > 0 ? Math.min(...classData.map((student) => student.overallAverage)) : 0,
        },
      },
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Class progress report generated',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to generate class report');
  }
};

exports.generateAcademicPerformanceReport = async (req, res) => {
  try {
    const { grade, academicYear, semester } = req.body;
    const normalizedGrade = String(grade || '')
      .replace(/^Grade\s+/i, '')
      .trim();

    if (!normalizedGrade || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: 'grade, academicYear, and semester are required',
      });
    }

    const students = await User.find({
      role: 'Student',
      $or: [
        { 'studentProfile.grade': normalizedGrade },
        { grade: normalizedGrade },
      ],
    });

    const classData = [];

    for (const student of students) {
      const records = await AcademicRecord.find({
        student: student._id,
        academicYear,
        semester: normalizeSemester(semester),
        status: 'Approved',
      });

      const subjects = records.map((record) => ({
        name: record.subject,
        total: roundToTwo(record.totalMarks),
      }));

      classData.push({
        student: {
          id: student._id,
          name: getStudentFullName(student),
          stream: getStudentStream(student),
        },
        subjects,
        overallAverage: calculateAverage(subjects.map((subject) => subject.total)),
      });
    }

    const report = new Report({
      reportType: 'PerformanceAnalytics',
      class: normalizedGrade,
      academicYear,
      semester: normalizeSemester(semester),
      generatedBy: req.user.id,
      data: buildAcademicPerformanceReportData(classData),
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Academic performance report generated',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to generate academic performance report');
  }
};

exports.generateAttendanceSummary = async (req, res) => {
  try {
    const { studentId, academicYear, month, grade } = req.body;

    const startDate = new Date(`${academicYear.split('-')[0]}-${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (studentId) {
      await assertCanAccessStudent(req, studentId);
      query.student = studentId;
    }

    const attendanceRecords = await Attendance.find(query).populate(
      'student',
      'firstName lastName email grade studentProfile'
    );

    // Filter by grade if specified (for class-level summaries)
    let filteredRecords = attendanceRecords;
    if (grade && !studentId) {
      filteredRecords = attendanceRecords.filter(
        (record) => String(record.student?.grade || record.student?.studentProfile?.grade) === String(grade)
      );
    }

    const studentIds = new Set(
      filteredRecords
        .map((record) => record.student?._id?.toString?.() || record.student?.toString?.() || '')
        .filter(Boolean)
    );
    const uniqueDays = new Set(filteredRecords.map((record) => record.date.toDateString())).size;
    const totalStudentDays = uniqueDays * Math.max(studentIds.size || (studentId ? 1 : 0), 1);

    const summary = {
      totalDays: totalStudentDays,
      present: filteredRecords.filter((record) => record.status === 'Present').length,
      absent: filteredRecords.filter((record) => record.status === 'Absent').length,
      late: filteredRecords.filter((record) => record.status === 'Late').length,
      excused: filteredRecords.filter((record) => record.status === 'Excused').length,
      uniqueDays,
      totalStudents: studentIds.size || (studentId ? 1 : 0),
    };

    summary.percentage =
      summary.totalDays > 0 ? roundToTwo((summary.present / summary.totalDays) * 100) : 0;

    const report = new Report({
      reportType: 'AttendanceSummary',
      student: studentId,
      academicYear,
      semester: Number(month) <= 6 ? 'Semester 2' : 'Semester 1',
      generatedBy: req.user.id,
      data: {
        monthlyData: filteredRecords,
        summary,
      },
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Attendance summary generated',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to generate attendance summary');
  }
};

exports.getReports = async (req, res) => {
  try {
    const { reportType, academicYear, semester, class: className, page = 1, limit = 20 } = req.query;
    const query = await buildStudentQueryScope(req);

    if (reportType) query.reportType = reportType;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = normalizeSemester(semester);
    if (className) query.class = className;

    const reports = await Report.find(query)
      .populate('generatedBy', 'firstName lastName')
      .populate('student', 'firstName lastName email grade studentProfile')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to fetch reports');
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'firstName lastName')
      .populate('student', 'firstName lastName email grade studentProfile');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.student?._id) {
      await assertCanAccessStudent(req, report.student._id);
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to fetch report');
  }
};

exports.officializeReport = async (req, res) => {
  try {
    const { signedBy, signatureDate } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Get the admin user to retrieve their signature
    const adminUser = await User.findById(req.user.id);

    report.official = true;
    report.signedBy = signedBy || getStudentFullName(req.user);
    report.signatureDate = signatureDate || new Date();
    report.signatureImage = adminUser?.signature || null;
    report.status = 'Final';

    await report.save();

    // Send notification to student and linked parents
    const Message = require('../models/Message');
    const student = await User.findById(report.student);

    if (student) {
      const recipients = [student._id];

      // Add linked parents
      const linkedParents = await User.find({
        _id: { $in: student.parentProfile?.linkedParents || [] },
        role: 'Parent',
        status: 'Active',
      });
      linkedParents.forEach(parent => recipients.push(parent._id));

      if (recipients.length > 0) {
        const notification = new Message({
          sender: req.user.id,
          recipients,
          messageType: 'Broadcast',
          category: 'Academic',
          subject: `Report Card Approved - ${student.firstName} ${student.lastName}`,
          content: `Your report card for ${report.academicYear} has been approved and is now available for viewing. Please check the Reports section to view or download the official document.`,
          priority: 'High',
        });
        await notification.save();
      }
    }

    res.json({
      success: true,
      message: 'Report officialized and notification sent to student/parent',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to officialize report');
  }
};

exports.archiveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.status === 'Final') {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive finalized reports',
      });
    }

    report.status = 'Archived';
    await report.save();

    res.json({
      success: true,
      message: 'Report archived',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to archive report');
  }
};

exports.revertToDraft = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.status !== 'Final') {
      return res.status(400).json({
        success: false,
        message: 'Only final reports can be reverted to draft',
      });
    }

    report.status = 'Draft';
    report.official = false;
    report.signedBy = null;
    report.signatureDate = null;
    report.signatureImage = null;
    await report.save();

    res.json({
      success: true,
      message: 'Report reverted to draft',
      data: report,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to revert report to draft');
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.status === 'Final') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete finalized reports',
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to delete report');
  }
};

exports.exportReport = async (req, res) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'firstName lastName')
      .populate('student', 'firstName lastName email grade section stream studentProfile');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.student?._id) {
      await assertCanAccessStudent(req, report.student._id);
    }

    const exportData = buildExportData(report);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${buildReportFilename(report, 'csv')}"`);
      return res.send(buildReportCsv(report, exportData));
    }

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${buildReportFilename(report, 'html')}"`);
      return res.send(buildReportHtml(report, exportData));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildReportFilename(report, 'json')}"`);
    return res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed to export report');
  }
};
