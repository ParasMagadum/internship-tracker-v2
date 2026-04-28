const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect, mentorOnly } = require('../middleware/auth');

// Student: Submit daily report
router.post('/', protect, async (req, res) => {
  try {
    const { date, tasks, hoursWorked, learnings, challenges, nextDayPlan } = req.body;
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    const existing = await Report.findOne({ student: req.user._id, date: reportDate });
    if (existing) return res.status(400).json({ message: 'Report for this date already exists. Use update.' });

    const report = await Report.create({
      student: req.user._id,
      date: reportDate,
      tasks,
      hoursWorked,
      learnings,
      challenges,
      nextDayPlan
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student: Update own report
router.put('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your report' });
    }
    const updated = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student: Get own reports
router.get('/my', protect, async (req, res) => {
  try {
    const reports = await Report.find({ student: req.user._id }).sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student: Get single report by date
router.get('/my/:date', protect, async (req, res) => {
  try {
    const d = new Date(req.params.date);
    d.setHours(0,0,0,0);
    const report = await Report.findOne({ student: req.user._id, date: d });
    res.json(report || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mentor: Get all reports (optionally filter by student)
router.get('/all', protect, mentorOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.student = req.query.studentId;
    const reports = await Report.find(filter)
      .populate('student', 'name email rollNumber college internshipTitle')
      .populate('reviewedBy', 'name')
      .sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mentor: Add feedback
router.patch('/:id/feedback', protect, mentorOnly, async (req, res) => {
  try {
    const { mentorFeedback, mentorRating } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, {
      mentorFeedback,
      mentorRating,
      isReviewed: true,
      reviewedBy: req.user._id,
      reviewedAt: new Date()
    }, { new: true }).populate('student', 'name email rollNumber');
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stats for dashboard
router.get('/stats/my', protect, async (req, res) => {
  try {
    const total = await Report.countDocuments({ student: req.user._id });
    const reviewed = await Report.countDocuments({ student: req.user._id, isReviewed: true });
    const thisMonth = await Report.countDocuments({
      student: req.user._id,
      date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });
    res.json({ total, reviewed, thisMonth, pending: total - reviewed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
