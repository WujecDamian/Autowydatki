// Feeds the pointer position to any element marked data-glow, so index.css can light its border where the cursor is.
export const installGlow = () => {
  if (typeof window === "undefined" || !window.matchMedia("(hover: hover)").matches) {
    return;
  }

  let frame = 0;

  document.addEventListener(
    "pointermove",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-glow]") : null;

      if (!target || frame) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
      });
    },
    { passive: true },
  );
};
