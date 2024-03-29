const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // backend only
    secure: true, // set to true if using https or samesite is none
    sameSite: 'none',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    const existingUser = await User.findOne({ name });
    const existingEmail = await User.findOne({ email });

    if (name.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'User name must be at least 6 characters long',
      });
    }

    if (existingUser) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'User name already taken!' });
    }

    if (existingEmail) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'This email is already in use!' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 8 characters long',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password and confirm password does not match!',
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      confirmPassword,
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      // 400 Bad Request
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password!',
      });
    }

    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    let correct;
    user
      ? (correct = await user.correctPassword(password, user.password))
      : (correct = false);

    if (!user || !correct) {
      // 401 Unauthorized
      return res.status(401).json({
        status: 'fail',
        message: 'Login not successful',
        error: 'Incorrect email or password',
      });
    }

    createSendToken(user, 200, res);
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.logout = async (req, res, next) => {
  res.clearCookie('jwt', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = async (req, res, next) => {
  try {
    // Get token and check if it exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Sorry, you need to log in to get access for this route',
      });
    }

    // Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token does no long exist.',
      });
    }

    // Check if user changed password after token was issued
    if (currentUser.changedPassword(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user recently changed password! Please log in again.',
      });
    }

    req.user = currentUser;
    next();
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'fail',
          message: 'You do not have permission to perform this action',
        });
      }
      next();
    } catch (err) {
      res.status(500).json({
        status: 'fail',
        message: err.message,
      });
    }
  };
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: `No user found with email address ${req.body.email}`,
      });
    }
    // Generate random reset token
    const resetToken = user.createResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Send reset token to user's email
    try {
      const resetURL = `${req.get('origin')}/resetPassword/${resetToken}`;

      const emailTemplateSource = fs.readFileSync(
        path.join(
          __dirname,
          '/../../public/templates/emails/resetPassword.hbs'
        ),
        'utf8'
      );

      const template = handlebars.compile(emailTemplateSource);
      const htmlToSend = template({
        firstName: user.name.split(' ')[0],
        url: resetURL,
      });

      const message = `Forgot your password? Follow the link below to reset your password\n${resetURL}\nIf you did not forget your password, please ignore this email!`;

      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 min)',
        message,
        html: htmlToSend,
      });

      res.status(200).json({
        status: 'success',
        message: 'token sent to email!',
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(err);
    }
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // Set new password if token has not expired and there is user
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired',
      });
    }
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log the user in, send JWT
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    // Check if POSTed password is correct
    if (
      !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
      return res.status(400).json({
        status: 'fail',
        message: 'Your current password is incorrect.',
      });
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password and confirm password does not match!',
      });
    }

    // If POSTed password is correct then update password
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();
    // Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    // Check if POSTed password is correct
    if (!(await user.correctPassword(req.body.password, user.password))) {
      return res.status(400).json({
        status: 'fail',
        message: 'Your password is incorrect.',
      });
    }

    // If POSTed password is correct
    // and the environment is production then delete the user
    // otherwise deactivates the user
    if (process.env.NODE_ENV === 'production') {
      await User.findByIdAndDelete(req.user.id);
    } else {
      await User.findByIdAndUpdate(user, { active: false });
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message,
    });
  }
};
