/* Ive Botunac — curriculum vitæ. Minimal vanilla JS, no dependencies. */
(function () {
  "use strict";

  // Signal that JS is on (enables scroll-reveal without hiding content for no-JS users)
  document.documentElement.classList.add("js");

  // Current year
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Rail index toggle (mobile)
  var toggle = document.querySelector(".rail__toggle");
  var nav = document.getElementById("railnav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll(".section"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".railnav a"));

  // Scroll-reveal sections
  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            reveal.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    sections.forEach(function (s) { reveal.observe(s); });

    // Scroll-spy: highlight active section in the rail index
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = "#" + entry.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === id);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { spy.observe(s); });
  } else {
    // No IO support: just show everything
    sections.forEach(function (s) { s.classList.add("in"); });
  }
})();
