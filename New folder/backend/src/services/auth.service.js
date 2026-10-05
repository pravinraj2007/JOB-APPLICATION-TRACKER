const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');
const { sendVerificationCode } = require('./email.service');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const generateCode = () => crypto.randomInt(100000, 1000000).toString();

const hashPassword = async (password) => bcrypt.hash(password, 10);

const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const createUserSession = async ({ email, password, name }) => {
  if (!supabaseAdmin) {
    return {
      user: {
        id: crypto.randomUUID(),
        email,
        name,
      },
      token: signToken({ email, name }),
    };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    token: signToken({ sub: data.user.id, email: data.user.email }),
  };
};

const sendEmailVerification = async ({ email, name }) => {
  const code = generateCode();

  await sendVerificationCode({ email, code });

  return {
    email,
    name,
    verificationCode: code,
  };
};

module.exports = {
  generateCode,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  createUserSession,
  sendEmailVerification,
};
