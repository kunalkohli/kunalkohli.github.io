(function () {
  var player = document.querySelector("[data-attack-player]");
  if (!player) return;

  var tabs = Array.prototype.slice.call(
    player.querySelectorAll("[data-attack-stage]")
  );
  var scenes = Array.prototype.slice.call(
    player.querySelectorAll("[data-attack-scene]")
  );
  var playButton = player.querySelector("[data-attack-play]");
  var replayButton = player.querySelector("[data-attack-replay]");
  var counter = player.querySelector("[data-attack-index]");
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var current = 0;
  var timer = null;
  var playing = false;
  var hasStarted = false;
  var userInteracted = false;
  var stageDuration = 4800;

  function pad(index) {
    return ("0" + (index + 1)).slice(-2);
  }

  function updatePlayButton() {
    if (!playButton) return;
    playButton.textContent = playing ? "Pause" : "▶ Play all";
    playButton.setAttribute("aria-pressed", playing ? "true" : "false");
  }

  function setStage(index, animate) {
    if (!tabs.length) return;
    current = Math.max(0, Math.min(tabs.length - 1, index));

    tabs.forEach(function (tab, i) {
      var active = i === current;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });

    scenes.forEach(function (scene, i) {
      var active = i === current;
      scene.classList.toggle("is-active", active);
      scene.classList.remove("is-live");
      if (active && animate) {
        // Force a reflow so the scene animation restarts on every switch.
        void scene.offsetWidth;
        scene.classList.add("is-live");
      }
    });

    if (counter) {
      counter.textContent = pad(current);
    }
  }

  function stopPlayback() {
    playing = false;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    updatePlayButton();
  }

  function startPlayback() {
    if (reduceMotion || playing || tabs.length < 2) return;

    playing = true;
    updatePlayButton();
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(function () {
      if (current >= tabs.length - 1) {
        stopPlayback();
        return;
      }
      setStage(current + 1, true);
    }, stageDuration);
  }

  function selectStage(index, animate) {
    stopPlayback();
    setStage(index, animate !== false);
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      userInteracted = true;
      selectStage(index, true);
    });

    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") {
        next = (index - 1 + tabs.length) % tabs.length;
      }
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;

      event.preventDefault();
      userInteracted = true;
      selectStage(next, true);
      tabs[next].focus();
    });
  });

  if (playButton) {
    playButton.addEventListener("click", function () {
      userInteracted = true;
      if (playing) {
        stopPlayback();
        return;
      }
      if (current >= tabs.length - 1) {
        setStage(0, true);
      }
      startPlayback();
    });
  }

  if (replayButton) {
    replayButton.addEventListener("click", function () {
      userInteracted = true;
      stopPlayback();
      setStage(0, true);
      startPlayback();
    });
  }

  // Set the initial UI without starting the animation until it is in view.
  setStage(0, false);

  function begin() {
    if (hasStarted) return;
    hasStarted = true;
    setStage(current, true);
    if (!userInteracted) {
      startPlayback();
    }
    if (observer) observer.disconnect();
  }

  var observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) begin();
        });
      },
      { threshold: 0.16 }
    );
    observer.observe(player);
  } else {
    begin();
  }
})();
