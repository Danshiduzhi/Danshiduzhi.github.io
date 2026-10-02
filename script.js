const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const copyButton = document.querySelector("#copy-booking");
const bookingMessage = document.querySelector("#booking-message");
const currentChapter = document.querySelector("#current-chapter");
const sectionLinks = document.querySelectorAll("[data-spy-link]");
const sections = document.querySelectorAll("[data-section]");

const sectionLabels = {
  top: "00 / 首页",
  about: "01 / 关于我",
  projects: "02 / 项目",
  services: "03 / 服务",
  process: "04 / 流程",
  faq: "05 / 问答",
  contact: "06 / 联系"
};

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll(".ripple-target").forEach((target) => {
  target.addEventListener("pointerdown", (event) => {
    const rect = target.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");

    ripple.className = "ripple";
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - diameter / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - diameter / 2}px`;
    target.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
});

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }
}

async function copyBookingMessage() {
  if (!copyButton || !bookingMessage) {
    return;
  }

  const text = bookingMessage.textContent.trim();
  await writeClipboard(text);

  copyButton.textContent = "已复制";
  copyButton.classList.add("is-copied");
  window.setTimeout(() => {
    copyButton.classList.remove("is-copied");
    copyButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg> 复制';
  }, 1600);
}

if (copyButton) {
  copyButton.addEventListener("click", copyBookingMessage);
}

document.querySelectorAll("[data-copy-value]").forEach((button) => {
  button.addEventListener("click", async () => {
    const text = button.dataset.copyValue || "";
    const originalText = button.textContent.trim();
    await writeClipboard(text);
    button.textContent = "已复制";
    button.classList.add("is-copied");
    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("is-copied");
    }, 1600);
  });
});

const autoplay = document.querySelector("[data-autoplay]");

if (autoplay) {
  const slides = [...autoplay.querySelectorAll("[data-slide]")];
  const progressSegments = [...autoplay.querySelectorAll(".autoplay-progress span")];
  const toggleButton = autoplay.querySelector("[data-autoplay-toggle]");
  const toggleLabel = toggleButton?.querySelector("span");
  const prevButton = autoplay.querySelector("[data-autoplay-prev]");
  const nextButton = autoplay.querySelector("[data-autoplay-next]");
  const duration = 4500;
  let currentIndex = 0;
  let isPlaying = !prefersReducedMotion;
  let timer = null;

  function renderAutoplay() {
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === currentIndex);
    });

    progressSegments.forEach((segment, index) => {
      segment.classList.remove("is-active");
      if (index === currentIndex) {
        void segment.offsetWidth;
        segment.classList.add("is-active");
      }
    });

    autoplay.classList.toggle("is-paused", !isPlaying);
    if (toggleLabel) {
      toggleLabel.textContent = isPlaying ? "暂停" : "播放";
    }
    if (toggleButton) {
      toggleButton.setAttribute("aria-label", isPlaying ? "暂停自动播放" : "播放自动播放");
    }
  }

  function stopAutoplayTimer() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startAutoplayTimer() {
    stopAutoplayTimer();
    if (!isPlaying || document.hidden) {
      return;
    }

    timer = window.setInterval(() => {
      goToSlide(currentIndex + 1, 1);
    }, duration);
  }

  function goToSlide(index, direction = 1) {
    autoplay.dataset.direction = direction === -1 ? "prev" : "next";
    currentIndex = (index + slides.length) % slides.length;
    renderAutoplay();
    startAutoplayTimer();
  }

  toggleButton?.addEventListener("click", () => {
    isPlaying = !isPlaying;
    renderAutoplay();
    if (isPlaying) {
      startAutoplayTimer();
    } else {
      stopAutoplayTimer();
    }
  });

  prevButton?.addEventListener("click", () => goToSlide(currentIndex - 1, -1));
  nextButton?.addEventListener("click", () => goToSlide(currentIndex + 1, 1));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplayTimer();
    } else {
      startAutoplayTimer();
    }
  });

  renderAutoplay();
  startAutoplayTimer();
}

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
  {
    threshold: 0.16,
    rootMargin: "0px 0px -8% 0px"
  }
);

document.querySelectorAll("[data-reveal]").forEach((element) => {
  const delay = Number(element.dataset.delay || 0);
  element.style.setProperty("--reveal-delay", `${delay}ms`);
  revealObserver.observe(element);
});

const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const id = entry.target.id;
      const label = sectionLabels[id] || sectionLabels.top;

      if (currentChapter) {
        currentChapter.textContent = label;
      }

      sectionLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
      });
    });
  },
  {
    threshold: 0.32,
    rootMargin: "-25% 0px -55% 0px"
  }
);

sections.forEach((section) => spyObserver.observe(section));
