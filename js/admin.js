"use strict";

const stateElement = document.querySelector("#admin-state");
const tableWrap = document.querySelector("#table-wrap");
const appointmentsBody = document.querySelector("#appointments-body");

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

function setState(message, isError) {
  stateElement.textContent = message;
  stateElement.classList.toggle("is-error", Boolean(isError));
}

function formatDateBr(isoDate) {
  if (!isoDate) {
    return "-";
  }

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTimeBr(dateTimeValue) {
  if (!dateTimeValue) {
    return "-";
  }

  const date = new Date(dateTimeValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderAppointments(appointments) {
  appointmentsBody.innerHTML = appointments
    .map(
      (appointment) => `
        <tr>
          <td>${escapeHtml(appointment.name || "-")}</td>
          <td>${escapeHtml(appointment.phone || "-")}</td>
          <td>${escapeHtml(appointment.service || "-")}</td>
          <td>${escapeHtml(formatDateBr(appointment.appointment_date))}</td>
          <td>${escapeHtml(appointment.appointment_time || "-")}</td>
          <td><span class="status-pill">${escapeHtml(appointment.status || "-")}</span></td>
          <td>${escapeHtml(formatDateTimeBr(appointment.created_at))}</td>
        </tr>
      `
    )
    .join("");
}

async function ensureSupabaseReady() {
  if (!window.CICOTE_CONFIG && (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY)) {
    try {
      await loadScript("js/config.js");
    } catch (error) {
      // Arquivo opcional; a validacao final acontece no init do supabase.
    }
  }

  if (!window.CicoteSupabase) {
    await loadScript("js/supabase.js");
  }

  if (!window.CicoteSupabase) {
    throw new Error("Modulo de Supabase indisponivel.");
  }

  return window.CicoteSupabase.initSupabase();
}

async function loadAppointments() {
  setState("Carregando agendamentos...");
  tableWrap.classList.add("hide");

  try {
    const client = await ensureSupabaseReady();
    const { data, error } = await client
      .from("appointments")
      .select("name, phone, service, appointment_date, appointment_time, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      setState("Sem agendamentos no momento.");
      return;
    }

    renderAppointments(data);
    setState(`${data.length} agendamento(s) carregado(s).`);
    tableWrap.classList.remove("hide");
  } catch (error) {
    console.error(error);
    setState("Erro de carregamento. Nao foi possivel consultar agora.", true);
  }
}

loadAppointments();