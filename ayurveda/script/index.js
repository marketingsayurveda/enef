document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  document.querySelectorAll(".retreat-card__more").forEach((button) => {
    const panel = button.nextElementSibling;
    if (!panel || !panel.classList.contains("retreat-card__toogle")) return;

    button.setAttribute("aria-expanded", "false");

    button.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("is-open");
      button.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
});
