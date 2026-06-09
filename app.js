const progress = document.getElementById("scrollProgress");
const matIntro = document.getElementById("matIntro");
const introEnterControls = Array.from(document.querySelectorAll("[data-intro-enter]"));
const introSkip = document.querySelector("[data-intro-skip]");
const introStorageKey = "fe1-step-onto-the-mat-entered-v2";
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function markIntroSeen() {
  try {
    sessionStorage.setItem(introStorageKey, "true");
  } catch (error) {
    // Session storage can be unavailable in private or restricted browser modes.
  }
}

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(introStorageKey) === "true";
  } catch (error) {
    return false;
  }
}

function finishIntro({ animate = true } = {}) {
  if (!matIntro) return;

  markIntroSeen();

  if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    matIntro.hidden = true;
    document.body.classList.remove("intro-active");
    return;
  }

  matIntro.classList.add("is-animating");
  introEnterControls.forEach((control) => {
    control.disabled = true;
  });
  if (introSkip) introSkip.disabled = true;

  window.setTimeout(() => {
    matIntro.classList.add("is-leaving");
    document.body.classList.remove("intro-active");
  }, 560);

  window.setTimeout(() => {
    matIntro.hidden = true;
  }, 1180);
}

if (matIntro && hasSeenIntro()) {
  finishIntro({ animate: false });
}

introEnterControls.forEach((control) => {
  control.addEventListener("click", () => finishIntro());
});

if (introSkip) {
  introSkip.addEventListener("click", () => finishIntro({ animate: false }));
}

function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-32% 0px -58% 0px", threshold: [0.1, 0.35, 0.7] }
);

sections.forEach((section) => sectionObserver.observe(section));
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

document.querySelectorAll(".scorecard-card").forEach((card) => {
  const button = card.querySelector("button");

  card.addEventListener("pointerenter", () => {
    card.classList.add("is-hovered");
    button.setAttribute("aria-expanded", "true");
  });

  card.addEventListener("pointerleave", () => {
    card.classList.remove("is-hovered");
    if (!card.classList.contains("is-open")) {
      button.setAttribute("aria-expanded", "false");
    }
  });

  card.addEventListener("focusin", () => {
    card.classList.add("is-hovered");
    button.setAttribute("aria-expanded", "true");
  });

  card.addEventListener("focusout", () => {
    card.classList.remove("is-hovered");
    if (!card.classList.contains("is-open")) {
      button.setAttribute("aria-expanded", "false");
    }
  });

  button.addEventListener("click", () => {
    const isOpen = !card.classList.contains("is-open");
    card.classList.toggle("is-open", isOpen);
    if (!isOpen) {
      card.classList.remove("is-hovered");
      button.blur();
    }
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

document.querySelectorAll(".opportunity-card").forEach((card) => {
  card.addEventListener("toggle", () => {
    if (!card.open) return;

    document.querySelectorAll(".opportunity-card[open]").forEach((openCard) => {
      if (openCard !== card) {
        openCard.open = false;
      }
    });
  });
});

const editableCalendarItems = Array.from(document.querySelectorAll("[data-editable-id]"));
const calendarStatus = document.getElementById("calendarStatus");
const storagePrefix = "fe1-calendar:";
const calendarDefaultVersionKey = `${storagePrefix}default-version`;
const calendarDefaultVersion = "june-july-calendar-grid-2026-06-09";

if (localStorage.getItem(calendarDefaultVersionKey) !== calendarDefaultVersion) {
  editableCalendarItems
    .filter((item) => item.classList.contains("calendar-cell"))
    .forEach((item) => {
      localStorage.removeItem(`${storagePrefix}${item.dataset.editableId}`);
    });
  localStorage.setItem(calendarDefaultVersionKey, calendarDefaultVersion);
}

function setCalendarStatus(message) {
  if (!calendarStatus) return;
  calendarStatus.textContent = message;
}

function defaultActivityTypeForCell(item) {
  if (item.classList.contains("client")) return "client-meeting";
  if (item.classList.contains("internal")) return "internal-sharing";
  if (item.classList.contains("learning")) return "self-learning";
  if (item.classList.contains("alignment")) return "catch-up-alignment";
  if (item.classList.contains("collaboration")) return "collaboration-rfp-support";
  return "add-activity";
}

function normalizeCalendarActivityMarkup(item) {
  if (!item.classList.contains("calendar-cell") || item.querySelector(".activity")) return;

  const content = item.innerHTML.trim();
  const activityType = content ? defaultActivityTypeForCell(item) : "add-activity";
  item.innerHTML = `<div class="activity ${activityType}">${content || "<strong>Add activity</strong>"}</div>`;
}

editableCalendarItems.forEach((item) => {
  const key = `${storagePrefix}${item.dataset.editableId}`;
  const savedValue = localStorage.getItem(key);

  if (savedValue !== null) {
    item.innerHTML = savedValue;
  }

  normalizeCalendarActivityMarkup(item);

  item.addEventListener("input", () => {
    localStorage.setItem(key, item.innerHTML);
    setCalendarStatus("Saved locally in this browser.");
  });

  item.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  });
});

const pageStoragePrefix = "fe1-page-editable:";

function editableDomPath(element) {
  const parts = [];
  let current = element;

  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;

    const sameTagSiblings = Array.from(parent.children).filter(
      (child) => child.tagName === current.tagName
    );
    const index = sameTagSiblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
    current = parent;
  }

  return parts.join(">");
}

function shouldAutoRegisterEditable(element) {
  const text = element.textContent.trim();

  return (
    text &&
    !element.dataset.pageEditableId &&
    !element.dataset.editableId &&
    !element.closest("[data-page-editable-id]") &&
    !element.closest("[data-editable-id]") &&
    !element.closest(".site-nav") &&
    !element.closest(".hero-actions") &&
    !element.closest(".calendar-tools") &&
    !element.closest(".mat-intro") &&
    !element.closest("button") &&
    !element.closest("script, style")
  );
}

const autoEditableSelector = [
  ".brand-mark",
  ".brand strong",
  ".brand small",
  "main h1",
  "main h2",
  "main h3",
  "main h4",
  "main h5",
  "main p",
  "main li",
  "main blockquote",
  "main span",
  "main strong",
  "main small",
  ".objective-number",
  ".focus-badge",
  ".stage-badge",
  ".track-card-number",
  ".score-tag",
  ".tape-label",
  ".opportunity-mark",
  ".account-pills span",
  ".belt",
  "footer p"
].join(",");

document.querySelectorAll(autoEditableSelector).forEach((element) => {
  if (!shouldAutoRegisterEditable(element)) return;
  element.dataset.pageEditableId = `auto:${editableDomPath(element)}`;
  element.classList.add("site-editable");
  element.setAttribute("contenteditable", "true");
  element.setAttribute("spellcheck", "true");
});

const editablePageItems = Array.from(document.querySelectorAll("[data-page-editable-id]"));
const pageEditableDefaultUpdates = new Map([
  ["training-track-1-item-1", { from: "Align with mentor/FLL", to: "Align with mentor / FLL" }],
  ["training-track-1-item-2", { from: "Identify active opportunities", to: "Identify active opportunities by checking with the SuccessFactors team regularly" }],
  ["training-track-1-item-3", { from: "Build stakeholder list across Sales, SA, CSM, Services", to: "Maintain KPI tracker and reflection log" }],
  ["training-track-2-item-1", { from: "Ask Sales / SA / CSM whether I can join meetings", to: "Shadow meetings with Sales / SA / CSM where possible" }],
  ["training-track-2-item-2", { from: "Join internal account planning calls when possible", to: "Join internal account planning calls" }],
  ["training-track-3-item-2", { from: "Practice SuccessFactors demo flow independently", to: "Practice the SuccessFactors demo flow independently" }],
  ["training-track-4-item-2", { from: "Draft RFx/RFP sections", to: "Co-work RFx / RFP sections" }],
  ["training-track-4-item-3", { from: "Prepare demo scripts", to: "Support demo preparation" }]
]);

editablePageItems.forEach((item) => {
  const key = `${pageStoragePrefix}${item.dataset.pageEditableId}`;
  let savedValue = localStorage.getItem(key);
  const defaultUpdate = pageEditableDefaultUpdates.get(item.dataset.pageEditableId);

  if (savedValue !== null && defaultUpdate && savedValue.trim() === defaultUpdate.from) {
    savedValue = defaultUpdate.to;
    localStorage.setItem(key, savedValue);
  }

  if (savedValue !== null) {
    item.innerHTML = savedValue;
  }

  item.addEventListener("click", (event) => {
    if (item.closest("summary")) {
      event.preventDefault();
    }
    event.stopPropagation();
  });

  item.addEventListener("input", () => {
    localStorage.setItem(key, item.innerHTML);
  });

  item.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  });
});

document.querySelectorAll("[data-calendar-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.calendarAction;

    if (action === "reset") {
      editableCalendarItems.forEach((item) => {
        localStorage.removeItem(`${storagePrefix}${item.dataset.editableId}`);
      });
      setCalendarStatus("Saved edits reset. Reloading the default calendar...");
      window.setTimeout(() => window.location.reload(), 450);
    }

    if (action === "export") {
      const text = editableCalendarItems
        .map((item) => {
          const label = item.dataset.editableId;
          const value = item.innerText.trim() || "(blank)";
          return `${label}\n${value}`;
        })
        .join("\n\n---\n\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "fe1-calendar-notes.txt";
      link.click();
      URL.revokeObjectURL(url);
      setCalendarStatus("Calendar text exported.");
    }
  });
});

const revealItems = Array.from(
  document.querySelectorAll(
    ".section-heading, .mission-grid article, .track-grid article, .swot-grid article, .flow-grid article, .opportunity-card, .support-card, .support-callout, .belt-card, .scorecard-card, .kpi-grid article, .planb-grid article, .ai-usecase-row, .ai-grid article, .fe2-grid article, .training-calendar, .timeline-panel, .statement-panel"
  )
);

revealItems.forEach((item) => item.classList.add("reveal"));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
);

revealItems.forEach((item) => revealObserver.observe(item));
