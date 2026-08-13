document.addEventListener("DOMContentLoaded", () => {
  // Renderiza los iconos inline de Lucide (data-lucide).
  if (window.lucide) {
    lucide.createIcons();
  }

  // Acordeón de preguntas frecuentes.
  document.querySelectorAll(".faq-item").forEach((item) => {
    const button = item.querySelector(".faq-item__q");
    if (!button) return;

    button.addEventListener("click", () => {
      const isOpen = item.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
});
