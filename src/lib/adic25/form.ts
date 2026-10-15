/**
 * Definição declarativa do funil "adic-25" — independente do funil original
 * em `form.ts` (não altera nem depende dele).
 *
 * Para mudar perguntas, opções ou o encadeamento condicional, edite só o
 * array STEPS abaixo. Mesmo formato do funil original:
 *   - next como string  -> vai sempre para esse id
 *   - next como função  -> decide a partir da resposta (lógica condicional)
 *
 * Kind "info" é exclusivo deste funil: uma tela só de aviso, com botão
 * "Continuar", sem coletar resposta — usada para a mensagem antes da
 * Pergunta 01.
 *
 * Os ids reservados são "submit" (dispara o WhatsApp) e "disqualified".
 */

export type Answers = Record<string, string>;

export type Choice = {
  value: string;
  label: string;
  /** Mesmo papel do `phrase` do funil original — ver form.ts. */
  phrase?: string;
};

export type QuestionText = string | ((answers: Answers) => string);

type Base = {
  summaryLabel: string;
  counted?: boolean;
  hideInSummary?: boolean;
};

export type Step = Base &
  (
    | {
        id: string;
        kind: "text" | "phone";
        question: QuestionText;
        placeholder: string;
        next: string;
      }
    | {
        id: string;
        kind: "choice";
        question: QuestionText;
        options: Choice[];
        next: string | ((value: string) => string);
      }
    | {
        id: string;
        kind: "info";
        message: QuestionText;
        buttonLabel?: string;
        next: string;
      }
  );

export const FIRST_STEP = "nome";

export const STEPS: Step[] = [
  {
    id: "nome",
    kind: "text",
    summaryLabel: "Nome",
    question: "Qual é o seu nome?",
    placeholder: "Digite seu nome completo",
    next: "telefone",
  },
  {
    id: "telefone",
    kind: "phone",
    summaryLabel: "WhatsApp",
    question: "Qual seu WhatsApp?",
    placeholder: "(00) 00000-0000",
    next: "avisoQualificacao",
  },
  {
    id: "avisoQualificacao",
    kind: "info",
    summaryLabel: "",
    counted: false,
    message:
      "Antes de prosseguir com a orientação, preciso entender melhor o seu caso para verificar se há possibilidade de concessão do benefício. Ao responder algumas perguntas rápidas, poderemos te orientar com mais precisão.",
    buttonLabel: "Continuar",
    next: "beneficio",
  },
  // Pergunta 01
  {
    id: "beneficio",
    kind: "choice",
    summaryLabel: "Benefício atual",
    question: "Você recebe:",
    options: [
      { value: "invalidez", label: "Aposentadoria por invalidez" },
      { value: "bpc_loas", label: "BPC/LOAS" },
      { value: "Aposentadoria_Normal", label: "Aposentadoria Normal" },
    ],
    // Invalidez segue direto pra pergunta 02. BPC/LOAS e Aposentadoria Normal
    // passam por uma confirmação antes de desqualificar.
    next: (v) => (v === "invalidez" ? "decimo13" : "confirmaBeneficio"),
  },
  {
    id: "confirmaBeneficio",
    kind: "choice",
    summaryLabel: "Confirmação — benefício",
    counted: false,
    hideInSummary: true,
    question: (answers) =>
      `Só pra confirmar: você recebe ${answerLabel("beneficio", answers)}?`,
    options: [
      { value: "sim", label: "Sim, é isso mesmo" },
      { value: "nao", label: "Não, quero corrigir minha resposta" },
    ],
    next: (v) => (v === "sim" ? "disqualified" : "beneficio"),
  },
  // Pergunta 02 (só quando a pergunta 01 = aposentadoria por invalidez)
  {
    id: "decimo13",
    kind: "choice",
    summaryLabel: "Recebe 13º salário",
    question: "Você recebe décimo terceiro?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
    ],
    next: (v) => (v === "sim" ? "situacao" : "confirmaDecimo13"),
  },
  {
    id: "confirmaDecimo13",
    kind: "choice",
    summaryLabel: "Confirmação — 13º salário",
    counted: false,
    hideInSummary: true,
    question: "Só pra confirmar: você não recebe décimo terceiro salário?",
    options: [
      { value: "sim", label: "Sim, é isso mesmo" },
      { value: "nao", label: "Não, quero corrigir minha resposta" },
    ],
    next: (v) => (v === "sim" ? "disqualified" : "decimo13"),
  },
  // Pergunta 03 (só quando a pergunta 02 = sim)
  {
    id: "situacao",
    kind: "choice",
    summaryLabel: "Situação",
    question: "Seu caso se enquadra em alguma dessas situações?",
    options: [
      { value: "tetraplegico", label: "Tetraplégico" },
      { value: "acamado", label: "Acamado" },
      { value: "paraplegico", label: "Paraplégico" },
      { value: "cadeirante", label: "Cadeirante" },
      { value: "outro", label: "Outro" },
    ],
    next: "motivo",
  },
  // Pergunta 04
  {
    id: "motivo",
    kind: "text",
    summaryLabel: "Motivo da invalidez",
    // Já aparece por extenso na primeira linha da mensagem (buildHeadline).
    hideInSummary: true,
    question:
      "Poderia me informar o motivo da sua aposentadoria por invalidez? Ela foi decorrente de alguma doença ou acidente?",
    placeholder: "Ex.: acidente de trabalho, AVC, doença degenerativa...",
    next: "submit",
  },
];

export const stepById = (id: string) => STEPS.find((s) => s.id === id);

export const TOTAL_QUESTIONS = STEPS.filter((s) => s.counted !== false).length;

export function resolveNext(step: Step, value: string): string {
  return typeof step.next === "function" ? step.next(value) : step.next;
}

export function labelFor(step: Step, value: string): string {
  if (step.kind !== "choice") return value;
  return step.options.find((o) => o.value === value)?.label ?? value;
}

export function phraseFor(stepId: string, answers: Answers): string {
  const step = stepById(stepId);
  if (!step || step.kind !== "choice") return "";

  const option = step.options.find((o) => o.value === answers[stepId]);
  if (!option) return "";

  return option.phrase ?? option.label.toLowerCase();
}

/** Label legível da resposta já dada a um step de escolha — ex.: usado nas
 * perguntas de confirmação ("você confirma que recebe X?"). */
export function answerLabel(stepId: string, answers: Answers): string {
  const step = stepById(stepId);
  if (!step) return "";
  return labelFor(step, answers[stepId] ?? "");
}

export function questionOf(step: Step, answers: Answers): string {
  const text = step.kind === "info" ? step.message : step.question;
  return typeof text === "function" ? text(answers) : text;
}
