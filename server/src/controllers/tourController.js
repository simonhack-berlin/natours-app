const tourModel = require('../models/tourModel');

/* Get all tours */
exports.getAllTours = async (req, res) => {
  try {
    const tours = await tourModel.find();
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours: tours,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

/* Get a single tour */
exports.getTour = async (req, res) => {
  try {
    const tour = await tourModel.findById(req.params.id);

    res.status(200).json({
      status: 'success',
      data: {
        tour: tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

/* Create new tour */
exports.createTour = async (req, res) => {
  try {
    const newTour = await tourModel.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

/* Update tour */
exports.updateTour = async (req, res) => {
  try {
    const tour = await tourModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        tour
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

/* Delete tour */
exports.deleteTour = async (req, res) => {
  try {
    await tourModel.findByIdAndDelete(req.params.id)

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};