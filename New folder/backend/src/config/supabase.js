const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are not configured. Backend will run in mock mode.');
}

const supabase = createClient(
  env.SUPABASE_URL || 'https://placeholder.supabase.co',
  env.SUPABASE_ANON_KEY || 'placeholder-key'
);

const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL || 'https://placeholder.supabase.co', env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

module.exports = { supabase, supabaseAdmin };
