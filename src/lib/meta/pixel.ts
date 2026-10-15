/** Meta Pixel — ID da conta de anúncios da BMZ. */
export const META_PIXEL_ID = "1289395722733398";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Evento `Lead` do Meta. Chamado só por `trackLead()`, em
 * `src/lib/tracking/conversion.ts` — os funis não falam direto com o pixel.
 *
 * O `?.` é proposital — bloqueador de anúncio ou falha de rede deixam `fbq`
 * indefinido, e nesse caso o formulário tem que continuar funcionando.
 */
export function trackMetaLead(): void {
  window.fbq?.("track", "Lead");
}
