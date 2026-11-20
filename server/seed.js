require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    await connectDB();

    // Create default faculty user
    const facultyPassword = await bcrypt.hash('faculty123', 10);
    const faculty = await User.findOneAndUpdate(
      { email: 'faculty@campus.edu' },
      {
        name: 'Campus Faculty',
        email: 'faculty@campus.edu',
        password: facultyPassword,
        role: 'faculty',
        department: 'Computer Engineering',
      },
      { upsert: true, new: true }
    );
    console.log('Faculty user created:', faculty.email);

    // Create default student user
    const studentPassword = await bcrypt.hash('student123', 10);
    const student = await User.findOneAndUpdate(
      { email: 'student@campus.edu' },
      {
        name: 'Student User',
        email: 'student@campus.edu',
        password: studentPassword,
        role: 'student',
        rollNumber: 'STU-24-CS-042',
        department: 'Computer Engineering',
        semester: 5,
        academicYear: '2024-25',
      },
      { upsert: true, new: true }
    );
    console.log('Student user created:', student.email);

    // Seed Semester 5 subjects
    const subjects = [
      { name: 'Database Management Systems', code: 'CECMP300', type: 'theory', category: 'mandatory', semester: 5 },
      { name: 'Database Management Systems Lab', code: 'CECMP301', type: 'lab', category: 'mandatory', semester: 5 },
      { name: 'Data Communications and Computer Networks', code: 'CECMP302', type: 'theory', category: 'mandatory', semester: 5 },
      { name: 'Data Communications and Computer Networks Lab', code: 'CECMP303', type: 'lab', category: 'mandatory', semester: 5 },
      { name: 'Artificial Intelligence', code: 'CECMP304', type: 'theory', category: 'mandatory', semester: 5 },
      { name: 'Artificial Intelligence Lab', code: 'CECMP305', type: 'lab', category: 'mandatory', semester: 5 },
      { name: 'Design and Analysis of Algorithms', code: 'CECMP306', type: 'theory', category: 'mandatory', semester: 5 },
      { name: 'Design and Analysis of Algorithms Lab', code: 'CECMP307', type: 'lab', category: 'mandatory', semester: 5 },
      { name: 'Soft Computing', code: 'CECMP325', type: 'theory', category: 'elective', semester: 5 },
      { name: 'Soft Computing Lab', code: 'CECMP326', type: 'lab', category: 'elective', semester: 5 },
    ];

    for (const subj of subjects) {
      await Subject.findOneAndUpdate({ code: subj.code }, subj, { upsert: true, new: true });
    }
    console.log('Subjects seeded:', subjects.length);

    // Seed timetable
    const timetableEntries = [
      { day: 'Monday', time: '09:00 - 10:30', subjectCode: 'CECMP300', type: 'theory', room: 'Room 201', facultyName: 'Prof. A. Sharma' },
      { day: 'Monday', time: '11:00 - 12:30', subjectCode: 'CECMP302', type: 'theory', room: 'Room 202', facultyName: 'Prof. R. Mehta' },
      { day: 'Monday', time: '14:00 - 17:00', subjectCode: 'CECMP301', type: 'lab', room: 'Lab 3', facultyName: 'Prof. A. Sharma' },
      { day: 'Tuesday', time: '09:00 - 10:30', subjectCode: 'CECMP304', type: 'theory', room: 'Room 101', facultyName: 'Prof. S. Patel' },
      { day: 'Tuesday', time: '11:00 - 12:30', subjectCode: 'CECMP306', type: 'theory', room: 'Room 102', facultyName: 'Prof. K. Verma' },
      { day: 'Tuesday', time: '14:00 - 17:00', subjectCode: 'CECMP305', type: 'lab', room: 'Lab 2', facultyName: 'Prof. S. Patel' },
      { day: 'Wednesday', time: '09:00 - 10:30', subjectCode: 'CECMP325', type: 'theory', room: 'Room 201', facultyName: 'Prof. M. Rao' },
      { day: 'Wednesday', time: '11:00 - 12:30', subjectCode: 'CECMP302', type: 'theory', room: 'Room 202', facultyName: 'Prof. R. Mehta' },
      { day: 'Wednesday', time: '14:00 - 17:00', subjectCode: 'CECMP307', type: 'lab', room: 'Lab 1', facultyName: 'Prof. K. Verma' },
      { day: 'Thursday', time: '09:00 - 10:30', subjectCode: 'CECMP300', type: 'theory', room: 'Room 201', facultyName: 'Prof. A. Sharma' },
      { day: 'Thursday', time: '11:00 - 12:30', subjectCode: 'CECMP326', type: 'lab', room: 'Lab 3', facultyName: 'Prof. M. Rao' },
      { day: 'Thursday', time: '14:00 - 15:30', subjectCode: 'CECMP303', type: 'lab', room: 'Lab 2', facultyName: 'Prof. R. Mehta' },
      { day: 'Friday', time: '09:00 - 10:30', subjectCode: 'CECMP304', type: 'theory', room: 'Room 101', facultyName: 'Prof. S. Patel' },
      { day: 'Friday', time: '11:00 - 12:30', subjectCode: 'CECMP306', type: 'theory', room: 'Room 102', facultyName: 'Prof. K. Verma' },
      { day: 'Friday', time: '14:00 - 17:00', subjectCode: 'CECMP325', type: 'theory', room: 'Room 201', facultyName: 'Prof. M. Rao' },
    ];

    for (const entry of timetableEntries) {
      const subject = await Subject.findOne({ code: entry.subjectCode });
      if (subject) {
        await Timetable.findOneAndUpdate(
          { day: entry.day, time: entry.time, subject: subject._id },
          {
            day: entry.day,
            time: entry.time,
            subject: subject._id,
            type: entry.type,
            room: entry.room,
            semester: 5,
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log('Timetable entries seeded:', timetableEntries.length);

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
