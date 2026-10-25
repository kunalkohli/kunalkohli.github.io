(function () {
  'use strict';
  var root = document.querySelector('.php-explainer');
  if (!root) return;
  var settings = { view: 'analogy', palette: 'original', text: 'original' };
  var allowed = { view: ['analogy', 'technical'], palette: ['original', 'studio', 'night'], text: ['original', 'modern'] };
  function apply(kind, value) {
    if (allowed[kind].indexOf(value) === -1) return;
    settings[kind] = value;
    root.setAttribute('data-php-' + kind, value);
    root.querySelectorAll('[data-php-' + kind + ']').forEach(function (button) {
      if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.getAttribute('data-php-' + kind) === value));
    });
    if (kind === 'view') root.querySelectorAll('[data-php-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-php-panel') !== value;
    });
    try { localStorage.setItem('php-locker-' + kind, value); } catch (error) { /* Preferences are optional. */ }
  }
  Object.keys(settings).forEach(function (kind) {
    var saved;
    try { saved = localStorage.getItem('php-locker-' + kind); } catch (error) { /* Keep the default. */ }
    apply(kind, allowed[kind].indexOf(saved) !== -1 ? saved : settings[kind]);
    root.querySelectorAll('button[data-php-' + kind + ']').forEach(function (button) {
      button.addEventListener('click', function () {
        apply(kind, button.getAttribute('data-php-' + kind));
        root.querySelector('[data-php-status]').textContent = button.textContent + ' selected. Every diagram still shows the full flow.';
      });
    });
  });
  root.querySelector('[data-php-controls]').hidden = false;
}());
