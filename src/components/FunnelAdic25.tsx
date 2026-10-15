"use client";

/**
 * Funil "adic-25" — cópia independente de `Funnel.tsx` (não importa nem
 * altera esse arquivo). Motor genérico igual ao original; o que muda é
 * de onde vêm os steps, a mensagem de WhatsApp e os textos das telas.
 *
 * Roteiro de qualificação (nome/telefone já vêm antes, como nos outros
 * formulários):
 *   aviso -> P1 (benefício) -> [BPC/Apos. Normal: confirma -> desqualificado]
 *                            -> [invalidez] -> P2 (13º)
 *                                 -> [Não: confirma -> desqualificado]
 *                                 -> [Sim] -> P3 (motivo) -> WhatsApp
 * Depois que o lead confirma uma resposta que desqualifica, o botão
 * "Voltar" some — não dá pra reabrir o funil a partir da desqualificação.
 */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WHATSAPP_NUMBER_ADIC25 } from "@/lib/adic25/config";
import {
  FIRST_STEP,
  questionOf,
  resolveNext,
  stepById,
  TOTAL_QUESTIONS,
  type Answers,
  type Step,
} from "@/lib/adic25/form";
import { buildMessage, buildWhatsAppUrl } from "@/lib/adic25/whatsapp";
import { phoneDigits, sendLeadWebhook } from "@/lib/lead-webhook";
import { trackLead } from "@/lib/tracking/conversion";
import { INSTAGRAM_URL, SITE_URL } from "@/lib/site/config";
import { markSubmitted, useHasSubmitted } from "@/lib/submission/status";
import { isValidPhone, maskPhone } from "@/lib/tracking/phone";
import { readTracking, type Tracking } from "@/lib/tracking/utm";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Grupo independente do "aux-acidente" — ver src/lib/submission/status.ts. */
const FORM_GROUP = "adic25";

type Screen = "intro" | "question" | "disqualified" | "done";

export default function FunnelAdic25({
  whatsappNumber,
}: {
  /** Se omitido, usa o número padrão deste funil em config-adic25.ts. */
  whatsappNumber?: string;
}) {
  const [resolvedNumber] = useState(
    () => whatsappNumber ?? WHATSAPP_NUMBER_ADIC25,
  );
  const [screen, setScreen] = useState<Screen>("intro");
  const [currentId, setCurrentId] = useState<string>(FIRST_STEP);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string>("");

  const tracking = useRef<Tracking>({});
  const inputRef = useRef<HTMLInputElement>(null);
  // Evita reenvio pro BI se o lead voltar da aba do WhatsApp e clicar de novo.
  const leadReported = useRef(false);

  useEffect(() => {
    tracking.current = readTracking();
  }, []);

  // Se esse navegador já enviou o adic-25 antes, a tela de agradecimento
  // substitui a intro — independente do grupo "aux-acidente".
  const alreadySubmitted = useHasSubmitted(FORM_GROUP);

  const step = stepById(currentId) as Step;
  // TODO: se o funil real ganhar ramificação que muda o total de perguntas
  // do caminho (como o "vinculo" do funil original), trocar por uma função
  // pathTotal(answers) igual à de Funnel.tsx.
  const total = TOTAL_QUESTIONS;
  // Telas "info" e de confirmação não contam (counted: false) — sem esse
  // filtro, o aviso antes da P1 já inflava a barra e ela chegava a 100%
  // antes da última pergunta.
  const answeredCount = history.filter(
    (id) => stepById(id)?.counted !== false,
  ).length;
  const progress =
    screen === "question" ? Math.max(4, (answeredCount / total) * 100) : 0;

  useEffect(() => {
    if (
      screen === "question" &&
      step?.kind !== "choice" &&
      step?.kind !== "info"
    ) {
      inputRef.current?.focus();
    }
  }, [screen, currentId, step?.kind]);

  const finish = useCallback(
    (finalAnswers: Answers) => {
      setWhatsAppUrl(
        buildWhatsAppUrl(finalAnswers, tracking.current, resolvedNumber),
      );
      setScreen("done");
    },
    [resolvedNumber],
  );

  const goTo = useCallback(
    (nextId: string, fromId: string, nextAnswers: Answers) => {
      if (nextId === "disqualified") {
        setScreen("disqualified");
        return;
      }
      if (nextId === "submit") {
        finish(nextAnswers);
        return;
      }
      setHistory((h) => [...h, fromId]);
      setCurrentId(nextId);
      setDraft(nextAnswers[nextId] ?? "");
      setError(null);
    },
    [finish],
  );

  const answer = useCallback(
    (value: string) => {
      const nextAnswers = { ...answers, [step.id]: value };
      setAnswers(nextAnswers);
      goTo(resolveNext(step, value), step.id, nextAnswers);
    },
    [answers, goTo, step],
  );

  // Chamado no clique de "Falar com um advogado agora" — manda o lead pro
  // webhook do BI junto com o trackLead/markSubmitted (ver Done).
  const reportLead = useCallback(() => {
    if (leadReported.current) return;
    leadReported.current = true;
    sendLeadWebhook({
      form: FORM_GROUP,
      pagina: window.location.href,
      clicadoEm: new Date().toISOString(),
      nome: answers.nome?.trim() || null,
      telefone: phoneDigits(answers.telefone),
      whatsappDestino: resolvedNumber,
      mensagem: buildMessage(answers, tracking.current),
      respostas: answers,
      tracking: tracking.current,
    });
  }, [answers, resolvedNumber]);

  const submitInput = useCallback(() => {
    const value = draft.trim();

    if (step.kind === "phone") {
      if (!isValidPhone(value)) {
        setError("Digite um WhatsApp válido com DDD.");
        return;
      }
    } else if (value.length < 2) {
      setError("Por favor, preencha este campo.");
      return;
    }

    answer(value);
  }, [answer, draft, step.kind]);

  const goBack = useCallback(() => {
    if (history.length === 0) {
      setScreen("intro");
      return;
    }
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentId(previous);
    setDraft(answers[previous] ?? "");
    setError(null);
  }, [answers, history]);

  useEffect(() => {
    if (screen !== "question" || step?.kind !== "choice") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const index = LETTERS.indexOf(e.key.toUpperCase());
      const option = index >= 0 ? step.options[index] : undefined;
      if (option) {
        e.preventDefault();
        answer(option.value);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, screen, step]);

  // Depois de desqualificado, não dá pra voltar pro início do funil.
  const canGoBack = screen === "question";

  const body = useMemo(() => {
    if (screen === "intro" && alreadySubmitted) return <AlreadySubmitted />;
    if (screen === "intro") return <Intro onStart={() => setScreen("question")} />;
    if (screen === "disqualified") return <Disqualified answers={answers} />;
    if (screen === "done")
      return <Done url={whatsAppUrl} onWhatsAppClick={reportLead} />;

    if (step.kind === "info") {
      return (
        <div key={currentId} className="animate-step-in text-center">
          <p className="text-base leading-relaxed text-ink sm:text-lg">
            {questionOf(step, answers)}
          </p>

          <button
            type="button"
            onClick={() => goTo(step.next, step.id, answers)}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-green px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-green-dark focus:outline-none focus-visible:ring-3 focus-visible:ring-green/40"
          >
            {step.buttonLabel ?? "Continuar"}
            <span aria-hidden>→</span>
          </button>
        </div>
      );
    }

    return (
      <div key={currentId} className="animate-step-in">
        <h2 className="text-2xl leading-snug font-bold text-navy sm:text-3xl">
          {questionOf(step, answers)}
        </h2>

        {step.kind === "choice" ? (
          <div className="mt-8 space-y-3">
            {step.options.map((option, i) => (
              <button
                key={option.value}
                type="button"
                onClick={() => answer(option.value)}
                className="group flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-green hover:shadow-md focus:outline-none focus-visible:border-green focus-visible:ring-3 focus-visible:ring-green/25"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-muted transition-colors group-hover:bg-green group-hover:text-white">
                  {LETTERS[i]}
                </span>
                <span className="text-base font-medium text-navy sm:text-lg">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <input
              ref={inputRef}
              type={step.kind === "phone" ? "tel" : "text"}
              inputMode={step.kind === "phone" ? "tel" : "text"}
              autoComplete={step.kind === "phone" ? "tel-national" : "name"}
              value={draft}
              placeholder={step.placeholder}
              onChange={(e) => {
                setDraft(
                  step.kind === "phone"
                    ? maskPhone(e.target.value)
                    : e.target.value,
                );
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitInput();
                }
              }}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-lg text-navy transition-colors outline-none placeholder:text-slate-400 focus:border-green focus:ring-3 focus:ring-green/20"
            />

            {error && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submitInput}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-green-dark focus:outline-none focus-visible:ring-3 focus-visible:ring-green/40"
            >
              Continuar
              <span aria-hidden>→</span>
            </button>
          </div>
        )}

        {step.kind === "choice" && (
          <p className="mt-6 hidden text-xs text-muted sm:block">
            Dica: use as teclas{" "}
            {step.options.map((_, i) => LETTERS[i]).join(", ")} para responder
            mais rápido.
          </p>
        )}
      </div>
    );
  }, [
    alreadySubmitted,
    answer,
    answers,
    currentId,
    draft,
    error,
    goTo,
    reportLead,
    screen,
    step,
    submitInput,
    whatsAppUrl,
  ]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl shrink-0 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <Image
            src="/logo-bmz.webp"
            alt="BMZ Advogados — Belin, Medeiros &amp; Zaiats"
            width={200}
            height={100}
            priority
            className="h-11 w-auto"
          />
          {canGoBack && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-slate-100 hover:text-navy"
            >
              ← Voltar
            </button>
          )}
        </header>

        <div
          className="h-1 bg-slate-100"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gold transition-[width] duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-6 py-8 sm:px-10 sm:py-10">{body}</div>
      </div>

      <footer className="mt-6 shrink-0 text-center text-xs text-white/45">
        <a href={SITE_URL} className="hover:text-white/80">
          bmzadvogados.adv.br
        </a>
        <span className="mx-2">·</span>
        Belin, Medeiros &amp; Zaiats — Advogados Associados
      </footer>
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="animate-step-in text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-green uppercase">
        Atenção, aposentados por invalidez do INSS
      </p>

      <h1 className="mt-3 text-3xl leading-tight font-bold text-navy sm:text-4xl">
        Você pode ter direito ao adicional de 25%!
      </h1>

      <p className="mt-5 text-base leading-relaxed text-ink">
        Se você recebe aposentadoria por invalidez e precisa da ajuda
        permanente de outra pessoa nas atividades do dia a dia, sua situação
        pode se enquadrar nos critérios para receber o adicional de 25%.
      </p>

      <p className="mt-3 text-base leading-relaxed text-ink">
        Somos a <strong>BMZ Advogados Associados</strong>, atuamos com Direito
        Previdenciário e atendemos online em todo o Brasil.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full rounded-xl bg-green px-8 py-4 text-center text-lg font-bold text-white transition-colors hover:bg-green-dark focus:outline-none focus-visible:ring-3 focus-visible:ring-green/40 sm:w-auto"
      >
        Entender se posso ter direito <span aria-hidden>→</span>
      </button>

      <p className="mt-4 text-sm text-muted">
        Perguntas rápidas · leva menos de 1 minuto
      </p>
    </div>
  );
}

/** Mensagem final varia conforme qual confirmação desqualificou o lead. */
function disqualifyMessage(answers: Answers): string {
  if (answers.confirmaDecimo13 === "sim") {
    return "Entendi. Pelo que você informou, é provável que você não receba aposentadoria por invalidez, já que esse benefício dá direito ao 13º salário. Como o adicional de 25% é exclusivo para aposentados por invalidez, infelizmente não poderemos seguir com a análise. Agradecemos o seu contato!";
  }
  return "Com base no que você informou, não é possível receber o adicional de 25%, pois ele é exclusivo para quem é aposentado por invalidez e comprova a necessidade de ajuda permanente de outra pessoa.";
}

function Disqualified({ answers }: { answers: Answers }) {
  return (
    <div className="animate-step-in text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        📄
      </div>

      <h2 className="mt-5 text-2xl font-bold text-navy sm:text-3xl">
        Pelo seu perfil, não identificamos direito ao adicional de 25%
      </h2>

      <p className="mt-4 text-base leading-relaxed text-ink">
        {disqualifyMessage(answers)}
      </p>

      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-navy-soft"
      >
        Acompanhe nosso conteúdo no Instagram
      </a>
    </div>
  );
}

function Done({
  url,
  onWhatsAppClick,
}: {
  url: string;
  onWhatsAppClick: () => void;
}) {
  return (
    <div className="animate-step-in text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green/10 text-2xl">
        ✅
      </div>

      <h2 className="mt-5 text-2xl font-bold text-navy sm:text-3xl">
        Falta só um passo!
      </h2>

      <div className="mt-6 rounded-xl border-2 border-gold bg-gold/20 px-5 py-5">
        <p className="text-lg leading-snug font-extrabold text-navy uppercase sm:text-xl">
          Envie a mensagem pronta na próxima tela do WhatsApp
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          Ela já vai estar escrita com os seus dados — é só apertar enviar.{" "}
          <strong>Sem esse envio, a nossa equipe não recebe o seu caso.</strong>
        </p>
      </div>

      <a
        href={url}
        onClick={() => {
          trackLead();
          markSubmitted(FORM_GROUP);
          onWhatsAppClick();
        }}
        className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-green px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-green-dark focus:outline-none focus-visible:ring-3 focus-visible:ring-green/40 sm:w-auto"
      >
        Falar com um advogado agora
      </a>
    </div>
  );
}

/** Exibida quando esse navegador já enviou o adic-25 antes — evita fazer o
 * lead repetir o funil inteiro. */
function AlreadySubmitted() {
  return (
    <div className="animate-step-in text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green/10 text-2xl">
        🙏
      </div>

      <h2 className="mt-5 text-2xl font-bold text-navy sm:text-3xl">
        Agradecemos o seu contato!
      </h2>

      <p className="mt-4 text-base leading-relaxed text-ink">
        Já recebemos as suas informações. Em breve, alguém da nossa equipe
        vai te chamar no WhatsApp para dar continuidade ao seu caso.
      </p>

      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-navy-soft"
      >
        Acompanhe nosso conteúdo no Instagram
      </a>
    </div>
  );
}
