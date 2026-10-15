import { trackMetaLead } from "@/lib/meta/pixel";
import { trackTikTokContact } from "@/lib/tiktok/pixel";

/**
 * Conversão principal: o lead terminou o funil e foi falar com o escritório.
 * Disparado no clique do botão da tela final, em `Funnel.tsx` e
 * `FunnelAdic25.tsx`.
 *
 * É o único ponto que os funis chamam. Cada pixel traduz para o seu evento;
 * uma plataforma nova entra aqui, sem mexer nos funis.
 */
export function trackLead(): void {
  trackMetaLead();
  trackTikTokContact();
}
