/* admin.js - the admin panel: properties (folders), rooms and photos, video tour, 3D view,
   map location, leads and site settings. */
(function () {
  'use strict';
  const RE = window.RE, h = RE.h, I = RE.icon;
  const S = () => RE.store;
  RE.cleanups = RE.cleanups || [];
  const A = { view: 'props', draft: null, isNew: false, tab: 'basics', dirty: false, root: null, viewers: [], leadFilter: 'all', confirmBack: false };
  const key = (r) => (r ? (r.k === 'sb' ? 'sb:' : 'idb:') + r.id : '');
  const num = (n) => new Intl.NumberFormat('en-IN').format(Math.round(+n || 0));

  const rerender = () => { if (A.root) { killViewers(); RE.clear(A.root); RE.admin.render(A.root); } };
  function killViewers() { A.viewers.forEach((v) => { try { v.destroy(); } catch (e) { /* ignore */ } }); A.viewers = []; }

  RE.admin = {};
  RE.admin.reset = () => { A.view = 'props'; A.draft = null; A.dirty = false; };

  /* ---------- small form helpers ---------- */
  function fld(label, input, hint, cls) {
    if (!input.id) input.id = RE.uid('f');
    return h('div', { class: 'field ' + (cls || '') }, h('label', { for: input.id }, label), input, hint ? h('p', { class: 'hint' }, hint) : null);
  }
  function touch() { A.dirty = true; }
  function text(label, obj, k, o) {
    o = o || {};
    const inp = h(o.rows ? 'textarea' : 'input', { type: o.rows ? null : o.type || 'text', rows: o.rows || null, placeholder: o.ph || null, maxlength: o.max || null, min: o.type === 'number' ? '0' : null, step: o.step || null, autocomplete: 'off' });
    inp.value = obj[k] == null ? '' : obj[k];
    inp.addEventListener('input', () => { obj[k] = o.type === 'number' ? (inp.value === '' ? 0 : +inp.value) : inp.value; touch(); if (o.on) o.on(inp.value); });
    return fld(label, inp, o.hint, o.cls);
  }
  function select(label, obj, k, opts, hint) {
    const sel = h('select', null, opts.map((o) => h('option', { value: o[0] }, o[1])));
    sel.value = obj[k] == null ? '' : obj[k];
    sel.addEventListener('change', () => { obj[k] = sel.value; touch(); });
    return fld(label, sel, hint);
  }
  const btn = (label, cls, fn, icon) => h('button', { class: 'btn ' + (cls || ''), type: 'button', onclick: fn }, icon ? I(icon, 16) : null, label);
  function confirmBtn(label, onYes, cls) {
    const box = h('span', { class: 'confirm-slot' });
    const normal = () => { RE.clear(box).append(h('button', { class: 'btn danger-ghost sm', type: 'button', onclick: ask }, I('trash', 15), label)); };
    const ask = () => { RE.clear(box).append(h('span', { class: 'confirm' }, h('span', null, 'Are you sure?'), h('button', { class: 'btn danger sm', type: 'button', onclick: onYes }, 'Yes, ' + label.toLowerCase()), h('button', { class: 'btn ghost sm', type: 'button', onclick: normal }, 'Keep'))); };
    normal(); return box;
  }
  function busy(el, on, msg) { if (!el) return; el.classList.toggle('is-busy', !!on); if (msg !== undefined) el.dataset.msg = msg; }

  /* ---------- LOGIN ---------- */
  function renderLogin(root) {
    const s = S().getSettings(), supa = S().auth.fields === 'email';
    const err = h('p', { class: 'err big', role: 'alert' });
    const email = supa ? h('input', { id: 'ad-email', type: 'email', autocomplete: 'username', placeholder: 'admin@yourdomain.com' }) : null;
    const pass = h('input', { id: 'ad-pass', type: 'password', autocomplete: supa ? 'current-password' : 'off', placeholder: supa ? 'Password' : 'Passcode' });
    const go = h('button', { class: 'btn primary block', type: 'submit' }, 'Sign in');
    const form = h('form', { class: 'login-form', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = ''; go.disabled = true; go.textContent = 'Signing in...';
      try { await (supa ? S().auth.login(email.value.trim(), pass.value) : S().auth.login(pass.value)); rerender(); }
      catch (x) { err.textContent = x.message; go.disabled = false; go.textContent = 'Sign in'; pass.focus(); }
    } }, supa ? fld('Email', email) : null, fld(supa ? 'Password' : 'Passcode', pass), err, go);
    root.append(h('main', { class: 'login' }, h('div', { class: 'login-card' },
      h('a', { class: 'back', href: '#home' }, I('arrowL', 16), 'Back to site'),
      h('h1', null, 'Admin sign in'), h('p', { class: 'sub' }, s.brand),
      form,
      supa ? h('p', { class: 'hint' }, 'Sign in with the admin account you created in Supabase.')
        : h('div', { class: 'note' }, I('key', 16), h('div', null, h('strong', null, 'Demo mode. '), 'The passcode is ', h('code', null, 'admin123'), '. Change it in Site settings. Everything you save stays in this browser only. See the README to connect Supabase before going live.')))));
    setTimeout(() => (email || pass).focus(), 0);
  }

  /* ---------- SHELL ---------- */
  RE.admin.render = async function (root) {
    A.root = root;
    RE.cleanups.push(killViewers);
    const st = S(), s = st.getSettings();
    document.title = 'Admin | ' + s.brand;
    if (!st.auth.isAdmin()) return renderLogin(root);
    try { await st.loadLeads(); } catch (e) { /* leads may be unavailable */ }
    await st.prime(st.props.map((p) => RE.coverOf(p)).concat(A.draft ? RE.refsOf(A.draft) : []));
    const newLeads = st.leads.filter((l) => l.status === 'new').length;
    const nav = (id, label, icon, badge) => h('button', { class: 'adm-link', type: 'button', 'aria-current': String(A.view === id && !A.draft), onclick: () => { if (A.draft && A.dirty) { A.confirmBack = true; rerender(); return; } A.draft = null; A.dirty = false; A.view = id; rerender(); } }, I(icon, 18), label, badge ? h('span', { class: 'badge' }, badge) : null);
    let body;
    if (A.draft) body = editor();
    else if (A.view === 'leads') body = leadsView();
    else if (A.view === 'settings') body = settingsView();
    else if (A.view === 'help') body = helpView();
    else body = propsView();
    root.append(h('div', { class: 'admin' },
      h('header', { class: 'adm-top' }, h('div', { class: 'adm-top-in' },
        h('div', { class: 'adm-title' }, h('strong', null, s.brand), h('span', null, 'Admin'), h('span', { class: 'mode ' + st.mode }, st.mode === 'supabase' ? 'Connected to Supabase' : 'Demo mode: saved in this browser')),
        h('div', { class: 'adm-actions' }, h('a', { class: 'btn ghost sm', href: '#home' }, I('eye', 16), 'View site'), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { st.auth.logout(); A.draft = null; A.dirty = false; rerender(); } }, I('logout', 16), 'Sign out')))),
      h('div', { class: 'adm-body' },
        h('nav', { class: 'adm-nav', 'aria-label': 'Admin sections' }, nav('props', 'Properties', 'home'), nav('leads', 'Leads', 'users', newLeads || ''), nav('settings', 'Site settings', 'cog'), nav('help', 'Backup and help', 'doc')),
        h('main', { class: 'adm-main' }, body))));
  };

  /* ---------- PROPERTIES LIST ---------- */
  function propsView() {
    const st = S();
    const rows = st.props.map((p) => {
      const cover = st.url(RE.coverOf(p));
      const del = confirmBtn('Delete', async () => { try { await st.deleteProp(p.id); RE.toast('"' + p.title + '" deleted'); rerender(); } catch (e) { RE.toast('Could not delete. ' + e.message, 'error'); } });
      return h('li', { class: 'prow' },
        h('div', { class: 'prow-img' }, cover ? h('img', { src: cover, alt: '' }) : I('image', 24)),
        h('div', { class: 'prow-main' }, h('div', { class: 'prow-title' }, p.title || 'Untitled', p.featured ? h('span', { class: 'feat-mini' }, I('star', 12), 'Featured') : null),
          h('div', { class: 'prow-sub' }, [p.locality, p.city].filter(Boolean).join(', ') || 'No location yet'),
          h('div', { class: 'prow-meta' }, h('span', { class: 'pill inline ' + p.status }, RE.statusText(p.status)), h('span', null, p.status === 'sold' ? 'Sold' : RE.priceText(p)), h('span', null, RE.photoCount(p) + ' photos'), (p.rooms || []).length ? h('span', null, p.rooms.length + ' rooms') : null, p.video && (p.video.ref || p.video.url) ? h('span', null, 'Video') : null, (p.spin || []).length ? h('span', null, '3D') : null, p.pano ? h('span', null, '360') : null)),
        h('div', { class: 'prow-actions' }, btn('Edit', 'sm', () => startEdit(p.id), 'edit'), h('a', { class: 'btn ghost sm', href: '#p-' + p.id }, I('eye', 15), 'View'), del));
    });
    return h('div', null,
      h('div', { class: 'adm-head' }, h('div', null, h('h1', null, 'Properties'), h('p', { class: 'sub' }, st.props.length + (st.props.length === 1 ? ' home folder' : ' home folders') + '. Each one holds its details, room photos, video, 3D view and map.')), btn('New property', 'primary', () => startEdit(null), 'plus')),
      rows.length ? h('ul', { class: 'plist' }, rows) : h('div', { class: 'empty light' }, I('home', 30), h('h3', null, 'No properties yet'), h('p', null, 'Add your first home. You can fill it in step by step and save at any time.'), btn('New property', 'primary', () => startEdit(null), 'plus')));
  }
  function startEdit(id) {
    A.draft = id ? RE.clone(S().getProp(id)) : RE.blankProperty();
    if (A.draft.video === undefined) A.draft.video = { kind: '', url: '', ref: null };
    A.isNew = !id; A.tab = 'basics'; A.dirty = false; A.confirmBack = false;
    rerender(); window.scrollTo(0, 0);
  }

  /* ---------- EDITOR ---------- */
  const TABS = [['basics', 'Details', 'home'], ['location', 'Location', 'pin'], ['story', 'Story and review', 'doc'], ['rooms', 'Rooms and photos', 'image'], ['video', 'Home tour video', 'play'], ['tour', '3D view', 'cube']];
  function editor() {
    const d = A.draft;
    const body = h('div', { class: 'ed-body' });
    const tabBar = h('div', { class: 'ed-tabs', role: 'tablist' }, TABS.map((t) => {
      let n = '';
      if (t[0] === 'rooms') n = RE.photoCount(d); else if (t[0] === 'video') n = d.video && (d.video.ref || d.video.url) ? '1' : ''; else if (t[0] === 'tour') n = (d.spin || []).length + (d.pano ? 1 : 0) || '';
      return h('button', { class: 'ed-tab', role: 'tab', type: 'button', 'aria-selected': String(A.tab === t[0]), onclick: () => { A.tab = t[0]; killViewers(); RE.$$('.ed-tab').forEach((b, i) => b.setAttribute('aria-selected', String(TABS[i][0] === A.tab))); paint(); } }, I(t[2], 17), t[1], n !== '' ? h('span', { class: 'tab-n' }, n) : null);
    }));
    function paint() {
      RE.clear(body);
      ({ basics: tabBasics, location: tabLocation, story: tabStory, rooms: tabRooms, video: tabVideo, tour: tabTour })[A.tab](body);
    }
    const saveBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => save(saveBtn) }, I('check', 16), A.isNew ? 'Save new property' : 'Save changes');
    const backBar = A.confirmBack ? h('div', { class: 'warn-bar', role: 'alert' }, h('span', null, 'You have unsaved changes.'), btn('Save and leave', 'primary sm', async () => { if (await save(null)) { A.draft = null; A.confirmBack = false; rerender(); } }), btn('Discard changes', 'danger sm', () => leave(true)), btn('Keep editing', 'ghost sm', () => { A.confirmBack = false; rerender(); })) : null;
    const del = !A.isNew ? confirmBtn('Delete property', async () => { try { const id = d.id; A.draft = null; A.dirty = false; await S().deleteProp(id); RE.toast('Property deleted'); rerender(); } catch (e) { RE.toast('Could not delete. ' + e.message, 'error'); } }) : null;
    paint();
    return h('div', { class: 'editor' },
      backBar,
      h('div', { class: 'ed-head' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { if (A.dirty) { A.confirmBack = true; rerender(); } else leave(false); } }, I('arrowL', 16), 'All properties'),
        h('div', null, h('h1', null, d.title || (A.isNew ? 'New property' : 'Untitled')), h('p', { class: 'sub' }, A.isNew ? 'Not saved yet' : 'Editing. Changes apply to the live site when you save.'))),
      tabBar, body,
      h('div', { class: 'savebar' }, h('div', { class: 'savebar-in' }, saveBtn, !A.isNew ? h('a', { class: 'btn ghost', href: '#p-' + d.id }, I('eye', 16), 'View on site') : null, btn('Close', 'ghost', () => { if (A.dirty) { A.confirmBack = true; rerender(); } else leave(false); }), h('span', { class: 'grow' }), del)));
  }
  function leave(discard) {
    if (discard && A.draft) {
      const saved = new Set(RE.refsOf(S().getProp(A.draft.id)).map(key));
      const orphan = RE.refsOf(A.draft).filter((r) => !saved.has(key(r)));
      S().deleteMedia(orphan).catch(() => {});
    }
    A.draft = null; A.dirty = false; A.confirmBack = false; rerender();
  }
  async function save(btnEl) {
    const d = A.draft;
    if (!String(d.title || '').trim()) { RE.toast('Give the property a title first (Details tab).', 'error'); A.tab = 'basics'; rerender(); return false; }
    if (btnEl) { btnEl.disabled = true; btnEl.lastChild.textContent = 'Saving...'; }
    try {
      ['price', 'bhk', 'bedrooms', 'bathrooms', 'area', 'floors', 'parking'].forEach((k) => (d[k] = Math.max(0, +d[k] || 0)));
      const m = RE.parseMap(d.map && d.map.input); d.map = { input: (d.map && d.map.input) || '', lat: m.lat, lng: m.lng, embed: m.embed };
      d.title = d.title.trim();
      if (d.cover && !RE.refsOf(d).some((r) => key(r) === key(d.cover) && r !== d.cover) && !(d.rooms || []).some((r) => (r.photos || []).some((p) => key(p) === key(d.cover)))) d.cover = null;
      await S().saveProp(d);
      A.isNew = false; A.dirty = false; A.confirmBack = false;
      RE.toast('Saved. The live site is updated.');
      if (btnEl) { btnEl.disabled = false; btnEl.lastChild.textContent = 'Save changes'; const hd = RE.$('.ed-head h1'); if (hd) hd.textContent = d.title; }
      return true;
    } catch (e) {
      RE.toast('Could not save. ' + e.message, 'error');
      if (btnEl) { btnEl.disabled = false; btnEl.lastChild.textContent = A.isNew ? 'Save new property' : 'Save changes'; }
      return false;
    }
  }

  /* ----- tab: details ----- */
  function tabBasics(body) {
    const d = A.draft;
    const pricePrev = h('span', { class: 'price-prev' });
    const upd = () => { pricePrev.textContent = d.price ? RE.inrShort(d.price) + (d.status === 'rent' ? ' per month' : '') + '  (' + RE.inr(d.price) + ')' : ''; };
    const types = ['Apartment', 'Villa', 'Penthouse', 'Independent house', 'Plot', 'Commercial'];
    if (d.type && types.indexOf(d.type) < 0) types.push(d.type);
    const statusSel = select('Status', d, 'status', [['sale', 'For sale'], ['rent', 'For rent'], ['sold', 'Sold']]);
    statusSel.querySelector('select').addEventListener('change', upd);
    const priceField = text('Price in rupees', d, 'price', { type: 'number', step: '1000', on: upd, hint: 'Type the full number, for example 8500000 for 85 lakh. For rent, the monthly rent.' });
    priceField.appendChild(pricePrev); upd();
    const feat = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!d.featured, onchange: (e) => { d.featured = e.target.checked; touch(); } }), h('span', null, 'Show as featured (listed first, with a badge)'));
    body.append(h('section', { class: 'card-sec' }, h('h2', null, 'Basic details'),
      h('div', { class: 'form-grid' }, text('Title', d, 'title', { ph: 'For example, Aurelia Villa', max: 90, cls: 'span2', on: (v) => { const hd = RE.$('.ed-head h1'); if (hd) hd.textContent = v || (A.isNew ? 'New property' : 'Untitled'); } }),
        text('One-line summary', d, 'tagline', { ph: 'Pool-facing 5 BHK villa near the beach', max: 140, cls: 'span2' }),
        statusSel, select('Type', d, 'type', types.map((t) => [t, t])), priceField, text('Price note (optional)', d, 'priceNote', { ph: 'Negotiable, furnished, 11 month lease', max: 80 }),
        h('div', { class: 'field span2' }, feat))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Size and layout'),
        h('div', { class: 'form-grid g4' }, text('BHK', d, 'bhk', { type: 'number' }), text('Bedrooms', d, 'bedrooms', { type: 'number' }), text('Bathrooms', d, 'bathrooms', { type: 'number' }), text('Area (sq ft)', d, 'area', { type: 'number' }),
          text('Floors', d, 'floors', { type: 'number' }), text('Parking spaces', d, 'parking', { type: 'number' }), text('Facing', d, 'facing', { ph: 'East, sea view' }), text('Age or possession', d, 'year', { ph: 'Ready to move, Dec 2026' }))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Contact for this home'),
        h('div', { class: 'form-grid' }, text('Phone number for this home (optional)', d, 'agentPhone', { ph: S().getSettings().phone, hint: 'Leave empty to show the main number from Site settings.' }))));
  }

  /* ----- tab: location ----- */
  function tabLocation(body) {
    const d = A.draft; d.map = d.map || { input: '', lat: null, lng: null, embed: '' };
    const status = h('p', { class: 'map-status', 'aria-live': 'polite' });
    const prevHost = h('div', { class: 'map-prev' });
    const showPrev = () => {
      RE.clear(prevHost);
      const tmp = Object.assign({}, d, { map: Object.assign({}, d.map, RE.parseMap(d.map.input)) });
      const src = RE.mapEmbedSrc(tmp);
      if (RE.cfg.embedMaps && src) prevHost.appendChild(h('iframe', { class: 'map-frame', src, title: 'Map preview', loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' }));
      else prevHost.appendChild(h('div', { class: 'map-card' }, h('div', { class: 'map-pin' }, I('pin', 30)), h('strong', null, 'Map preview appears on your live site'), h('span', null, 'Use the button below to check the place in Google Maps.')));
    };
    const linkOut = h('a', { class: 'btn', target: '_blank', rel: 'noopener noreferrer' }, I('map', 16), 'Check in Google Maps');
    const refresh = () => {
      const m = RE.parseMap(d.map.input), has = !!String(d.map.input || '').trim();
      status.className = 'map-status ' + (m.lat != null || m.embed ? 'ok' : has ? 'warn' : '');
      status.textContent = m.lat != null ? 'Location found: ' + m.lat.toFixed(5) + ', ' + m.lng.toFixed(5) : m.embed ? 'Embed link accepted.' : has ? 'Could not read a location from this. Paste coordinates like 18.7156, 72.8785, or the Embed HTML from Google Maps.' : 'Nothing pasted. The site will place the map using the address above.';
      linkOut.href = RE.mapLink(Object.assign({}, d, { map: Object.assign({}, d.map, m) }));
    };
    const input = h('textarea', { id: 'map-in', rows: '3', placeholder: '18.7156, 72.8785   or   https://www.google.com/maps/place/.../@18.7156,72.8785,17z   or   <iframe src="https://www.google.com/maps/embed?..."></iframe>' });
    input.value = d.map.input || '';
    input.addEventListener('input', () => { d.map.input = input.value; touch(); refresh(); });
    body.append(h('section', { class: 'card-sec' }, h('h2', null, 'Address'),
      h('div', { class: 'form-grid' }, text('City', d, 'city', { ph: 'Alibaug' }), text('Locality or area', d, 'locality', { ph: 'Kihim Beach' }), text('Full address', d, 'address', { rows: 2, cls: 'span2', ph: 'Plot 14, Kihim Beach Road, Alibaug, Maharashtra 402201' }))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Google Maps location'),
        h('p', { class: 'sub' }, 'Paste a place link, coordinates or the embed code. Visitors see this map on the property page.'),
        fld('Google Maps link, coordinates or embed code', input), status,
        h('details', { class: 'how' }, h('summary', null, 'How to get it from Google Maps'),
          h('ol', null, h('li', null, 'Open Google Maps and find the property.'), h('li', null, 'Easiest: right-click the pin and click the numbers at the top of the menu (the coordinates). They are copied. Paste them here.'), h('li', null, 'Or: click Share, then Embed a map, then Copy HTML, and paste that here.'), h('li', null, 'Short links such as maps.app.goo.gl cannot be read. Use one of the two options above.'))),
        h('div', { class: 'map-actions' }, btn('Show map preview', '', showPrev, 'eye'), linkOut), prevHost));
    refresh();
  }

  /* ----- tab: story ----- */
  function tabStory(body) {
    const d = A.draft; d.amenities = d.amenities || [];
    const chips = h('div', { class: 'chips edit' });
    const inp = h('input', { id: 'amen-in', type: 'text', placeholder: 'Type an amenity and press Enter', maxlength: '40' });
    const SUG = ['Private pool', 'Lift', 'Gym', 'Garden', 'Clubhouse', 'Power backup', '24x7 security', 'Terrace', 'Smart home', 'Solar panels', 'Modular kitchen', 'Vastu compliant', 'Gated community', 'Covered parking', 'Home theatre', 'Furnished'];
    const draw = () => {
      RE.clear(chips);
      d.amenities.forEach((a, i) => chips.appendChild(h('span', { class: 'chip on' }, a, h('button', { type: 'button', 'aria-label': 'Remove ' + a, onclick: () => { d.amenities.splice(i, 1); touch(); draw(); } }, I('close', 12)))));
      RE.clear(sug); SUG.filter((s) => d.amenities.indexOf(s) < 0).forEach((s) => sug.appendChild(h('button', { class: 'chip', type: 'button', onclick: () => { d.amenities.push(s); touch(); draw(); } }, '+ ' + s)));
    };
    const sug = h('div', { class: 'chips sug' });
    const add = () => { const v = inp.value.replace(/,/g, '').trim(); if (v && d.amenities.indexOf(v) < 0) { d.amenities.push(v); touch(); draw(); } inp.value = ''; };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } });
    body.append(h('section', { class: 'card-sec' }, h('h2', null, 'Description'), text('About this home', d, 'description', { rows: 5, max: 2000, hint: 'Two or three sentences that sell the home. Press Enter twice to start a new paragraph.' })),
      h('section', { class: 'card-sec' }, h('h2', null, 'Full review'), text('Your review of this home', d, 'review', { rows: 10, max: 6000, hint: 'What stands out, what to know, and who it suits. Shown in the Review folder. Leave a blank line between paragraphs.' })),
      h('section', { class: 'card-sec' }, h('h2', null, 'Amenities'), fld('Add amenity', inp), chips, h('p', { class: 'hint' }, 'Quick add'), sug, btn('Add', 'sm', add, 'plus')));
    draw();
  }

  /* ----- uploads ----- */
  async function uploadImages(files, folder, opt, status) {
    opt = opt || {};
    const list = Array.from(files).filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
    const skipped = files.length - list.length;
    if (skipped) RE.toast(skipped + ' file' + (skipped > 1 ? 's were' : ' was') + ' skipped. Use JPG, PNG or WebP photos.', 'error');
    if (opt.sort) list.sort((a, b) => RE.natCompare(a.name, b.name));
    const refs = []; let i = 0;
    for (const f of list) {
      if (status) status.textContent = 'Uploading ' + (i + 1) + ' of ' + list.length + '...';
      try {
        const c = await RE.compressImage(f, opt.max || 1800, opt.q || 0.82);
        refs.push(await S().putMedia(c.blob, { name: f.name.replace(/\.[^.]+$/, '') + '.jpg', folder }));
      } catch (e) { RE.toast(e.message, 'error'); }
      i++;
    }
    if (status) status.textContent = '';
    return refs;
  }
  function dropzone(label, onFiles, multiple, accept) {
    const input = h('input', { type: 'file', accept: accept || 'image/*', multiple: !!multiple, class: 'file-in', 'aria-label': label });
    input.addEventListener('change', () => { if (input.files.length) onFiles(Array.from(input.files)); input.value = ''; });
    const status = h('span', { class: 'dz-status', 'aria-live': 'polite' });
    const z = h('div', { class: 'dz', tabindex: '0', role: 'button', 'aria-label': label, onclick: () => input.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, I('upload', 22), h('span', { class: 'dz-t' }, label), h('span', { class: 'dz-s' }, 'Click to choose, or drop files here'), status, input);
    z.addEventListener('click', (e) => { if (e.target === input) e.stopPropagation(); });
    ['dragenter', 'dragover'].forEach((ev) => z.addEventListener(ev, (e) => { e.preventDefault(); z.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => z.addEventListener(ev, (e) => { e.preventDefault(); z.classList.remove('over'); }));
    z.addEventListener('drop', (e) => { const fs = Array.from(e.dataTransfer.files || []); if (fs.length) onFiles(multiple ? fs : fs.slice(0, 1)); });
    z.status = status;
    return z;
  }
  function dropIfUnsaved(ref) {
    if (!ref) return;
    const saved = new Set(RE.refsOf(S().getProp(A.draft.id)).map(key));
    const stillUsed = RE.refsOf(A.draft).some((r) => key(r) === key(ref));
    if (!saved.has(key(ref)) && !stillUsed) S().deleteMedia([ref]).catch(() => {});
  }

  /* ----- tab: rooms and photos ----- */
  function tabRooms(body) {
    const d = A.draft; d.rooms = d.rooms || [];
    const host = h('div', { class: 'rooms' });
    const PRESETS = ['Exterior', 'Living room', 'Master bedroom', 'Bedroom 2', 'Bedroom 3', 'Kitchen', 'Dining area', 'Bathroom', 'Balcony', 'Terrace', 'Garden', 'Pool', 'Study', 'Parking'];
    const addRoom = (name) => { d.rooms.push({ id: RE.uid('room'), name: name || 'New room', photos: [] }); touch(); draw(); };
    const custom = h('input', { id: 'room-new', type: 'text', placeholder: 'Or type a room name', maxlength: '40' });
    custom.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (custom.value.trim()) { addRoom(custom.value.trim()); custom.value = ''; } } });
    function roomCard(room, ri) {
      const n = room.photos.length;
      const nameIn = h('input', { type: 'text', value: room.name, maxlength: '40', 'aria-label': 'Room name' });
      nameIn.addEventListener('input', () => { room.name = nameIn.value; touch(); });
      const dz = dropzone('Add photos to ' + (room.name || 'this room'), async (files) => {
        const refs = await uploadImages(files, d.id + '/' + RE.slug(room.name), {}, dz.status);
        if (refs.length) { room.photos.push(...refs); if (!d.cover) d.cover = refs[0]; touch(); draw(); RE.toast(refs.length + ' photo' + (refs.length > 1 ? 's' : '') + ' added to ' + room.name); }
      }, true);
      const grid = h('div', { class: 'thumbs' }, room.photos.map((ph, pi) => {
        const isCover = d.cover && key(d.cover) === key(ph);
        const act = (label, icon, fn, dis) => h('button', { type: 'button', class: 'th-btn', 'aria-label': label, title: label, disabled: !!dis, onclick: fn }, I(icon, 14));
        return h('div', { class: 'thumb' + (isCover ? ' is-cover' : '') }, h('img', { src: S().url(ph), alt: room.name + ' photo ' + (pi + 1), loading: 'lazy' }), isCover ? h('span', { class: 'cover-tag' }, 'Cover') : null,
          h('div', { class: 'th-actions' },
            act('Move earlier', 'chevL', () => { if (pi > 0) { [room.photos[pi - 1], room.photos[pi]] = [room.photos[pi], room.photos[pi - 1]]; touch(); draw(); } }, pi === 0),
            act('Move later', 'chevR', () => { if (pi < room.photos.length - 1) { [room.photos[pi + 1], room.photos[pi]] = [room.photos[pi], room.photos[pi + 1]]; touch(); draw(); } }, pi === room.photos.length - 1),
            act('Use as cover photo', 'star', () => { d.cover = ph; touch(); draw(); }),
            act('Remove photo', 'close', () => { room.photos.splice(pi, 1); if (d.cover && key(d.cover) === key(ph)) d.cover = null; dropIfUnsaved(ph); touch(); draw(); })));
      }));
      const del = confirmBtn('Delete room', () => { const gone = room.photos.slice(); if (d.cover && gone.some((x) => key(x) === key(d.cover))) d.cover = null; d.rooms.splice(ri, 1); gone.forEach(dropIfUnsaved); touch(); draw(); });
      return h('section', { class: 'room card-sec' },
        h('div', { class: 'room-head' }, h('div', { class: 'room-name' }, I('image', 18), nameIn), h('span', { class: 'count-pill ' + (n >= 10 ? 'ok' : n ? 'mid' : '') }, n + ' photo' + (n === 1 ? '' : 's') + (n < 10 ? ', aim for 10 to 15' : '')), del),
        dz, n ? grid : h('p', { class: 'hint' }, 'No photos yet. Show each corner of the room, plus the windows, ceiling and storage.'));
    }
    function draw() {
      RE.clear(host);
      if (!d.rooms.length) host.appendChild(h('div', { class: 'empty light' }, I('image', 28), h('h3', null, 'No rooms yet'), h('p', null, 'Add a folder for each room, then upload its photos. Visitors can filter the gallery by room.')));
      d.rooms.forEach((r, i) => host.appendChild(roomCard(r, i)));
      const tab = RE.$('.ed-tab[aria-selected="true"] .tab-n'); if (tab) tab.textContent = RE.photoCount(d);
    }
    body.append(h('section', { class: 'card-sec' }, h('h2', null, 'Add a room folder'), h('p', { class: 'sub' }, 'Photos are resized automatically (long side 1800 px) so pages stay fast.'),
      h('div', { class: 'chips sug' }, PRESETS.map((p) => h('button', { class: 'chip', type: 'button', onclick: () => addRoom(p) }, '+ ' + p))), h('div', { class: 'inline-add' }, fld('Custom room', custom), btn('Add room', 'sm', () => { if (custom.value.trim()) { addRoom(custom.value.trim()); custom.value = ''; } }, 'plus'))), host);
    draw();
  }

  /* ----- tab: home tour video ----- */
  function tabVideo(body) {
    const d = A.draft; d.video = d.video || { kind: '', url: '', ref: null };
    const prev = h('div', { class: 'video-prev' });
    const urlIn = h('input', { id: 'vid-url', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...' });
    urlIn.value = d.video.kind === 'url' ? d.video.url : '';
    const urlMsg = h('p', { class: 'hint' });
    function paint() {
      RE.clear(prev); const v = d.video;
      if (v.kind === 'file' && v.ref) {
        prev.append(h('video', { controls: true, playsinline: true, preload: 'metadata', src: S().url(v.ref) }), h('div', { class: 'video-meta' }, I('play', 16), v.ref.n || 'Uploaded video', btn('Remove video', 'danger-ghost sm', () => { const old = v.ref; d.video = { kind: '', url: '', ref: null }; dropIfUnsaved(old); touch(); paint(); const t = RE.$('.ed-tab[aria-selected="true"] .tab-n'); if (t) t.remove(); }, 'trash')));
      } else if (v.kind === 'url' && v.url) {
        const e = RE.videoEmbed(v.url);
        if (e && e.kind === 'iframe') prev.append(h('div', { class: 'video-box' }, h('iframe', { src: e.src, title: 'Video preview', loading: 'lazy', allowfullscreen: true })));
        else if (e) prev.append(h('div', { class: 'video-box' }, h('video', { controls: true, src: e.src })));
        prev.append(h('div', { class: 'video-meta' }, I('play', 16), v.url, btn('Remove link', 'danger-ghost sm', () => { d.video = { kind: '', url: '', ref: null }; urlIn.value = ''; touch(); paint(); }, 'trash')));
      } else prev.append(h('p', { class: 'hint' }, 'No video yet. Visitors see this in the Home tour folder.'));
    }
    urlIn.addEventListener('input', () => {
      const v = urlIn.value.trim();
      if (!v) { if (d.video.kind === 'url') { d.video = { kind: '', url: '', ref: null }; touch(); paint(); } urlMsg.textContent = ''; return; }
      if (!RE.videoEmbed(v)) { urlMsg.textContent = 'Paste a full link that starts with https://'; return; }
      urlMsg.textContent = 'Link accepted.';
      const old = d.video.kind === 'file' ? d.video.ref : null; d.video = { kind: 'url', url: v, ref: null }; if (old) dropIfUnsaved(old); touch(); paint();
    });
    const dz = dropzone('Upload a home tour video', async (files) => {
      const f = files[0];
      if (!/^video\//.test(f.type) && !/\.(mp4|mov|webm|m4v)$/i.test(f.name)) { RE.toast('Choose a video file (MP4, MOV or WebM).', 'error'); return; }
      if (S().mode === 'supabase' && f.size > 50 * 1024 * 1024) RE.toast('This video is over 50 MB. Supabase Free allows 50 MB per file. Compress it or paste a YouTube link.', 'error');
      dz.status.textContent = 'Uploading ' + (f.size / 1048576).toFixed(1) + ' MB...';
      try {
        const blob = f.type ? f : new Blob([f], { type: 'video/mp4' });
        const ref = await S().putMedia(blob, { name: f.name, folder: d.id + '/video' });
        const old = d.video.kind === 'file' ? d.video.ref : null; d.video = { kind: 'file', url: '', ref }; if (old) dropIfUnsaved(old);
        urlIn.value = ''; touch(); paint(); RE.toast('Video uploaded');
      } catch (e) { RE.toast('Upload failed. ' + e.message, 'error'); }
      dz.status.textContent = '';
    }, false, 'video/*');
    body.append(h('section', { class: 'card-sec' }, h('h2', null, 'Home tour video'), h('p', { class: 'sub' }, 'One walkthrough video for this home. Upload a file, or paste a YouTube or Vimeo link (better for long videos, and free of storage limits).'),
      dz, h('div', { class: 'or' }, h('span', null, 'or')), fld('Video link', urlIn), urlMsg, prev));
    paint();
  }

  /* ----- tab: 3D view ----- */
  function tabTour(body) {
    const d = A.draft; d.spin = d.spin || [];
    const prevHost = h('div', { class: 'viewer-host small' });
    const strip = h('div', { class: 'thumbs small' });
    const msg = h('p', { class: 'hint' });
    const panoHost = h('div', { class: 'viewer-host small' });
    function drawSpin() {
      RE.clear(strip); RE.clear(prevHost); killViewers();
      d.spin.forEach((ph, i) => strip.appendChild(h('div', { class: 'thumb' }, h('img', { src: S().url(ph), alt: 'Frame ' + (i + 1) }), h('span', { class: 'frame-n' }, i + 1), h('div', { class: 'th-actions' }, h('button', { type: 'button', class: 'th-btn', 'aria-label': 'Remove frame ' + (i + 1), onclick: () => { d.spin.splice(i, 1); dropIfUnsaved(ph); touch(); drawSpin(); } }, I('close', 14))))));
      const n = d.spin.length;
      msg.textContent = !n ? 'No walk-around photos yet.' : n < 12 ? n + ' photos. With fewer than 12 the turn looks jumpy. 24 or 36 is best.' : n + ' photos. Drag the preview to check the turn.';
      if (n >= 2) A.viewers.push(RE.SpinViewer(prevHost, d.spin.map((r) => S().url(r)), {}));
      const t = RE.$('.ed-tab[aria-selected="true"] .tab-n'); if (t) t.textContent = d.spin.length + (d.pano ? 1 : 0);
    }
    function drawPano() {
      RE.clear(panoHost); const old = A.viewers.filter((v) => v.pano); old.forEach((v) => { v.destroy(); A.viewers.splice(A.viewers.indexOf(v), 1); });
      if (d.pano) { const v = RE.PanoViewer(panoHost, S().url(d.pano), {}); v.pano = true; A.viewers.push(v); }
      panoRemove.hidden = !d.pano;
    }
    const spinDz = dropzone('Add walk-around photos', async (files) => {
      const refs = await uploadImages(files, d.id + '/3d', { sort: true, max: 1600, q: 0.8 }, spinDz.status);
      if (refs.length) { d.spin.push(...refs); touch(); drawSpin(); RE.toast(refs.length + ' photos added, sorted by file name'); }
    }, true);
    const panoDz = dropzone('Upload a 360 photo', async (files) => {
      const refs = await uploadImages(files.slice(0, 1), d.id + '/360', { max: 4096, q: 0.85 }, panoDz.status);
      if (refs.length) { const old = d.pano; d.pano = refs[0]; if (old) dropIfUnsaved(old); touch(); drawPano(); const t = RE.$('.ed-tab[aria-selected="true"] .tab-n'); if (t) t.textContent = d.spin.length + 1; RE.toast('360 photo added'); }
    }, false);
    const panoRemove = btn('Remove 360 photo', 'danger-ghost sm', () => { const old = d.pano; d.pano = null; dropIfUnsaved(old); touch(); drawPano(); }, 'trash');
    const clearAll = confirmBtn('Remove all walk-around photos', () => { const old = d.spin.slice(); d.spin = []; old.forEach(dropIfUnsaved); touch(); drawSpin(); });
    body.append(h('section', { class: 'card-sec' }, h('h2', null, 'Walk-around 3D view'),
      h('p', { class: 'sub' }, 'Visitors drag to turn the house, like holding a model. It is built from photos taken in a circle around the outside.'),
      h('ol', { class: 'steps' }, h('li', null, 'Stand about 8 to 10 steps from the house, phone held sideways at chest height.'), h('li', null, 'Walk in a circle, taking a photo every 10 to 15 degrees. 24 photos is good, 36 is smoother.'), h('li', null, 'Keep the height, zoom and distance the same. Upload all of them at once. They are ordered by file name.')),
      spinDz, msg, prevHost, strip, d.spin.length ? clearAll : null),
      h('section', { class: 'card-sec' }, h('h2', null, '360 view of a room or terrace'), h('p', { class: 'sub' }, 'A single panorama photo (a 2:1 ratio image from a 360 camera or your phone\'s panorama mode). Visitors can look in every direction.'),
        panoDz, panoHost, panoRemove));
    drawSpin(); drawPano();
  }

  /* ---------- LEADS ---------- */
  function leadsView() {
    const st = S(), all = st.leads, list = all.filter((l) => A.leadFilter === 'all' || l.status === A.leadFilter);
    const rows = list.map((l) => {
      const sel = h('select', { 'aria-label': 'Status for ' + l.name, onchange: async (e) => { try { await st.setLeadStatus(l.id, e.target.value); RE.toast('Marked ' + e.target.value); rerender(); } catch (x) { RE.toast(x.message, 'error'); } } }, ['new', 'contacted', 'closed'].map((s) => h('option', { value: s, selected: l.status === s }, s[0].toUpperCase() + s.slice(1))));
      const del = confirmBtn('Delete', async () => { try { await st.deleteLead(l.id); rerender(); } catch (x) { RE.toast(x.message, 'error'); } });
      return h('li', { class: 'lead ' + l.status },
        h('div', { class: 'lead-top' }, h('strong', null, l.name), h('span', { class: 'kind' }, l.kind === 'visit' ? 'Site visit' : 'Enquiry'), h('span', { class: 'when' }, RE.fmtDate(l.createdAt))),
        h('div', { class: 'lead-body' }, h('div', { class: 'lead-contact' }, h('span', { class: 'sel' }, l.phone), l.email ? h('span', { class: 'sel' }, l.email) : null, l.propertyId ? h('a', { href: '#p-' + l.propertyId }, l.propertyTitle || 'View home') : null),
          l.kind === 'visit' && l.visitDate ? h('p', { class: 'visit' }, I('calendar', 15), 'Wants to visit on ' + l.visitDate + (l.visitTime ? ' at ' + l.visitTime : '')) : null,
          l.message ? h('p', { class: 'msg' }, l.message) : null),
        h('div', { class: 'lead-act' }, h('label', { class: 'sr' }, 'Status'), sel, del));
    });
    const filt = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter leads' }, [['all', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']].map((o) => h('button', { type: 'button', 'aria-pressed': String(A.leadFilter === o[0]), onclick: () => { A.leadFilter = o[0]; rerender(); } }, o[1])));
    return h('div', null, h('div', { class: 'adm-head' }, h('div', null, h('h1', null, 'Leads'), h('p', { class: 'sub' }, all.length + ' total. Enquiries and site-visit requests from the website.')),
      btn('Export CSV', '', () => RE.download('leads.csv', RE.csv([['Date', 'Type', 'Name', 'Phone', 'Email', 'Home', 'Visit date', 'Visit time', 'Message', 'Status']].concat(all.map((l) => [new Date(l.createdAt).toISOString(), l.kind, l.name, l.phone, l.email, l.propertyTitle, l.visitDate, l.visitTime, l.message, l.status]))), 'text/csv'), 'download')),
      filt, rows.length ? h('ul', { class: 'leads' }, rows) : h('div', { class: 'empty light' }, I('users', 28), h('h3', null, all.length ? 'No leads with this status' : 'No leads yet'), h('p', null, 'When a visitor fills a form on the site, it appears here.')));
  }

  /* ---------- SETTINGS ---------- */
  function settingsView() {
    const st = S(), cur = st.getSettings(), d = Object.assign({}, cur, { newPass: '' });
    const err = h('p', { class: 'err big', role: 'alert' });
    const saveB = h('button', { class: 'btn primary', type: 'button' }, I('check', 16), 'Save settings');
    saveB.addEventListener('click', async () => {
      err.textContent = '';
      if (!RE.validPhone(d.phone)) { err.textContent = 'Enter a valid phone number.'; return; }
      if (d.whatsapp && RE.digits(d.whatsapp).length < 10) { err.textContent = 'WhatsApp number needs the country code, for example 919876543210.'; return; }
      if (d.email && !RE.validEmail(d.email)) { err.textContent = 'Enter a valid email address.'; return; }
      const out = {}; ['brand', 'tagline', 'heroTitle', 'heroSub', 'phone', 'whatsapp', 'email', 'office', 'rera', 'about', 'instagram', 'facebook', 'youtube'].forEach((k) => (out[k] = String(d[k] || '').trim()));
      out.whatsapp = RE.digits(out.whatsapp);
      if (!out.brand) { err.textContent = 'Business name cannot be empty.'; return; }
      if (st.mode === 'demo' && d.newPass) { if (d.newPass.length < 6) { err.textContent = 'The new passcode needs at least 6 characters.'; return; } out.adminPass = d.newPass; }
      saveB.disabled = true;
      try { await st.saveSettings(out); RE.toast('Settings saved. Every page now shows the new details.'); rerender(); }
      catch (e) { err.textContent = 'Could not save. ' + e.message; saveB.disabled = false; }
    });
    return h('div', null, h('div', { class: 'adm-head' }, h('div', null, h('h1', null, 'Site settings'), h('p', { class: 'sub' }, 'These appear across the whole site: header, footer, contact buttons and forms.'))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Contact details'),
        h('div', { class: 'form-grid' }, text('Phone number', d, 'phone', { hint: 'Shown in the header, footer and on every property page.', ph: '+91 98765 43210' }), text('WhatsApp number', d, 'whatsapp', { hint: 'Digits only with country code, for example 919876543210.', ph: '919876543210' }),
          text('Email', d, 'email', { type: 'email' }), text('RERA or licence line', d, 'rera'), text('Office address', d, 'office', { rows: 2, cls: 'span2' }))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Brand and home page'),
        h('div', { class: 'form-grid' }, text('Business name', d, 'brand', { max: 50 }), text('Tagline', d, 'tagline', { max: 80 }), text('Home page headline', d, 'heroTitle', { max: 90, cls: 'span2' }), text('Home page intro', d, 'heroSub', { rows: 2, max: 240, cls: 'span2' }), text('About us', d, 'about', { rows: 4, max: 900, cls: 'span2' }))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Social links (optional)'), h('div', { class: 'form-grid g3' }, text('Instagram link', d, 'instagram', { ph: 'https://instagram.com/...' }), text('Facebook link', d, 'facebook', { ph: 'https://facebook.com/...' }), text('YouTube link', d, 'youtube', { ph: 'https://youtube.com/...' }))),
      st.mode === 'demo' ? h('section', { class: 'card-sec' }, h('h2', null, 'Admin passcode'), h('p', { class: 'sub' }, 'Demo mode only. In Supabase mode you sign in with your admin email and password.'), h('div', { class: 'form-grid' }, text('New passcode', d, 'newPass', { type: 'password', hint: 'At least 6 characters. Leave empty to keep the current one.' }))) : null,
      err, h('div', { class: 'savebar' }, h('div', { class: 'savebar-in' }, saveB)));
  }

  /* ---------- BACKUP AND HELP ---------- */
  function helpView() {
    const st = S();
    const reset = st.mode === 'demo' ? confirmBtn('Reset demo data', async () => { try { await st.resetDemo(); try { await st.auth.logout(); } catch (e) { /* ignore */ } RE.toast('Demo data cleared. Reloading...'); setTimeout(() => location.reload(), 600); } catch (e) { RE.toast(e.message, 'error'); } }) : null;
    return h('div', null, h('div', { class: 'adm-head' }, h('div', null, h('h1', null, 'Backup and help'))),
      h('section', { class: 'card-sec' }, h('h2', null, 'Where your data lives'), st.mode === 'supabase'
        ? h('p', null, 'This site is connected to Supabase. Properties, leads and settings are in your Supabase database, and photos and videos are in the ', h('code', null, RE.cfg.bucket), ' storage bucket. Supabase keeps daily backups on the Pro plan.')
        : h('p', null, 'Demo mode: everything is saved inside this browser only. Clearing site data removes it, and visitors on other devices will not see your changes. To go live, connect Supabase as described below.')),
      h('section', { class: 'card-sec' }, h('h2', null, 'Export'), h('p', { class: 'sub' }, 'Download the details of all properties and the settings as a JSON file. Photos and videos are not included.'), btn('Download data (JSON)', '', () => RE.download('properties-backup.json', st.exportJSON(), 'application/json'), 'download')),
      h('section', { class: 'card-sec' }, h('h2', null, 'Go live with Supabase and Hostinger'),
        h('ol', { class: 'steps' }, h('li', null, 'Create a Supabase project. In the SQL editor, run supabase/schema.sql from the code folder.'), h('li', null, 'Copy the Project URL and the anon public key into assets/js/config.js.'), h('li', null, 'In Supabase, Authentication, add your admin user. Then add that user id to the admins table (the README shows the one-line SQL).'), h('li', null, 'Upload the whole folder to Hostinger public_html using File Manager or FTP. Open your domain, then /#admin.'))),
      reset ? h('section', { class: 'card-sec' }, h('h2', null, 'Start over'), h('p', { class: 'sub' }, 'Removes the sample homes, your changes, leads and photos from this browser.'), reset) : null);
  }
})();
