/* Ive Botunac — curriculum vitæ. Minimal vanilla JS, no dependencies.
   Site chrome only (year, mobile rail toggle, scroll reveal + scroll-spy).
   The ambient robot mini-game lives in game/*.js (loaded after this file). */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var toggle = document.querySelector(".rail__toggle");
  var nav = document.getElementById("railnav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll(".section"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".railnav a"));

  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("in"); reveal.unobserve(entry.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    sections.forEach(function (s) { reveal.observe(s); });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = "#" + entry.target.id;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  } else {
    sections.forEach(function (s) { s.classList.add("in"); });
  }
})();
