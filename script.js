(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toast = document.querySelector(".toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2100);
  }

  const progressBar = document.querySelector("#scroll-progress");
  const parallax = document.querySelector("[data-parallax]");
  let scrollFrame = 0;

  function updateScrollEffects() {
    scrollFrame = 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) {
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      progressBar.style.transform = `scaleX(${progress})`;
    }
    if (parallax && !reduceMotion.matches && window.innerWidth > 600) {
      const offset = Math.min(45, Math.max(-45, window.scrollY * 0.1));
      parallax.style.transform = `translate3d(0, ${offset}px, 0)`;
    } else if (parallax) {
      parallax.style.transform = "";
    }
  }

  function requestScrollEffects() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  }
  window.addEventListener("scroll", requestScrollEffects, { passive: true });
  window.addEventListener("resize", requestScrollEffects, { passive: true });
  updateScrollEffects();

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");

  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "打开导航");
    menuButton.title = "打开导航";
    nav.classList.remove("is-open");
    document.body.classList.remove("menu-is-open");
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "关闭导航" : "打开导航");
      menuButton.title = isOpen ? "关闭导航" : "打开导航";
      nav.classList.toggle("is-open", isOpen);
      document.body.classList.toggle("menu-is-open", isOpen);
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (nav.classList.contains("is-open") && !nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeMenu();
        menuButton.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    }, { passive: true });
  }

  document.querySelectorAll(".ripple-target").forEach((target) => {
    target.addEventListener("pointerdown", (event) => {
      if (reduceMotion.matches) return;
      const rect = target.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${event.clientX - rect.left - diameter / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - diameter / 2}px`;
      target.append(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      window.setTimeout(() => ripple.remove(), 700);
    });
  });

  async function writeClipboard(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // A browser may expose the API but deny clipboard permission.
      }
    }
    const previousFocus = document.activeElement;
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    previousFocus?.focus({ preventScroll: true });
    if (!copied) throw new Error("clipboard unavailable");
  }

  document.querySelectorAll("[data-copy-value], #copy-booking").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue || document.querySelector("#booking-message")?.textContent.trim();
      if (!value) return;
      try {
        await writeClipboard(value);
        showToast(button.id === "copy-booking" ? "咨询模板已复制" : "已复制到剪贴板");
      } catch {
        showToast("复制未成功，请长按文字手动复制");
      }
    });
  });

  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    revealItems.forEach((element) => {
      const delay = Number(element.dataset.delay || 0);
      element.style.setProperty("--reveal-delay", `${Math.min(delay, 180)}ms`);
    });
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    revealItems.forEach((element) => revealObserver.observe(element));
  } else {
    revealItems.forEach((element) => element.classList.add("is-visible"));
  }

  const sections = [...document.querySelectorAll("[data-section]")];
  const sectionLinks = [...document.querySelectorAll("[data-spy-link]")];
  if ("IntersectionObserver" in window) {
    const linkObserver = new IntersectionObserver((entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      sectionLinks.forEach((link) => {
        const selected = link.getAttribute("href") === `#${active.target.id}`;
        if (selected) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { threshold: 0, rootMargin: "-24% 0px -66% 0px" });
    sections.forEach((section) => linkObserver.observe(section));
  }

  const carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    const slides = [...carousel.querySelectorAll("[data-slide]")];
    const counter = carousel.querySelector("[data-carousel-count]");
    const toggle = carousel.querySelector("[data-carousel-toggle]");
    const previous = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    const progress = carousel.querySelector(".gallery-progress span");
    const interval = 6000;
    let currentIndex = 0;
    let timer = 0;
    let isPaused = reduceMotion.matches;
    let isInView = false;
    let isPausedByHover = false;
    let isPausedByFocus = false;
    let progressAnimation;

    function renderCarousel() {
      slides.forEach((slide, index) => {
        const active = index === currentIndex;
        slide.classList.toggle("is-active", active);
        slide.inert = !active;
        slide.setAttribute("aria-hidden", String(!active));
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-label", `第 ${index + 1} 张，共 ${slides.length} 张`);
      });
      if (counter) counter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      carousel.classList.toggle("is-paused", isPaused);
      if (toggle) {
        toggle.setAttribute("aria-pressed", String(isPaused));
        toggle.setAttribute("aria-label", isPaused ? "播放自动切换" : "暂停自动切换");
        toggle.title = isPaused ? "播放自动切换" : "暂停自动切换";
      }
    }

    function stop() {
      window.clearTimeout(timer);
      timer = 0;
      progressAnimation?.cancel();
      carousel.classList.remove("is-running");
    }

    function schedule() {
      stop();
      if (isPaused || isPausedByHover || isPausedByFocus || !isInView || document.hidden || slides.length < 2) return;
      carousel.classList.add("is-running");
      if (progress && !reduceMotion.matches) {
        progressAnimation = progress.animate([
          { transform: "scaleX(0)" },
          { transform: "scaleX(1)" }
        ], { duration: interval, fill: "forwards" });
      }
      timer = window.setTimeout(() => goTo(currentIndex + 1), interval);
    }

    function goTo(index) {
      currentIndex = (index + slides.length) % slides.length;
      renderCarousel();
      schedule();
    }

    toggle?.addEventListener("click", () => {
      isPaused = !isPaused;
      renderCarousel();
      schedule();
    });
    previous?.addEventListener("click", () => goTo(currentIndex - 1));
    next?.addEventListener("click", () => goTo(currentIndex + 1));
    carousel.addEventListener("mouseenter", () => {
      isPausedByHover = true;
      schedule();
    });
    carousel.addEventListener("mouseleave", () => {
      isPausedByHover = false;
      schedule();
    });
    carousel.addEventListener("focusin", () => {
      isPausedByFocus = true;
      schedule();
    });
    carousel.addEventListener("focusout", (event) => {
      if (carousel.contains(event.relatedTarget)) return;
      isPausedByFocus = false;
      schedule();
    });
    reduceMotion.addEventListener("change", () => {
      if (reduceMotion.matches) isPaused = true;
      renderCarousel();
      schedule();
    });

    document.addEventListener("visibilitychange", schedule);
    if ("IntersectionObserver" in window) {
      const carouselObserver = new IntersectionObserver(([entry]) => {
        isInView = entry.isIntersecting;
        renderCarousel();
        schedule();
      }, { threshold: 0.2 });
      carouselObserver.observe(carousel);
    } else {
      isInView = true;
    }
    renderCarousel();
    schedule();
  }

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) revealItems.forEach((element) => element.classList.add("is-visible"));
    requestScrollEffects();
  });
})();
