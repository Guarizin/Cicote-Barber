"use strict";

(function supabaseModule(globalScope) {
  const SUPABASE_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  let clientInstance = null;

  function createTypedError(code, message, originalError) {
    const error = new Error(message);
    error.code = code;
    error.originalError = originalError;
    return error;
  }

  function readConfig() {
    const scopedConfig = globalScope.CICOTE_CONFIG && globalScope.CICOTE_CONFIG.supabase;
    const directUrl = globalScope.SUPABASE_URL;
    const directAnonKey = globalScope.SUPABASE_ANON_KEY;
    const config = scopedConfig || {
      url: directUrl,
      anonKey: directAnonKey
    };

    if (!config || !config.url || !config.anonKey) {
      throw createTypedError(
        "SUPABASE_CONFIG_MISSING",
        "Configuracao do Supabase ausente. Defina window.CICOTE_CONFIG.supabase com url e anonKey."
      );
    }

    return config;
  }

  function isConnectionError(error) {
    const message = String((error && error.message) || "");
    return (
      error instanceof TypeError ||
      /network|fetch|failed to fetch|load failed|timeout/i.test(message)
    );
  }

  function loadSupabaseLibrary() {
    if (globalScope.supabase && typeof globalScope.supabase.createClient === "function") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${SUPABASE_CDN_URL}"]`);

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(createTypedError("SUPABASE_LIB_LOAD_ERROR", "Nao foi possivel carregar a biblioteca do Supabase.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = SUPABASE_CDN_URL;
      script.async = true;

      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => reject(createTypedError("SUPABASE_LIB_LOAD_ERROR", "Nao foi possivel carregar a biblioteca do Supabase.")),
        { once: true }
      );

      document.head.appendChild(script);
    });
  }

  async function initSupabase() {
    if (clientInstance) {
      return clientInstance;
    }

    await loadSupabaseLibrary();
    const config = readConfig();

    clientInstance = globalScope.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    return clientInstance;
  }

  async function createAppointment(appointmentInput) {
    try {
      const client = await initSupabase();
      const payload = {
        name: appointmentInput.name,
        phone: appointmentInput.phone,
        service: appointmentInput.service,
        appointment_date: appointmentInput.appointment_date,
        appointment_time: appointmentInput.appointment_time,
        status: "pendente"
      };

      const { data, error } = await client
        .from("appointments")
        .insert([payload])
        .select("id, created_at, name, phone, service, appointment_date, appointment_time, status")
        .single();

      if (error) {
        throw createTypedError("SUPABASE_INSERT_ERROR", error.message, error);
      }

      return data;
    } catch (error) {
      if (error.code) {
        throw error;
      }

      if (isConnectionError(error)) {
        throw createTypedError(
          "SUPABASE_CONNECTION_ERROR",
          "Erro de conexao com o Supabase. Verifique sua internet e tente novamente.",
          error
        );
      }

      throw createTypedError("SUPABASE_UNKNOWN_ERROR", "Erro inesperado ao salvar o agendamento.", error);
    }
  }

  globalScope.CicoteSupabase = {
    initSupabase,
    createAppointment
  };
})(window);