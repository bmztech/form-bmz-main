/** TikTok Pixel — ID da conta de anúncios da BMZ no TikTok. */
export const TIKTOK_PIXEL_ID = "CCOQ4PRC77UB4C8P7T1G";

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
    };
  }
}

/**
 * Evento `Contact` do TikTok — o equivalente ao `Lead` do Meta para "clicou
 * para falar com o escritório". Chamado só por `trackLead()`, em
 * `src/lib/tracking/conversion.ts`.
 *
 * O `?.` segue a mesma regra do Meta: sem `ttq` (bloqueador, falha de rede),
 * o formulário continua funcionando.
 */
export function trackTikTokContact(): void {
  window.ttq?.track("Contact");
}
