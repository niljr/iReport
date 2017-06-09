const mongoose = require('mongoose');
const Report = mongoose.model('Report');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
}

exports.addReport = (req, res) => {
  res.render('editReport', { title: 'Add Report' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); //skip to the next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // Once the photo is written to filesystem , keep goind!
  next();
}

exports.createReport = async (req, res) => {
  req.body.author = req.user._id;
  const report = await (new Report(req.body)).save();
  req.flash('success', `Succesfully created ${report.title}. Care to leave a Comment?`);
  res.redirect(`/report/${report.slug}`);
};

exports.getReports = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 9;
  const skip = (page * limit) - limit;

  // 1. Query the database for a list of all reports
  const reportsPromise = Report
  .find()
  .skip(skip)
  .limit(limit)
  .sort({ created: 'desc' });

  const countPromise = Report.count();

  const [reports, count] = await Promise.all([reportsPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!reports.length && skip) {
    req.flash('info', `Hey you asked for page ${page}. But that doesn't exist. so i put you on page ${pages}`);
    res.redirect(`/reports/page/${pages}`);
    return;
  }

  res.render('reports', { title: 'Reports', reports, page, pages, count });
};

const confirmOwner = (report, user) => {
  if (!report.author.equals(user._id)) {
    throw Error('You must own a report in order to edit it!');
  }
};

exports.editReport = async (req, res) => {
  // 1. Find the report given the id
  const report = await Report.findOne({ _id: req.params.id });
  // 2. Confirm They are the owner of the report
  confirmOwner(report, req.user);
  // 3. Rendera out the edit from so the user can update their report
  res.render('editReport', { title: `Edit ${report.title}`, report });
};

exports.updateReport = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = 'Point';
  // Find and update the report
  const report = await Report.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, //return the nwew report instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${report.title}</strong>. <a href="/reports/${report.slug}">View Report -></a>`);
  res.redirect(`/reports/${report._id}/edit`);
  // redirect them the report and tell them it worked
};

exports.getReportBySlug = async (req, res, next) => {
  const report = await Report.findOne({ slug: req.params.slug }).populate('author comments gravatar');
  if (!report) return next();
  res.render('report', { report, title: report.title });
};

exports.getReportsByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Report.getTagsList();
  const reportsPromise = Report.find({ tags: tagQuery });
  const [tags, reports] = await Promise.all([tagsPromise, reportsPromise]);
  res.render('tag', { tags, title: 'Tags', tag, reports });
};


exports.searchReports = async (req, res) => {
  const reports = await Report
  // first find reports that match
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  // sort them
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only 5 results
  .limit(5);
  res.json(reports);
};

exports.mapReports = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const reports = await Report.find(q).select('slug title description location photo').limit(10);
  res.json(reports);
};

exports.homePage = (req, res) => {
  res.render('index', { title: 'Home' });
};

exports.heartReport = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
  .findByIdAndUpdate(req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );
  res.json(user);
}; 

exports.getHearts = async (req, res) => {
  const reports = await Report.find({
    _id: { $in: req.user.hearts }
  });
  res.render('reports', { title: 'Hearted Reports', reports });
};

exports.getTopReports = async (req, res) => {
  const reports = await Report.getTopReports();
  res.render('topReports', { reports, title: '★ Top Reports!' });
};