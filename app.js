/* app.js - start-up and routing.
   #home (or empty)  -> home page      #p-<id> -> property page      #admin -> admin panel */
(function () {
  'use strict';
  const RE = window.RE, h = RE.h;
  const root = RE.$('#app');
  let running = false, again = false;

  function cleanup() {
    (RE.cleanups || []).splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    if (RE.lightbox) RE.lightbox.close(true);
  }
  async function doRoute() {
    cleanup(); RE.clear(root);
    const hash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    try {
      if (hash.indexOf('p-') === 0) await RE.pub.property(root, hash.slice(2));
      else if (hash === 'admin') await RE.admin.render(root);
      else await RE.pub.home(root);
    } catch (e) {
      console.error(e);
      RE.clear(root).append(h('main', { class: 'wrap nf' }, h('h1', null, 'Something went wrong'), h('p', null, e.message || String(e)), h('a', { class: 'btn primary', href: '#home' }, 'Back to home')));
    }
    if (RE.pendingScroll) { const id = RE.pendingScroll; RE.pendingScroll = null; requestAnimationFrame(() => { const el = document.getElementById(id); if (el) el.scrollIntoView(); }); }
    else window.scrollTo(0, 0);
  }
  async function route() {
    if (running) { again = true; return; }
    running = true;
    do { again = false; await doRoute(); } while (again);
    running = false;
  }
  RE.route = route;

  async function boot() {
    const boot = RE.$('#boot'), bar = RE.$('.boot-bar'), msg = RE.$('.boot-msg');
    try {
      await RE.store.init((p, m) => { bar.style.width = Math.max(6, Math.round(p * 100)) + '%'; if (m) msg.textContent = m; });
    } catch (e) {
      console.error(e);
      boot.append(h('div', { class: 'boot-error', role: 'alert' }, h('strong', null, 'Could not load the site data.'), h('p', null, e.message),
        h('p', null, RE.store.mode === 'supabase' ? 'Check supabaseUrl and supabaseAnonKey in assets/js/config.js, and that supabase/schema.sql has been run.' : 'Try reloading the page.')));
      msg.textContent = '';
      return;
    }
    boot.remove();
    window.addEventListener('hashchange', route);
    route();
  }
  boot();
})();
