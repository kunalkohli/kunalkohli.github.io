(function () {
  'use strict';
  var player = document.querySelector('[data-m365-player]');
  if (!player) return;

  var tabs = Array.prototype.slice.call(player.querySelectorAll('[data-m365-tab]'));
  var scenes = Array.prototype.slice.call(player.querySelectorAll('[data-m365-scene]'));
  var play = player.querySelector('[data-m365-play]');
  var replay = player.querySelector('[data-m365-replay]');
  var count = player.querySelector('[data-m365-count]');
  var status = player.querySelector('[data-m365-status]');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0;
  var timer = null;
  var playing = false;
  var duration = 5600;

  function stop() {
    window.clearTimeout(timer);
    timer = null;
    playing = false;
    play.textContent = '▶ Play all';
    play.setAttribute('aria-pressed', 'false');
  }

  function select(index, announce) {
    current = (index + tabs.length) % tabs.length;
    player.classList.remove('is-paused');
    tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', i === current ? 'true' : 'false');
      tab.tabIndex = i === current ? 0 : -1;
    });
    scenes.forEach(function (scene, i) {
      scene.hidden = i !== current;
      scene.classList.remove('is-live');
    });
    if (!motion.matches) {
      void scenes[current].offsetWidth;
      scenes[current].classList.add('is-live');
    }
    count.textContent = ('0' + (current + 1)).slice(-2) + ' / 06';
    if (announce) status.textContent = 'Stage ' + (current + 1) + ' of 6: ' + scenes[current].querySelector('h3').textContent;
  }

  function schedule() {
    timer = window.setTimeout(function () {
      if (current === tabs.length - 1) { stop(); return; }
      select(current + 1, true);
      schedule();
    }, duration);
  }

  function start() {
    if (motion.matches || document.hidden || playing) return;
    if (current === tabs.length - 1) select(0, true);
    player.classList.remove('is-paused');
    playing = true;
    play.textContent = 'Ⅱ Pause';
    play.setAttribute('aria-pressed', 'true');
    schedule();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { stop(); select(index, true); });
    tab.addEventListener('keydown', function (event) {
      var next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      stop(); select(next, true); tabs[next].focus();
    });
  });
  play.addEventListener('click', function () {
    if (playing) { stop(); player.classList.add('is-paused'); }
    else start();
  });
  replay.addEventListener('click', function () { stop(); select(0, true); start(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); player.classList.add('is-paused'); }
  });
  function applyMotionPreference() {
    stop();
    play.disabled = motion.matches;
    play.title = motion.matches ? 'Automatic playback is off for reduced motion. Select any stage manually.' : 'Play the six stages';
    replay.textContent = motion.matches ? '↶ First stage' : '↻ Replay';
    scenes.forEach(function (scene) { scene.classList.remove('is-live'); });
  }
  motion.addEventListener('change', applyMotionPreference);

  // Enhance only after all handlers exist. Without JavaScript, all six scenes
  // remain visible, with no dead controls or inaccessible hidden explanation.
  player.classList.add('is-enhanced');
  scenes.forEach(function (scene, i) {
    scene.setAttribute('role', 'tabpanel');
    scene.setAttribute('aria-labelledby', tabs[i].id);
    scene.tabIndex = 0;
  });
  player.querySelector('.m365-controls').hidden = false;
  player.querySelector('.m365-tabs').hidden = false;
  replay.hidden = false;
  applyMotionPreference();
  select(0, false);
})();
