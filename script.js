(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const appEl = $('#app');

  /* ---------- Kinetic type: split into masked characters ---------- */
  function splitChars(el) {
    const text = el.textContent;
    if (el.dataset.chars !== 'nolabel') el.setAttribute('aria-label', text);
    el.textContent = '';
    let n = 0;
    [...text].forEach(c => {
      const m = document.createElement('span');
      m.className = 'mk'; m.setAttribute('aria-hidden', 'true');
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = c === ' ' ? '\u00A0' : c;
      s.style.setProperty('--i', n++);
      m.appendChild(s); el.appendChild(m);
    });
  }
  $$('[data-chars]').forEach(splitChars);
  // second hero line starts after the first
  $$('#name .l2 .ch').forEach(c => c.style.setProperty('--d', '220ms'));

  /* About statement: words that light up on scroll */
  const st = $('#statement');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = $$('.w', st);

  /* Marquee: duplicate the group for a seamless loop */
  $$('.track').forEach(t => {
    const g = t.firstElementChild, c = g.cloneNode(true);
    c.setAttribute('aria-hidden', 'true'); t.appendChild(c);
  });

  /* Placeholder links should not jump to the top */
  $$('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* ---------- QR graphic ---------- */
  const qr = $('#qr'), N = 11, cells = [];
  const isFinder = (r, c) => (r < 3 && c < 3) || (r < 3 && c > N - 4) || (r > N - 4 && c < 3);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = document.createElement('i');
    const f = isFinder(r, c);
    if (f) { const lr = r % (N - 3), lc = c % (N - 3); if (!(lr % 2 === 1 && lc % 2 === 1 && (r === 1 || r === N - 2) && (c === 1 || c === N - 2))) i.classList.add('on'); i.dataset.f = 1; }
    else if (Math.random() > .5) i.classList.add('on');
    qr.appendChild(i); if (!f) cells.push(i);
  }
  if (!reduce) setInterval(() => {
    if (document.hidden) return;
    for (let k = 0; k < 6; k++) cells[(Math.random() * cells.length) | 0].classList.toggle('on');
  }, 480);

  /* ---------- Page wipe (transitions) ---------- */
  const wipe = $('#wipe'), stripes = $$('.stripe', wipe), wlabel = $('#wipeLabel');
  const WD = reduce ? 1 : 520;
  function wipeIn() {
    wipe.style.pointerEvents = 'auto';
    return Promise.all(stripes.map((s, i) => {
      s.style.transformOrigin = '50% 100%';
      return s.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: WD, delay: reduce ? 0 : i * 70, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished;
    }));
  }
  function wipeOut() {
    return Promise.all(stripes.map((s, i) => {
      s.style.transformOrigin = '50% 0%';
      return s.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
        { duration: WD, delay: reduce ? 0 : i * 70, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished;
    })).then(() => {
      stripes.forEach(s => s.getAnimations().forEach(a => a.cancel()));
      wipe.classList.remove('cover'); wipe.style.pointerEvents = 'none';
    });
  }

  /* ---------- Reveal on scroll (held during page transitions) ---------- */
  let hold = false; const pending = [];
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    hold ? pending.push(en.target) : en.target.classList.add('in');
  }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]:not([data-manual])').forEach(el => io.observe(el));
  const release = () => { pending.splice(0).forEach(el => el.classList.add('in')); };

  /* ---------- Measurements + scroll frame ---------- */
  let vh = innerHeight, docH = 0;
  const sections = $$('[data-section]').map(el => ({ el, id: el.id, top: 0 }));
  const par = $$('[data-speed]').map(el => ({ el, s: parseFloat(el.dataset.speed), top: 0, h: 0, box: el.parentElement }));
  const skewEls = $$('.skewy');
  const bands = $$('.band-in');
  const bar = $('#pbar');
  const accents = { home: '#2B44FF', projects: '#FF5D8F', about: '#2B44FF', contact: '#FF5D8F' };
  const links = $$('.sb-link');

  function measure() {
    vh = innerHeight; docH = root.scrollHeight;
    const y = scrollY;
    par.forEach(p => { const r = p.box.getBoundingClientRect(); p.top = r.top + y; p.h = r.height; });
    sections.forEach(s => { s.top = s.el.getBoundingClientRect().top + y; });
  }

  let lastY = scrollY, vel = 0, raf = 0, curSec = '', lit = -1;
  function frame() {
    raf = 0;
    const y = scrollY, d = y - lastY; lastY = y;
    vel += (d - vel) * .18;
    const v = clamp(vel, -50, 50);

    if (!reduce) {
      for (const p of par) {
        const c = p.top + p.h / 2 - y - vh / 2;
        if (Math.abs(c) < vh * 1.7) p.el.style.transform = `translate3d(0,${(-c * p.s).toFixed(1)}px,0)`;
      }
      const sk = (-v * .22).toFixed(2);
      skewEls.forEach(el => el.style.transform = `skewX(${sk}deg)`);
      bands.forEach((el, i) => el.style.transform = `skewX(${(i ? v : -v) * .35}deg)`);
    }

    // progress bar + active section
    const max = docH - vh;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0})`;
    let cur = sections[0].id;
    for (const s of sections) if (y + vh * .4 >= s.top) cur = s.id;
    if (cur !== curSec) {
      curSec = cur;
      links.forEach(a => a.setAttribute('aria-current', a.dataset.nav === cur));
      shell.style.setProperty('--acc', accents[cur] || '#2B44FF');
    }

    // About statement fill
    const r = st.getBoundingClientRect();
    const p = clamp((vh * .9 - r.top) / (r.height + vh * .3), 0, 1);
    const n = Math.round(p * words.length);
    if (n !== lit) { words.forEach((w, i) => w.classList.toggle('on', i < n)); lit = n; }

    if (Math.abs(vel) > .05) raf = requestAnimationFrame(frame);
  }
  const shell = $('#shell');
  const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { measure(); request(); });

  /* ---------- Project cards: scroll-driven depth ---------- */
  const track = $('#cards'), cards = $$('.card', track), thumb = $('#thumb'), nowL = $('#nowLabel');
  const names = ['Clavis', 'Unduhin', 'WhatsApp Bot'], acc = ['#2B44FF', '#FF5D8F', '#FFD400'];
  let cardRaf = 0, idx = 0;
  function updCards() {
    cardRaf = 0;
    const c = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = 1e9;
    cards.forEach((el, i) => {
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const d = clamp((mid - c) / (el.offsetWidth * .95), -1.3, 1.3), a = Math.abs(d);
      if (!reduce) {
        el.style.transform = `translate3d(0,${(a * 16).toFixed(1)}px,0) rotate(${(d * 4).toFixed(2)}deg) scale(${(1 - a * .08).toFixed(3)})`;
        el.style.setProperty('--px', (-d * 28).toFixed(1) + 'px');
      }
      if (a < bd) { bd = a; best = i; }
    });
    const mx = track.scrollWidth - track.clientWidth;
    thumb.style.transform = `translateX(${((mx ? track.scrollLeft / mx : 0) * 200).toFixed(1)}%)`;
    if (best !== idx) {
      idx = best;
      cards.forEach((el, i) => el.classList.toggle('is-active', i === best));
      thumb.style.background = acc[best];
      nowL.textContent = names[best];
      if (!reduce) nowL.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      if (navigator.vibrate) navigator.vibrate(6);
    }
  }
  track.addEventListener('scroll', () => { if (!cardRaf) cardRaf = requestAnimationFrame(updCards); }, { passive: true });

  // mouse drag (desktop preview); touch uses native swipe + snap
  let drag = null, dragged = false;
  track.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { drag = { x: e.clientX, l: track.scrollLeft, m: false }; dragged = false; } });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.m && Math.abs(dx) > 5) { drag.m = true; dragged = true; track.style.scrollSnapType = 'none'; track.classList.add('drag'); }
    if (drag.m) track.scrollLeft = drag.l - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.m) { track.classList.remove('drag'); const w = cards[0].offsetWidth + 18; track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: 'smooth' }); setTimeout(() => track.style.scrollSnapType = '', 450); }
    drag = null;
  });
  track.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') track.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * (cards[0].offsetWidth + 18), behavior: 'smooth' });
  });

  /* ---------- Magnetic buttons ---------- */
  $$('.mag').forEach(el => {
    let cx = 0, cy = 0;
    const move = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2 - cx)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2 - cy)) / (r.height / 2);
      cx = clamp(x, -1, 1) * 10; cy = clamp(y, -1, 1) * 8;
      el.classList.remove('rel');
      el.style.setProperty('--mx', cx.toFixed(1) + 'px'); el.style.setProperty('--my', cy.toFixed(1) + 'px');
    };
    const reset = () => {
      cx = cy = 0; el.classList.remove('down'); el.classList.add('rel');
      el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px');
    };
    if (reduce) return;
    el.addEventListener('pointerenter', move);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', e => { el.classList.add('down'); move(e); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, reset));
  });

  /* ---------- Tap micro-interaction: confetti squares ---------- */
  const PAL = ['#FF5D8F', '#FFD400', '#2B44FF', '#38E0A0', '#000'];
  function burst(x, y) {
    if (reduce) return;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i'), sz = 6 + Math.random() * 7;
      s.className = 'burst';
      Object.assign(s.style, { left: x + 'px', top: y + 'px', width: sz + 'px', height: sz + 'px', background: PAL[i % PAL.length] });
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, dist = 34 + Math.random() * 46;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px),calc(-50% + ${Math.sin(a) * dist}px)) scale(.2) rotate(${Math.random() * 360}deg)`, opacity: 0 }
      ], { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.15,.9,.3,1)' }).onfinish = () => s.remove();
    }
  }
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.btn,.soc,.sb-link,.menu-btn,.skill,.chip,.tag,.ring,.srow a,.name .mk')) burst(e.clientX, e.clientY);
  }, { passive: true });

  /* Tap a letter of the name: it jumps */
  const nameEl = $('#name');
  $$('#name .mk').forEach(m => m.addEventListener('pointerdown', () => {
    if (reduce || !nameEl.classList.contains('free')) return;
    m.firstElementChild.animate([
      { transform: 'translateY(0) rotate(0) scale(1)' },
      { transform: 'translateY(-14%) rotate(-7deg) scale(1.1)', offset: .35 },
      { transform: 'translateY(3%) rotate(2deg) scale(.98)', offset: .7 },
      { transform: 'none' }
    ], { duration: 650, easing: 'cubic-bezier(.3,.8,.3,1)' });
  }));

  /* ---------- Sidebar ---------- */
  const sb = $('#sidebar'), menuBtn = $('#menuBtn');
  let open = false;
  function setOpen(v) {
    open = v;
    sb.classList.toggle('open', v); menuBtn.classList.toggle('open', v);
    menuBtn.setAttribute('aria-expanded', v); menuBtn.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    sb.setAttribute('aria-hidden', !v);
    appEl.toggleAttribute('inert', v);
    root.classList.toggle('lock', v);
    if (navigator.vibrate) navigator.vibrate(8);
    if (v) setTimeout(() => open && $('.sb-link', sb).focus({ preventScroll: true }), 500);
  }
  menuBtn.addEventListener('click', () => setOpen(!open));
  $('#scrim').addEventListener('click', () => setOpen(false));
  $('#scrim').addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) { setOpen(false); menuBtn.focus(); } });
  let tx = null;
  sb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  sb.addEventListener('touchend', e => { if (tx !== null && e.changedTouches[0].clientX - tx < -60) setOpen(false); tx = null; }, { passive: true });

  /* ---------- Navigation with page wipe ---------- */
  let busy = false;
  async function goTo(id) {
    if (busy) return; busy = true; hold = true;
    if (open) setOpen(false);
    await wipeIn();
    root.classList.remove('lock'); appEl.removeAttribute('inert');
    const el = id === 'home' ? null : document.getElementById(id);
    window.scrollTo(0, el ? el.getBoundingClientRect().top + scrollY : 0);
    measure(); frame();
    try { history.replaceState(null, '', '#' + id); } catch (_) {}
    const out = wipeOut();
    setTimeout(() => { hold = false; release(); }, reduce ? 0 : 200);
    await out; busy = false;
  }
  $$('[data-nav]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); goTo(a.dataset.nav); }));

  /* ---------- Boot: loader wipe, then hero intro ---------- */
  async function boot() {
    await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
    await new Promise(r => setTimeout(r, reduce ? 0 : 700));
    measure(); frame(); updCards();
    wlabel.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: .6 }], { duration: 240, fill: 'forwards' });
    const out = wipeOut();
    setTimeout(() => $('#home').classList.add('in'), reduce ? 0 : 260);
    setTimeout(() => nameEl.classList.add('free'), reduce ? 0 : 2400);
    await out; wlabel.getAnimations().forEach(a => a.cancel());
  }
  if (document.readyState === 'complete') boot(); else addEventListener('load', boot);
  setTimeout(() => { measure(); request(); }, 900);
})();
