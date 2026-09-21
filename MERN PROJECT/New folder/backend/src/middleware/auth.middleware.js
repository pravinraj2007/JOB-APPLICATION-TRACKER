const { supabase } = require('../config/supabase');
const { sendError } = require('../utils/apiResponse');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid or expired token.', 401);
    }

    req.user = data.user;
    next();
  } catch (error) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication failed.', 401);
  }
};

module.exports = { requireAuth };
