/* SOLO Marketing, concept interactions (v3).
   Vanilla, no dependencies. Everything here is an enhancement: the page reads
   fully without it, and motion steps aside under prefers-reduced-motion. */

const CONFIG = {
  // OWNER: set the address that should receive contact-form messages.
  // While empty, the final step offers "Copy message" and shows an owner note.
  email: 'solomarketing.ut@gmail.com',
  subject: 'New conversation from the SOLO website',
  // HubSpot form submission (Forms API). "Send it" posts here first; if it
  // fails, the button falls back to the mailto link above.
  hubspot: {
    portalId: '246548239',
    formId: '2a76de61-c2cb-469c-8afc-a9ff9dbebb79',
  },
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const bounce = t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  };
  const px = v => `${v.toFixed(1)}px`;
  const root = document.documentElement;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;

  if (new URLSearchParams(location.search).has('clean')) root.classList.add('clean');

  // progress of a pinned stage: 0 when it sticks, 1 when its spacer runs out
  const smooth = {};   // GSAP-smoothed progress per pinned sequence, when GSAP is running
  const pinProgress = (stage, spacer, top = 0) => (top + stage.offsetHeight - spacer.getBoundingClientRect().top) / spacer.offsetHeight;

  /* ---------------------------------------------------------------- masthead */
  const mast = $('[data-masthead]');
  const progress = $('[data-progress]');
  const stopLabel = $('[data-current-stop]');
  const sections = $$('main > section, footer');
  let currentStop = '';

  function updateMasthead() {
    const max = root.scrollHeight - innerHeight;
    progress.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);

    const probe = mast.offsetHeight / 2;
    const read = innerHeight * .35;
    let theme = 'beige', name = currentStop;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) {
        const band = [...s.classList].find(c => c.startsWith('band--'));
        theme = s.dataset.surface || (band ? band.slice(6) : 'beige');
      }
      if (r.top <= read && r.bottom > read && s.dataset.stopName) name = s.dataset.stopName;
    }
    if (mast.dataset.theme !== theme) mast.dataset.theme = theme;
    if (name && name !== currentStop) {
      currentStop = name;
      stopLabel.textContent = name;
      if (!reduced) { stopLabel.classList.remove('is-swapping'); void stopLabel.offsetWidth; stopLabel.classList.add('is-swapping'); }
    }
  }

  /* -------------------------------------------------------------------- menu */
  const menu = $('[data-menu]');
  const openBtn = $('[data-menu-open]');
  const closeBtn = $('[data-menu-close]');
  const outside = [$('main'), $('footer'), mast];
  $$('.menu__list li', menu).forEach((li, i) => li.style.setProperty('--i', i));

  function openMenu() {
    menu.hidden = false;
    menu.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    outside.forEach(el => el.inert = true);
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    closeBtn.focus();
  }
  function closeMenu(restoreFocus = true) {
    menu.hidden = true;
    menu.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    outside.forEach(el => el.inert = false);
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    if (restoreFocus) openBtn.focus();
  }
  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', () => closeMenu());
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
    if (e.key === 'Tab') {
      const f = $$('a, button', menu);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  $$('a', menu).forEach(a => a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return closeMenu(false);
    e.preventDefault();
    closeMenu(false);
    history.pushState(null, '', a.getAttribute('href'));
    if (lenis) lenis.scrollTo(target);   // Lenis honours the page's scroll-padding for the header
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    // move focus with the reader, without a second jump
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }));

  /* ------------------------------------------------- hero: letters on the line */
  const splitLetters = el => {
    const text = el.textContent;
    el.textContent = '';
    return [...text].map(c => {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = c;
      el.append(s);
      return s;
    });
  };
  const heroTitle = $('[data-hero-title]');
  const letters = $$('[data-letters]', heroTitle).flatMap(splitLetters);
  const mess = [[-.04, .5, -12], [.03, .62, 9], [-.02, .44, -6], [.05, .7, 14], [-.03, .52, -9], [.02, .66, 11], [-.05, .48, -7], [.04, .58, 8], [0, .64, -11]];
  const setMess = (on) => letters.forEach((c, i) => {
    const [x, y, r] = mess[i % mess.length];
    c.style.transform = on ? `translate(${x}em, ${y}em) rotate(${r}deg)` : '';
    c.style.opacity = on ? '0' : '';
  });
  const hop = c => c.animate(
    [{ transform: 'none' }, { transform: 'translateY(-.16em) rotate(-5deg)', offset: .35 }, { transform: 'translateY(.02em)', offset: .75 }, { transform: 'none' }],
    { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });

  // a ripple of hops runs through the words, left to right
  const ripple = (delay = 0) => letters.forEach((c, i) => setTimeout(() => hop(c), delay + i * 45));

  function heroIn() {
    if (reduced) return;
    letters.forEach((c, i) => {
      c.style.transition = `transform 700ms cubic-bezier(.34,1.56,.64,1) ${i * 32}ms, opacity 300ms ease ${i * 32}ms`;
    });
    requestAnimationFrame(() => setMess(false));
    ripple(letters.length * 32 + 350);
    setTimeout(() => letters.forEach(c => c.style.transition = ''), letters.length * 32 + 900);
  }

  // pointer: letters lift as you move across them; a tap re-runs the line
  if (!reduced && matchMedia('(hover: hover)').matches) {
    let raf = 0, mx = null;
    const lift = () => {
      raf = 0;
      letters.forEach(c => {
        if (mx === null) { c.style.translate = ''; return; }
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mx);
        const k = Math.max(0, 1 - d / 140);
        c.style.translate = k ? `0 ${(-.1 * k * k).toFixed(3)}em` : '';
      });
    };
    heroTitle.addEventListener('pointermove', e => { mx = e.clientX; if (!raf) raf = requestAnimationFrame(lift); });
    heroTitle.addEventListener('pointerleave', () => { mx = null; if (!raf) raf = requestAnimationFrame(lift); });
  }
  heroTitle.addEventListener('click', () => { if (!reduced) ripple(); });

  /* ------------------------------------------------------------------ loader */
  const loader = $('[data-loader]');
  let seen = false;
  try { seen = sessionStorage.getItem('solo-loaded') === '1'; } catch {}
  function loaded() { root.classList.add('is-loaded'); heroIn(); }
  if (reduced || seen) {
    loaded();
  } else {
    setMess(true);
    loader.hidden = false;
    const count = $('[data-loader-count]', loader), bar = $('[data-loader-rail]', loader);
    let t0 = performance.now(), dur = 1500;
    // any key, click or tap skips straight to the page
    const skip = () => { t0 = -1e9; };
    addEventListener('keydown', skip, { once: true, capture: true });
    loader.addEventListener('pointerdown', skip, { once: true });
    const step = now => {
      const t = clamp((now - t0) / dur), k = 1 - Math.pow(1 - t, 2.2);
      count.textContent = Math.round(k * 100);
      bar.style.setProperty('--p', k.toFixed(3));
      if (t < 1) return requestAnimationFrame(step);
      removeEventListener('keydown', skip, { capture: true });
      loader.classList.add('is-done');
      loaded();
      try { sessionStorage.setItem('solo-loaded', '1'); } catch {}
      setTimeout(() => { loader.hidden = true; }, 800);
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------- stops, reveals, rows */
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -18% 0px' });
  $$('.stop, .reveal, [data-prob-item]').forEach(el => io.observe(el));

  /* --------------------------------- who we work with (three-card carousel) */
  const who = $('[data-who]');
  const whoStage = $('[data-who-stage]');
  const frames = $$('.who__frame', who);
  const whoCards = frames.map(f => $('.who__card', f));
  const whoTags = frames.map(f => $('.who__tag', f));
  const whoSpacer = $('.who__spacer', who);
  const whoArrow = $('[data-who-arrow]', who);
  const bgMap = { navy: '#3c3f8c', green: '#224c34', burgundy: '#76202d' };
  let whoOn = false, whoActive = -1, whoDone = false;

  // split each handwritten label into letters so it can be written out in order
  whoTags.forEach(tag => {
    const text = $('.who__tagtext', tag);
    let i = 0;
    [...text.childNodes].forEach(node => {
      if (node.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'wch'; s.textContent = ch; s.style.setProperty('--i', i++);
        frag.append(s);
      });
      node.replaceWith(frag);
    });
  });
  // size each ring to the words it holds
  const sizeTags = () => whoTags.forEach(tag => {
    tag.style.removeProperty('--E');
    const t = $('.who__tagtext', tag);
    tag.style.setProperty('--E', px(Math.max(t.offsetWidth / 1.12, t.offsetHeight / .92)));
  });

  function measureWho() {
    whoOn = !reduced && innerHeight >= 520 && innerWidth >= 340;
    who.classList.toggle('is-pinned', whoOn);
    whoActive = -1;
    const reset = () => {
      who.dataset.surface = 'navy';
      frames.forEach(f => f.classList.remove('is-on', 'is-past'));
      whoCards.forEach(c => c.removeAttribute('style'));
    };
    sizeTags();
    if (!whoOn) return reset();
    // if the words would collide with the cards (e.g. very large text), use the calm grid instead
    const sr = whoStage.getBoundingClientRect(), c0 = whoCards[0], cs = getComputedStyle(c0);
    const cx = sr.left + parseFloat(cs.left), cy = sr.top + parseFloat(cs.top), w = c0.offsetWidth;
    const box = { l: cx - w * .7 - 8, r: cx + w * .7 + 8, t: cy - c0.offsetHeight / 2 - 8, b: cy + c0.offsetHeight / 2 + 8 };
    const hits = el => { const r = el.getBoundingClientRect(); return r.right > box.l && r.left < box.r && r.bottom > box.t && r.top < box.b; };
    if ([$('[data-who-intro]', who), ...frames.flatMap(f => $$('.who__l, .who__r', f))].some(hits)) {
      whoOn = false; who.classList.remove('is-pinned'); return reset();
    }
    // images inside the sticky stage are needed as soon as it pins
    $$('img', who).forEach(i => { i.loading = 'eager'; });
  }

  // the text box of a line, not its full column
  const textRect = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };

  function setWhoActive(i, done = false) {
    const moved = i !== whoActive;
    whoActive = i; whoDone = done;
    frames.forEach((fr, k) => {
      // every industry passed joins the list on the right; at the end of the run the last one joins too
      fr.classList.toggle('is-on', k === i);
      fr.classList.toggle('is-past', k < i || (done && k === i));
    });
    const bg = frames[i].dataset.bg;
    whoStage.style.setProperty('--who-bg', bgMap[bg]);
    who.dataset.surface = bg;
    if (!moved) return;
    // the doodle arrow runs from the left line to the right line, behind the cards
    whoArrow.classList.remove('is-on');
    if (innerWidth < 800) return;
    const st = whoStage.getBoundingClientRect();
    const L = textRect($('.who__l', frames[i])), R = textRect($('.who__r', frames[i]));
    const x0 = L.right + 20 - st.left + 24, x1 = R.left - 20 - st.left - 24;   // lines sit 1.5rem off their rest spot until shown
    if (x1 - x0 < 90) return;
    whoArrow.style.setProperty('--ax', px(x0));
    whoArrow.style.setProperty('--ay', px((L.top + L.bottom) / 2 - st.top));
    whoArrow.style.setProperty('--af', px((x1 - x0) / 7.42));
    void whoArrow.offsetWidth;
    whoArrow.classList.add('is-on');
  }

  // one deck of cards: each new card rises over the last, which tucks behind and stays visible
  function deck(cards, f, cardW, travel, peek = .34, first = 1) {
    let active = 0;
    cards.forEach((card, i) => {
      const rise = i === 0 ? first : ease(clamp((f - i) / .7));
      const next = i < cards.length - 1 ? ease(clamp((f - i - 1) / .7)) : 0;
      const gone = i < cards.length - 2 ? ease(clamp((f - i - 2) / .7)) : 0;
      if (i > 0 && clamp((f - i) / .7) >= .5) active = i;
      card.style.setProperty('--y', px((1 - rise) * travel));
      card.style.setProperty('--x', px(-next * cardW * peek));
      card.style.setProperty('--r', `${((1 - rise) * 7 - next * 5).toFixed(2)}deg`);
      card.style.setProperty('--s', (1 - next * .08).toFixed(3));
      card.style.setProperty('--b', (1 - next * .22).toFixed(3));
      card.style.setProperty('--o', (1 - gone).toFixed(3));
    });
    return active;
  }

  function updateWho() {
    if (!whoOn) return;
    const p = smooth.who ? smooth.who.p : clamp(pinProgress(whoStage, whoSpacer));
    const n = frames.length;
    const f = clamp((p - .04) / .9) * (n - 1);
    const S = whoCards[0].offsetWidth * .17;
    // three cards always on stage: the next waits behind on the left, the last behind on the right,
    // and the row slides right as you scroll
    whoCards.forEach((card, j) => {
      const rel = (((j - f) + n / 2) % n + n) % n - n / 2;
      const a = Math.abs(rel), side = Math.sign(rel);
      let x, s, o, b;
      if (a <= 1) { x = -rel * S; s = 1 - .1 * a; o = 1; b = 1 - .28 * a; }
      else { const t = Math.min(a - 1, 1); x = -side * (S + t * S * 1.4); s = .9 - .08 * t; o = 1 - t; b = .72; }
      card.style.setProperty('--x', px(x));
      card.style.setProperty('--s', s.toFixed(3));
      card.style.setProperty('--o', o.toFixed(3));
      card.style.setProperty('--b', b.toFixed(3));
      card.style.zIndex = String(10 - Math.round(a * 4));
    });
    const active = Math.round(f) % n, done = p > .97;
    if (active !== whoActive || done !== whoDone) setWhoActive(active, done);
  }

  /* ------------------------------------------------------ wave + ticker */
  const wave = $('[data-wave] svg');
  const ticker = $('[data-ticker]');
  const tickRow = $('.ticker__row', ticker);
  function updateTicker() {
    if (reduced) return;
    const r = ticker.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    const p = (innerHeight - r.top) / (innerHeight + r.height);
    tickRow.style.setProperty('--tx', px(-p * tickRow.scrollWidth * .3));
    wave.style.setProperty('--wx', px(-((scrollY * .5) % (wave.clientWidth / 2))));
  }

  /* --------------------------------------------- the real problem (circles) */
  const prob = $('[data-prob]');
  const probStage = $('[data-prob-stage]');
  const probSpacer = $('.prob__spacer', prob);
  const orbs = $$('[data-orb]', prob);
  const probItems = $$('[data-prob-item]', prob);
  const syms = probItems.map(it => $$('[data-sym]', it));
  const probRail = $('[data-prob-rail]', prob);
  // a loose heap, bottom right (u across, v down); groups are shuffled together
  const heap = [[.10, .95], [.30, .97], [.52, .96], [.74, .95], [.93, .97], [.20, .80], [.42, .81], [.64, .80], [.85, .82], [.31, .65], [.55, .66], [.44, .5]];
  const heapOrder = [0, 5, 9, 3, 1, 6, 11, 8, 2, 4, 10, 7];
  let probOn = false, probGeo = null;

  function measureProb() {
    probOn = !reduced && innerWidth >= 800 && innerHeight >= 600;
    prob.classList.toggle('is-pinned', probOn);
    const clear = () => { [...orbs, ...probItems, ...syms.flat(), probStage].forEach(el => el.removeAttribute('style')); };
    clear();
    if (!probOn) return;
    const W = probStage.offsetWidth, H = probStage.offsetHeight;
    // with very large text the side columns won't fit: fall back to the static rows
    const tall = probItems.some(it => $('.prob__name', it).offsetHeight + $('.prob__answer', it).offsetHeight > H * .62);
    const wide = syms.flat().some(s => s.offsetWidth > W * .3 - 16);
    if (tall || wide) { prob.classList.remove('is-pinned'); probOn = false; clear(); return; }
    const D = Math.min(W * .28, H * .5);
    probStage.style.setProperty('--D', px(D));
    const dot = syms[0][0].querySelector('.sym__dot');
    probGeo = { W, H, D, cx: W * .52, cy: H * .5, liH: syms[0][0].offsetHeight, dotW: dot.offsetWidth };
  }

  function updateProb() {
    if (!probOn) return;
    const { W, H, D, cx, cy, liH } = probGeo;
    const raw = pinProgress(probStage, probSpacer, mast.offsetHeight);
    const p = smooth.prob ? smooth.prob.p : clamp(raw);
    const S = [.13, .37, .61], FIN = .86;
    const fk = S.map(s => ease(clamp((p - s) / .07)));
    const fin = ease(clamp((p - FIN) / .08));
    const w = fk.map((v, k) => v * (1 - (k < 2 ? fk[k + 1] : fin)));
    const cluster = [[-.3, -.12], [.3, -.12], [0, .32]];
    const back = [[-.46, -.52], [.46, -.52], [0, -.7]];
    const gapX = Math.min(D * .95, W * .26);
    const orbPos = orbs.map((o, k) => {
      let x = lerp(back[k][0] * D, 0, w[k]), y = lerp(back[k][1] * D, 0, w[k]);
      let s = lerp(.38, 1, w[k]), op = lerp(.3, 1, w[k]);
      x = lerp(cluster[k][0] * D, x, fk[0]); y = lerp(cluster[k][1] * D, y, fk[0]);
      s = lerp(.55, s, fk[0]); op = lerp(1, op, fk[0]);
      x = lerp(cx + x, W / 2 + (k - 1) * gapX, fin); y = lerp(cy + y, cy - H * .04, fin);
      s = lerp(s, .5, fin); op = lerp(op, 1, fin);
      o.style.setProperty('--x', px(x)); o.style.setProperty('--y', px(y));
      o.style.setProperty('--s', s.toFixed(3)); o.style.setProperty('--o', op.toFixed(3));
      o.style.zIndex = w[k] > .5 ? 3 : 1;
      return [x, y];
    });
    probRail.style.setProperty('--rx0', px(W / 2 - gapX)); probRail.style.setProperty('--rx1', px(W / 2 + gapX));
    probRail.style.setProperty('--ry', px(cy - H * .04));
    probStage.style.setProperty('--fin', fin.toFixed(3));

    const gap = clamp(H * .1, 44, 72);
    probItems.forEach((it, g) => {
      const og = ease(clamp((p - S[g] - .03) / .07));
      const st = clamp((p - S[g] - .1) / .05);
      const fx = clamp((p - S[g] - .15) / .05);
      const ab = ease(clamp((p - (g < 2 ? S[g + 1] : FIN)) / .06));
      it.style.setProperty('--wt', clamp((w[g] - .35) / .4).toFixed(3));
      it.style.setProperty('--st', (1 - st).toFixed(3));
      it.style.setProperty('--fx', fx.toFixed(3));
      syms[g].forEach((li, j) => {
        const n = g * 4 + j, [u, v] = heap[heapOrder[n]];
        const fall = bounce(clamp(((raw < 0 ? raw : p) + .08 - n * .004) / .09));
        let x = lerp(W * .66, W * .95, u), y = lerp(-H * .15, lerp(H * .6, H * .93, v), fall);
        x = lerp(x, W * .69, og); y = lerp(y, cy + (j - 1.5) * gap, og);
        x = lerp(x, orbPos[g][0], ab); y = lerp(y, orbPos[g][1], ab);
        li.style.setProperty('--x', px(x - probGeo.dotW / 2));
        li.style.setProperty('--y', px(y - liH / 2));
        li.style.setProperty('--lo', (og * (1 - ab)).toFixed(3));
        li.style.setProperty('--ds', (1 - ab * .95).toFixed(3));
      });
    });
  }

  /* ------------------------------------------ from stuck to moving (rings) */
  const appr = $('[data-appr]');
  const apprStage = $('[data-appr-stage]');
  const apprSpacer = $('.appr__spacer', appr);
  const rings = $$('[data-ring]', appr);
  const apprSteps = $$('[data-appr-step]', appr);
  const orbit = $('[data-orbit]', appr);
  const core = $('[data-core]', appr);
  let apprOn = false, apprGeo = null;

  function measureAppr() {
    apprOn = !reduced && innerWidth >= 800 && innerHeight >= 600;
    appr.classList.toggle('is-pinned', apprOn);
    const clear = () => [...rings, ...apprSteps, apprStage, orbit, core].forEach(el => el.removeAttribute('style'));
    clear();
    if (!apprOn) return;
    const W = apprStage.offsetWidth, H = apprStage.offsetHeight;
    if (apprSteps.some(s => s.offsetHeight > H * .86)) { appr.classList.remove('is-pinned'); apprOn = false; clear(); return; }
    const D = Math.min(W * .3, H * .56);
    apprStage.style.setProperty('--D', px(D));
    apprGeo = { W, H, D, cx: W * .28, cy: H * .5 };
    orbit.style.setProperty('--cx', px(apprGeo.cx)); orbit.style.setProperty('--cy', px(apprGeo.cy));
    orbit.style.setProperty('--R', px(D * .64));
    core.style.setProperty('--cx', px(apprGeo.cx)); core.style.setProperty('--cy', px(apprGeo.cy));
  }

  function updateAppr() {
    if (!apprOn) return;
    const { D, cx, cy } = apprGeo;
    const p = smooth.appr ? smooth.appr.p : clamp(pinProgress(apprStage, apprSpacer, mast.offsetHeight));
    const cv = ease(clamp((p - .06) / .1));
    const S = [.16, .33, .5, .67], fin = ease(clamp((p - .84) / .1));
    const a = S.map(s => ease(clamp((p - s) / .05)));
    const w = a.map((v, k) => v * (1 - (k < 3 ? a[k + 1] : fin)));
    const venn = [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]];
    rings.forEach((r, k) => {
      let x = lerp(venn[k][0] * D, 0, cv), y = lerp(venn[k][1] * D, 0, cv), s = lerp(.62, 1, cv);
      let o = lerp(1, w[k], cv), f = w[k] * cv;
      x = lerp(x, venn[k][0] * D, fin); y = lerp(y, venn[k][1] * D, fin); s = lerp(s, .62, fin);
      o = lerp(o, 1, fin); f = lerp(f, 0, fin);
      r.style.setProperty('--x', px(cx + x)); r.style.setProperty('--y', px(cy + y));
      r.style.setProperty('--s', s.toFixed(3)); r.style.setProperty('--o', o.toFixed(3));
      r.style.setProperty('--f', f.toFixed(3));
      r.style.setProperty('--lo', Math.max(1 - cv, w[k] * cv, fin).toFixed(3));
      r.style.setProperty('--lr', `${((1 - w[k]) * cv * (1 - fin) * -8).toFixed(2)}deg`);
    });
    apprSteps.forEach((s, k) => s.style.setProperty('--w', clamp((w[k] - .3) / .5).toFixed(3)));
    orbit.style.setProperty('--oo', (cv * (1 - fin)).toFixed(3));
    orbit.style.setProperty('--rot', `${(p * 540).toFixed(1)}deg`);
    apprStage.style.setProperty('--fin', Math.max(1 - cv, fin).toFixed(3));
    core.style.setProperty('--fin', fin.toFixed(3));
  }

  /* ----------------------------------------- working together (rising cards) */
  const together = $('[data-together]');
  const tStage = $('[data-together-stage]');
  const tSpacer = $('.together__spacer', together);
  const tCards = $$('[data-tcard]', together);
  let tOn = false, tGeo = [];

  function measureTogether() {
    tOn = !reduced && innerWidth >= 800 && innerHeight >= 620;
    together.classList.toggle('is-pinned', tOn);
    const clear = () => tCards.forEach(c => c.removeAttribute('style'));
    clear();
    if (!tOn) return;
    const W = tStage.offsetWidth, H = tStage.offsetHeight;
    const row = W >= 1200;
    const cw = row ? Math.min(304, (W - 96 - 72) / 4) : Math.min(340, W * .4);
    tCards.forEach(c => c.style.setProperty('--cw', px(cw)));
    const top = mast.offsetHeight + 24;
    if (tCards.some(c => c.offsetHeight > H - top - 24)) { together.classList.remove('is-pinned'); tOn = false; clear(); return; }
    const rot = [-3, 2, -2, 3];
    tGeo = tCards.map((c, i) => {
      const h = c.offsetHeight;
      const cx = row ? W / 2 + (i - 1.5) * (cw + 24) : W / 2 + (i - 1.5) * cw * .3;
      let cy = row ? H * .6 + (i % 2 ? -1 : 1) * H * .03 : H * .58 + (i % 2 ? -1 : 1) * H * .02;
      cy = clamp(cy, top + h / 2, H - h / 2 - 16);
      c.style.setProperty('--cx', px(cx)); c.style.setProperty('--cy', px(cy));
      return { rot: rot[i], travel: H - cy + h / 2 + 40 };
    });
  }

  function updateTogether() {
    if (!tOn) return;
    const p = smooth.together ? smooth.together.p : clamp(pinProgress(tStage, tSpacer));
    tCards.forEach((c, i) => {
      const rise = ease(clamp((p - .06 - i * .2) / .18));
      c.style.setProperty('--y', px((1 - rise) * tGeo[i].travel));
      c.style.setProperty('--r', `${lerp(tGeo[i].rot + 10, tGeo[i].rot, rise).toFixed(2)}deg`);
    });
  }

  /* ------------------------------------------ signals / launchpad / stack */
  const ways = $('[data-ways]');
  const wStage = $('[data-ways-stage]');
  const wSpacer = $('.ways__spacer', ways);
  const wCards = $$('[data-wcard]', ways);
  const wDetails = $$('[data-wdetail]', ways);
  let wOn = false;

  function measureWays() {
    wOn = !reduced && innerWidth >= 900 && innerHeight >= 600;
    ways.classList.toggle('is-pinned', wOn);
    const clear = () => { [...wCards, wStage].forEach(el => el.removeAttribute('style')); wDetails.forEach(d => d.classList.remove('is-on')); delete ways.dataset.surface; };
    clear();
    if (!wOn) return;
    const H = wStage.offsetHeight;
    const over = wCards.some(c => c.scrollHeight > c.clientHeight + 2) || wDetails.some(d => d.offsetHeight > H * .8) || $('.ways__intro', ways).offsetHeight > H * .8;
    if (over) { ways.classList.remove('is-pinned'); wOn = false; clear(); }
  }

  function updateWays() {
    if (!wOn) return;
    const p = smooth.ways ? smooth.ways.p : clamp(pinProgress(wStage, wSpacer));
    const t = clamp(p / .08);
    wStage.style.setProperty('--ways-bg', `color-mix(in srgb, #3c3f8c ${((1 - t) * 100).toFixed(1)}%, #f5f5f5)`);
    const dark = t < .5;
    wStage.style.setProperty('--ways-fg', dark ? '#f6ddbf' : '#3c3f8c');
    ways.dataset.surface = dark ? 'navy' : 'beige';
    const f = clamp((p - .15) / .72) * 2.75;
    const cardH = wCards[0].offsetHeight;
    const active = deck(wCards, f, wCards[0].offsetWidth, wStage.offsetHeight / 2 + cardH / 2 + 40, .16, ease(clamp((p - .06) / .12)));
    wDetails.forEach((d, i) => d.classList.toggle('is-on', i === active && t > .5));
  }

  /* ------------------------------------------------ proof: overlapping deck */
  const track = $('[data-proof-track]');
  const pCards = $$('[data-pcard]', track);
  const ctrl = $('[data-proof-ctrl]');
  const prevBtn = $('[data-proof-prev]'), nextBtn = $('[data-proof-next]');
  const pNow = $('[data-proof-now]');
  $('[data-proof-total]').textContent = pCards.length;
  ctrl.hidden = false;
  let pActive = 0;
  const stepW = () => (pCards[1].offsetLeft - pCards[0].offsetLeft) || 1;
  function updateProof() {
    const a = track.scrollLeft / stepW();
    pCards.forEach((c, i) => {
      const d = i - a, k = Math.min(1, Math.abs(d));
      c.style.setProperty('--z', String(100 - Math.round(Math.abs(d) * 10)));
      c.style.setProperty('--r', `${(d < 0 ? -5 * k : 2.5 * k).toFixed(2)}deg`);
      c.style.setProperty('--s', (1 - .07 * k).toFixed(3));
    });
    const now = clamp(Math.round(a), 0, pCards.length - 1);
    if (now !== pActive || !pNow.dataset.set) { pActive = now; pNow.dataset.set = '1'; pNow.textContent = now + 1; }
    prevBtn.disabled = now === 0;
    nextBtn.disabled = now === pCards.length - 1;
  }
  // room after the last card, so every card can reach the front
  function measureProof() {
    track.style.paddingRight = '';
    const cs = getComputedStyle(track);
    const room = track.clientWidth - parseFloat(cs.paddingLeft) - pCards.at(-1).offsetWidth;
    track.style.paddingRight = px(Math.max(parseFloat(cs.paddingRight), room));
    updateProof();
  }
  const goCard = i => track.scrollTo({ left: clamp(i, 0, pCards.length - 1) * stepW(), behavior: reduced ? 'auto' : 'smooth' });
  prevBtn.addEventListener('click', () => goCard(pActive - 1));
  nextBtn.addEventListener('click', () => goCard(pActive + 1));
  track.addEventListener('keydown', e => {
    const k = { ArrowRight: pActive + 1, ArrowLeft: pActive - 1, Home: 0, End: pCards.length - 1 }[e.key];
    if (k !== undefined) { e.preventDefault(); goCard(k); }
  });
  track.addEventListener('scroll', () => requestAnimationFrame(updateProof), { passive: true });
  /* ------------------------------------------------------------ chat form */
  const form = $('[data-chat]');
  if (form) {
    const stepsEl = $$('.chat__step', form);
    const segs = $$('[data-seg]', form);
    const dots = $$('.chat__stop', form);
    const back = $('[data-chat-back]', form);
    const nextBtn = $('[data-chat-next]', form);
    const done = $('[data-chat-done]', form);
    const status = $('[data-chat-status]', form);
    const summaryEl = $('[data-chat-summary]', form);
    const mail = $('[data-chat-mail]', form);
    const missing = $('[data-chat-missing]', form);
    const copy = $('[data-chat-copy]', form);
    let at = 0;
    form.classList.add('is-stepped');

    const field = n => form.elements[n];
    const setError = (name, msg) => {
      const input = field(name), err = $(`[data-error-for="${name}"]`, form);
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        err.id = `err-${name}`; input.setAttribute('aria-describedby', err.id);
        err.hidden = false;
      } else {
        input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); err.hidden = true;
      }
      return !msg;
    };
    const validate = i => {
      if (i === 0) return setError('name', !field('name').value.trim());
      if (i === 1) return setError('business', !field('business').value.trim());
      if (i === 3) return setError('email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field('email').value.trim()));
      return true;
    };
    const firstName = () => field('name').value.trim().split(/\s+/)[0] || '';

    const show = (i, dir = 1) => {
      at = i;
      stepsEl.forEach((s, j) => { s.classList.toggle('is-current', j === i); s.classList.toggle('is-back', dir < 0); });
      dots.forEach((d, j) => d.classList.toggle('is-on', j <= i));
      segs.forEach((s, j) => s.classList.toggle('is-on', j < i));
      back.hidden = i === 0;
      nextBtn.firstChild.textContent = i === stepsEl.length - 1 ? 'Review ' : 'Next ';
      const n = firstName();
      $('[data-echo-name]', form).textContent = n ? `, ${n}` : '';
      status.textContent = `Question ${i + 1} of ${stepsEl.length}`;
    };
    const focusStep = () => {
      const target = $('input, textarea', stepsEl[at]);
      target && target.focus({ preventScroll: true });
    };

    const compose = () => {
      const ends = $$('input[name="ends"]:checked', form).map(c => c.value);
      const lines = [
        `Name: ${field('name').value.trim()}`,
        `Business: ${field('business').value.trim()}`,
        `Loose ends: ${ends.length ? ends.join('; ') : 'none picked'}`,
        field('notes').value.trim() ? `Notes: ${field('notes').value.trim()}` : null,
        `Email: ${field('email').value.trim()}`,
        field('phone').value.trim() ? `Phone: ${field('phone').value.trim()}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    };

    // Map the answers onto HubSpot contact properties and post them to the
    // Forms API. Option values in HubSpot use straight apostrophes, so the
    // site's curly ones are normalised before sending.
    const buildHubspotFields = () => {
      const val = n => field(n).value.trim();
      const parts = val('name').split(/\s+/);
      const ends = $$('input[name="ends"]:checked', form)
        .map(c => c.value.replace(/[‘’]/g, "'"));
      const map = [
        ['firstname', parts[0]],
        ['lastname', parts.slice(1).join(' ')],
        ['company', val('business')],
        ['loose_ends_cb', ends.join(';')],
        ['loose_ends_other', val('notes')],
        ['email', val('email')],
        ['phone', val('phone')],
      ];
      return map.filter(([, v]) => v).map(([name, value]) => ({ objectTypeId: '0-1', name, value }));
    };
    const sendToHubspot = async () => {
      const { portalId, formId } = CONFIG.hubspot;
      const res = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: buildHubspotFields(),
          context: { pageUri: location.href, pageName: document.title },
        }),
      });
      if (!res.ok) throw new Error(`HubSpot responded ${res.status}`);
    };
    let sending = false, sent = false;
    const sendLabel = mail.innerHTML;
    const errEl = document.createElement('p');
    errEl.className = 'field__error';
    errEl.hidden = true;
    errEl.textContent = 'That didn’t go through. Please use the email button instead, or copy the message.';
    $('.chat__send', form).after(errEl);
    mail.addEventListener('click', async e => {
      if (!CONFIG.hubspot) return;            // no HubSpot: plain mailto link
      if (sent || sending) { e.preventDefault(); return; }
      if (mail.dataset.fallback === 'true') return; // HubSpot failed once: let mailto open
      e.preventDefault();
      sending = true;
      mail.setAttribute('aria-disabled', 'true');
      mail.firstElementChild.textContent = 'Sending...';
      try {
        await sendToHubspot();
        sent = true;
        mail.firstElementChild.textContent = 'Sent. Thank you.';
        status.textContent = 'Message sent. We’ll be in touch soon.';
        copy.hidden = true;
      } catch (err) {
        mail.dataset.fallback = 'true';
        errEl.hidden = false;
        mail.removeAttribute('aria-disabled');
        mail.innerHTML = sendLabel;
        mail.firstElementChild.firstChild.textContent = 'Send by email instead ';
        status.textContent = 'That didn’t go through. Use the email button instead, or copy the message.';
      } finally {
        sending = false;
      }
    });

    const finish = () => {
      const text = compose();
      sent = false; delete mail.dataset.fallback; errEl.hidden = true; copy.hidden = false;
      mail.removeAttribute('aria-disabled'); mail.innerHTML = sendLabel;
      summaryEl.textContent = text;
      stepsEl.forEach(s => s.classList.remove('is-current'));
      dots.forEach(d => d.classList.add('is-on'));
      segs.forEach(s => s.classList.add('is-on'));
      nextBtn.hidden = true;
      back.hidden = false;
      back.lastChild.textContent = ' Edit answers';
      const n = firstName();
      $('[data-echo-name-2]', form).textContent = n ? `, ${n}` : '';
      if (CONFIG.email) {
        mail.hidden = false; missing.hidden = true;
        mail.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(CONFIG.subject)}&body=${encodeURIComponent(text)}`;
      } else {
        mail.hidden = true; missing.hidden = false;
      }
      done.hidden = false;
      at = stepsEl.length;
      status.textContent = 'All four questions answered. Review your message below.';
      done.focus({ preventScroll: true });
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate(at)) {
        const bad = $('[aria-invalid="true"]', stepsEl[at]);
        bad && bad.focus();
        return;
      }
      if (at < stepsEl.length - 1) { show(at + 1); focusStep(); }
      else finish();
    });
    back.addEventListener('click', () => {
      if (at === stepsEl.length) {
        done.hidden = true; nextBtn.hidden = false; back.lastChild.textContent = ' Back';
        show(stepsEl.length - 1, -1);
      } else show(Math.max(0, at - 1), -1);
      focusStep();
    });
    // clear an error as soon as it's fixed
    form.addEventListener('input', e => {
      const n = e.target.name;
      if (e.target.getAttribute('aria-invalid') === 'true') validate(['name', 'business', '', 'email'].indexOf(n));
    });
    copy.addEventListener('click', async () => {
      const label = copy.textContent;
      try { await navigator.clipboard.writeText(summaryEl.textContent); copy.textContent = 'Copied. Thank you.'; }
      catch { copy.textContent = 'Select the text above to copy'; }
      setTimeout(() => copy.textContent = label, 2400);
    });
    show(0);
  }

  /* ------------------------------------------------------- elastic seams */
  // Where a dark and a light section meet, the edge bows with scroll speed and
  // springs back past flat when you stop, as if the page were pulled in the middle.
  const seams = [];
  const isClear = c => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
  const bgOf = el => {
    // a pinned stage paints over its section, so read the stage first
    for (const x of [el.querySelector(':scope > .who__stage, :scope > .ways__stage'), el]) {
      if (!x) continue;
      const c = getComputedStyle(x).backgroundColor;
      if (!isClear(c)) return c;
    }
    return null;
  };
  const kids = [...$('main').children];
  kids.forEach((b, i) => {
    const a = kids[i - 1];
    if (!a || [a, b].some(el => el.matches('.wave, .ticker'))) return;
    const el = document.createElement('div');
    el.className = 'seam';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false"><path/></svg>';
    b.before(el);
    seams.push({ el, a, b, svg: el.firstChild, path: el.firstChild.firstChild });
  });

  let amp = 0, vel = 0, lastY = scrollY, seamRun = false;
  const seamMax = () => Math.min(96, innerWidth * .075);
  function drawSeams() {
    const m = seamMax();
    for (const s of seams) {
      const r = s.el.getBoundingClientRect();
      const near = r.top > -m * 2 && r.top < innerHeight + m * 2;
      if (!near || Math.abs(amp) < .3) { s.svg.style.visibility = 'hidden'; continue; }
      const up = bgOf(s.a), down = bgOf(s.b);
      if (!up || !down || up === down) { s.svg.style.visibility = 'hidden'; continue; }
      // a bell in the middle third; the edges stay flat and the peak sits amp px from the seam
      const k = (clamp(amp, -m, m) / m) * 50;
      s.el.style.setProperty('--m', px(m));
      s.path.setAttribute('d', `M0 50L24 50C38 50 40 ${(50 + k).toFixed(2)} 50 ${(50 + k).toFixed(2)}S62 50 76 50L100 50Z`);
      s.path.setAttribute('fill', amp > 0 ? up : down);
      s.svg.style.visibility = 'visible';
    }
  }
  function seamTick() {
    const y = scrollY, dy = y - lastY;
    lastY = y;
    vel = vel * .75 + dy * .25;
    const m = seamMax();
    const target = clamp(vel * 5, -m, m);
    amp += (target - amp) * .19;   // eased, never springy: one long dip and a smooth return
    if (Math.abs(amp) < .2 && Math.abs(vel) < .05 && Math.abs(dy) < .5) {
      amp = vel = 0; drawSeams(); seamRun = false; return;
    }
    drawSeams();
    requestAnimationFrame(seamTick);
  }
  addEventListener('scroll', () => {
    if (reduced || seamRun) return;
    seamRun = true;
    requestAnimationFrame(seamTick);
  }, { passive: true });

  /* ------------------------------------------ GSAP ScrollTrigger: smooth + snap */
  // CSS sticky still does the pinning. ScrollTrigger supplies each sequence's progress:
  // it eases in just after the scroll (scrub) and settles on whole steps (snap).
  // Without GSAP, or with reduced motion, the raw scroll position is used instead.
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  if (G) G.registerPlugin(window.ScrollTrigger);

  // Lenis turns wheel notches into one continuous glide. It keeps native scrolling
  // underneath, so sticky pinning, keyboard and touch scrolling all behave as before.
  let lenis = null, lenisTick = null;
  function syncLenis() {
    if (reduced || !window.Lenis) {
      if (lenis) { lenis.destroy(); lenis = null; if (G && lenisTick) G.ticker.remove(lenisTick); }
      return;
    }
    if (lenis) return;
    // the same feel as agencefoudre.com (Locomotive Scroll 5 on Lenis, stock settings)
    lenis = new window.Lenis({ lerp: .1, wheelMultiplier: 1, anchors: true, autoRaf: !G });
    if (G) {
      lenis.on('scroll', window.ScrollTrigger.update);
      lenisTick = t => lenis && lenis.raf(t * 1000);
      G.ticker.add(lenisTick);
      G.ticker.lagSmoothing(0);
    }
    lenis.on('scroll', queueSnap);
  }

  // snap: once the glide comes to rest inside a pinned sequence, ease to its nearest whole step
  let snapTimer = 0;
  function queueSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (!lenis || lenis.isStopped || Math.abs(lenis.velocity) > .2) return;
      const s = seqs.find(q => q.tw && q.tw.scrollTrigger && q.tw.scrollTrigger.isActive);
      if (!s) return;
      const st = s.tw.scrollTrigger, span = st.end - st.start;
      const now = (lenis.scroll - st.start) / span;
      const to = s.snap().reduce((a, b) => Math.abs(b - now) < Math.abs(a - now) ? b : a);
      const y = st.start + to * span;
      if (Math.abs(y - lenis.scroll) > 2) lenis.scrollTo(y, { duration: .9, easing: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
    }, 240);
  }
  const range = (a, b, n) => [...Array(n)].map((_, k) => a + (b - a) * k / (n - 1));
  const seqs = [
    { id: 'who', on: () => whoOn, stage: whoStage, spacer: whoSpacer, top: () => 0, update: () => updateWho(),
      snap: () => range(.04, .94, frames.length).concat(1) },
    { id: 'prob', on: () => probOn, stage: probStage, spacer: probSpacer, top: () => mast.offsetHeight, update: () => updateProb(),
      snap: () => [0, .33, .57, .81, 1] },
    { id: 'appr', on: () => apprOn, stage: apprStage, spacer: apprSpacer, top: () => mast.offsetHeight, update: () => updateAppr(),
      snap: () => [0, .25, .42, .59, .76, 1] },
    { id: 'together', on: () => tOn, stage: tStage, spacer: tSpacer, top: () => 0, update: () => updateTogether(),
      snap: () => [0, .24, .44, .64, .84, 1] },
    { id: 'ways', on: () => wOn, stage: wStage, spacer: wSpacer, top: () => 0, update: () => updateWays(),
      snap: () => [0, 1, 2].map(k => .15 + .72 * (k + .7) / 2.75).concat(1) },
  ];
  function syncGsap() {
    if (!G) return;
    for (const s of seqs) {
      if (s.tw) { s.tw.scrollTrigger && s.tw.scrollTrigger.kill(); s.tw.kill(); s.tw = null; }
      delete smooth[s.id];
      if (reduced || !s.on()) continue;
      const proxy = smooth[s.id] = { p: clamp(pinProgress(s.stage, s.spacer, s.top())) };
      const at = () => `${s.top() + s.stage.offsetHeight}px`;
      s.tw = G.fromTo(proxy, { p: 0 }, {
        p: 1, ease: 'none', onUpdate: s.update,
        scrollTrigger: {
          trigger: s.spacer, start: () => 'top ' + at(), end: () => 'bottom ' + at(),
          scrub: lenis ? true : .6,   // Lenis already glides, so the sequences follow it directly
          snap: lenis ? false : { snapTo: s.snap(), duration: { min: .25, max: .7 }, delay: .12, ease: 'power2.inOut' },
        },
      });
    }
  }

  /* --------------------------------------- doodle box around "Start" */
  function fitBoxes() {
    $$('[data-box]').forEach(b => {
      const word = $('.ways__word', b), box = $('.ways__box', b);
      const r = document.createRange(); r.selectNodeContents(word);
      const wr = r.getBoundingClientRect(), br = b.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(b).fontSize), padX = fs * .16, padY = fs * .09;
      // the glyph's front face is 2.75em wide and .55em tall, starting .2em in and .375em down
      const gs = (wr.width + padX * 2) / 2.75;
      const sy = (wr.height * .8 + padY * 2) / (.55 * gs);
      box.style.setProperty('--bg-size', px(gs));
      box.style.setProperty('--bsy', sy.toFixed(3));
      box.style.setProperty('--bx', px(wr.left - br.left - padX - .2 * gs));
      box.style.setProperty('--by', px(wr.top - br.top + wr.height * .07 - padY - .375 * gs * sy));
    });
  }

  /* ---------------------------------------------------------- scroll loop */
  let ticking = false;
  const frame = () => { ticking = false; updateWho(); updateTicker(); updateProb(); updateAppr(); updateTogether(); updateWays(); updateMasthead(); };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });

  const measureAll = () => { measureWho(); measureProb(); measureAppr(); measureTogether(); measureWays(); fitBoxes(); syncLenis(); syncGsap(); frame(); measureProof(); };
  let rt, lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(rt);
    // mobile browsers resize the viewport height while scrolling; only re-measure for real changes
    rt = setTimeout(() => { if (innerWidth !== lastW || !matchMedia('(hover: none)').matches) { lastW = innerWidth; measureAll(); } }, 150);
  });
  motionQuery.addEventListener('change', e => { reduced = e.matches; measureAll(); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
  measureAll();
})();
