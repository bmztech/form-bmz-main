import { WHATSAPP_NUMBER } from "./config";
import { answeredPath, labelFor, phraseFor, type Answers } from "./form";
import type { Tracking } from "../tracking/utm";

/**
 * Primeira linha da mensagem — resume o caso para o advogado bater o olho:
 * "Caso: fratura que não consolidou na região do braço ou mão".
 */
export function buildHeadline(answers: Answers): string {
  const lesao = answers.lesao?.trim();
  if (!lesao) return "Caso novo pelo formulário do site.";

  // Só "Limitação de Movimento" pergunta a região — ignora resposta antiga
  // se o lead voltou e trocou para outro tipo de lesão.
  const regiao =
    answers.tipoLesao === "limitacao" ? phraseFor("regiao", answers) : "";
  return regiao ? `Caso: ${lesao} na região ${regiao}` : `Caso: ${lesao}`;
}

/**
 * Monta o texto da mensagem que o lead envia para o escritório.
 *
 * `unit` etiqueta a mensagem com `[TIME X]` — hoje nenhuma rota passa esse
 * parâmetro (nem /aux-a/b/c nem o destino do rodízio via /go/aux-acidente),
 * porque a unidade já fica visível na própria URL clicada. Parâmetro fica
 * disponível caso algum funil precise etiquetar a mensagem no futuro.
 */
export function buildMessage(
  answers: Answers,
  tracking: Tracking,
  unit?: string,
): string {
  const lines: string[] = [];
  if (unit) lines.push(`[TIME ${unit.toUpperCase()}]`);
  lines.push(buildHeadline(answers), "");

  for (const step of answeredPath(answers)) {
    if (step.hideInSummary) continue;
    lines.push(`${step.summaryLabel}: ${labelFor(step, answers[step.id])}`);
  }

  const trackingEntries = Object.entries(tracking).filter(([, v]) => v);
  const originEntries = unit
    ? [["unidade", unit.toUpperCase()] as [string, string], ...trackingEntries]
    : trackingEntries;

  if (originEntries.length > 0) {
    lines.push("", "— origem —");
    for (const [key, value] of originEntries) {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

/** Link wa.me pronto para abrir a conversa já com a mensagem preenchida. */
export function buildWhatsAppUrl(
  answers: Answers,
  tracking: Tracking,
  whatsappNumber: string = WHATSAPP_NUMBER,
  unit?: string,
): string {
  const text = encodeURIComponent(buildMessage(answers, tracking, unit));
  return `https://wa.me/${whatsappNumber}?text=${text}`;
}
