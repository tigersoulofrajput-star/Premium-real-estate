# Aurelia Estates: premium real-estate website (3D hero + admin panel)

No build step, no npm. Plain HTML/CSS/JS. Works on Hostinger shared hosting.

## हिंदी में quick start
1. फोल्डर की सारी files `public_html` में upload करो (index.html + assets/).
2. साइट खोलो। Demo mode में सब कुछ browser में सेव होता है।
3. Admin: `yoursite.com/#admin`, demo passcode `admin123` (Site settings में बदलो)।
4. असली data (सब visitors को दिखे) के लिए नीचे Supabase सेटअप करो।

## Features
- Drag-able 3D villa hero (mouse/finger), auto-rotate
- Admin: add/edit/delete homes, BHK, rooms, price, description, phone, per-room photos (10-15+), home-tour video (upload or YouTube/Vimeo link), Google Maps location, full review, 3D view (photos around the house + 360 panorama)
- Leads (enquiry / site visit) with status and CSV export, editable contact number, WhatsApp, EMI calculator, JSON backup

## Go live with Supabase
1. Create a project at supabase.com.
2. SQL Editor: run `supabase/schema.sql`.
3. Authentication > Users > Add user (email + password). Then run the last line in schema.sql with your email.
4. Edit `assets/js/config.js`: set `supabaseUrl`, `supabaseAnonKey` (anon key only, never service_role), `sampleData:false`.
5. Upload to Hostinger `public_html`. Sign in at `/#admin` with the email + password.
Note: Supabase Free allows 50 MB per file; compress tour videos.

## Shooting guide
- Photos: 10-15 per room, landscape, daylight, 1800px is plenty (auto-compressed).
- 3D view: walk a circle around the house, 24-36 photos at equal steps, same height. Optional 360 panorama (2:1).
