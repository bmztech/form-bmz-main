/**
 * Envio do lead pro BI no clique final do funil ("Falar com um advogado
 * agora"). O navegador NÃO fala direto com o webhook do BI: ele posta em
 * /api/lead-webhook (mesma origem) e a rota repassa pro BI — assim não há
 * CORS nem a página de aviso do ngrok, e a URL do BI troca por variável de
 * ambiente sem tocar no código do cliente.
 *
 * Compartilhado entre os funis pelo mesmo motivo de maskPhone/readTracking:
 * é genérico, não depende dos STEPS de nenhum formulário.
 */

export type LeadWebhookPayload = {
  /** Grupo do formulário — mesmo valor do FORM_GROUP do componente. */
  form: string;
  /** URL completa da página no momento do clique. */
  pagina: string;
  /** Instante do clique, ISO 8601. */
  clicadoEm: string;
  nome: string | null;
  /** Telefone informado no formulário, só dígitos (DDD + número). */
  telefone: string | null;
  /** Número BMZ que receberia a mensagem no WhatsApp. */
  whatsappDestino: string;
  /** Texto completo da mensagem que o wa.me abriria pré-preenchida. */
  mensagem: string;
  /** Respostas cruas, chaveadas pelo id do step (ver src/lib/form*.ts). */
  respostas: Record<string, string>;
  /** UTMs, fbclid/gclid/ttclid, referrer e landing_page da sessão. */
  tracking: Record<string, string | undefined>;
};

/** "(41) 99954-5084" -> "41999545084"; retorna null se vazio. */
export function phoneDigits(value: string | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || null;
}

/**
 * Dispara e esquece: o clique navega pro wa.me na mesma aba, então usamos
 * `keepalive` pra requisição sobreviver à saída da página. Qualquer falha é
 * engolida — o envio pro BI nunca pode impedir a abertura do WhatsApp.
 */
export function sendLeadWebhook(payload: LeadWebhookPayload): void {
  try {
    void fetch("/api/lead-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fetch indisponível ou bloqueado — segue pro WhatsApp mesmo assim.
  }
}
