const dotenv = require('dotenv');

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  AI_API_KEY: process.env.AI_API_KEY || '',
};

module.exports = { env };
