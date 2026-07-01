"use strict";

const bookingForm = document.querySelector("#booking-form");
const nomeInput = document.querySelector("#nome");
const telefoneInput = document.querySelector("#telefone");
const servicoInput = document.querySelector("#servico");
const dataInput = document.querySelector("#data");
const horarioInput = document.querySelector("#horario");
const confirmButton = document.querySelector("#confirmar-btn");
const toast = document.querySelector("#toast");

const resumoNome = document.querySelector("#resumo-nome");
const resumoServico = document.querySelector("#resumo-servico");
const resumoData = document.querySelector("#resumo-data");
const resumoHorario = document.querySelector("#resumo-horario");

const errorElements = {
  nome: document.querySelector("#erro-nome"),
  telefone: document.querySelector("#erro-telefone"),
  servico: document.querySelector("#erro-servico"),
  data: document.querySelector("#erro-data"),
  horario: document.querySelector("#erro-horario")
};

const fields = [nomeInput, telefoneInput, servicoInput, dataInput, horarioInput];
let isSubmitting = false;
let supabaseService = null;
let toastTimeoutId = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function ensureSupabaseReady() {
  if (!window.CICOTE_CONFIG && (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY)) {
    try {
      await loadScript("js/config.js");
    } catch (error) {
      // Config pode ser injetada por outro mecanismo; se nao existir, o init reporta o erro.
    }
  }

  if (!window.CicoteSupabase) {
    await loadScript("js/supabase.js");
  }

  if (!window.CicoteSupabase) {
    throw new Error("Modulo de Supabase indisponivel.");
  }

  if (!supabaseService) {
    await window.CicoteSupabase.initSupabase();
    supabaseService = window.CicoteSupabase;
  }

  return supabaseService;
}

function getTodayIso() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
}

function onlyDigits(value) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function applyPhoneMask(value) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatDateBr(isoDate) {
  if (!isoDate) {
    return "-";
  }

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function setError(fieldName, message) {
  const errorElement = errorElements[fieldName];
  const inputElement = document.querySelector(`#${fieldName}`);

  if (!errorElement || !inputElement) {
    return;
  }

  errorElement.textContent = message;
  inputElement.classList.toggle("input-error", Boolean(message));
  inputElement.setAttribute("aria-invalid", message ? "true" : "false");
}

function clearErrors() {
  Object.keys(errorElements).forEach((key) => setError(key, ""));
}

function isPastDate(selectedDate) {
  const today = getTodayIso();
  return selectedDate < today;
}

function isPhoneValid(value) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

function validateForm() {
  clearErrors();

  let isValid = true;

  if (!nomeInput.value.trim()) {
    setError("nome", "Informe seu nome completo.");
    isValid = false;
  }

  if (!telefoneInput.value.trim()) {
    setError("telefone", "Informe seu telefone.");
    isValid = false;
  } else if (!isPhoneValid(telefoneInput.value)) {
    setError("telefone", "Informe um telefone valido.");
    isValid = false;
  }

  if (!servicoInput.value) {
    setError("servico", "Selecione um servico.");
    isValid = false;
  }

  if (!dataInput.value) {
    setError("data", "Selecione uma data.");
    isValid = false;
  } else if (isPastDate(dataInput.value)) {
    setError("data", "Nao e permitido agendar datas passadas.");
    isValid = false;
  }

  if (!horarioInput.value) {
    setError("horario", "Selecione um horario.");
    isValid = false;
  }

  return isValid;
}

function validateField(field) {
  if (field === nomeInput) {
    if (!nomeInput.value.trim()) {
      setError("nome", "Informe seu nome completo.");
      return false;
    }

    setError("nome", "");
    return true;
  }

  if (field === telefoneInput) {
    if (!telefoneInput.value.trim()) {
      setError("telefone", "Informe seu telefone.");
      return false;
    }

    if (!isPhoneValid(telefoneInput.value)) {
      setError("telefone", "Informe um telefone valido.");
      return false;
    }

    setError("telefone", "");
    return true;
  }

  if (field === servicoInput) {
    if (!servicoInput.value) {
      setError("servico", "Selecione um servico.");
      return false;
    }

    setError("servico", "");
    return true;
  }

  if (field === dataInput) {
    if (!dataInput.value) {
      setError("data", "Selecione uma data.");
      return false;
    }

    if (isPastDate(dataInput.value)) {
      setError("data", "Nao e permitido agendar datas passadas.");
      return false;
    }

    setError("data", "");
    return true;
  }

  if (field === horarioInput) {
    if (!horarioInput.value) {
      setError("horario", "Selecione um horario.");
      return false;
    }

    setError("horario", "");
    return true;
  }

  return true;
}

function updateSummary() {
  resumoNome.textContent = nomeInput.value.trim() || "-";
  resumoServico.textContent = servicoInput.value || "-";
  resumoData.textContent = formatDateBr(dataInput.value);
  resumoHorario.textContent = horarioInput.value || "-";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");

  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId);
  }

  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toastTimeoutId = null;
  }, 2600);
}

function setLoadingState(isLoading) {
  confirmButton.disabled = isLoading;

  if (isLoading) {
    confirmButton.innerHTML = '<span class="button-loading"><span class="spinner" aria-hidden="true"></span>Confirmando...</span>';
    return;
  }

  confirmButton.textContent = "Confirmar agendamento";
}

function mapErrorMessage(error) {
  if (!error) {
    return "Não foi possível enviar agora.";
  }

  return "Não foi possível enviar agora.";
}

async function init() {
  const minDate = getTodayIso();
  dataInput.min = minDate;

  telefoneInput.addEventListener("input", () => {
    telefoneInput.value = applyPhoneMask(telefoneInput.value);
    updateSummary();
  });

  fields.forEach((field) => {
    field.addEventListener("input", updateSummary);
    field.addEventListener("change", updateSummary);

    field.addEventListener("blur", () => {
      const hasValue = typeof field.value === "string" ? field.value.trim() !== "" : Boolean(field.value);

      if (!hasValue) {
        return;
      }

      validateField(field);
    });
  });

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!validateForm()) {
      showToast("Revise os campos obrigatorios.");
      return;
    }

    const appointmentPayload = {
      name: nomeInput.value.trim(),
      phone: telefoneInput.value.trim(),
      service: servicoInput.value,
      appointment_date: dataInput.value,
      appointment_time: horarioInput.value,
      status: "pendente",
      created_at: new Date().toISOString()
    };

    isSubmitting = true;
    setLoadingState(true);

    try {
      const api = await ensureSupabaseReady();
      await api.createAppointment(appointmentPayload);
      showToast("Agendamento recebido. Entraremos em contato.");
      bookingForm.reset();
      dataInput.min = getTodayIso();
      clearErrors();
      updateSummary();
    } catch (error) {
      console.error(error);
      showToast(mapErrorMessage(error));
    } finally {
      isSubmitting = false;
      setLoadingState(false);
    }
  });

  updateSummary();
}

init();