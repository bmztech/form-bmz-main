import { nextUnit } from "@/lib/trabalhista/rotation";
import { buildTrackedHref } from "@/lib/tracking/links";

// Cada clique aqui consome uma posição da fila do rodízio A/B/C — precisa
// ser dinâmico e não-cacheável: um redirect guardado no navegador ou numa
// CDN na frente congelaria todo mundo no mesmo time.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const { unit } = nextUnit();
  const from = new URL(request.url).searchParams;
  // unit é "a" | "b" | "c" — cai direto na rota fixa correspondente
  // (src/app/trab-a|b|c/page.tsx), levando as UTMs de entrada.
  const location = buildTrackedHref(`/trab-${unit}`, from);

  return new Response(null, {
    status: 307,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

// HEAD (preview de link, checador de saúde, bot) não pode andar com a fila.
export function HEAD() {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
