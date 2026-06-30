"use strict";

const revealTargets = document.querySelectorAll(".section-reveal");
const siteHeader = document.querySelector(".site-header");

revealTargets.forEach((target, index) => {
  target.style.transitionDelay = `${Math.min(index * 70, 240)}ms`;
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.2 }
);

revealTargets.forEach((target) => revealObserver.observe(target));

const hero = document.querySelector(".hero");

window.addEventListener("scroll", () => {
  if (siteHeader) {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 14);
  }

  if (!hero) {
    return;
  }

  const offset = Math.min(window.scrollY * 0.2, 70);
  hero.style.backgroundPosition = `center calc(50% + ${offset}px)`;
});