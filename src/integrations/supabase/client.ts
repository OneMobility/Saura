import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ruwajqjusvzcjtahhvhb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1d2FqcWp1c3Z6Y2p0YWhodmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMzcxMTQsImV4cCI6MjA3NDYxMzExNH0.FZmRoTGRoAYCdmH0XWBj1stfrdWXkwmhJrG_JFdVaRE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);