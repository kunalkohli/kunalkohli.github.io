(function () {
  'use strict';
  var player = document.querySelector('[data-m365-player]');
  if (!player) return;

  var tabs = Array.prototype.slice.call(player.querySelectorAll('[data-m365-tab]'));
  var scenes = Array.prototype.slice.call(player.querySelectorAll('[data-m365-scene]'));
  var play = player.querySelector('[data-m365-play]');
  var replay = player.querySelector('[data-m365-replay]');
  var previous = player.querySelector('[data-m365-prev]');
  var next = player.querySelector('[data-m365-next]');
  var count = player.querySelector('[data-m365-count]');
  var status = player.querySelector('[data-m365-status]');
  var board = player.querySelector('[data-m365-board]');
  var progress = player.querySelector('[data-m365-progress]');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var duration = 8000;
  var current = 0;
  var frame = null;
  var playing = false;
  var paused = false;
  var mode = 'all';
  var elapsed = 0;
  var started = 0;
  var beat = -1;
  var position = 1;

  var steps = [
    {
      time: 'Before the outage · a normal visit to your mailbox',
      screen: 'Opening your inbox…', detail: 'Asking Microsoft for your mail', result: 'Your request can complete normally.',
      gateway: 'Lets your request through', mailbox: 'Reachable', condition: 'Your request goes through. Your mail comes back.',
      beats: ['You open Outlook. It asks Microsoft for your mail.', 'Your request reaches Microsoft\'s connection gateway.', 'The gateway lets the request reach your stored mailbox.', 'Mail comes back. Outlook fills your inbox.']
    },
    {
      time: '12 November · 01:07 UTC · hours before broad mail failures',
      screen: 'Your inbox still works', detail: 'The path is busier, but still responding', result: 'You do not notice the routing change yet.',
      gateway: 'Now carries mail + Teams', mailbox: 'Still reachable', condition: 'Teams takes the backup route. That alone does not break your mail.',
      beats: ['You can still open your mailbox normally.', 'A routing problem sends Teams traffic to this gateway too.', 'The gateway now carries both workloads, but mail still gets through.', 'Your inbox still loads. The bigger failure happens hours later.']
    },
    {
      time: '12 November · near North American peak traffic',
      screen: 'Trying to connect…', detail: 'No mailbox response is coming back', result: 'Your app waits or fails to connect.',
      gateway: 'Connections stuck', mailbox: 'Intact, but hard to reach', condition: 'Peak traffic + Teams traffic + less capacity expose a hidden connection bug.',
      beats: ['You open Outlook again, expecting your inbox.', 'Your request arrives at the now busier gateway.', 'The hidden bug makes connection processing stall. Requests queue up.', 'No response reaches Outlook. Your stored mail has not been deleted.']
    },
    {
      time: '12 November · failures spread inside a region',
      screen: 'Still trying to connect…', detail: 'The backup route is struggling too', result: 'Another server is not a guaranteed way through.',
      gateway: 'This server is not responding', mailbox: 'Still difficult to reach', condition: 'Same requests, fewer working servers. The backup can hit the same bug.',
      beats: ['Your connection still has not completed.', 'Microsoft tries sending connections to another server group.', 'That group has the same defect and now takes extra load.', 'More servers fail. You still do not get a usable inbox.']
    },
    {
      time: '12 November · within about two hours of broad North American failures',
      screen: 'Mail still will not load', detail: 'Changing the destination has not removed the bug', result: 'People in other regions encounter problems too.',
      gateway: 'Local healthy capacity runs low', mailbox: 'Stored mail still intact', condition: 'Other regions have the same defective change. Rerouting spreads the failure.',
      beats: ['Your mailbox remains difficult to reach.', 'Connections move out of regions running short of healthy capacity.', 'The other regions have the same hidden bug.', 'Servers in every region are affected—not every user or every server.']
    },
    {
      time: '13 November · first corrective update 07:20 UTC; recovery follows',
      screen: 'Reconnecting…', detail: 'Microsoft is repairing the gateway fleet', result: 'As service recovers, you can read your mail again.',
      gateway: 'Repairing away from traffic', mailbox: 'Reachable again after repair', condition: 'Repair the connection path, then restore access. Mail backlogs still need time.',
      beats: ['Microsoft takes failed servers out of live traffic to repair them.', 'Restart, patch, restart again: the defective change is reverted.', 'Repaired servers return. Your connection can reach the mailbox.', 'Your inbox loads again. Delayed mail and monitoring continue afterward.']
    }
  ];

  function text(name, value) {
    player.querySelector('[data-m365-' + name + ']').textContent = value;
  }
  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function packet(name, p, start, end, reverse, visible) {
    var element = player.querySelector('[data-m365-packet="' + name + '"]');
    var distance = clamp((p - start) / (end - start));
    element.style.setProperty('--travel', reverse ? 1 - distance : distance);
    element.style.opacity = !motion.matches && visible && p >= start && p <= end ? '1' : '0';
  }

  function renderAt(p) {
    position = p;
    var repaired = current === 5 && p >= 0.5;
    var succeeds = current < 2 || repaired;
    var inbox = current === 1 || (succeeds && p >= 0.94);
    var nextBeat = Math.min(3, Math.floor(p * 4));
    player.dataset.inbox = inbox ? 'ready' : 'waiting';
    player.dataset.repaired = repaired ? 'true' : 'false';
    player.dataset.beat = String(nextBeat);
    text('screen-status', inbox ? 'Inbox loaded' : steps[current].screen);
    text('mailbox-status', current === 5 && !repaired ? 'Waiting for the path to be repaired' : steps[current].mailbox);
    if (nextBeat !== beat) {
      beat = nextBeat;
      text('beat-number', ('0' + (beat + 1)).slice(-2));
      text('beat-text', steps[current].beats[beat]);
      text('gateway-status', repaired ? 'Fixed · connections get through' : steps[current].gateway);
      text('gateway-icon', repaired || current === 0 ? '✓' : current === 1 ? '+' : current === 5 ? '↻' : '×');
    }
    // A packet's position is driven by this same clock as the captions and
    // progress bar. Pausing freezes the whole explanation, not just the tabs.
    var firstStart = current === 5 ? 0.5 : 0.035;
    var firstEnd = current === 5 ? 0.6 : 0.24;
    packet('request', p, firstStart, firstEnd, false, true);
    packet('fetch', p, current === 5 ? 0.61 : 0.30, current === 5 ? 0.70 : 0.47, false, succeeds);
    packet('mail', p, current === 5 ? 0.71 : 0.55, current === 5 ? 0.81 : 0.70, true, succeeds);
    packet('reply', p, current === 5 ? 0.82 : 0.72, 0.94, true, succeeds);
    packet('fallback', p, 0.34, 0.65, false, current === 3 || current === 4);
    progress.style.width = (p * 100).toFixed(2) + '%';
    text('playback-status', (playing ? (mode === 'all' ? 'Playing all' : 'Playing this step') : paused ? 'Paused' : 'Ready') + ' · step ' + (current + 1) + ' of 6');
  }

  function select(index, announce) {
    current = Math.max(0, Math.min(tabs.length - 1, index));
    beat = -1;
    player.dataset.stage = String(current);
    tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', i === current ? 'true' : 'false');
      tab.tabIndex = i === current ? 0 : -1;
    });
    scenes.forEach(function (scene, i) { scene.hidden = i !== current; });
    previous.disabled = current === 0;
    next.disabled = current === tabs.length - 1;
    count.textContent = ('0' + (current + 1)).slice(-2) + ' / 06';
    text('time', steps[current].time);
    text('screen-title', steps[current].screen);
    text('screen-detail', steps[current].detail);
    text('user-result', steps[current].result);
    text('mailbox-status', steps[current].mailbox);
    text('condition', steps[current].condition);
    text('extra-title', current === 0 ? 'Teams uses another entrance' : 'Teams moved to this gateway');
    text('extra-detail', current === 0 ? 'A separate connection path' : 'More connections at the same front door');
    text('fallback-title', current === 4 ? 'Another region' : 'Another server group');
    text('fallback-status', 'Same defect + redirected work');
    board.setAttribute('aria-label', scenes[current].querySelector('h3').textContent + ' ' + scenes[current].querySelector('.m365-scene-caption p').textContent);
    if (announce) status.textContent = 'Step ' + (current + 1) + ' of 6. ' + scenes[current].querySelector('h3').textContent;
  }

  function updateButton() {
    play.textContent = playing ? 'Ⅱ Pause' : paused ? '▶ Resume' : '▶ Play all';
    play.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function stop() {
    window.cancelAnimationFrame(frame);
    frame = null;
    playing = false;
    paused = false;
    updateButton();
  }
  function tick(now) {
    if (!playing) return;
    elapsed = Math.min(duration, now - started);
    renderAt(elapsed / duration);
    if (elapsed >= duration) {
      if (mode === 'all' && current < tabs.length - 1) {
        select(current + 1, true);
        elapsed = 0;
        started = now;
        renderAt(0);
      } else {
        stop();
        renderAt(1);
        text('playback-status', current === 5 ? 'Story complete · your inbox is back' : 'Step complete · select Next or Play all');
        return;
      }
    }
    frame = window.requestAnimationFrame(tick);
  }
  function run(index, runMode) {
    stop();
    mode = runMode;
    select(index, true);
    elapsed = 0;
    started = performance.now();
    playing = true;
    renderAt(0);
    updateButton();
    frame = window.requestAnimationFrame(tick);
  }
  function pause() {
    if (!playing) return;
    elapsed = Math.min(duration, performance.now() - started);
    window.cancelAnimationFrame(frame);
    playing = false;
    paused = true;
    updateButton();
    renderAt(elapsed / duration);
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { run(index, 'step'); });
    tab.addEventListener('keydown', function (event) {
      var target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else return;
      event.preventDefault();
      run(target, 'step');
      tabs[target].focus();
    });
  });
  play.addEventListener('click', function () {
    if (playing) pause();
    else if (paused) {
      started = performance.now() - elapsed;
      playing = true;
      paused = false;
      updateButton();
      renderAt(elapsed / duration);
      frame = window.requestAnimationFrame(tick);
    } else run(0, 'all'); // Play ALL always starts at the beginning, immediately.
  });
  replay.addEventListener('click', function () { run(0, 'all'); });
  previous.addEventListener('click', function () { run(current - 1, 'step'); });
  next.addEventListener('click', function () { run(current + 1, 'step'); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

  function applyMotionPreference() {
    player.dataset.reducedMotion = motion.matches ? 'true' : 'false';
    var note = player.querySelector('[data-m365-motion-note]');
    note.hidden = !motion.matches;
    note.textContent = 'Reduced motion: Play all still tells the story, without moving request graphics.';
    // Explicitly requested playback remains available. The same captions and
    // step progression work without moving packets or a sweeping progress bar.
    if (beat >= 0) renderAt(position);
  }
  motion.addEventListener('change', applyMotionPreference);

  player.classList.add('is-enhanced');
  scenes.forEach(function (scene, i) {
    scene.setAttribute('role', 'tabpanel');
    scene.setAttribute('aria-labelledby', tabs[i].id);
    scene.tabIndex = 0;
  });
  ['.m365-controls', '.m365-tabs', '[data-m365-board]', '.m365-live-commentary', '.m365-playback-track', '.m365-story-navigation', '[data-m365-replay]'].forEach(function (selector) { player.querySelector(selector).hidden = false; });
  applyMotionPreference();
  select(0, false);
  renderAt(1);
  text('beat-text', 'Press Play all to follow your request—or select any step.');
  text('playback-status', 'Ready · about 48 seconds for all six steps');
})();
