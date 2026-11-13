/* config.js - the only file you edit to connect a real database.

   DEMO MODE (default): leave supabaseUrl and supabaseAnonKey empty.
     Sample homes are created automatically and everything is saved in the visitor's own browser.
     Good for a preview. NOT for a live client site, because other visitors never see your changes.

   LIVE MODE: paste your Supabase project values below. See README.md, step by step.
     - supabaseUrl      Project settings > API > Project URL
     - supabaseAnonKey  Project settings > API > anon public key (safe to put here)
     NEVER paste the service_role key in this file.
*/
window.RE_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  bucket: 'property-media',   // the Storage bucket created by supabase/schema.sql
  embedMaps: true,            // shows the Google map inside the page
  sampleData: true            // demo mode only: create sample homes on first visit
};
