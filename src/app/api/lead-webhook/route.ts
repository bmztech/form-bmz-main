/**
 * Proxy do lead pro webhook do BI (ver src/lib/lead-webhook.ts, que é quem
 * posta aqui). Existe pra requisição sair servidor→servidor: sem CORS no
 * navegador e sem expor o token de autenticação no código do cliente.
 *
 * Config: usa LEAD_WEBHOOK_URL/LEAD_WEBHOOK_TOKEN do ambiente quando as DUAS
 * estiverem visíveis no runtime; senão cai nos valores hardcoded abaixo (o
 * .env da Hostinger já falhou em produção e derrubou a captação — o log
 * "[lead-webhook] config" mostra qual fonte está valendo). Quando o Runtime
 * Log confirmar "env" em produção de forma estável: rotacionar o token na
 * API do BI (o atual vazou no histórico do git) e remover o fallback.
 */

const FALLBACK_URL = "https://api-bi.bmztech.com.br/api/webhooks/leads/form";
const FALLBACK_TOKEN =
  "yHvuUetxW6pOalE3Py67GnnL2gHduyDpPTiVVjG2TxrKisj8ts3xA5lgIyTLmXST";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const envUrl = process.env.LEAD_WEBHOOK_URL;
  const envToken = process.env.LEAD_WEBHOOK_TOKEN;
  const useEnv = Boolean(envUrl && envToken);

  console.log(
    `[lead-webhook] config: usando ${useEnv ? "env" : "fallback hardcoded"} ` +
      `(LEAD_WEBHOOK_URL=${envUrl ? "visível" : "AUSENTE"} ` +
      `LEAD_WEBHOOK_TOKEN=${envToken ? "visível" : "AUSENTE"})`,
  );

  const token = useEnv ? (envToken as string) : FALLBACK_TOKEN;
  // `set` tolera uma URL que já venha com `?token=` (sobrescreve sem duplicar).
  const url = new URL(useEnv ? (envUrl as string) : FALLBACK_URL);
  url.searchParams.set("token", token);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // A API do BI autentica pelo header X-Webhook-Token, com fallback
        // pro `?token=` da query string — enviamos os dois por redundância.
        "X-Webhook-Token": token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });

    if (response.ok) {
      console.log(`[lead-webhook] lead encaminhado — BI respondeu ${response.status}`);
    } else {
      console.error(
        `[lead-webhook] BI respondeu ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error("[lead-webhook] falha ao encaminhar o lead pro BI:", error);
  }

  return new Response(null, { status: 204 });
}
