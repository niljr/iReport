const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: 'Please enter a report title'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply as address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJson: { virtuals: true },
  toObject: { virtuals: true },
});

// define indexes
reportSchema.index({
  title: 'text',
  description: 'text'
});

reportSchema.index({ location: '2dsphere' });


reportSchema.pre('save', async function(next) {
  if (!this.isModified('title')) {
    next(); // skip it
    return; // stop this function from running
  }
  this.slug = slug(this.title);
  // find other reports that have a slug of wes, wes-1, wes-2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const reportsWithSlug = await this.constructor.find({ slug: slugRegEx });
  if(reportsWithSlug.length) {
    this.slug = `${this.slug}-${reportsWithSlug.length + 1}`;
  }
  next();
  // TODO make more resiliant so slugs are unique
});

reportSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

reportSchema.statics.getTopReports = function() {
  return this.aggregate([
    // lookup reports and populate their comments
    { $lookup: { from: 'comments', localField: '_id', foreignField: 'report', as: 'comments' }},
    //filter for only items that have 2 or more comments
    { $match: { 'comments.1': { $exists: true } } },
    // Add the average comments field
    { $project: {
      photo: '$$ROOT.photo',
      title: '$$ROOT.title',
      slug: '$$ROOT.slug',
      comments: '$$ROOT.comments',
      averageRating: { $avg: '$comments.rating' }
    }},
    // sort it by new field, highest comments first
    { $sort: { averageRating: -1 } },
    // limit to at most 10
    { $limit: 10 }
  ]);
}

// find comments where the reports _id property === comments report property
reportSchema.virtual('comments', {
  ref: 'Comment', //what model to link
  localField: '_id', //which field on the report
  foreignField: 'report' //which field on the comment
});

function autopopuplate(next) {
  this.populate('comments');
  next();
}

reportSchema.pre('find', autopopuplate);
reportSchema.pre('findOne', autopopuplate);

module.exports = mongoose.model('Report', reportSchema);