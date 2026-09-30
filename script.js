(function () {
  'use strict';

  var RETRY = 60;                                  // seconds between automatic checks
  var MARK = 'data-maintenance' + '-page';         // present on this page only, so the real site won't match

  var STR = {
    en: {
      title: '503 | Sutsudik is down for maintenance',
      h1: 'Error 503, service unavailable',
      tag: 'Back soon.',
      lead: 'Sutsudik is getting an update, so the site is offline for now. Nothing is wrong on your side.',
      retry: 'Check again', mail: 'Email me', checking: 'Checking…',
      wait: 'Next check in {s}s',
      still: 'Still under maintenance. Next check in {s}s',
      offline: 'Couldn\u2019t reach the server. Next check in {s}s',
      liveStill: 'Still under maintenance.',
      liveOffline: 'Couldn\u2019t reach the server.',
      b1: ['Down for maintenance', 'Be right back'],
      b2: ['503', 'Service unavailable'],
      langLabel: 'Language'
    },
    id: {
      title: '503 | Sutsudik sedang maintenance',
      h1: 'Error 503, layanan tidak tersedia',
      tag: 'Segera kembali.',
      lead: 'Sutsudik sedang diperbarui, jadi situs offline untuk sementara. Tidak ada masalah di perangkatmu.',
      retry: 'Cek lagi', mail: 'Email saya', checking: 'Mengecek…',
      wait: 'Cek berikutnya dalam {s} dtk',
      still: 'Masih maintenance. Cek lagi dalam {s} dtk',
      offline: 'Server tidak terjangkau. Cek lagi dalam {s} dtk',
      liveStill: 'Masih maintenance.',
      liveOffline: 'Server tidak terjangkau.',
      b1: ['Sedang maintenance', 'Segera kembali'],
      b2: ['503', 'Layanan tidak tersedia'],
      langLabel: 'Bahasa'
    }
  };

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var app = $('#app'), code = $('#code'), fill = $('#mFill'), mLabel = $('#mLabel'),
      live = $('#live'), retryBtn = $('#retry'), retryTxt = $('#retryTxt');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lang = 'en', state = 'wait', busy = false, deadline = 0;

  /* ---------- language ---------- */
  try { lang = localStorage.getItem('sutsudik-lang') || ''; } catch (e) { lang = ''; }
  if (!STR[lang]) lang = (navigator.language || 'en').toLowerCase().indexOf('id') === 0 ? 'id' : 'en';

  function t(k) { return STR[lang][k]; }

  function buildBand(track, words) {
    var html = '', group = '', i, n;
    for (n = 0; n < 2; n++) {
      for (i = 0; i < words.length; i++) group += '<span>' + words[i] + '</span><i class="star"></i>';
    }
    html = '<div class="grp">' + group + '</div><div class="grp">' + group + '</div>';
    track.innerHTML = html;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    $$('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    code.setAttribute('aria-label', t('h1'));
    $('.lang').setAttribute('aria-label', t('langLabel'));
    $$('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    buildBand($('#tr1'), t('b1'));
    buildBand($('#tr2'), t('b2'));
    render();
  }

  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      try { localStorage.setItem('sutsudik-lang', lang); } catch (e) {}
      applyLang();
    });
  });

  /* ---------- countdown + availability check ---------- */
  function remaining() { return Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); }

  function render() {
    mLabel.textContent = state === 'checking' ? t('checking') : t(state).replace('{s}', remaining());
    retryTxt.textContent = busy ? t('checking') : t('retry');
    retryBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function schedule() {
    deadline = Date.now() + RETRY * 1000;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    void fill.offsetWidth;
    fill.style.transition = '';
  }

  function tick() {
    var s = remaining();
    fill.style.width = ((RETRY - s) / RETRY * 100) + '%';
    render();
    if (s <= 0 && !busy) check();
  }

  function check() {
    if (busy) return;
    busy = true; state = 'checking'; render();
    var next = 'still';

    fetch(location.href.split('#')[0], { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) {
        return r.text().then(function (body) {
          // Site is back once the response is no longer a 503 and no longer this page.
          if (r.status !== 503 && body.indexOf(MARK) === -1) { location.reload(); return 'reload'; }
          return 'still';
        });
      })
      .catch(function () { return 'offline'; })
      .then(function (result) {
        if (result === 'reload') return;
        next = result;
        return new Promise(function (res) { setTimeout(res, 600); }).then(function () {
          busy = false; state = next; schedule();
          live.textContent = t(next === 'offline' ? 'liveOffline' : 'liveStill');
          render();
        });
      });
  }

  retryBtn.addEventListener('click', check);

  /* ---------- big 503: fit to width + tap wobble ---------- */
  function fit() {
    var avail = code.parentElement.clientWidth;
    code.style.fontSize = '100px';
    var w = code.offsetWidth;
    if (!w || !avail) return;
    code.style.fontSize = Math.min(100 * avail / w * 0.95, 340).toFixed(1) + 'px';
  }

  $$('.mk', code).forEach(function (m, i) {
    m.addEventListener('click', function () {
      if (reduce || !m.animate) return;
      m.animate(
        [{ transform: 'translateY(0) rotate(0deg)' },
         { transform: 'translateY(-12%) rotate(' + (i % 2 ? 6 : -6) + 'deg)' },
         { transform: 'translateY(0) rotate(0deg)' }],
        { duration: 650, easing: 'cubic-bezier(.3,1.9,.45,1)' }
      );
    });
  });

  window.addEventListener('resize', fit);

  /* ---------- start ---------- */
  $('#copy').textContent = '\u00A9 ' + new Date().getFullYear() + ' Sutsudik';
  applyLang();
  fit();
  schedule();
  setInterval(tick, 1000);

  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1200); })]).then(function () {
    fit();
    requestAnimationFrame(function () { app.classList.add('in'); });
  });
})();
