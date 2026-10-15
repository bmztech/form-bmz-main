"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FIRST_STEP,
  questionOf,
  resolveNext,
  stepById,
  type Answers,
  type Step,
} from "@/lib/aux-acidente/form";
import { buildMessage, buildWhatsAppUrl } from "@/lib/aux-acidente/whatsapp";
import { phoneDigits, sendLeadWebhook } from "@/lib/lead-webhook";
import { trackLead } from "@/lib/tracking/conversion";
import { INSTAGRAM_URL, SITE_URL } from "@/lib/site/config";
import { markSubmitted, useHasSubmitted } from "@/lib/submission/status";
import { isValidPhone, maskPhone } from "@/lib/tracking/phone";
import { readTracking, type Tracking } from "@/lib/tracking/utm";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** Grupo do funil pra fins de "já enviou antes?" — aux-a/b/c e "/" contam
 * como o mesmo formulário, independente do adicional de 25%. */
const FORM_GROUP = "aux-acidente";

/**
 * Total exato de perguntas do caminho que o lead está percorrendo.
 * Dois steps alteram o tamanho do funil: "vinculo" (MEI/desempregado ganham a
 * pergunta extra sobre carteira assinada no ano anterior) e "tipoLesao" (só
 * limitação de movimento pergunta a parte do corpo — até responder, conta
 * o caminho mais longo).
 */
function pathTotal(answers: Answers): number {
  const v = answers.vinculo;
  const t = answers.tipoLesao;
  return (
    7 +
    (v === "mei" || v === "desempregado" ? 1 : 0) +
    (!t || t === "limitacao" ? 1 : 0)
  );
}

type Screen = "intro" | "question" | "disqualified" | "done";

export default function Funnel({
  whatsappNumber,
  unit,
}: {
  whatsappNumber: string;
  /**
   * Etiqueta a mensagem com `[TIME X]`. Hoje nenhuma rota passa esse prop —
   * nem as fixas (aux-a/b/c) nem o destino do rodízio via /go/aux-acidente
   * (ver src/lib/aux-acidente/rotation.ts), porque a unidade já fica
   * visível na própria URL clicada. Mantido opcional pra uso futuro.
   */
  unit?: string;
}) {
  const [resolvedNumber] = useState(whatsappNumber);
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

  // As UTMs são lidas uma única vez, na montagem, e guardadas na sessão.
  useEffect(() => {
    tracking.current = readTracking();
  }, []);

  // Se esse navegador já enviou o auxílio-acidente antes (por qualquer uma
  // das unidades), a tela de agradecimento substitui a intro — ver o uso
  // de `alreadySubmitted` no `body` abaixo.
  const alreadySubmitted = useHasSubmitted(FORM_GROUP);

  const step = stepById(currentId) as Step;
  const total = pathTotal(answers);
  // Mínimo de 4% para a barra ficar visível já na primeira pergunta.
  const progress =
    screen === "question" ? Math.max(4, (history.length / total) * 100) : 0;

  // Foca o campo sempre que uma tela de texto/telefone entra.
  useEffect(() => {
    if (screen === "question" && step?.kind !== "choice") {
      inputRef.current?.focus();
    }
  }, [screen, currentId, step?.kind]);

  // Sem redirecionamento automático: o lead precisa ler o aviso de que a
  // mensagem só chega no escritório depois que ele apertar enviar no WhatsApp.
  // O clique no botão também é um gesto de verdade, o que faz o app abrir
  // direto no celular em vez de cair no navegador.
  const finish = useCallback(
    (finalAnswers: Answers) => {
      setWhatsAppUrl(
        buildWhatsAppUrl(finalAnswers, tracking.current, resolvedNumber, unit),
      );
      setScreen("done");
    },
    [resolvedNumber, unit],
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
      telefone: phoneDigits(answers.whatsapp),
      whatsappDestino: resolvedNumber,
      mensagem: buildMessage(answers, tracking.current, unit),
      respostas: answers,
      tracking: tracking.current,
    });
  }, [answers, resolvedNumber, unit]);

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
    if (screen === "disqualified") {
      setScreen("question");
      setError(null);
      return;
    }
    if (history.length === 0) {
      setScreen("intro");
      return;
    }
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentId(previous);
    setDraft(answers[previous] ?? "");
    setError(null);
  }, [answers, history, screen]);

  // Atalhos de teclado: A/B/C… escolhem a opção, Enter avança.
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

  const canGoBack = screen === "question" || screen === "disqualified";

  const body = useMemo(() => {
    // Se já enviou antes e ainda está na intro (não é o clique que acabou
    // de marcar `alreadySubmitted` ao final DESTE funil), mostra a tela de
    // agradecimento em vez de reabrir o questionário.
    if (screen === "intro" && alreadySubmitted) return <AlreadySubmitted />;
    if (screen === "intro") return <Intro onStart={() => setScreen("question")} />;
    if (screen === "disqualified") return <Disqualified />;
    if (screen === "done")
      return <Done url={whatsAppUrl} onWhatsAppClick={reportLead} />;

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
        Informação previdenciária
      </p>

      <h1 className="mt-3 text-3xl leading-tight font-bold text-navy sm:text-4xl">
        Você pode ter direito a receber um benefício do INSS
      </h1>

      <p className="mt-5 text-base leading-relaxed text-ink">
        Se você sofreu um acidente, trabalhava de carteira assinada na época e
        ficou com alguma limitação que reduziu sua capacidade de trabalho,
        sua situação pode se enquadrar nos critérios do{" "}
        <strong>Auxílio-Acidente</strong>.
      </p>

      <p className="mt-3 text-base leading-relaxed text-ink">
        Somos a <strong>BMZ Advogados Associados</strong>, atuamos com Direito
        Previdenciário e atendemos online em todo o Brasil. Tire suas dúvidas
        e entenda os critérios aplicáveis ao seu caso.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full rounded-xl bg-green px-8 py-4 text-center text-lg font-bold text-white transition-colors hover:bg-green-dark focus:outline-none focus-visible:ring-3 focus-visible:ring-green/40 sm:w-auto"
      >
        Descobrir se tenho direito <span aria-hidden>→</span>
      </button>

      <p className="mt-4 text-sm text-muted">
        Perguntas rápidas · leva menos de 1 minuto
      </p>
    </div>
  );
}

function Disqualified() {
  return (
    <div className="animate-step-in text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        📄
      </div>

      <h2 className="mt-5 text-2xl font-bold text-navy sm:text-3xl">
        Pelo seu perfil, não identificamos direito ao benefício
      </h2>

      <p className="mt-4 text-base leading-relaxed text-ink">
        Obrigado por responder! Com as informações que você nos deu, não
        conseguimos identificar um direito ao benefício neste momento — mas as
        regras do INSS mudam, e a sua situação pode mudar também.
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

/** Exibida quando esse navegador já enviou o formulário antes (por
 * qualquer unidade) — evita fazer o lead repetir o funil inteiro. */
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
