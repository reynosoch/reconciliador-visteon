let overlayLockCount = 0;
let previousBodyOverflow = "";
let previousBodyOverscroll = "";
let previousHtmlOverscroll = "";

export function lockPageScroll() {
  if (overlayLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyOverscroll = document.body.style.overscrollBehavior;
    previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
  }

  overlayLockCount += 1;
  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehavior = "none";
  document.documentElement.style.overscrollBehavior = "none";
  document.body.classList.add("vi-overlay-open");
}

export function unlockPageScroll() {
  overlayLockCount = Math.max(0, overlayLockCount - 1);
  if (overlayLockCount !== 0) return;

  document.body.style.overflow = previousBodyOverflow;
  document.body.style.overscrollBehavior = previousBodyOverscroll;
  document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
  document.body.classList.remove("vi-overlay-open");
}

export function forceUnlockPageScroll() {
  overlayLockCount = 0;
  document.body.style.overflow = "";
  document.body.style.overscrollBehavior = "";
  document.documentElement.style.overscrollBehavior = "";
  document.body.classList.remove("vi-overlay-open");
}
