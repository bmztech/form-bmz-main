/**
 * Marca, por navegador, se o lead já concluiu o envio de um grupo de
 * formulário — usado pra não repetir o funil inteiro se ele abrir outro
 * link do mesmo grupo depois (ex.: já enviou pelo aux-a e depois cai no
 * aux-b vindo de outro anúncio).
 *
 * Cada grupo é independente: enviar o auxílio-acidente não afeta o
 * adicional de 25%, e vice-versa.
 */

import { useSyncExternalStore } from "react";

export type FormGroup = "aux-acidente" | "adic25" | "trabalhista";

const KEY_PREFIX = "bmz_submitted_";

function hasSubmitted(group: FormGroup): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY_PREFIX + group) === "1";
  } catch {
    return false;
  }
}

export function markSubmitted(group: FormGroup): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + group, "1");
  } catch {
    // localStorage indisponível (modo privado/iframe) — segue sem persistir.
  }
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Lê "já enviou?" de forma segura pra SSR/hidratação — retorna `false` no
 * servidor e no primeiro paint do cliente, depois sincroniza com o valor
 * real do localStorage sem gerar mismatch de hidratação nem setState direto
 * dentro de um efeito.
 */
export function useHasSubmitted(group: FormGroup): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasSubmitted(group),
    () => false,
  );
}
