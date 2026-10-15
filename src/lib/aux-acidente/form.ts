/**
 * Definição declarativa do funil. Para mudar perguntas, opções ou o
 * encadeamento condicional, edite apenas o array STEPS abaixo.
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
   * Ex.: label "Braço ou mão" -> phrase "do braço ou mão", para render
   * "na região do braço ou mão". Sem isso, usamos a label em minúsculas.
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

/** Regiões que, na triagem do escritório, não configuram auxílio-acidente. */
const REGIOES_DESQUALIFICANTES = new Set(["cabeca", "costas"]);

export const STEPS: Step[] = [
  {
    id: "nome",
    kind: "text",
    summaryLabel: "Nome",
    question: "Qual é o seu nome?",
    placeholder: "Digite seu nome completo",
    next: "sequela",
  },
  {
    id: "sequela",
    kind: "choice",
    summaryLabel: "Sequela",
    question:
      "1.	Você sofreu um acidente e ficou com alguma sequela ou limitação PERMANENTE que dificulta seu trabalho?",
    options: [
      {
        value: "sim",
        label: "Sim, hoje tenho dificuldade para trabalhar como antes ",
      },
      {
        value: "nao",
        label: "Não sofri acidente/ Me recuperei e trabalho normalmente ",
      },
    ],
    next: (v) => (v === "sim" ? "vinculo" : "disqualified"),
  },
  {
    id: "vinculo",
    kind: "choice",
    summaryLabel: "Vínculo",
    question: "Na época do acidente, qual era sua situação de trabalho?",
    options: [
      { value: "carteira", label: "Tinha carteira assinada" },
      { value: "agricultor", label: "Era Agricultor" },
      { value: "mei", label: "Era MEI ou Autônomo" },
      { value: "desempregado", label: "Estava desempregado" },
    ],
    // Carteira assinada e agricultor já têm qualidade de segurado -> pula direto
    // para o INSS. MEI/autônomo e desempregado precisam checar vínculo anterior.
    next: (v) =>
      v === "carteira" || v === "agricultor" ? "inss" : "carteiraAnterior",
  },
  {
    id: "carteiraAnterior",
    kind: "choice",
    summaryLabel: "Mais de 1 ano sem carteira assinada",
    question:
      "Fazia mais de um ano que estava sem carteira assinada, quando ocorreu seu acidente?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
    ],
    next: (v) => (v === "sim" ? "disqualified" : "inss"),
  },
  {
    id: "inss",
    kind: "choice",
    summaryLabel: "INSS",
    question: "Na época do acidente, você buscou o INSS?",
    options: [
      { value: "afastado", label: "Fiquei afastado pelo INSS" },
      { value: "nao_busquei", label: "Não busquei o INSS" },
      { value: "negado", label: "Fui ao INSS mas fui negado" },
    ],
    next: "whatsapp",
  },
  {
    id: "whatsapp",
    kind: "phone",
    summaryLabel: "WhatsApp",
    question: "Qual seu WhatsApp?",
    placeholder: "(00) 00000-0000",
    next: "tipoLesao",
  },
  {
    id: "tipoLesao",
    kind: "choice",
    summaryLabel: "Tipo de lesão",
    question: "Qual foi a sua lesão?",
    options: [
      { value: "amputacao", label: "Amputação" },
      { value: "limitacao", label: "Limitação de Movimento" },
      { value: "visao_monocular", label: "Visão Monocular" },
    ],
    // Só limitação de movimento precisa saber a parte do corpo afetada.
    next: (v) => (v === "limitacao" ? "regiao" : "lesao"),
  },
  {
    id: "regiao",
    kind: "choice",
    summaryLabel: "Região",
    question: "Qual parte do corpo foi afetada?",
    options: [
      { value: "braco", label: "Braço ou mão", phrase: "do braço ou mão" },
      { value: "perna", label: "Perna ou pé", phrase: "da perna ou pé" },
      {
        value: "Ombro ou Clavícula",
        label: "Ombro ou Clavícula",
        phrase: "do ombro ou clavícula",
      },
      { value: "cabeca", label: "Cabeça", phrase: "da cabeça" },
      { value: "costas", label: "Costas", phrase: "das costas" },
      // Label "Outra região" é usada pela automação do WhatsApp pra
      // identificar esse caminho. Não renomear sem avisar quem mantém o fluxo.
      { value: "outra", label: "Outra região", phrase: "afetada" },
    ],
    // Cabeça e costas não se enquadram na triagem do escritório.
    next: (v) => (REGIOES_DESQUALIFICANTES.has(v) ? "disqualified" : "lesao"),
  },
  {
    id: "lesao",
    kind: "text",
    summaryLabel: "Lesão",
    // Já aparece por extenso na primeira linha da mensagem.
    hideInSummary: true,
    question: "Em poucas palavras, descreva a sua lesão",
    placeholder: "Ex.: fratura que não consolidou",
    next: "submit",
  },
];

export const stepById = (id: string) => STEPS.find((s) => s.id === id);

/** Total de perguntas do caminho mais longo — usado na barra de progresso. */
export const TOTAL_QUESTIONS = STEPS.filter((s) => s.counted !== false).length;

/** Resolve o próximo id a partir do step atual e da resposta dada. */
export function resolveNext(step: Step, value: string): string {
  return typeof step.next === "function" ? step.next(value) : step.next;
}

/**
 * Steps respondidos no caminho que vale hoje, em ordem. Se o lead voltou e
 * trocou de ramo (ex.: "Limitação de Movimento" -> "Amputação"), a resposta
 * antiga do ramo abandonado (`regiao`) continua em `answers`, mas fica fora.
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

/**
 * Versão da resposta pronta para entrar no meio de uma frase.
 * Ex.: phraseFor("regiao", { regiao: "braco" }) -> "do braço ou mão".
 */
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
