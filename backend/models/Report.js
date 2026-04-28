const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: String, default: '' },
  status: { type: String, enum: ['completed', 'in-progress', 'pending'], default: 'completed' }
});

const reportSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  tasks: [taskSchema],
  hoursWorked: { type: Number, default: 0 },
  learnings: { type: String, default: '' },
  challenges: { type: String, default: '' },
  nextDayPlan: { type: String, default: '' },
  mentorFeedback: { type: String, default: '' },
  mentorRating: { type: Number, min: 1, max: 5, default: null },
  isReviewed: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

// Compound index: one report per student per day
reportSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
