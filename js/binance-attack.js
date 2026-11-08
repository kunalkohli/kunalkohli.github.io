(function () {
  var root = document.querySelector("[data-attack-anim]");
  if (!root) return;

  function play() {
    root.classList.remove("is-live");
    // Force a reflow so the reveal animation can be replayed.
    void root.offsetWidth;
    root.classList.add("is-live");
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            play();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(root);
  } else {
    play();
  }

  var replay = root.querySelector(".attack-replay");
  if (replay) {
    replay.addEventListener("click", play);
  }
})();
