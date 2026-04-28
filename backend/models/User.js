const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'mentor'], required: true },
  // Student-specific
  rollNumber: { type: String },
  college: { type: String },
  internshipTitle: { type: String },
  // Mentor-specific
  organization: { type: String },
  designation: { type: String },
  assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Student-mentor link
  mentorEmail: { type: String, lowercase: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
