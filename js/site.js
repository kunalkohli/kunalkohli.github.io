(function () {
  'use strict';
  var root = document.documentElement;
  var themeColors = { dev: '#000000', light: '#fdfdfe' };

  function updateTheme(theme, save) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = themeColors[theme] || '#000000';
    document.querySelectorAll('[data-theme-opt]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.themeOpt === theme));
    });
    if (save) {
      try { localStorage.setItem('data-musings-theme', theme); } catch (error) {}
    }
    document.dispatchEvent(new CustomEvent('site:theme', { detail: { theme: theme } }));
  }
  document.querySelectorAll('[data-theme-opt]').forEach(function (button) {
    button.addEventListener('click', function () { updateTheme(button.dataset.themeOpt, true); });
  });
  updateTheme(themeColors[root.dataset.theme] !== undefined ? root.dataset.theme : 'dev', false);

  var textSteps = Array.from(document.querySelectorAll('[data-text-step]'));
  if (textSteps.length) {
    var sizeGroup = textSteps[0].closest('.text-size');
    var sizeLabel = sizeGroup.querySelector('[data-text-label]');
    var textSize = parseInt(root.dataset.textSize, 10) || 90;
    sizeGroup.hidden = false;
    function normalizeSize(value) { return Math.min(110, Math.max(70, Math.round(value / 10) * 10)); }
    function updateTextSize(save) {
      root.style.zoom = textSize / 100;
      sizeLabel.textContent = textSize + '%';
      textSteps.forEach(function (button) {
        var delta = button.dataset.textStep === '+' ? 10 : -10;
        button.disabled = normalizeSize(textSize + delta) === textSize;
      });
      if (save) {
        try { localStorage.setItem('data-musings-text-size', String(textSize)); } catch (error) {}
      }
    }
    textSteps.forEach(function (button) {
      button.addEventListener('click', function () {
        textSize = normalizeSize(textSize + (button.dataset.textStep === '+' ? 10 : -10));
        updateTextSize(true);
      });
    });
    updateTextSize(false);
  }

  var topicRail = document.querySelector('[data-topic-rail]');
  if (topicRail) {
    var topicPanels = Array.from(document.querySelectorAll('[data-topic-panel]'));
    var showTopic = function (tag) {
      topicPanels.forEach(function (panel) { panel.hidden = panel.dataset.topicPanel !== tag; });
      topicRail.querySelectorAll('a').forEach(function (link) {
        if (link.dataset.topic === tag) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      var openPanel = topicPanels.find(function (panel) { return panel.dataset.topicPanel === tag; });
      if (openPanel) {
        openPanel.style.animation = 'none';
        void openPanel.offsetWidth;
        openPanel.style.animation = '';
      }
    };
    topicRail.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-topic]');
      if (!link) return;
      event.preventDefault();
      showTopic(link.dataset.topic);
    });
    showTopic(topicRail.dataset.defaultTopic);
  }

  var toc = document.querySelector('[data-toc]');
  if (toc) {
    var tocLinks = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var tocTargets = tocLinks.map(function (link) {
      return document.getElementById(decodeURIComponent(link.hash.slice(1)));
    });
    var tocTicking = false;
    var updateToc = function () {
      tocTicking = false;
      var active = -1;
      for (var i = 0; i < tocTargets.length; i++) {
        if (tocTargets[i] && tocTargets[i].getBoundingClientRect().top <= 120) active = i;
      }
      tocLinks.forEach(function (link, i) {
        if (i === active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };
    window.addEventListener('scroll', function () {
      if (!tocTicking) { tocTicking = true; requestAnimationFrame(updateToc); }
    }, { passive: true });
    updateToc();
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
})();
