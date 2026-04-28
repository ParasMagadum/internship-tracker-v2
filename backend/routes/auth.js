const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'internship_secret_key_2024', { expiresIn: '30d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, college, internshipTitle, organization, designation } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, rollNumber, college, internshipTitle, organization, designation });
    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        college: user.college,
        internshipTitle: user.internshipTitle,
        organization: user.organization,
        designation: user.designation
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// Get all students (for mentor)
router.get('/students', protect, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, password, rollNumber, college, internshipTitle, organization, designation } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (rollNumber !== undefined) user.rollNumber = rollNumber;
    if (college !== undefined) user.college = college;
    if (internshipTitle !== undefined) user.internshipTitle = internshipTitle;
    if (organization !== undefined) user.organization = organization;
    if (designation !== undefined) user.designation = designation;
    if (password) user.password = password;

    await user.save();
    res.json({
      name: user.name,
      email: user.email,
      role: user.role,
      rollNumber: user.rollNumber,
      college: user.college,
      internshipTitle: user.internshipTitle,
      organization: user.organization,
      designation: user.designation
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
