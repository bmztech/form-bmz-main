/**
 * ---------------------------------------------------------------------------
 * CONFIGURAÇÃO — edite apenas este arquivo para trocar o número de destino.
 * ---------------------------------------------------------------------------
 * INSTAGRAM_URL, SITE_URL e TRACKING_PARAMS são compartilhados entre todos
 * os funis — vivem em `@/lib/site/config` e `@/lib/tracking/utm`.
 */

/**
 * Número que recebe os leads no WhatsApp.
 * Formato: código do país + DDD + número, apenas dígitos.
 * Ex.: (42) 6823-5732  ->  "554268235732"
 */
export const WHATSAPP_NUMBER = "5542936181197";

/**
 * Números por unidade, usados nas rotas /aux-a, /aux-b e /aux-c — cada uma
 * envia o lead para um número diferente. O card "Auxílio-Acidente" do
 * linktree ("/") também usa esse mapa: /go/aux-acidente faz o rodízio
 * sequencial e redireciona pra uma dessas três rotas (ver `./rotation.ts`).
 */
export const WHATSAPP_NUMBERS = {
  a: "5542936181197", // BMZ A
  b: "5542936181197", // BMZ B
  c: "5542936181197", // BMZ C
} as const;
