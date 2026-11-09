(function () {
  'use strict';

  var root = document.documentElement;
  var params = new URLSearchParams(window.location.search);
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  var compactContents = window.matchMedia('(max-width: 760px)');
  var directions = {
    fieldnotes: {
      description: '01 / Fieldnotes — A modern journal. Less chrome, more room for the story.',
      eyebrow: 'THE PERSONAL JOURNAL OF KUNAL KOHLI',
      line: 'The interesting part is',
      emphasis: 'how it works.',
      intro: 'Unpacking technology, building small things, and following the questions that won’t leave me alone.'
    },
    workbench: {
      description: '02 / Workbench — A colorful studio. Writing, projects, and experiments in one place.',
      eyebrow: 'A PERSONAL LAB FOR IDEAS & EXPERIMENTS',
      line: 'Some ideas need',
      emphasis: 'a little building.',
      intro: 'A collection of things I’ve made, systems I’ve taken apart, and lessons from somewhere in between.'
    },
    signal: {
      description: '03 / Signal — A focused technical notebook. Clear structure, diagrams, and a compact reading index.',
      eyebrow: 'KUNAL KOHLI / NOTES ON TECHNOLOGY',
      line: 'Less noise.',
      emphasis: 'More understanding.',
      intro: 'Trace the connections. Question the defaults. Notes on security, AI, and the systems we put our trust in.'
    }
  };
  var theme = params.get('theme');
  var explicitTheme = theme === 'light' || theme === 'dark';
  if (!explicitTheme) {
    try { theme = window.localStorage.getItem('data-musings-design-theme'); } catch (error) { /* Storage may be blocked. */ }
    explicitTheme = theme === 'light' || theme === 'dark';
    if (!explicitTheme) theme = systemTheme.matches ? 'dark' : 'light';
  }
  var direction = Object.prototype.hasOwnProperty.call(directions, params.get('concept')) ? params.get('concept') : 'fieldnotes';
  var view = params.get('view') === 'article' ? 'article' : 'home';
  var filter = 'all';
  var search = '';
  var step = 0;
  var timer = null;
  var progressPending = false;
  var summaries = [
    'A tampered install turns an everyday developer task into the first point of access.',
    'A plausible interview gets unfamiliar assignment code onto a work machine.',
    'Malware hides behind the name and path of a tool the engineer already trusts.',
    'A compromised workstation becomes a route to more people, systems, and credentials.',
    'A deployment credential opens a path to a privileged service. Protecting the keys is only part of the defense.'
  ];

  function updateURL() {
    var next = new URL(window.location.href);
    next.searchParams.set('concept', direction);
    next.searchParams.set('view', view);
    next.searchParams.set('theme', theme);
    window.history.replaceState(null, '', next);
  }

  function animateView() {
    var page = document.querySelector('[data-page="' + view + '"]');
    page.classList.remove('view-enter');
    void page.offsetWidth;
    page.classList.add('view-enter');
  }

  function setDirection(next, animate) {
    direction = next;
    root.dataset.concept = direction;
    document.querySelectorAll('[data-choice]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.choice === direction));
    });
    var content = directions[direction];
    document.getElementById('direction-description').textContent = content.description;
    document.querySelector('[data-hero-eyebrow]').textContent = content.eyebrow;
    document.querySelector('[data-hero-line]').textContent = content.line;
    document.querySelector('[data-hero-emphasis]').textContent = content.emphasis;
    document.querySelector('[data-hero-description]').textContent = content.intro;
    document.title = direction.charAt(0).toUpperCase() + direction.slice(1) + ' · Data Musings design lab';
    if (animate) animateView();
    updateURL();
  }

  function setTheme(next) {
    theme = next;
    root.dataset.theme = theme;
    var toggle = document.querySelector('.theme-toggle');
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    document.querySelector('[data-theme-label]').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    document.querySelector('[data-theme-icon]').textContent = theme === 'dark' ? '☼' : '◐';
    updateURL();
  }

  function setView(next, scroll) {
    if (next !== view) stopChain();
    view = next;
    document.querySelectorAll('[data-page]').forEach(function (page) {
      page.hidden = page.dataset.page !== view;
    });
    document.querySelectorAll('[data-view-choice]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.viewChoice === view));
    });
    document.querySelector('.reading-progress').hidden = view !== 'article';
    animateView();
    updateURL();
    updateProgress();
    if (scroll) {
      document.getElementById('preview').scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth' });
      document.getElementById('preview').focus({ preventScroll: true });
    }
  }

  function applyFilters() {
    var shown = 0;
    document.querySelectorAll('[data-story]').forEach(function (story) {
      var matches = (filter === 'all' || story.dataset.topic === filter) && story.dataset.title.toLowerCase().includes(search);
      story.hidden = !matches;
      if (matches) shown++;
    });
    document.querySelector('.empty-state').hidden = shown !== 0;
    document.querySelector('.feed-status').textContent = shown + (shown === 1 ? ' story shown.' : ' stories shown.');
    document.querySelector('.section-count').textContent = ('0' + shown).slice(-2) + ' SELECTED STORIES';
  }

  function showStep(index) {
    step = index;
    document.querySelectorAll('[data-step]').forEach(function (button, i) {
      button.setAttribute('aria-pressed', String(i === step));
    });
    var summary = document.querySelector('.chain-summary');
    summary.replaceChildren();
    var label = document.createElement('span');
    label.textContent = ('0' + (step + 1)).slice(-2) + ' /';
    summary.append(label, document.createTextNode(' ' + summaries[step]));
    if (timer && window.innerWidth < 760) {
      var selected = document.querySelector('[data-step="' + step + '"]');
      var container = document.querySelector('.chain-scroll');
      container.scrollTo({ left: selected.offsetLeft - container.clientWidth / 2 + selected.offsetWidth / 2, behavior: motion.matches ? 'auto' : 'smooth' });
    }
  }

  function stopChain() {
    if (timer) window.clearInterval(timer);
    timer = null;
    var button = document.querySelector('.chain-play');
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '▶ Play the chain';
  }

  function updateProgress() {
    progressPending = false;
    if (view !== 'article') return;
    var article = document.querySelector('.article-preview');
    var top = article.getBoundingClientRect().top;
    var length = Math.max(1, article.offsetHeight - window.innerHeight);
    var value = Math.max(0, Math.min(1, -top / length));
    document.querySelector('.reading-progress span').style.width = value * 100 + '%';
    var current = 'the-opening';
    ['the-opening', 'attack-path', 'the-lesson'].forEach(function (id) {
      if (document.getElementById(id).getBoundingClientRect().top < window.innerHeight * .4) current = id;
    });
    document.querySelectorAll('.article-toc a').forEach(function (link) {
      if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  document.querySelectorAll('[data-choice]').forEach(function (button) {
    button.addEventListener('click', function () { setDirection(button.dataset.choice, true); });
  });
  document.querySelectorAll('[data-view-choice]').forEach(function (button) {
    button.addEventListener('click', function () { setView(button.dataset.viewChoice, false); });
  });
  document.querySelectorAll('[data-home]').forEach(function (link) {
    link.addEventListener('click', function (event) { event.preventDefault(); setView('home', true); });
  });
  document.querySelectorAll('[data-article-open]').forEach(function (link) {
    link.addEventListener('click', function (event) { event.preventDefault(); setView('article', true); });
  });
  document.querySelectorAll('[data-writing]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      setView('home', false);
      document.getElementById('writing').scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth' });
    });
  });
  document.querySelector('.theme-toggle').addEventListener('click', function () {
    explicitTheme = true;
    setTheme(theme === 'light' ? 'dark' : 'light');
    try { window.localStorage.setItem('data-musings-design-theme', theme); } catch (error) { /* In-memory toggle still works. */ }
  });
  systemTheme.addEventListener('change', function (event) {
    if (!explicitTheme) setTheme(event.matches ? 'dark' : 'light');
  });
  document.querySelectorAll('[data-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(function (option) { option.setAttribute('aria-pressed', String(option === button)); });
      applyFilters();
    });
  });
  document.querySelector('[data-search]').addEventListener('input', function (event) {
    search = event.target.value.trim().toLowerCase();
    applyFilters();
  });
  document.querySelectorAll('[data-step]').forEach(function (button) {
    button.addEventListener('click', function () { stopChain(); showStep(Number(button.dataset.step)); });
  });
  document.querySelector('.chain-play').addEventListener('click', function () {
    if (timer) { stopChain(); return; }
    if (motion.matches) return;
    if (step === summaries.length - 1) showStep(0);
    this.setAttribute('aria-pressed', 'true');
    this.textContent = 'Ⅱ Pause';
    timer = window.setInterval(function () {
      if (step === summaries.length - 1) stopChain();
      else showStep(step + 1);
    }, 2400);
  });
  function syncMotion() {
    var map = document.querySelector('.ideas-map');
    if (motion.matches) { stopChain(); map.pauseAnimations(); }
    else map.unpauseAnimations();
    document.querySelector('.chain-play').hidden = motion.matches;
  }
  motion.addEventListener('change', syncMotion);
  function syncContents() {
    document.querySelector('.toc-disclosure').open = !compactContents.matches;
  }
  compactContents.addEventListener('change', syncContents);
  document.querySelectorAll('.article-toc a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (compactContents.matches) document.querySelector('.toc-disclosure').open = false;
    });
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopChain(); });
  window.addEventListener('scroll', function () {
    if (!progressPending) { progressPending = true; window.requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);

  var dialog = document.querySelector('.about-dialog');
  document.querySelector('[data-about]').addEventListener('click', function () { dialog.showModal(); });
  document.querySelector('.dialog-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    var box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });

  setDirection(direction, false);
  setTheme(theme);
  setView(view, false);
  syncMotion();
  syncContents();
})();
