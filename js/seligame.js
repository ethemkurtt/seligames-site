/* ===== PRELOADER ===== */
(function() {
  const preloader = document.getElementById('preloader');
  const fill = document.getElementById('preBarFill');
  let progress = 0;
  document.body.style.overflow = 'hidden';

  function tick() {
    progress += Math.random() * 14 + 4;
    if (progress > 100) progress = 100;
    fill.style.width = progress + '%';
    if (progress < 100) {
      setTimeout(tick, 70 + Math.random() * 50);
    } else {
      setTimeout(() => {
        preloader.classList.add('done');
        document.body.style.overflow = '';
        setTimeout(initHero, 100);
      }, 280);
    }
  }
  setTimeout(tick, 250);
})();

/* ===== LENIS + GSAP ===== */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    }
  });
});

const nav = document.getElementById('nav');
lenis.on('scroll', (e) => {
  if (e.scroll > 40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

/* ===== HERO CINEMATIC REVEAL ===== */
function initHero() {
  const wrap = document.getElementById('heroVideoWrap');
  const slogan = document.getElementById('heroSlogan');
  const actions = document.getElementById('heroActions');
  const scroll = document.querySelector('.hero-scroll');

  const tl = gsap.timeline();

  // 1. Cinematic clip-path opens from center
  tl.to(wrap, {
    clipPath: 'inset(0% 0% 0% 0%)',
    scale: 1,
    duration: 1.4,
    ease: 'expo.out',
  });

  // 2. Slogan fades in
  tl.to(slogan, {
    opacity: 1,
    duration: 0.7,
    ease: 'power2.out',
  }, '-=0.6');

  // 3. CTAs slide up
  tl.to(actions, {
    opacity: 1,
    duration: 0.7,
    ease: 'power2.out',
  }, '-=0.4');

  // 4. Scroll indicator
  tl.to(scroll, {
    opacity: 0.7,
    duration: 0.6,
  }, '-=0.3');

  // Banner reveal animations - cinematic scroll trigger for all banners
  gsap.utils.toArray('.banner-wrap').forEach(bannerWrap => {
    gsap.to(bannerWrap, {
      opacity: 1,
      y: 0,
      scale: 1,
      clipPath: 'inset(0 0% 0 0%)',
      duration: 1.6,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: bannerWrap,
        start: 'top 80%',
        toggleActions: 'play none none none',
        onEnter: () => bannerWrap.classList.add('revealed'),
      },
    });
  });

  // Scroll-triggered fade-ups
  gsap.utils.toArray('.fade-up').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.0,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Stat counters
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const isDecimal = target % 1 !== 0;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: function() {
            const v = this.targets()[0].val;
            if (isDecimal) el.textContent = v.toFixed(1) + suffix;
            else if (target >= 1000) el.textContent = Math.floor(v).toLocaleString() + suffix;
            else el.textContent = Math.floor(v) + suffix;
          },
        });
      },
    });
  });

  // Animate gift progress bars on scroll
  document.querySelectorAll('.gift-progress-fill').forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0%';
    ScrollTrigger.create({
      trigger: bar,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(bar, {
          width: width,
          duration: 1.4,
          ease: 'expo.out',
          delay: 0.2,
        });
      },
    });
  });
}

/* ===== FEATURE CARDS MOUSE GLOW ===== */
document.querySelectorAll('[data-card]').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
});
