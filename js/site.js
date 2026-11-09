(function () {
  'use strict';
  var root = document.documentElement;
  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  var compact = window.matchMedia('(max-width: 760px)');
  var explicitTheme = false;
  try { explicitTheme = /^(light|dark)$/.test(localStorage.getItem('data-musings-theme')); } catch (error) {}

  function updateTheme(theme, save) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#141a2b' : '#f1f3f8';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.hidden = false;
      button.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.querySelector('[data-theme-icon]').textContent = theme === 'dark' ? '☼' : '◐';
      button.querySelector('[data-theme-label]').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    });
    if (save) {
      explicitTheme = true;
      try { localStorage.setItem('data-musings-theme', theme); } catch (error) {}
    }
    document.dispatchEvent(new CustomEvent('site:theme', { detail: { theme: theme } }));
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () { updateTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true); });
  });
  systemTheme.addEventListener('change', function (event) {
    if (!explicitTheme) updateTheme(event.matches ? 'dark' : 'light', false);
  });
  updateTheme(root.dataset.theme || 'light', false);

  var search = document.querySelector('[data-search]');
  if (search) {
    var filter = 'all';
    var stories = Array.from(document.querySelectorAll('[data-story]'));
    document.querySelector('[data-feed-controls]').hidden = false;
    function filterStories() {
      var query = search.value.trim().toLowerCase();
      var count = 0;
      stories.forEach(function (story) {
        var show = (filter === 'all' || story.dataset.topic === filter) && story.dataset.searchText.includes(query);
        story.hidden = !show;
        if (show) count++;
      });
      document.querySelector('[data-empty-state]').hidden = count !== 0;
      document.querySelector('[data-feed-status]').textContent = count + (count === 1 ? ' story shown.' : ' stories shown.');
    }
    document.querySelectorAll('[data-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        filter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(function (option) { option.setAttribute('aria-pressed', String(option === button)); });
        filterStories();
      });
    });
    search.addEventListener('input', filterStories);
    filterStories();
  }

  var copyButton = document.querySelector('[data-copy-link]');
  if (copyButton && navigator.clipboard && window.isSecureContext) {
    copyButton.hidden = false;
    var copyTimer;
    copyButton.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.href).then(function () {
        copyButton.textContent = 'Copied ✓';
        document.querySelector('[data-copy-status]').textContent = 'Article link copied.';
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () { copyButton.textContent = 'Copy link ↗'; }, 2000);
      }).catch(function () {
        document.querySelector('[data-copy-status]').textContent = 'Could not copy automatically. Copy the address from your browser.';
      });
    });
  }

  var article = document.querySelector('[data-post-content]');
  if (!article) return;
  var contents = document.querySelector('.toc-disclosure');
  var links = Array.from(document.querySelectorAll('.post-toc nav a'));
  var entries = links.map(function (link) {
    var id;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch (error) { id = link.hash.slice(1); }
    return { link: link, heading: document.getElementById(id) };
  }).filter(function (entry) { return entry.heading && article.contains(entry.heading); });
  if (!entries.length) {
    document.querySelector('.post-layout').classList.add('no-toc');
    if (contents) contents.closest('aside').hidden = true;
  }
  if (contents) {
    function syncContents() { contents.open = !compact.matches; }
    syncContents();
    compact.addEventListener('change', syncContents);
    entries.forEach(function (entry) {
      entry.link.addEventListener('click', function () {
        var parent = entry.heading.parentElement;
        while (parent && parent !== article) {
          if (parent.tagName === 'DETAILS') parent.open = true;
          parent = parent.parentElement;
        }
        if (compact.matches) contents.open = false;
      });
    });
  }
  var progress = document.querySelector('[data-reading-progress]');
  var pending = false;
  function updateReading() {
    pending = false;
    var bounds = article.getBoundingClientRect();
    var distance = Math.max(1, article.offsetHeight - window.innerHeight);
    if (progress) progress.style.width = Math.max(0, Math.min(1, -bounds.top / distance)) * 100 + '%';
    var current = entries[0];
    entries.forEach(function (entry) {
      if (entry.heading.getClientRects().length && entry.heading.getBoundingClientRect().top <= window.innerHeight * .3) current = entry;
    });
    entries.forEach(function (entry) {
      if (entry === current) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!pending) { pending = true; window.requestAnimationFrame(updateReading); }
  }, { passive: true });
  window.addEventListener('resize', updateReading);
  window.addEventListener('load', updateReading);
  article.addEventListener('toggle', updateReading, true);
  updateReading();
})();
