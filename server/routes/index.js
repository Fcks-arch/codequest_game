const express = require('express');

const router = express.Router();

const { authMiddleware, instructorOnly } = require('../middleware/auth');

const auth = require('../controllers/authController');
const lessons = require('../controllers/lessonController');
const progress = require('../controllers/progressController');
const code = require('../controllers/codeController');
const teacher = require('../controllers/teacherController');
const quizzes = require('../controllers/quizController');
const reports = require('../controllers/reportController');
const classController = require('../controllers/classController');


// ========================================================
// AUTHENTICATION
// ========================================================

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/google', auth.googleAuth);

router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);

router.get('/auth/me', authMiddleware, auth.getMe);
router.get('/auth/profile', authMiddleware, auth.getProfile);
router.put('/auth/profile', authMiddleware, auth.updateProfile);


// ========================================================
// LESSONS
// ========================================================

router.get('/lessons', authMiddleware, lessons.getLessons);
router.get('/lessons/modules', authMiddleware, lessons.getModules);

router.get(
  '/lessons/:id/next',
  authMiddleware,
  lessons.getNextLesson
);

router.get(
  '/lessons/:id',
  authMiddleware,
  lessons.getLesson
);

router.post(
  '/lessons',
  authMiddleware,
  instructorOnly,
  lessons.createLesson
);

router.put(
  '/lessons/:id',
  authMiddleware,
  instructorOnly,
  lessons.updateLesson
);


// ========================================================
// TEACHER DASHBOARD
// ========================================================

router.get(
  '/teacher/overview',
  authMiddleware,
  instructorOnly,
  teacher.overview
);

router.get(
  '/teacher/students',
  authMiddleware,
  instructorOnly,
  teacher.students
);

router.get(
  '/teacher/students/:id',
  authMiddleware,
  instructorOnly,
  teacher.student
);

router.get(
  '/teacher/analytics',
  authMiddleware,
  instructorOnly,
  teacher.analytics
);

router.get(
  '/teacher/leaderboard',
  authMiddleware,
  instructorOnly,
  teacher.leaderboard
);


// ========================================================
// TEACHER REPORTS
// ========================================================

router.get(
  '/teacher/reports/generate',
  authMiddleware,
  instructorOnly,
  reports.generate
);


// ========================================================
// TEACHER QUIZZES
// ========================================================

// Get all quizzes created by the teacher
router.get(
  '/teacher/quizzes',
  authMiddleware,
  instructorOnly,
  quizzes.listTeacher
);

// Create a new quiz
router.post(
  '/teacher/quizzes',
  authMiddleware,
  instructorOnly,
  quizzes.create
);

// // ========================================================
// QUIZ ARCHIVE / RESTORE
// ========================================================
//
// NOTE: this block is registered BEFORE the '/teacher/quizzes/:id'
// routes below on purpose. Express matches routes top-to-bottom,
// and ':id' matches ANY single path segment — including the literal
// word "archived". If '/teacher/quizzes/:id' were registered first,
// GET /teacher/quizzes/archived would be swallowed by getTeacher(),
// which tries to parse "archived" as a numeric ID and fails with
// "Invalid quiz ID." Keep this block above the ':id' routes.

// Get archived quizzes
router.get(
  '/teacher/quizzes/archived',
  authMiddleware,
  instructorOnly,
  quizzes.listArchived
);

// Get a specific quiz for editing
router.get(
  '/teacher/quizzes/:id',
  authMiddleware,
  instructorOnly,
  quizzes.getTeacher
);

// Update an existing quiz
router.patch(
  '/teacher/quizzes/:id',
  authMiddleware,
  instructorOnly,
  quizzes.update
);

// Publish / unpublish quiz
router.patch(
  '/teacher/quizzes/:id/toggle',
  authMiddleware,
  instructorOnly,
  quizzes.toggle
);

// Archive a quiz
router.patch(
  '/teacher/quizzes/:id/archive',
  authMiddleware,
  instructorOnly,
  quizzes.archive
);

// Restore an archived quiz
router.patch(
  '/teacher/quizzes/:id/restore',
  authMiddleware,
  instructorOnly,
  quizzes.restore
);

// Permanently delete a quiz (intended to be used from the
// Archived tab only, as a final, non-reversible step)
router.delete(
  '/teacher/quizzes/:id',
  authMiddleware,
  instructorOnly,
  quizzes.remove
);

// Get quiz scores
router.get(
  '/teacher/quizzes/:id/scores',
  authMiddleware,
  instructorOnly,
  quizzes.teacherScores
);


// ========================================================
// STUDENT QUIZZES
// ========================================================

// Get quizzes available to the logged-in student
router.get(
  '/quizzes',
  authMiddleware,
  quizzes.listStudent
);

// Get a specific quiz
router.get(
  '/quizzes/:id',
  authMiddleware,
  quizzes.get
);

// Submit a quiz
router.post(
  '/quizzes/:id/submit',
  authMiddleware,
  quizzes.submit
);


// ========================================================
// CODE EXECUTION
// ========================================================

router.post(
  '/execute/java',
  authMiddleware,
  code.executeJava
);


// ========================================================
// PROGRESS & GAMIFICATION
// ========================================================

router.get(
  '/progress',
  authMiddleware,
  progress.getProgress
);

router.post(
  '/progress/complete',
  authMiddleware,
  progress.completeLesson
);

router.get(
  '/progress/badges',
  authMiddleware,
  progress.getBadges
);

router.get(
  '/progress/leaderboard',
  authMiddleware,
  progress.getLeaderboard
);


// ========================================================
// PRE-TEST
// ========================================================

router.post(
  '/progress/pretest',
  authMiddleware,
  progress.savePretest
);

router.get(
  '/progress/pretest',
  authMiddleware,
  progress.getPretestResult
);


// ========================================================
// POST-TEST
// ========================================================

router.post(
  '/progress/posttest',
  authMiddleware,
  progress.savePosttest
);

router.get(
  '/progress/posttest',
  authMiddleware,
  progress.getPosttestResult
);


// ========================================================
// TEACHER CLASSES
// ========================================================

// Create a class
router.post(
  '/teacher/classes',
  authMiddleware,
  instructorOnly,
  classController.create
);

// Get classes belonging to the teacher
router.get(
  '/teacher/classes',
  authMiddleware,
  instructorOnly,
  classController.teacherClasses
);

// Get students in a specific class
router.get(
  '/teacher/classes/:id/students',
  authMiddleware,
  instructorOnly,
  classController.students
);


// ========================================================
// STUDENT CLASSES
// ========================================================

// Join a class
router.post(
  '/classes/join',
  authMiddleware,
  classController.join
);

// Get student's classes
router.get(
  '/classes',
  authMiddleware,
  classController.studentClasses
);

// Leave a class
router.delete(
  '/classes/:id/leave',
  authMiddleware,
  classController.leave
);


// ========================================================
// EXPORT ROUTER
// ========================================================

module.exports = router;