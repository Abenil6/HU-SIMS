const AcademicYear = require('../models/AcademicYear');

/**
 * Create a new academic year
 */
exports.createAcademicYear = async (req, res) => {
  try {
    const { year, startDate, endDate, semesters, notes } = req.body;

    // Check if year already exists
    const existingYear = await AcademicYear.findOne({ year });
    if (existingYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year already exists'
      });
    }

    const academicYear = new AcademicYear({
      year,
      startDate,
      endDate,
      semesters,
      notes,
      createdBy: req.user.id
    });

    await academicYear.save();

    res.status(201).json({
      success: true,
      message: 'Academic year created successfully',
      data: academicYear
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create academic year',
      error: error.message
    });
  }
};

/**
 * Get all academic years
 */
exports.getAcademicYears = async (req, res) => {
  try {
    const { status, isActive, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const years = await AcademicYear.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ year: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AcademicYear.countDocuments(query);

    res.json({
      success: true,
      data: years,
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
      message: 'Failed to fetch academic years',
      error: error.message
    });
  }
};

/**
 * Get academic year by ID
 */
exports.getAcademicYearById = async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found'
      });
    }

    res.json({
      success: true,
      data: year
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic year',
      error: error.message
    });
  }
};

/**
 * Update academic year
 */
exports.updateAcademicYear = async (req, res) => {
  try {
    const { startDate, endDate, semesters, status, notes } = req.body;

    const year = await AcademicYear.findById(req.params.id);

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found'
      });
    }

    if (startDate) year.startDate = startDate;
    if (endDate) year.endDate = endDate;
    if (semesters) year.semesters = semesters;
    if (status) year.status = status;
    if (notes !== undefined) year.notes = notes;
    year.updatedBy = req.user.id;

    await year.save();

    res.json({
      success: true,
      message: 'Academic year updated successfully',
      data: year
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update academic year',
      error: error.message
    });
  }
};

/**
 * Delete academic year
 */
exports.deleteAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found'
      });
    }

    if (year.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the active academic year'
      });
    }

    await AcademicYear.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Academic year deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete academic year',
      error: error.message
    });
  }
};

/**
 * Set academic year as active
 */
exports.setAsActive = async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found'
      });
    }

    await year.setAsActive();

    res.json({
      success: true,
      message: 'Academic year set as active',
      data: year
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to set academic year as active',
      error: error.message
    });
  }
};

/**
 * Get active academic year
 */
exports.getActiveAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.getActiveYear();

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'No active academic year found'
      });
    }

    res.json({
      success: true,
      data: year
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get active academic year',
      error: error.message
    });
  }
};

/**
 * Update semester details
 */
exports.updateSemester = async (req, res) => {
  try {
    const { semesterName } = req.params;
    const { startDate, endDate, examPeriodStart, examPeriodEnd, resultDate } = req.body;

    const year = await AcademicYear.findById(req.params.id);

    if (!year) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found'
      });
    }

    const semesterIndex = year.semesters.findIndex(s => s.name === semesterName);
    if (semesterIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Semester ${semesterName} not found`
      });
    }

    if (startDate) year.semesters[semesterIndex].startDate = startDate;
    if (endDate) year.semesters[semesterIndex].endDate = endDate;
    if (examPeriodStart !== undefined) year.semesters[semesterIndex].examPeriodStart = examPeriodStart;
    if (examPeriodEnd !== undefined) year.semesters[semesterIndex].examPeriodEnd = examPeriodEnd;
    if (resultDate !== undefined) year.semesters[semesterIndex].resultDate = resultDate;

    year.updatedBy = req.user.id;
    await year.save();

    res.json({
      success: true,
      message: 'Semester updated successfully',
      data: year
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update semester',
      error: error.message
    });
  }
};
