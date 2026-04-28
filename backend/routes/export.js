const express = require('express');
const router = express.Router();
const excel = require('excel4node');
const Report = require('../models/Report');
const { protect, mentorOnly } = require('../middleware/auth');

// ── Shared style builder ───────────────────────
function buildStyles(wb) {
  return {
    header: wb.createStyle({
      fill: { type: 'pattern', patternType: 'solid', fgColor: '1a1a2e' },
      font: { bold: true, color: 'FFFFFF', size: 12, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        left: { style: 'thin', color: '2d2d2d' }, right: { style: 'thin', color: '2d2d2d' },
        top: { style: 'thin', color: '2d2d2d' }, bottom: { style: 'thin', color: '2d2d2d' }
      }
    }),
    rowEven: wb.createStyle({
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'f0f4ff' },
      font: { size: 10, name: 'Calibri' },
      alignment: { vertical: 'top', wrapText: true },
      border: {
        left: { style: 'thin', color: 'cccccc' }, right: { style: 'thin', color: 'cccccc' },
        top: { style: 'thin', color: 'cccccc' }, bottom: { style: 'thin', color: 'cccccc' }
      }
    }),
    rowOdd: wb.createStyle({
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'ffffff' },
      font: { size: 10, name: 'Calibri' },
      alignment: { vertical: 'top', wrapText: true },
      border: {
        left: { style: 'thin', color: 'cccccc' }, right: { style: 'thin', color: 'cccccc' },
        top: { style: 'thin', color: 'cccccc' }, bottom: { style: 'thin', color: 'cccccc' }
      }
    }),
    reviewed: wb.createStyle({
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'd4edda' },
      font: { size: 10, name: 'Calibri', color: '155724' },
      alignment: { vertical: 'top', wrapText: true },
      border: {
        left: { style: 'thin', color: 'cccccc' }, right: { style: 'thin', color: 'cccccc' },
        top: { style: 'thin', color: 'cccccc' }, bottom: { style: 'thin', color: 'cccccc' }
      }
    }),
    title: wb.createStyle({
      font: { bold: true, size: 16, name: 'Calibri', color: '1a1a2e' },
      alignment: { horizontal: 'center' }
    }),
    subTitle: wb.createStyle({
      font: { size: 11, name: 'Calibri', color: '555555' },
      alignment: { horizontal: 'center' }
    })
  };
}

// ── Write reports sheet ────────────────────────
function writeReportsSheet(wb, reports, styles) {
  const ws = wb.addWorksheet('Daily Reports', { sheetView: { showGridLines: false } });

  ws.cell(1, 1, 1, 11, true).string('🎓 Internship Daily Report').style(styles.title);
  ws.cell(2, 1, 2, 11, true).string(
    `Generated: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
  ).style(styles.subTitle);
  ws.row(1).setHeight(30);
  ws.row(2).setHeight(20);
  ws.row(3).setHeight(5);

  // AFTER — only Date and Tasks
const headers = ['Date', 'Tasks Completed'];
headers.forEach((h, i) => ws.cell(4, i + 1).string(h).style(styles.header));

[14, 80].forEach((w, i) => ws.column(i + 1).setWidth(w));

reports.forEach((r, idx) => {
    const rowNum = idx + 5;
    const style = idx % 2 === 0 ? styles.rowEven : styles.rowOdd;
    const taskText = (r.tasks || []).map((t, ti) =>
      `${ti + 1}. ${t.title}${t.description ? ': ' + t.description : ''}`
    ).join('\n');

    ws.cell(rowNum, 1).date(new Date(r.date)).style({ ...style, numberFormat: 'dd-mmm-yyyy' });
    ws.cell(rowNum, 2).string(taskText || '').style(style);
    ws.row(rowNum).setHeight(60);
});

  return ws;
}

// ─────────────────────────────────────────────
// ROUTE 1: Download ALL reports (or filtered by student)
// GET /api/export/excel
// GET /api/export/excel?studentId=xxx
// ─────────────────────────────────────────────
router.get('/excel', protect, async (req, res) => {
  try {
    let filter = {};
    let filename = 'internship_reports.xlsx';

    if (req.user.role === 'student') {
      filter.student = req.user._id;
      filename = `${req.user.name.replace(/\s+/g, '_')}_all_reports.xlsx`;
    } else {
      if (req.query.studentId) filter.student = req.query.studentId;
    }

    const reports = await Report.find(filter)
      .populate('student', 'name email rollNumber college internshipTitle')
      .populate('reviewedBy', 'name')
      .sort({ date: 1 });

    const wb = new excel.Workbook();
    const styles = buildStyles(wb);
    writeReportsSheet(wb, reports, styles);

    // Student summary sheet (only for all-reports export)
    const ws2 = wb.addWorksheet('Student Summary');
    ws2.cell(1, 1, 1, 6, true).string('Student Summary').style(styles.title);
    const summaryHeaders = ['Student', 'Roll No', 'College', 'Internship Title', 'Total Reports', 'Reviewed'];
    summaryHeaders.forEach((h, i) => ws2.cell(3, i + 1).string(h).style(styles.header));

    const studentMap = {};
    reports.forEach(r => {
      const sid = r.student?._id?.toString();
      if (!sid) return;
      if (!studentMap[sid]) studentMap[sid] = { student: r.student, total: 0, reviewed: 0 };
      studentMap[sid].total++;
      if (r.isReviewed) studentMap[sid].reviewed++;
    });

    Object.values(studentMap).forEach((s, i) => {
      const row = i + 4;
      const st = s.student;
      ws2.cell(row, 1).string(st?.name || '').style(styles.rowEven);
      ws2.cell(row, 2).string(st?.rollNumber || '').style(styles.rowEven);
      ws2.cell(row, 3).string(st?.college || '').style(styles.rowEven);
      ws2.cell(row, 4).string(st?.internshipTitle || '').style(styles.rowEven);
      ws2.cell(row, 5).number(s.total).style(styles.rowEven);
      ws2.cell(row, 6).number(s.reviewed).style(styles.rowEven);
    });
    [25, 15, 25, 30, 14, 12].forEach((w, i) => ws2.column(i + 1).setWidth(w));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    wb.write(filename, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// ROUTE 2: Download a SINGLE report by ID
// GET /api/export/excel/single/:reportId
// ─────────────────────────────────────────────
router.get('/excel/single/:reportId', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate('student', 'name email rollNumber college internshipTitle')
      .populate('reviewedBy', 'name');

    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Students can only download their own reports
    if (req.user.role === 'student' && report.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const reportDate = new Date(report.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).replace(/ /g, '_');

    const studentName = (report.student?.name || 'student').replace(/\s+/g, '_');
    const filename = `${studentName}_report_${reportDate}.xlsx`;

    const wb = new excel.Workbook();
    const styles = buildStyles(wb);

    // ── Sheet 1: Report Detail ─────────────────
    const ws = wb.addWorksheet('Report', { sheetView: { showGridLines: false } });

    const titleStyle = wb.createStyle({
      font: { bold: true, size: 18, name: 'Calibri', color: '1a1a2e' },
      alignment: { horizontal: 'center' }
    });
    const labelStyle = wb.createStyle({
      font: { bold: true, size: 11, name: 'Calibri', color: 'ffffff' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: '1a1a2e' },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        left: { style: 'thin', color: '444444' }, right: { style: 'thin', color: '444444' },
        top: { style: 'thin', color: '444444' }, bottom: { style: 'thin', color: '444444' }
      }
    });
    const valueStyle = wb.createStyle({
      font: { size: 11, name: 'Calibri', color: '1a1a2e' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'f8f9ff' },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: {
        left: { style: 'thin', color: 'cccccc' }, right: { style: 'thin', color: 'cccccc' },
        top: { style: 'thin', color: 'cccccc' }, bottom: { style: 'thin', color: 'cccccc' }
      }
    });
    const sectionHeaderStyle = wb.createStyle({
      font: { bold: true, size: 12, name: 'Calibri', color: 'ffffff' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'f5a623' },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        left: { style: 'thin', color: 'c17d0b' }, right: { style: 'thin', color: 'c17d0b' },
        top: { style: 'thin', color: 'c17d0b' }, bottom: { style: 'thin', color: 'c17d0b' }
      }
    });
    const feedbackStyle = wb.createStyle({
      font: { size: 11, name: 'Calibri', color: '155724', italic: true },
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'd4edda' },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: {
        left: { style: 'thin', color: '28a745' }, right: { style: 'thin', color: '28a745' },
        top: { style: 'thin', color: '28a745' }, bottom: { style: 'thin', color: '28a745' }
      }
    });

    ws.column(1).setWidth(22);
    ws.column(2).setWidth(60);

    // Title
    ws.cell(1, 1, 1, 2, true)
      .string('📄 Daily Internship Report')
      .style(titleStyle);
    ws.row(1).setHeight(36);

    // Sub-title date
    ws.cell(2, 1, 2, 2, true)
      .string(`${new Date(report.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`)
      .style(wb.createStyle({ font: { size: 12, name: 'Calibri', color: '888888' }, alignment: { horizontal: 'center' } }));
    ws.row(2).setHeight(22);

    ws.row(3).setHeight(10); // spacer

    // Student info section
    ws.cell(4, 1, 4, 2, true).string('STUDENT INFORMATION').style(sectionHeaderStyle);
    ws.row(4).setHeight(24);

    const s = report.student || {};
    const infoRows = [
      ['Student Name', s.name || '—'],
      ['Roll Number', s.rollNumber || '—'],
      ['College', s.college || '—'],
      ['Internship Title', s.internshipTitle || '—'],
      ['Date', new Date(report.date).toLocaleDateString('en-IN')],
      ['Hours Worked', `${report.hoursWorked || 0} hours`],
    ];

    infoRows.forEach(([label, val], i) => {
      const row = 5 + i;
      ws.cell(row, 1).string(label).style(labelStyle);
      ws.cell(row, 2).string(val).style(valueStyle);
      ws.row(row).setHeight(22);
    });

    // Tasks section
    const taskStartRow = 5 + infoRows.length + 1;
    ws.cell(taskStartRow, 1, taskStartRow, 2, true).string('TASKS COMPLETED').style(sectionHeaderStyle);
    ws.row(taskStartRow).setHeight(24);

    const taskHeaderStyle = wb.createStyle({
      font: { bold: true, size: 10, name: 'Calibri', color: 'ffffff' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: '252550' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { left: { style: 'thin', color: '333333' }, right: { style: 'thin', color: '333333' }, top: { style: 'thin', color: '333333' }, bottom: { style: 'thin', color: '333333' } }
    });
    const taskValueStyle = wb.createStyle({
      font: { size: 10, name: 'Calibri' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: 'fafbff' },
      alignment: { vertical: 'top', wrapText: true },
      border: { left: { style: 'thin', color: 'dddddd' }, right: { style: 'thin', color: 'dddddd' }, top: { style: 'thin', color: 'dddddd' }, bottom: { style: 'thin', color: 'dddddd' } }
    });

    // Task table — use 4 sub-columns merged into col2 area
    const taskTableStart = taskStartRow + 1;
    ws.cell(taskTableStart, 1).string('#').style(taskHeaderStyle);
    ws.cell(taskTableStart, 2).string('Task Title | Description | Duration | Status').style(taskHeaderStyle);
    ws.row(taskTableStart).setHeight(22);

    (report.tasks || []).forEach((t, i) => {
      const row = taskTableStart + 1 + i;
      ws.cell(row, 1).number(i + 1).style(taskValueStyle);
      const taskLine = [
        t.title,
        t.description ? `Description: ${t.description}` : '',
        t.duration ? `Duration: ${t.duration}` : '',
        `Status: ${t.status}`
      ].filter(Boolean).join('  |  ');
      ws.cell(row, 2).string(taskLine).style(taskValueStyle);
      ws.row(row).setHeight(30);
    });

    // Next Day Plan
    const planRow = taskTableStart + 1 + (report.tasks || []).length + 1;
    ws.cell(planRow, 1, planRow, 2, true).string('NEXT DAY PLAN').style(sectionHeaderStyle);
    ws.row(planRow).setHeight(24);
    ws.cell(planRow + 1, 1).string('Plan').style(labelStyle);
    ws.cell(planRow + 1, 2).string(report.nextDayPlan || '—').style(valueStyle);
    ws.row(planRow + 1).setHeight(40);

    // Mentor Feedback
    if (report.isReviewed) {
      const fbRow = planRow + 3;
      ws.cell(fbRow, 1, fbRow, 2, true).string('MENTOR REVIEW').style(sectionHeaderStyle);
      ws.row(fbRow).setHeight(24);

      ws.cell(fbRow + 1, 1).string('Feedback').style(labelStyle);
      ws.cell(fbRow + 1, 2).string(report.mentorFeedback || '—').style(feedbackStyle);
      ws.row(fbRow + 1).setHeight(50);

      ws.cell(fbRow + 2, 1).string('Rating').style(labelStyle);
      ws.cell(fbRow + 2, 2).string(report.mentorRating ? `${report.mentorRating}/5 ${'★'.repeat(report.mentorRating)}` : '—').style(feedbackStyle);
      ws.row(fbRow + 2).setHeight(22);

      ws.cell(fbRow + 3, 1).string('Reviewed By').style(labelStyle);
      ws.cell(fbRow + 3, 2).string(report.reviewedBy?.name || '—').style(feedbackStyle);
      ws.row(fbRow + 3).setHeight(22);
    } else {
      const fbRow = planRow + 3;
      ws.cell(fbRow, 1, fbRow, 2, true).string('⏳ Awaiting mentor review...').style(
        wb.createStyle({
          font: { size: 11, name: 'Calibri', color: '888888', italic: true },
          alignment: { horizontal: 'center' }
        })
      );
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    wb.write(filename, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
