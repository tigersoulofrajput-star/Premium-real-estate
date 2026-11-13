/* public.js - the visitor-facing site: home page, property pages, forms */
(function () {
  'use strict';
  const RE = window.RE, h = RE.h, I = RE.icon;
  const store = () => RE.store;
  const num = (n) => new Intl.NumberFormat('en-IN').format(Math.round(+n || 0));
  const F = { status: 'all', q: '', type: '', bhk: '', max: '', sort: 'featured' };
  RE.cleanups = RE.cleanups || [];

  const LOGO = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 15L16 4l13 11M7 13v14h18V13"/><path d="M13 27v-7h6v7"/><circle cx="16" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>';

  RE.scrollToSection = function (id) {
    const go = () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: RE.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); };
    if (!location.hash || location.hash === '#home') go();
    else { RE.pendingScroll = id; location.hash = '#home'; }
  };

  /* ---------- shared pieces ---------- */
  function header() {
    const s = store().getSettings();
    const nav = (label, id) => h('button', { type: 'button', class: 'nav-link', onclick: () => RE.scrollToSection(id) }, label);
    const logo = h('span', { class: 'logo' }); logo.innerHTML = LOGO;
    return h('header', { class: 'site-header' },
      h('div', { class: 'wrap hdr' },
        h('a', { class: 'brand', href: '#home', 'aria-label': s.brand + ' home' }, logo, h('span', { class: 'brand-name' }, s.brand)),
        h('nav', { class: 'nav', 'aria-label': 'Main' }, nav('Homes', 'homes'), nav('Payments', 'emi'), nav('About', 'about'), nav('Contact', 'contact')),
        h('div', { class: 'hdr-right' },
          h('span', { class: 'phone-chip' }, I('phone', 16), h('span', { class: 'sel' }, s.phone)),
          h('a', { class: 'btn ghost sm', href: '#admin' }, 'Admin'))));
  }
  function footer() {
    const s = store().getSettings();
    const soc = [['Instagram', s.instagram], ['Facebook', s.facebook], ['YouTube', s.youtube]].filter((x) => /^https?:\/\//i.test(x[1] || ''));
    return h('footer', { class: 'site-footer' }, h('div', { class: 'wrap foot' },
      h('div', null, h('div', { class: 'foot-brand' }, s.brand), h('p', { class: 'foot-tag' }, s.tagline), h('p', { class: 'foot-rera' }, I('shield', 16), s.rera)),
      h('div', { class: 'foot-col' }, h('div', { class: 'foot-h' }, 'Visit'), h('p', null, s.office)),
      h('div', { class: 'foot-col' }, h('div', { class: 'foot-h' }, 'Talk to us'), h('p', { class: 'sel' }, s.phone), h('p', { class: 'sel' }, s.email),
        soc.length ? h('p', { class: 'foot-soc' }, soc.map((x) => h('a', { href: x[1], target: '_blank', rel: 'noopener noreferrer' }, x[0]))) : null)),
      h('div', { class: 'wrap foot-bottom' }, h('span', null, '© ' + new Date().getFullYear() + ' ' + s.brand), h('a', { href: '#admin' }, 'Admin sign in')));
  }
  function whatsappLink(text, phone) {
    const s = store().getSettings();
    return 'https://wa.me/' + RE.digits(phone || s.whatsapp) + '?text=' + encodeURIComponent(text || 'Hello, I would like to know more about your homes.');
  }

  /* ---------- lead form (enquiry + site visit) ---------- */
  function leadForm(opts) {
    opts = opts || {};
    const p = opts.property || null;
    const st = { kind: opts.kind || 'enquiry' };
    const inputs = {
      name: h('input', { id: 'lf-name' + (p ? '-p' : ''), type: 'text', autocomplete: 'name', placeholder: 'Your name', maxlength: '80' }),
      phone: h('input', { id: 'lf-phone' + (p ? '-p' : ''), type: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '10-digit mobile number', maxlength: '16' }),
      email: h('input', { id: 'lf-email' + (p ? '-p' : ''), type: 'email', autocomplete: 'email', placeholder: 'Email (optional)', maxlength: '120' }),
      date: h('input', { id: 'lf-date' + (p ? '-p' : ''), type: 'date', min: new Date().toISOString().slice(0, 10) }),
      time: h('select', { id: 'lf-time' + (p ? '-p' : '') }, ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'].map((t) => h('option', { value: t }, t))),
      message: h('textarea', { id: 'lf-msg' + (p ? '-p' : ''), rows: '3', placeholder: p ? 'Anything you want to know about this home?' : 'Tell us what you are looking for', maxlength: '800' }),
      hp: h('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', class: 'hp', 'aria-hidden': 'true' }),
    };
    const errs = {};
    const field = (label, key, extra) => { errs[key] = h('span', { class: 'err', role: 'alert' }); return h('div', { class: 'field ' + (extra || '') }, h('label', { for: inputs[key].id }, label), inputs[key], errs[key]); };
    const dateRow = h('div', { class: 'row2' }, field('Preferred date', 'date'), field('Time', 'time'));
    const submit = h('button', { class: 'btn primary block', type: 'submit' }, 'Send enquiry');
    const toggle = opts.kinds ? h('div', { class: 'seg', role: 'group', 'aria-label': 'What would you like to do' },
      opts.kinds.map((k) => h('button', { type: 'button', 'aria-pressed': String(k === st.kind), 'data-k': k, onclick: () => { st.kind = k; sync(); } }, k === 'visit' ? 'Book a site visit' : 'Ask a question'))) : null;
    function sync() {
      dateRow.hidden = st.kind !== 'visit';
      submit.textContent = st.kind === 'visit' ? 'Request site visit' : 'Send enquiry';
      if (toggle) toggle.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === st.kind)));
    }
    const form = h('form', { class: 'lead-form', novalidate: true }, toggle, field('Name', 'name'), field('Mobile number', 'phone'), field('Email', 'email'), dateRow, field('Message', 'message'), inputs.hp, submit);
    sync();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      Object.values(errs).forEach((x) => (x.textContent = ''));
      Object.values(inputs).forEach((x) => x.removeAttribute('aria-invalid'));
      const bad = (k, m) => { errs[k].textContent = m; inputs[k].setAttribute('aria-invalid', 'true'); };
      let ok = true;
      if (inputs.name.value.trim().length < 2) { bad('name', 'Enter your name.'); ok = false; }
      if (!RE.validPhone(inputs.phone.value)) { bad('phone', 'Enter a valid 10-digit mobile number.'); ok = false; }
      if (inputs.email.value.trim() && !RE.validEmail(inputs.email.value)) { bad('email', 'That email does not look right.'); ok = false; }
      if (st.kind === 'visit' && !inputs.date.value) { bad('date', 'Pick a date for the visit.'); ok = false; }
      if (!ok) { const first = form.querySelector('[aria-invalid="true"]'); if (first) first.focus(); return; }
      if (inputs.hp.value) { form.replaceChildren(done()); return; }
      submit.disabled = true; submit.textContent = 'Sending...';
      try {
        await store().addLead({ kind: st.kind, propertyId: p ? p.id : null, propertyTitle: p ? p.title : null, name: inputs.name.value.trim(), phone: inputs.phone.value.trim(), email: inputs.email.value.trim(), message: inputs.message.value.trim(), visitDate: st.kind === 'visit' ? inputs.date.value : null, visitTime: st.kind === 'visit' ? inputs.time.value : null });
        form.replaceChildren(done());
      } catch (err) { submit.disabled = false; sync(); RE.toast('Could not send. ' + err.message, 'error'); }
    });
    function done() {
      return h('div', { class: 'sent' }, I('check', 26), h('h4', null, st.kind === 'visit' ? 'Visit requested' : 'Thank you'),
        h('p', null, 'We have your details and will call ' + inputs.phone.value.trim() + ' shortly' + (st.kind === 'visit' ? ' to confirm the time.' : '.')));
    }
    return form;
  }

  /* ---------- EMI calculator ---------- */
  function emiCalc(opts) {
    opts = opts || {};
    const st = { price: opts.price || 25000000, down: 20, rate: 8.5, years: 20 };
    const out = h('div', { class: 'emi-out', 'aria-live': 'polite' });
    const rows = [];
    const slider = (id, label, key, min, max, step, fmt) => {
      const val = h('output', { for: id }, fmt(st[key]));
      const inp = h('input', { id, type: 'range', min, max, step, value: st[key] });
      inp.addEventListener('input', () => { st[key] = +inp.value; val.textContent = fmt(st[key]); update(); });
      return h('div', { class: 'slider' }, h('div', { class: 'slider-top' }, h('label', { for: id }, label), val), inp);
    };
    if (!opts.fixedPrice) rows.push(slider('emi-price' + (opts.id || ''), 'Home price', 'price', 2500000, 200000000, 500000, RE.inrShort));
    rows.push(slider('emi-down' + (opts.id || ''), 'Down payment', 'down', 0, 80, 5, (v) => v + '%'));
    rows.push(slider('emi-rate' + (opts.id || ''), 'Interest rate (yearly)', 'rate', 6, 14, 0.1, (v) => v.toFixed(1) + '%'));
    rows.push(slider('emi-years' + (opts.id || ''), 'Loan period', 'years', 5, 30, 1, (v) => v + ' years'));
    function update() {
      const loan = st.price * (1 - st.down / 100), r = RE.emi(loan, st.rate, st.years), pPct = r.total ? Math.round((loan / r.total) * 100) : 100;
      RE.clear(out).append(
        h('div', { class: 'emi-big' }, h('span', { class: 'emi-num' }, RE.inr(r.emi)), h('span', { class: 'emi-unit' }, 'per month')),
        h('div', { class: 'emi-bar', role: 'img', 'aria-label': 'Principal ' + pPct + ' percent, interest ' + (100 - pPct) + ' percent' }, h('span', { style: { width: pPct + '%' } })),
        h('dl', { class: 'emi-dl' },
          h('div', null, h('dt', null, 'Loan amount'), h('dd', null, RE.inrShort(loan))),
          h('div', null, h('dt', null, 'Total interest'), h('dd', null, RE.inrShort(r.interest))),
          h('div', null, h('dt', null, 'Total repaid'), h('dd', null, RE.inrShort(r.total)))));
    }
    update();
    return h('div', { class: 'emi' + (opts.compact ? ' compact' : '') }, h('div', { class: 'emi-in' }, rows), out);
  }

  /* ---------- property card ---------- */
  function fact(icon, text) { return h('li', null, I(icon, 16), text); }
  function hasVideo(p) { return !!(p.video && (p.video.ref || p.video.url)); }
  function card(p) {
    const cover = store().url(RE.coverOf(p));
    const tb = [];
    if (hasVideo(p)) tb.push(['play', 'Video tour']);
    if ((p.spin || []).length > 5) tb.push(['cube', '3D view']);
    if (p.pano) tb.push(['pano', '360°']);
    return h('a', { class: 'card', href: '#p-' + p.id, 'aria-label': p.title + ', ' + (p.status === 'sold' ? 'sold' : RE.priceText(p)) },
      h('div', { class: 'card-img' },
        cover ? h('img', { src: cover, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, I('image', 30)),
        h('span', { class: 'pill ' + p.status }, RE.statusText(p.status)),
        p.featured ? h('span', { class: 'feat' }, I('star', 14), 'Featured') : null,
        tb.length ? h('div', { class: 'tour-badges' }, tb.map((b) => h('span', { class: 'tb' }, I(b[0], 14), b[1]))) : null),
      h('div', { class: 'card-body' },
        h('div', { class: 'card-price' }, p.status === 'sold' ? 'Sold' : RE.priceText(p)),
        h('h3', null, p.title),
        h('p', { class: 'loc' }, I('pin', 15), [p.locality, p.city].filter(Boolean).join(', ')),
        h('ul', { class: 'facts' }, fact('bed', p.bedrooms + ' beds'), fact('bath', p.bathrooms + ' baths'), fact('area', num(p.area) + ' sq ft'))));
  }

  /* =====================================================================
     HOME
     ===================================================================== */
  function filtered() {
    let a = store().props.slice();
    if (F.status !== 'all') a = a.filter((p) => p.status === F.status);
    if (F.q) { const q = F.q.toLowerCase(); a = a.filter((p) => [p.title, p.city, p.locality, p.address, p.type, p.tagline].join(' ').toLowerCase().indexOf(q) >= 0); }
    if (F.type) a = a.filter((p) => p.type === F.type);
    if (F.bhk) a = a.filter((p) => +p.bhk >= +F.bhk);
    if (F.max) a = a.filter((p) => p.status === 'rent' || +p.price <= +F.max);
    if (F.sort === 'low') a.sort((x, y) => x.price - y.price);
    else if (F.sort === 'high') a.sort((x, y) => y.price - x.price);
    else if (F.sort === 'new') a.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
    return a;
  }

  RE.pub = {};
  RE.pub.home = async function (root) {
    const S = store(), s = S.getSettings();
    document.title = s.brand + ' | ' + s.tagline;
    await S.prime(S.props.map((p) => RE.coverOf(p)));

    /* hero */
    const canvas = h('canvas', { class: 'hero-canvas' });
    const hint = h('div', { class: 'hero-hint' }, I('hand', 16), 'Drag the villa to look around');
    const sf = { status: 'sale' };
    const q = h('input', { id: 'hs-q', type: 'text', placeholder: 'City or area, for example Alibaug', 'aria-label': 'City or area', value: F.q });
    const budget = h('select', { id: 'hs-max', 'aria-label': 'Maximum budget' }, [['', 'Any budget'], [10000000, 'Up to ₹1 Cr'], [30000000, 'Up to ₹3 Cr'], [50000000, 'Up to ₹5 Cr'], [100000000, 'Up to ₹10 Cr']].map((o) => h('option', { value: o[0] }, o[1])));
    const seg = h('div', { class: 'seg dark', role: 'group', 'aria-label': 'Buy or rent' },
      ['sale', 'rent'].map((k) => h('button', { type: 'button', 'aria-pressed': String(k === sf.status), 'data-k': k, onclick: () => { sf.status = k; seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k))); budget.hidden = k === 'rent'; } }, k === 'sale' ? 'Buy' : 'Rent')));
    const search = h('form', { class: 'hero-search', onsubmit: (e) => { e.preventDefault(); F.status = sf.status; F.q = q.value.trim(); F.max = sf.status === 'rent' ? '' : budget.value; syncFilters(); renderGrid(); RE.scrollToSection('homes'); } }, seg, q, budget, h('button', { class: 'btn primary', type: 'submit' }, 'Search homes'));
    const hero = h('section', { class: 'hero' }, canvas, h('div', { class: 'hero-shade' }),
      h('div', { class: 'wrap hero-inner' }, h('div', { class: 'hero-copy' }, h('h1', null, s.heroTitle), h('p', { class: 'lede' }, s.heroSub), search)), hint);

    /* listings */
    const grid = h('div', { class: 'grid', id: 'grid' });
    const count = h('p', { class: 'count', 'aria-live': 'polite' });
    const mkSel = (id, label, key, opts) => h('div', { class: 'f-item' }, h('label', { for: id }, label), h('select', { id, onchange: (e) => { F[key] = e.target.value; renderGrid(); } }, opts.map((o) => h('option', { value: o[0], selected: String(F[key]) === String(o[0]) }, o[1]))));
    const types = Array.from(new Set(S.props.map((p) => p.type).filter(Boolean)));
    const segF = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter by sale or rent' }, [['all', 'All'], ['sale', 'Buy'], ['rent', 'Rent']].map((o) => h('button', { type: 'button', 'data-k': o[0], 'aria-pressed': String(F.status === o[0]), onclick: () => { F.status = o[0]; syncFilters(); renderGrid(); } }, o[1])));
    const qf = h('input', { id: 'f-q', type: 'search', placeholder: 'Search by name or area', value: F.q, oninput: RE.debounce((e) => { F.q = e.target.value.trim(); renderGrid(); }, 150) });
    const bar = h('div', { class: 'filters' }, segF, h('div', { class: 'f-item grow' }, h('label', { for: 'f-q' }, 'Search'), qf),
      mkSel('f-type', 'Type', 'type', [['', 'All types']].concat(types.map((t) => [t, t]))),
      mkSel('f-bhk', 'Bedrooms', 'bhk', [['', 'Any'], [1, '1+ BHK'], [2, '2+ BHK'], [3, '3+ BHK'], [4, '4+ BHK'], [5, '5+ BHK']]),
      mkSel('f-max', 'Budget (buy)', 'max', [['', 'Any'], [5000000, 'Up to ₹50 L'], [10000000, 'Up to ₹1 Cr'], [30000000, 'Up to ₹3 Cr'], [50000000, 'Up to ₹5 Cr'], [100000000, 'Up to ₹10 Cr']]),
      mkSel('f-sort', 'Sort', 'sort', [['featured', 'Featured first'], ['new', 'Newest'], ['low', 'Price: low to high'], ['high', 'Price: high to low']]));
    function syncFilters() { segF.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === F.status))); qf.value = F.q; const m = RE.$('#f-max'); if (m) m.value = F.max; }
    function renderGrid() {
      const list = filtered();
      count.textContent = list.length + (list.length === 1 ? ' home' : ' homes');
      RE.clear(grid);
      if (!list.length) grid.appendChild(h('div', { class: 'empty' }, I('home', 30), h('h3', null, S.props.length ? 'No homes match these filters' : 'No homes yet'), h('p', null, S.props.length ? 'Try a wider budget or clear the search.' : 'Sign in to Admin and add the first property.'),
        S.props.length ? h('button', { class: 'btn', type: 'button', onclick: () => { Object.assign(F, { status: 'all', q: '', type: '', bhk: '', max: '', sort: 'featured' }); RE.$$('.filters select').forEach((x) => (x.value = x.options[0].value)); syncFilters(); renderGrid(); } }, 'Clear filters') : h('a', { class: 'btn', href: '#admin' }, 'Open Admin')));
      else list.forEach((p) => grid.appendChild(card(p)));
    }
    const homes = h('section', { class: 'section light', id: 'homes' }, h('div', { class: 'wrap' }, h('div', { class: 'sec-head' }, h('h2', null, 'Homes we are selling and renting'), count), bar, grid));

    /* why */
    const why = h('section', { class: 'section paper' }, h('div', { class: 'wrap why' },
      h('div', { class: 'why-head' }, h('h2', null, 'See it properly before you travel'), h('p', null, 'Every listing is visited, measured and filmed by our team, so what you see here is what you get.')),
      h('ul', { class: 'why-list' },
        [['cube', 'Walk around it in 3D', 'Photos taken all the way around the house, so you can turn it like an object, plus a 360 view of the best room.'],
         ['play', 'Home-tour video', 'A walkthrough from the gate to the terrace, with the full room-by-room photo set underneath.'],
         ['calendar', 'Book a visit in a minute', 'Pick a day and time from the property page. We confirm by phone the same day.'],
         ['shield', 'Paperwork checked', 'Title, approvals and RERA details are verified before a home is listed.']].map((x) => h('li', null, h('span', { class: 'why-ico' }, I(x[0], 22)), h('div', null, h('h3', null, x[1]), h('p', null, x[2])))))));

    /* emi */
    const emiSec = h('section', { class: 'section light', id: 'emi' }, h('div', { class: 'wrap emi-wrap' }, h('div', { class: 'emi-copy' }, h('h2', null, 'Plan your payments'), h('p', null, 'Move the sliders to see the monthly instalment for a home loan. Rates differ by bank, so treat this as a guide and confirm the final figure with your lender.')), emiCalc({})));

    /* about + contact */
    const about = h('section', { class: 'section dark', id: 'about' }, h('div', { class: 'wrap about' },
      h('div', { class: 'about-copy', id: 'contact' }, h('h2', null, 'Talk to a person'), h('p', { class: 'lede' }, s.about),
        h('ul', { class: 'contact-list' },
          h('li', null, I('phone', 18), h('div', null, h('span', { class: 'lbl' }, 'Call'), h('span', { class: 'sel' }, s.phone))),
          h('li', null, I('mail', 18), h('div', null, h('span', { class: 'lbl' }, 'Email'), h('span', { class: 'sel' }, s.email))),
          h('li', null, I('pin', 18), h('div', null, h('span', { class: 'lbl' }, 'Office'), h('span', null, s.office)))),
        h('a', { class: 'btn wa', href: whatsappLink(), target: '_blank', rel: 'noopener noreferrer' }, 'Chat on WhatsApp')),
      h('div', { class: 'panel' }, h('h3', null, 'Send us an enquiry'), leadForm({}))));

    root.append(header(), hero, homes, why, emiSec, about, footer());
    syncFilters(); renderGrid();

    /* start the 3D villa */
    try {
      const house = RE.house.create(canvas, { shiftFn: (asp) => (asp > 1.15 ? { x: 0.36, y: 0.02 } : { x: 0, y: -0.3 }), onInteract: () => hint.classList.add('gone') });
      RE.cleanups.push(() => house.destroy());
    } catch (e) { hero.classList.add('no-gl'); hint.hidden = true; }
  };

  /* =====================================================================
     PROPERTY PAGE
     ===================================================================== */
  RE.pub.property = async function (root, id) {
    const S = store(), s = S.getSettings(), p = S.getProp(id);
    if (!p) {
      document.title = 'Home not found | ' + s.brand;
      root.append(header(), h('main', { class: 'wrap nf' }, h('h1', null, 'We could not find that home'), h('p', null, 'It may have been sold or removed.'), h('a', { class: 'btn primary', href: '#home' }, 'See all homes')), footer());
      return;
    }
    document.title = p.title + ' | ' + s.brand;
    await S.prime(RE.refsOf(p).concat(S.props.map((x) => RE.coverOf(x))));
    const url = (r) => S.url(r);
    const photos = [];
    (p.rooms || []).forEach((r) => (r.photos || []).forEach((ph) => photos.push({ url: url(ph), caption: r.name, room: r.id, ref: ph })));
    const cover = RE.coverOf(p), coverUrl = url(cover);
    const phone = p.agentPhone || s.phone;

    /* gallery strip */
    const lbItems = photos.map((x) => ({ url: x.url, caption: p.title + ' / ' + x.caption }));
    const others = photos.filter((x) => !cover || x.ref.id !== cover.id).slice(0, 4);
    const openLb = (u, btn) => { const i = Math.max(0, photos.findIndex((x) => x.url === u)); if (lbItems.length) RE.lightbox.open(lbItems, i, btn); };
    const mainBtn = h('button', { class: 'pg-main', type: 'button', 'aria-label': 'Open photo viewer', onclick: (e) => openLb(coverUrl, e.currentTarget) }, coverUrl ? h('img', { src: coverUrl, alt: p.title }) : h('div', { class: 'ph' }, I('image', 40)));
    const thumbs = others.map((x, i) => h('button', { class: 'pg-thumb', type: 'button', 'aria-label': 'Open photo: ' + x.caption, onclick: (e) => openLb(x.url, e.currentTarget) }, h('img', { src: x.url, alt: '', loading: 'lazy' }),
      i === others.length - 1 && photos.length > 5 ? h('span', { class: 'pg-more' }, '+' + (photos.length - 5) + ' photos') : null));
    const gallery = h('div', { class: 'pg' + (others.length ? '' : ' solo') }, mainBtn, others.length ? h('div', { class: 'pg-side' }, thumbs) : null);

    /* facts */
    const facts = [['bed', p.bhk + ' BHK'], ['bed', p.bedrooms + ' bedrooms'], ['bath', p.bathrooms + ' bathrooms'], ['area', num(p.area) + ' sq ft'], ['layers', p.floors + (+p.floors === 1 ? ' floor' : ' floors')], ['car', p.parking + ' parking'], p.facing ? ['compass', p.facing] : null, p.year ? ['calendar', p.year] : null].filter(Boolean);

    /* tabs ("folders") */
    let active = 'photos', viewer = null;
    const hasSpin = (p.spin || []).length > 1, hasTour = hasSpin || !!p.pano;
    const tabs = [];
    if (photos.length) tabs.push({ id: 'photos', label: 'Photos', icon: 'image', count: photos.length });
    if (hasVideo(p)) tabs.push({ id: 'video', label: 'Home tour', icon: 'play' });
    if (hasTour) tabs.push({ id: 'tour', label: '3D view', icon: 'cube' });
    tabs.push({ id: 'map', label: 'Location', icon: 'map' });
    tabs.push({ id: 'review', label: 'Review', icon: 'doc' });
    if (!tabs.some((t) => t.id === active)) active = tabs[0].id;
    const panel = h('div', { class: 'tab-panel', role: 'tabpanel', tabindex: '0' });
    const tabBar = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Folders for ' + p.title });

    function killViewer() { if (viewer) { viewer.destroy(); viewer = null; } }
    RE.cleanups.push(killViewer);
    function renderTabs() {
      RE.clear(tabBar);
      tabs.forEach((t) => tabBar.appendChild(h('button', { class: 'tab', role: 'tab', type: 'button', id: 'tab-' + t.id, 'aria-selected': String(t.id === active), 'aria-controls': 'panel', tabindex: t.id === active ? '0' : '-1', onclick: () => { active = t.id; renderTabs(); renderPanel(); }, onkeydown: (e) => { const i = tabs.findIndex((x) => x.id === active); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { active = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id; renderTabs(); renderPanel(); RE.$('#tab-' + active).focus(); } } }, I(t.icon, 17), t.label, t.count ? h('span', { class: 'tab-n' }, t.count) : null)));
      panel.setAttribute('aria-labelledby', 'tab-' + active); panel.id = 'panel';
    }
    function renderPanel() {
      killViewer(); RE.clear(panel);
      if (active === 'photos') panel.appendChild(photosPanel());
      else if (active === 'video') panel.appendChild(videoPanel());
      else if (active === 'tour') panel.appendChild(tourPanel());
      else if (active === 'map') panel.appendChild(mapPanel());
      else panel.appendChild(reviewPanel());
    }
    function photosPanel() {
      let room = 'all';
      const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter photos by room' });
      const grid = h('div', { class: 'ph-grid' });
      const draw = () => {
        RE.clear(chips);
        chips.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(room === 'all'), onclick: () => { room = 'all'; draw(); } }, 'All ' + photos.length));
        (p.rooms || []).filter((r) => (r.photos || []).length).forEach((r) => chips.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(room === r.id), onclick: () => { room = r.id; draw(); } }, r.name + ' ' + r.photos.length)));
        RE.clear(grid);
        const list = photos.filter((x) => room === 'all' || x.room === room);
        const items = list.map((x) => ({ url: x.url, caption: p.title + ' / ' + x.caption }));
        list.forEach((x, i) => grid.appendChild(h('button', { class: 'ph-item', type: 'button', 'aria-label': 'Open photo: ' + x.caption, onclick: (e) => RE.lightbox.open(items, i, e.currentTarget) }, h('img', { src: x.url, alt: '', loading: 'lazy' }), h('span', { class: 'ph-cap' }, x.caption))));
      };
      draw();
      return h('div', null, chips, grid);
    }
    function videoPanel() {
      const v = p.video || {};
      const box = h('div', { class: 'video-box' });
      if (v.kind === 'file' && v.ref) box.appendChild(h('video', { controls: true, playsinline: true, preload: 'metadata', poster: coverUrl || null, src: url(v.ref) }));
      else {
        const e = RE.videoEmbed(v.url);
        if (e && e.kind === 'iframe') box.appendChild(h('iframe', { src: e.src, title: 'Home tour video of ' + p.title, loading: 'lazy', allow: 'accelerometer; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin' }));
        else if (e) box.appendChild(h('video', { controls: true, playsinline: true, preload: 'metadata', poster: coverUrl || null, src: e.src }));
      }
      const link = v.url && /^https?:\/\//i.test(v.url) ? h('a', { class: 'btn ghost sm', href: v.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open video in a new tab') : null;
      return h('div', null, box, h('p', { class: 'hint-line' }, 'A walkthrough of the whole home. The room-by-room photos are in the Photos folder.'), link);
    }
    function tourPanel() {
      let mode = hasSpin ? 'spin' : 'pano';
      const host = h('div', { class: 'viewer-host' });
      const seg = hasSpin && p.pano ? h('div', { class: 'seg', role: 'group', 'aria-label': '3D view type' }, [['spin', 'Walk around the house'], ['pano', '360° inside view']].map((o) => h('button', { type: 'button', 'data-k': o[0], 'aria-pressed': String(mode === o[0]), onclick: () => { mode = o[0]; start(); } }, o[1]))) : null;
      const note = h('p', { class: 'hint-line' });
      function start() {
        killViewer(); RE.clear(host);
        if (seg) seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === mode)));
        if (mode === 'spin') { viewer = RE.SpinViewer(host, p.spin.map(url), {}); note.textContent = (p.spin.length) + ' photos taken around the house. Drag left or right to turn it.'; }
        else { viewer = RE.PanoViewer(host, url(p.pano), {}); note.textContent = 'One 360-degree photo. Drag to look around, use the buttons to zoom.'; }
      }
      setTimeout(start, 0);
      return h('div', null, seg, host, note);
    }
    function mapPanel() {
      const src = RE.mapEmbedSrc(p), m = p.map || {};
      const link = h('a', { class: 'btn', href: RE.mapLink(p), target: '_blank', rel: 'noopener noreferrer' }, I('map', 16), 'Open in Google Maps');
      let view;
      if (RE.cfg.embedMaps && src) view = h('iframe', { class: 'map-frame', src, title: 'Map showing ' + p.title, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', allowfullscreen: true });
      else view = h('div', { class: 'map-card' }, h('div', { class: 'map-pin' }, I('pin', 30)), h('strong', null, [p.locality, p.city].filter(Boolean).join(', ')), m.lat != null ? h('span', { class: 'sel' }, m.lat.toFixed(5) + ', ' + m.lng.toFixed(5)) : null);
      return h('div', null, view, h('div', { class: 'map-row' }, h('p', { class: 'addr' }, I('pin', 16), p.address || [p.locality, p.city].filter(Boolean).join(', ')), link));
    }
    function reviewPanel() {
      const paras = (t) => String(t || '').split(/\n\s*\n/).filter(Boolean).map((x) => h('p', null, x));
      return h('div', { class: 'prose' },
        p.description ? h('div', null, h('h3', null, 'About this home'), paras(p.description)) : null,
        p.review ? h('div', null, h('h3', null, 'Our review'), paras(p.review)) : null,
        (p.amenities || []).length ? h('div', null, h('h3', null, 'Amenities'), h('ul', { class: 'amen' }, p.amenities.map((a) => h('li', null, I('check', 16), a)))) : null);
    }
    renderTabs(); renderPanel();

    /* side card */
    const loan = RE.emi(p.price * 0.8, 8.5, 20);
    const side = h('aside', { class: 'prop-side' }, h('div', { class: 'side-card' },
      h('div', { class: 'side-price' }, p.status === 'sold' ? 'Sold' : RE.priceText(p)),
      p.priceNote ? h('div', { class: 'side-note' }, p.priceNote) : null,
      p.status === 'sale' ? h('div', { class: 'side-emi' }, 'Estimated EMI ' + RE.inr(loan.emi) + ' a month ', h('button', { class: 'link', type: 'button', onclick: () => RE.$('#emi-calc').scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 'Adjust')) : null,
      h('div', { class: 'side-contact' }, h('div', { class: 'lbl' }, 'Call about this home'), h('div', { class: 'side-phone sel' }, phone), h('a', { class: 'btn wa block', href: whatsappLink('Hello, I am interested in ' + p.title + ' (' + [p.locality, p.city].filter(Boolean).join(', ') + ').', phone), target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp us')),
      h('div', { class: 'side-form' }, leadForm({ property: p, kinds: ['visit', 'enquiry'], kind: 'visit' }))));

    /* similar */
    const similar = S.props.filter((x) => x.id !== p.id).sort((a, b) => (b.status === p.status) - (a.status === p.status)).slice(0, 3);

    const main = h('main', { class: 'wrap prop' },
      h('a', { class: 'back', href: '#home' }, I('arrowL', 16), 'All homes'),
      h('div', { class: 'prop-head' }, h('div', null, h('div', { class: 'prop-meta' }, h('span', { class: 'pill inline ' + p.status }, RE.statusText(p.status)), h('span', null, p.type)), h('h1', null, p.title), h('p', { class: 'loc' }, I('pin', 16), [p.address || [p.locality, p.city].filter(Boolean).join(', ')]),
        p.tagline ? h('p', { class: 'tagline' }, p.tagline) : null),
        h('div', { class: 'prop-price' }, p.status === 'sold' ? 'Sold' : RE.priceText(p))),
      gallery,
      h('div', { class: 'prop-cols' },
        h('div', { class: 'prop-main' },
          h('ul', { class: 'fact-grid' }, facts.map((f) => h('li', null, I(f[0], 20), h('span', null, f[1])))),
          h('div', { class: 'folders' }, tabBar, panel),
          p.status === 'sale' ? h('div', { id: 'emi-calc', class: 'emi-block' }, h('h2', null, 'Monthly payment'), emiCalc({ price: p.price, fixedPrice: true, compact: true, id: '-p' })) : null),
        side),
      similar.length ? h('section', { class: 'similar' }, h('h2', null, 'More homes'), h('div', { class: 'grid' }, similar.map(card))) : null);
    root.append(header(), main, footer());
  };
})();
