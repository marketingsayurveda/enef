// Configuración del formulario.
//
// El envío usa Netlify Forms: no hay endpoint externo ni credenciales.
// Netlify detecta el formulario al desplegar (por data-netlify="true" en el
// marcado) y guarda los envíos; el correo de aviso a info@ayurvedskepobyty.sk
// se configura en el panel de Netlify (Forms > Form notifications), no aquí.
//
// Ojo: esto solo funciona en el sitio desplegado en Netlify. En local o en
// otro hosting el POST devuelve 404 y verás el mensaje de error.
const FORM_NAME = "contact";

// Página de agradecimiento a la que se redirige tras un envío correcto.
const THANKS_URL = "/ayurveda/thanks.html";

// Margen antes de redirigir para que GTM alcance a enviar el evento de éxito.
const REDIRECT_DELAY = 400;

const MESSAGES = {
  nameRequired: "Zadajte vaše meno a priezvisko.",
  nameShort: "Meno musí mať aspoň 2 znaky.",
  emailRequired: "Zadajte váš email.",
  emailInvalid: "Zadajte platnú emailovú adresu.",
  phoneInvalid: "Zadajte platné telefónne číslo.",
  messageLong: "Správa je príliš dlhá (max. 2000 znakov).",
  sending: "Odosielam…",
  error:
    "Správu sa nepodarilo odoslať. Skúste to znova alebo nám napíšte na info@ayurvedskepobyty.sk.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{9,20}$/;
const MESSAGE_MAX_LENGTH = 2000;

const validateField = (input) => {
  const value = input.value.trim();

  if (input.name === "name") {
    if (!value) return MESSAGES.nameRequired;
    if (value.length < 2) return MESSAGES.nameShort;
  }

  if (input.name === "email") {
    if (!value) return MESSAGES.emailRequired;
    if (!EMAIL_PATTERN.test(value)) return MESSAGES.emailInvalid;
  }

  if (input.name === "phone") {
    if (value && !PHONE_PATTERN.test(value)) return MESSAGES.phoneInvalid;
  }

  if (input.name === "message") {
    if (value.length > MESSAGE_MAX_LENGTH) return MESSAGES.messageLong;
  }

  return "";
};

const pushEvent = (payload) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const status = form.querySelector("#form-status");
  const submitButton = form.querySelector(".submit-button");
  const submitLabel = submitButton.querySelector(".submit-button__label");
  const submitLabelText = submitLabel.textContent.trim();
  const fields = ["name", "email", "phone", "message"]
    .map((name) => form.querySelector(`[name="${name}"]`))
    .filter(Boolean);

  const showError = (input, message) => {
    const errorNode = form.querySelector(`#${input.name}-error`);
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.toggle("is-visible", Boolean(message));
    }
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
  };

  const clearErrors = () => {
    fields.forEach((input) => showError(input, ""));
  };

  const setStatus = (message, variant) => {
    if (!status) return;
    status.textContent = message;
    status.classList.remove("form-status--success", "form-status--error");
    if (message) {
      status.classList.add(`form-status--${variant}`);
    }
    status.classList.toggle("is-visible", Boolean(message));
  };

  // Mientras se envía, el botón queda deshabilitado y muestra el spinner para
  // que no se pueda volver a pulsar hasta que haya respuesta.
  const setLoading = (isLoading) => {
    submitButton.disabled = isLoading;
    submitButton.classList.toggle("is-loading", isLoading);
    submitButton.setAttribute("aria-busy", String(isLoading));
    submitLabel.textContent = isLoading ? MESSAGES.sending : submitLabelText;
  };

  // Al volver atrás desde la página de agradecimiento el navegador puede
  // restaurar esta página desde bfcache con el botón todavía bloqueado.
  window.addEventListener("pageshow", () => setLoading(false));

  // Revalidación progresiva: solo se actualiza el error de un campo que ya
  // estaba marcado como inválido, para no molestar mientras se escribe.
  fields.forEach((input) => {
    const revalidate = () => {
      if (!input.classList.contains("is-invalid")) return;
      showError(input, validateField(input));
    };

    input.addEventListener("input", revalidate);
    input.addEventListener("change", revalidate);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", "error");

    let firstInvalid = null;

    fields.forEach((input) => {
      const message = validateField(input);
      showError(input, message);
      if (message && !firstInvalid) {
        firstInvalid = input;
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const retreatType = form.querySelector("[name='type']").value;

    pushEvent({ event: "form_submit_attempt", form_name: FORM_NAME });
    setLoading(true);

    // Netlify espera el POST urlencoded contra una ruta del propio sitio,
    // con form-name identificando el formulario (va en un input oculto).
    const body = new URLSearchParams(new FormData(form)).toString();

    let isRedirecting = false;

    try {
      const response = await fetch(window.location.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!response.ok) {
        setStatus(MESSAGES.error, "error");
        pushEvent({ event: "form_submit_error", form_name: FORM_NAME, error_type: "api" });
        return;
      }

      clearErrors();
      pushEvent({
        event: "form_submit_success",
        form_name: FORM_NAME,
        retreat_type: retreatType,
      });

      // El botón sigue en loading hasta que el navegador cambie de página.
      isRedirecting = true;
      window.setTimeout(() => {
        window.location.assign(THANKS_URL);
      }, REDIRECT_DELAY);
    } catch (error) {
      setStatus(MESSAGES.error, "error");
      pushEvent({ event: "form_submit_error", form_name: FORM_NAME, error_type: "network" });
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  });
});
