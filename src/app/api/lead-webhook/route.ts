/**
 * Proxy do lead pro webhook do BI (ver src/lib/lead-webhook.ts, que é quem
 * posta aqui). Existe pra requisição sair servidor→servidor: sem CORS no
 * navegador e sem expor o token de autenticação no código do cliente.
 *
 * HOTFIX (de novo): URL e token hardcoded porque o .env da Hostinger não é
 * lido no runtime e a versão só-env descartava todos os leads em produção.
 * NÃO voltar pra process.env sem antes confirmar (pelo log de diagnóstico
 * abaixo) que as envs estão visíveis em produção. O token já vazou no
 * histórico do git — rotacionar o token na API do BI resolve o vazamento,
 * removê-lo daqui sem env funcional só derruba a captação.
 */

const WEBHOOK_URL = "https://api-bi.bmztech.com.br/api/webhooks/leads/form";
const WEBHOOK_TOKEN =
  "yHvuUetxW6pOalE3Py67GnnL2gHduyDpPTiVVjG2TxrKisj8ts3xA5lgIyTLmXST";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  // Diagnóstico do .env em produção: as envs NÃO são usadas por enquanto,
  // só logamos se o runtime as enxerga pra decidir quando voltar pra elas.
  console.log(
    `[lead-webhook] diagnóstico env: LEAD_WEBHOOK_URL=${
      process.env.LEAD_WEBHOOK_URL ? "visível" : "AUSENTE"
    } LEAD_WEBHOOK_TOKEN=${
      process.env.LEAD_WEBHOOK_TOKEN ? "visível" : "AUSENTE"
    } NODE_ENV=${process.env.NODE_ENV}`,
  );

  const url = new URL(WEBHOOK_URL);
  url.searchParams.set("token", WEBHOOK_TOKEN);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // A API do BI autentica pelo header X-Webhook-Token, com fallback
        // pro `?token=` da query string — enviamos os dois por redundância.
        "X-Webhook-Token": WEBHOOK_TOKEN,
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
