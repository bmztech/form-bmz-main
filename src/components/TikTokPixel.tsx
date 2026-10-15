import { TIKTOK_PIXEL_ID } from "@/lib/tiktok/pixel";

/**
 * Código base do TikTok Pixel: carrega a lib e registra o PageView.
 * Fica no `<head>` do HTML do servidor (requisito da campanha), por isso é um
 * `<script>` puro e não `next/script`: o `beforeInteractive` serializa o
 * código no payload do Next e só insere no `<head>` em tempo de execução.
 * Montado dentro do `<head>` em `src/app/layout.tsx`.
 * O evento de conversão (Contact) é disparado em `trackLead()`
 * (`src/lib/tracking/conversion.ts`), junto com o Lead do Meta.
 */
export default function TikTokPixel() {
  return (
    <script
      id="tiktok-pixel"
      dangerouslySetInnerHTML={{
        __html: `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for( var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._t=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${TIKTOK_PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');`,
      }}
    />
  );
}
