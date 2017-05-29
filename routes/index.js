const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const userController = require('../controllers/userController');
const commentController = require('../controllers/commentController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', catchErrors(reportController.getReports));
router.get('/reports', catchErrors(reportController.getReports));
router.get('/reports/page/:page', catchErrors(reportController.getReports));
router.get('/add', authController.isLoggedIn, reportController.addReport);

router.post('/add',
  reportController.upload,
  catchErrors(reportController.resize),
  catchErrors(reportController.createReport)
);

router.post('/add/:id',
  reportController.upload,
  catchErrors(reportController.resize),
  catchErrors(reportController.updateReport)
);

router.get('/reports/:id/edit', catchErrors(reportController.editReport));
router.get('/report/:slug', catchErrors(reportController.getReportBySlug));

router.get('/tags', catchErrors(reportController.getReportsByTag));
router.get('/tags/:tag', catchErrors(reportController.getReportsByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/register', userController.registerForm);

// 1. Validate the registration data
// 2. register the user
// 3. we need to log them in
router.post('/register',
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset))
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update)
);
router.get('/map', reportController.mapPage );
router.get('/hearts', authController.isLoggedIn, catchErrors(reportController.getHearts));
router.post('/comments/:id', 
  authController.isLoggedIn, 
  catchErrors(commentController.addComment)
);
router.get('/top', catchErrors(reportController.getTopReports));

/*
  API
*/

router.get('/api/search', catchErrors(reportController.searchReports));
router.get('/api/reports/near', catchErrors(reportController.mapReports));
router.post('/api/reports/:id/heart', catchErrors(reportController.heartReport));


module.exports = router;
