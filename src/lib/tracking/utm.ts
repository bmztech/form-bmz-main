/**
 * Captura de UTMs/parâmetros de rastreamento da URL — genérico, usado por
 * todos os funis via `readTracking()` (não depende de STEPS de nenhum).
 */

export type Tracking = Partial<Record<string, string>>;

/** Parâmetros de rastreamento capturados da URL e enviados na mensagem. */
export const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ttclid",
] as const;

export type TrackingParam = (typeof TRACKING_PARAMS)[number];

/**
 * Lê os parâmetros de rastreamento da URL atual.
 * Também recupera o que já tinha sido salvo na sessão, para o caso do lead
 * navegar/recarregar e a URL perder as UTMs no meio do caminho.
 */
export function readTracking(): Tracking {
  if (typeof window === "undefined") return {};

  const STORAGE_KEY = "bmz_tracking";
  const params = new URLSearchParams(window.location.search);

  let stored: Tracking = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    stored = {};
  }

  const tracking: Tracking = { ...stored };
  for (const key of TRACKING_PARAMS) {
    const value = params.get(key);
    if (value) tracking[key] = value;
  }

  // Referrer só é registrado na primeira visita, quando ainda não há nada salvo.
  if (!tracking.referrer && document.referrer) {
    tracking.referrer = document.referrer;
  }
  if (!tracking.landing_page) {
    tracking.landing_page = window.location.origin + window.location.pathname;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tracking));
  } catch {
    // sessionStorage indisponível (modo privado/iframe) — segue sem persistir.
  }

  return tracking;
}
