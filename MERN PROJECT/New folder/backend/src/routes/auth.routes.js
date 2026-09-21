const express = require('express');
const { body, validationResult } = require('express-validator');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const {
  createUserSession,
  sendEmailVerification,
  comparePassword,
  signToken,
} = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
const pendingVerificationCodes = new Map();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'VALIDATION_ERROR', errors.array()[0].msg, 400);
    }

    try {
      const { name, email, password } = req.body;
      const verification = await sendEmailVerification({ email, name });
      pendingVerificationCodes.set(email.toLowerCase(), {
        code: verification.verificationCode,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const user = await createUserSession({
        email,
        password,
        name,
      });

      return sendSuccess(res, {
        user: user.user,
        token: user.token,
        verificationCodeSent: true,
        verification: {
          email: verification.email,
          expiresInMinutes: 10,
        },
      }, 'User registered successfully. Verification email sent.', 201);
    } catch (error) {
      return sendError(res, 'REGISTRATION_FAILED', error.message || 'Registration failed.', 500);
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'VALIDATION_ERROR', errors.array()[0].msg, 400);
    }

    try {
      const { email, password } = req.body;

      const user = { email, name: 'JobTrack User' };
      const isMatch = await comparePassword(password, '$2a$10$abcdefghijklmnopqrstuv');

      if (!isMatch) {
        return sendError(res, 'INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
      }

      const token = signToken({ sub: user.email, email: user.email, name: user.name });
      return sendSuccess(res, { user, token }, 'Login successful.');
    } catch (error) {
      return sendError(res, 'LOGIN_FAILED', error.message || 'Login failed.', 500);
    }
  }
);

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return sendError(res, 'VALIDATION_ERROR', 'Email and verification code are required.', 400);
  }

  const pending = pendingVerificationCodes.get(String(email).toLowerCase());
  if (!pending || pending.expiresAt < Date.now() || String(code) !== String(pending.code)) {
    return sendError(res, 'INVALID_CODE', 'Verification code is incorrect.', 400);
  }

  pendingVerificationCodes.delete(String(email).toLowerCase());

  return sendSuccess(res, { verified: true }, 'Email verified successfully.');
});

router.get('/me', requireAuth, async (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Authenticated user fetched.');
});

module.exports = router;
