const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const factory = require('./handlerFactory');

// Doc: https://www.npmjs.com/package/multer
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed.'), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = async (req, res, next) => {
  try {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    // console.log(req.file)

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`../server/public/img/users/${req.file.filename}`);

    next();
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user.id });

    // Get all user reviews
    const myReviews = reviews.map((el) => el);

    res.status(200).json({
      status: 'success',
      data: {
        myReviews,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    // Find all bookings
    const bookings = await Booking.find({ user: req.user.id });

    // Get all tours with returned IDs
    const tourIDs = bookings.map((el) => el.tour);
    const tours = await Tour.find({ _id: { $in: tourIDs } });

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        bookedTours: tours,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.getMyBillings = async (req, res, next) => {
  try {
    // Find all bookings
    const bookings = await Booking.find({ user: req.user.id });

    const tour = bookings.map((el) => el.tour);
    const price = bookings.map((el) => el.price);
    const date = bookings.map((el) => el.createdAt);

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        billings: {
          tour,
          price,
          date,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { name, password, confirmPassword } = req.body;
    // Create error if user POSTs password data
    if (password || confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message:
          'This route is not for password updates. Please use /updatePassword',
      });
    }

    if (name && name.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'User name must be at least 6 characters long',
      });
    }

    // Filtered out unwanted fields name that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    // console.log(req.file);
    if (req.file) filteredBody.photo = req.file.filename;

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined, please use /signup instead!',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User, [{ path: 'reviews' }]);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
