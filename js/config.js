// ============================================================
//  FILL IN YOUR SUPABASE CREDENTIALS HERE
//  Find them in: Supabase Dashboard → Project Settings → API
// ============================================================
const SUPABASE_URL  = 'https://fzzfepdojaarnvsqthfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h4VwJaLkxTfglikd0BMQRw_EAdlJTtr';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
