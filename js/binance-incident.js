(function () {
  "use strict";

  var progress = document.getElementById("inc-progress-bar");
  var nav = document.querySelector(".inc-nav");
  var links = Array.prototype.slice.call(document.querySelectorAll(".inc-nav-link"));
  var sections = links
    .map(function (link) {
      var id = link.getAttribute("href");
      return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  var activeId = "situation";

  function setActive(id) {
    if (!id || id === activeId) {
      return;
    }
    activeId = id;

    links.forEach(function (link) {
      var isActive = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (nav && window.matchMedia("(max-width: 860px)").matches) {
      var active = nav.querySelector(".inc-nav-link.is-active");
      if (active) {
        var left = active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2;
        if (typeof nav.scrollTo === "function") {
          nav.scrollTo({ left: left, behavior: "smooth" });
        }
      }
    }
  }

  function updateChrome() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    if (progress) {
      progress.style.width = pct + "%";
    }

    if (!sections.length) {
      return;
    }

    var probe = window.scrollY + 150;
    var current = sections[0];

    sections.forEach(function (section) {
      var top = section.getBoundingClientRect().top + window.scrollY;
      if (top <= probe) {
        current = section;
      }
    });

    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }

    setActive(current.id);
  }

  var ticking = false;

  function onScroll() {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(function () {
      updateChrome();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateChrome();

  /* Start each scene when it first enters the viewport. */
  var scenes = Array.prototype.slice.call(document.querySelectorAll("[data-scene]"));

  function playScene(scene) {
    scene.classList.remove("is-live");
    void scene.offsetWidth;
    scene.classList.add("is-live");
  }

  if ("IntersectionObserver" in window) {
    var sceneObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.target.dataset.played !== "1") {
            entry.target.dataset.played = "1";
            playScene(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );

    scenes.forEach(function (scene) {
      sceneObserver.observe(scene);
    });
  } else {
    scenes.forEach(playScene);
  }

  document.querySelectorAll(".scene-replay").forEach(function (button) {
    button.addEventListener("click", function () {
      var scene = button.closest("[data-scene]");
      if (scene) {
        playScene(scene);
      }
    });
  });

  /* Keep keyboard navigation from hiding the section under the sticky bars. */
  links.forEach(function (link) {
    link.addEventListener("click", function () {
      var id = link.getAttribute("href");
      if (id && id.charAt(0) === "#") {
        setActive(id.slice(1));
      }
    });
  });
})();
