/**
 * Definição declarativa do funil trabalhista (indenização por acidente de
 * trabalho). Para mudar perguntas, opções ou o encadeamento condicional,
 * edite apenas o array STEPS abaixo.
 *
 * Cada step aponta para o próximo através de `next`:
 *   - string  -> vai sempre para esse id
 *   - função  -> decide a partir da resposta (lógica condicional)
 *
 * Os ids reservados são "submit" (dispara o WhatsApp) e "disqualified".
 */

export type Answers = Record<string, string>;

export type Choice = {
  value: string;
  label: string;
  /**
   * A mesma opção escrita para caber no meio de uma frase, já com preposição.
   * Sem isso, usamos a label em minúsculas.
   */
  phrase?: string;
};

/** Perguntas cujo enunciado depende do que o lead já respondeu. */
export type QuestionText = string | ((answers: Answers) => string);

type Base = {
  /** Rótulo curto usado na mensagem do WhatsApp. Ex.: "Nome". */
  summaryLabel: string;
  /** Se false, o step não entra na barra de progresso (telas informativas). */
  counted?: boolean;
  /** Se true, a resposta não vira uma linha na lista da mensagem. */
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
  );

export const FIRST_STEP = "nome";

export const STEPS: Step[] = [
  {
    id: "nome",
    kind: "text",
    summaryLabel: "Nome",
    question: "Qual é o seu nome?",
    placeholder: "Digite seu nome completo",
    next: "cat",
  },
  {
    id: "cat",
    kind: "choice",
    summaryLabel: "CAT emitida",
    question:
      "Em razão do acidente foi emitida a CAT (Comunicação de Acidente de Trabalho)?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
    ],
    next: "ano",
  },
  {
    id: "ano",
    kind: "choice",
    summaryLabel: "Ano do acidente",
    question: "Em que ano ocorreu o acidente?",
    options: [
      { value: "2010_ou_depois", label: "2010 ou depois" },
      { value: "antes_2010", label: "Antes de 2010" },
      { value: "nao_lembro", label: "Não lembro" },
    ],
    next: (v) => (v === "antes_2010" ? "disqualified" : "comoAconteceu"),
  },
  {
    id: "comoAconteceu",
    kind: "text",
    summaryLabel: "Como aconteceu",
    // Já aparece por extenso na primeira linha da mensagem.
    hideInSummary: true,
    question: "Como aconteceu o acidente?",
    placeholder: "Ex.: caí de uma escada durante o serviço",
    next: "carteira",
  },
  {
    id: "carteira",
    kind: "choice",
    summaryLabel: "Carteira assinada",
    question: "Você tinha carteira assinada na época?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
    ],
    next: "empresaExiste",
  },
  {
    id: "empresaExiste",
    kind: "choice",
    summaryLabel: "Empresa ainda existe",
    question: "A empresa onde ocorreu o acidente ainda existe?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
      { value: "nao_sei", label: "Não sei" },
    ],
    next: (v) => (v === "nao" ? "disqualified" : "sequela"),
  },
  {
    id: "sequela",
    kind: "choice",
    summaryLabel: "Sequela",
    question: "Ficou com alguma sequela após o acidente?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
      { value: "nao_sei", label: "Não sei" },
    ],
    next: (v) => (v === "nao" ? "disqualified" : "whatsapp"),
  },
  {
    id: "whatsapp",
    kind: "phone",
    summaryLabel: "WhatsApp",
    question: "Qual seu WhatsApp?",
    placeholder: "(00) 00000-0000",
    next: "submit",
  },
];

export const stepById = (id: string) => STEPS.find((s) => s.id === id);

/**
 * Total de perguntas — nenhuma ramificação muda o tamanho do caminho (só
 * desqualifica), então serve direto pra barra de progresso.
 */
export const TOTAL_QUESTIONS = STEPS.filter((s) => s.counted !== false).length;

/** Resolve o próximo id a partir do step atual e da resposta dada. */
export function resolveNext(step: Step, value: string): string {
  return typeof step.next === "function" ? step.next(value) : step.next;
}

/**
 * Steps respondidos no caminho que vale hoje, em ordem. Se o lead voltou e
 * trocou de ramo, respostas antigas do ramo abandonado ficam fora.
 */
export function answeredPath(answers: Answers): Step[] {
  const path: Step[] = [];
  let step = stepById(FIRST_STEP);
  while (step && answers[step.id] && !path.includes(step)) {
    path.push(step);
    step = stepById(resolveNext(step, answers[step.id]));
  }
  return path;
}

/** Converte o valor interno na label legível que vai para a mensagem. */
export function labelFor(step: Step, value: string): string {
  if (step.kind !== "choice") return value;
  return step.options.find((o) => o.value === value)?.label ?? value;
}

/** Versão da resposta pronta para entrar no meio de uma frase. */
export function phraseFor(stepId: string, answers: Answers): string {
  const step = stepById(stepId);
  if (!step || step.kind !== "choice") return "";

  const option = step.options.find((o) => o.value === answers[stepId]);
  if (!option) return "";

  return option.phrase ?? option.label.toLowerCase();
}

/** Resolve o enunciado, que pode depender das respostas anteriores. */
export function questionOf(step: Step, answers: Answers): string {
  return typeof step.question === "function"
    ? step.question(answers)
    : step.question;
}
