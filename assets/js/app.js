/* Поведение портала: небо, заставка, появление блоков, меню, поиск,
   выбор комплекса. Без библиотек — страница должна открываться быстро
   с телефона в бане. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ================= небо ================= */

  function sky(canvas) {
    var ctx = canvas.getContext('2d');
    var stars = [], meteors = [], w = 0, h = 0, dpr = 1, scrollY = 0, px = 0, py = 0, last = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(260, w * h / 5200));
      stars = [];
      for (var i = 0; i < count; i++) {
        var depth = Math.random();
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          z: .25 + depth * .75,                      // ближние крупнее и едут быстрее
          r: .4 + depth * depth * 1.5,
          a: .35 + Math.random() * .6,
          t: Math.random() * 6.28, s: .4 + Math.random() * 1.6,
          warm: Math.random() < .14
        });
      }
    }

    function meteor() {
      meteors.push({ x: Math.random() * w * .9, y: -20, vx: 5 + Math.random() * 4, vy: 3 + Math.random() * 2.5, life: 1 });
    }

    function frame(now) {
      var dt = Math.min(48, now - last) / 16.7; last = now;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.t += .02 * s.s * dt;
        var y = (s.y - scrollY * .12 * s.z + py * 14 * s.z) % h; if (y < 0) y += h;
        var x = (s.x + px * 14 * s.z) % w; if (x < 0) x += w;
        ctx.globalAlpha = s.a * (.62 + .38 * Math.sin(s.t));
        ctx.fillStyle = s.warm ? '#ffc9a3' : '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.2832); ctx.fill();
      }
      for (var m = meteors.length - 1; m >= 0; m--) {
        var k = meteors[m];
        k.x += k.vx * dt; k.y += k.vy * dt; k.life -= .012 * dt;
        if (k.life <= 0 || k.y > h) { meteors.splice(m, 1); continue; }
        var g = ctx.createLinearGradient(k.x, k.y, k.x - k.vx * 16, k.y - k.vy * 16);
        g.addColorStop(0, 'rgba(255,225,200,' + k.life + ')'); g.addColorStop(1, 'rgba(255,225,200,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - k.vx * 16, k.y - k.vy * 16); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (!calm && !document.hidden) requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      px = e.clientX / w - .5; py = e.clientY / h - .5;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !calm) { last = performance.now(); requestAnimationFrame(frame); }
    });
    if (!calm) setInterval(function () { if (!document.hidden && Math.random() < .55) meteor(); }, 5200);
    requestAnimationFrame(frame);
  }

  /* ================= заставка ================= */
  /* Полёт сквозь звёзды, из глубины вылетает логотип, вспышка — и небо
     «тормозит» в обычный фон. Показываем раз за посещение, по нажатию пропускаем. */

  function intro(el) {
    var canvas = $('canvas', el), ctx = canvas.getContext('2d');
    var w, h, stars = [], speed = 34, t0 = performance.now(), done = false;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(s) {
      s.x = (Math.random() - .5) * w * 2; s.y = (Math.random() - .5) * h * 2;
      s.z = Math.random() * w; s.pz = s.z;
      return s;
    }
    size();
    for (var i = 0; i < 520; i++) stars.push(spawn({}));

    function frame(now) {
      var t = (now - t0) / 1000;
      // сначала разгон, к вылету логотипа — плавное торможение
      speed = t < 1.3 ? 34 : Math.max(.6, 34 * Math.pow(.05, (t - 1.3) / 1.1));
      ctx.fillStyle = 'rgba(2,2,4,' + (t < 1.3 ? .28 : .5) + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.pz = s.z; s.z -= speed;
        if (s.z < 1) { spawn(s); continue; }
        var x = s.x / s.z * w * .5 + w / 2, y = s.y / s.z * w * .5 + h / 2;
        var ox = s.x / s.pz * w * .5 + w / 2, oy = s.y / s.pz * w * .5 + h / 2;
        if (x < 0 || x > w || y < 0 || y > h) { spawn(s); continue; }
        var k = 1 - s.z / w;
        ctx.strokeStyle = i % 7 ? 'rgba(255,255,255,' + k + ')' : 'rgba(255,190,150,' + k + ')';
        ctx.lineWidth = k * 2.2;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke();
      }
      if (!done) requestAnimationFrame(frame);
    }

    function finish() {
      if (done) return;
      el.classList.add('is-out');
      doc.classList.remove('has-intro');
      setTimeout(function () { done = true; el.remove(); document.body.classList.remove('is-locked'); }, 900);
    }

    document.body.classList.add('is-locked');
    el.classList.add('is-play');
    requestAnimationFrame(frame);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', finish, { once: true });
    setTimeout(finish, 3300);
  }

  /* ================= появление блоков ================= */

  function reveals() {
    var items = $$('.reveal, .path');
    if (!('IntersectionObserver' in window) || calm) { items.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in'); io.unobserve(en.target);
        if (en.target.hasAttribute('data-count')) count(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(function (e) { io.observe(e); });
  }

  function count(el) {
    var to = +el.getAttribute('data-count'), t0 = performance.now(), num = $('b', el);
    if (!num || !to) return;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* свет под курсором на карточках */
  function glow() {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ================= меню ================= */

  function menus() {
    var mega = $('.mega');
    if (mega) {
      var btn = $('button', mega), timer;
      var set = function (on) { mega.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', on); };
      btn.addEventListener('click', function () { set(!mega.classList.contains('is-open')); });
      mega.addEventListener('mouseenter', function () { clearTimeout(timer); set(true); });
      mega.addEventListener('mouseleave', function () { timer = setTimeout(function () { set(false); }, 180); });
      document.addEventListener('click', function (e) { if (!mega.contains(e.target)) set(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    }
    var sheet = $('.sheet'), burger = $('.burger');
    if (sheet && burger) {
      var toggle = function (on) { sheet.classList.toggle('is-open', on); document.body.classList.toggle('is-locked', on); };
      burger.addEventListener('click', function () { toggle(true); });
      $('.sheet__close', sheet).addEventListener('click', function () { toggle(false); });
      sheet.addEventListener('click', function (e) { if (e.target.closest('a')) toggle(false); });
    }
    var top = $('.to-top');
    if (top) {
      window.addEventListener('scroll', function () { top.classList.toggle('is-on', window.scrollY > 700); }, { passive: true });
      top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
  }

  /* ================= оглавление страницы ================= */

  function toc() {
    var nav = $('.toc'); if (!nav) return;
    var links = $$('.toc__link', nav), list = $('.toc__list', nav);
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var current = -1;
    function update() {
      var max = document.body.scrollHeight - window.innerHeight;
      nav.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max) : 0);
      var line = window.innerHeight * .35, idx = 0;
      for (var i = 0; i < targets.length; i++) if (targets[i] && targets[i].getBoundingClientRect().top < line) idx = i;
      if (idx === current) return;
      current = idx;
      links.forEach(function (a, i) { a.classList.toggle('is-current', i === idx); });
      var a = links[idx];
      list.scrollTo({ left: a.offsetLeft - list.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ================= выбор комплекса ================= */
  /* Сотрудник один раз отмечает свой комплекс — чужие карточки приглушаются
     на всех страницах. Ничего не прячем: приглушённое остаётся доступным. */

  function pick() {
    var box = $('.pick'); if (!box) return;
    var buttons = $$('button', box);
    function apply(c) {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-c') === c); });
      $$('.card[data-c]').forEach(function (card) {
        card.classList.toggle('is-dim', c !== 'all' && card.getAttribute('data-c') !== c);
      });
      $$('.tabs').forEach(function (tabs) {
        var tab = $('.tabs__tab[data-c="' + c + '"]', tabs);
        if (tab) tab.click();
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { var c = b.getAttribute('data-c'); store('complex', c); apply(c); });
    });
    apply(store('complex') || 'all');
  }

  /* ================= вкладки и увеличение картинок ================= */

  function tabs() {
    $$('.tabs').forEach(function (box) {
      var tabsEl = $$('.tabs__tab', box), panels = $$('.tabs__panel', box);
      tabsEl.forEach(function (tab, i) {
        tab.addEventListener('click', function () {
          tabsEl.forEach(function (t, j) { t.setAttribute('aria-selected', i === j); });
          panels.forEach(function (p, j) { p.hidden = i !== j; });
        });
      });
    });
  }

  function lightbox() {
    var box = $('.lightbox'); if (!box) return;
    var img = $('img', box);
    function close() { box.classList.remove('is-open'); document.body.classList.remove('is-locked'); }
    document.addEventListener('click', function (e) {
      var z = e.target.closest('.zoom');
      if (!z) return;
      img.src = z.getAttribute('data-full') || $('img', z).src;
      img.alt = $('img', z).alt;
      box.classList.add('is-open', 'is-fit');
      document.body.classList.add('is-locked');
    });
    // первое нажатие — в полный размер, чтобы прочитать мелкий текст схемы, второе — закрыть
    img.addEventListener('click', function (e) {
      e.stopPropagation();
      if (box.classList.contains('is-fit')) box.classList.remove('is-fit'); else close();
    });
    box.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ценности: планета и карточка подсвечивают друг друга */
  function orbit() {
    var box = $('.orbit'); if (!box) return;
    var planets = $$('.planet', box), values = $$('.value', box), timer, cur = 0;
    function on(i) {
      cur = i;
      planets.forEach(function (p, j) { p.classList.toggle('is-on', i === j); });
      values.forEach(function (v, j) { v.classList.toggle('is-on', i === j); });
    }
    function auto() { timer = setInterval(function () { on((cur + 1) % values.length); }, 2600); }
    planets.concat(values).forEach(function (el) {
      var i = +el.getAttribute('data-i');
      el.addEventListener('pointerenter', function () { clearInterval(timer); on(i); });
      el.addEventListener('click', function () { clearInterval(timer); on(i); });
    });
    box.addEventListener('pointerleave', function () { clearInterval(timer); if (!calm) auto(); });
    on(0); if (!calm) auto();
  }

  /* отбор блюд по названию и составу прямо на странице */
  function filter() {
    var box = $('.filter'); if (!box) return;
    var input = $('input', box), count = $('.filter__count', box), empty = $('.filter__empty');
    var items = $$('.dish').map(function (el) { return { el: el, text: el.textContent.toLowerCase().replace(/ё/g, 'е') }; });
    input.addEventListener('input', function () {
      var words = input.value.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean), shown = 0;
      items.forEach(function (it) {
        var ok = words.every(function (w) { return it.text.indexOf(w) >= 0; });
        it.el.hidden = !ok;
        if (ok) { shown++; it.el.classList.add('is-in'); }
      });
      count.textContent = words.length ? shown + ' из ' + items.length : '';
      if (empty) empty.hidden = shown > 0;
    });
  }

  /* ================= поиск ================= */

  function search() {
    var box = $('.search'); if (!box) return;
    var input = $('input', box), list = $('.search__list', box), index = null, active = 0, hits = [];
    var base = doc.getAttribute('data-base') || '';

    function norm(s) { return s.toLowerCase().replace(/ё/g, 'е'); }
    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function mark(text, words) {
      var out = esc(text);
      words.forEach(function (w) {
        out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
      });
      return out;
    }

    function open() {
      box.classList.add('is-open'); document.body.classList.add('is-locked');
      input.value = ''; render(''); input.focus();
      if (!index) {
        fetch(base + 'assets/search.json').then(function (r) { return r.json(); }).then(function (d) {
          index = d.map(function (e) { e.n = norm(e.t + ' ' + e.p + ' ' + (e.x || '')); e.nt = norm(e.t); return e; });
          render(input.value);
        }).catch(function () { list.innerHTML = '<div class="search__hint">Поиск не загрузился. Обновите страницу.</div>'; });
      }
    }
    function close() { box.classList.remove('is-open'); document.body.classList.remove('is-locked'); }

    function render(q) {
      var words = norm(q).split(/\s+/).filter(Boolean);
      if (!words.length) { hits = []; list.innerHTML = '<div class="search__hint">Начните вводить: «чек-лист», «медкнижка», «меню», «зарплата»…</div>'; return; }
      if (!index) { list.innerHTML = '<div class="search__hint">Загружаю…</div>'; return; }
      hits = index.map(function (e) {
        var score = 0;
        for (var i = 0; i < words.length; i++) {
          var w = words[i];
          if (e.n.indexOf(w) < 0) return null;
          score += e.nt.indexOf(w) >= 0 ? 10 : 1;
        }
        return { e: e, s: score };
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 30);
      active = 0;
      if (!hits.length) { list.innerHTML = '<div class="search__hint">Ничего не нашлось. Попробуйте другое слово.</div>'; return; }
      list.innerHTML = hits.map(function (h, i) {
        var e = h.e, text = '';
        if (e.x) {
          var pos = norm(e.x).indexOf(words[0]);
          if (pos >= 0) { var from = Math.max(0, pos - 50); text = (from ? '…' : '') + e.x.slice(from, from + 150) + '…'; }
        }
        return '<a class="hit' + (i ? '' : ' is-active') + '" href="' + base + e.u + '">' +
          '<span class="hit__where">' + esc(e.p) + '</span>' +
          '<span class="hit__title">' + mark(e.t, words) + '</span>' +
          (text ? '<span class="hit__text">' + mark(text, words) + '</span>' : '') + '</a>';
      }).join('');
    }

    function move(d) {
      var items = $$('.hit', list); if (!items.length) return;
      items[active].classList.remove('is-active');
      active = (active + d + items.length) % items.length;
      items[active].classList.add('is-active');
      items[active].scrollIntoView({ block: 'nearest' });
    }

    $$('[data-search]').forEach(function (b) { b.addEventListener('click', open); });
    $('.search__field button', box).addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.hit')) close(); });
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { var a = $('.hit.is-active', list); if (a) a.click(); }
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'л')) { e.preventDefault(); open(); }
      else if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  /* ================= запуск ================= */

  var skyCanvas = $('.sky__stars');
  if (skyCanvas) sky(skyCanvas);

  var introEl = $('.intro');
  if (introEl) {
    if (doc.classList.contains('has-intro') && !calm) intro(introEl); else introEl.remove();
  }

  reveals(); glow(); menus(); toc(); tabs(); pick(); lightbox(); orbit(); filter(); search();
})();
