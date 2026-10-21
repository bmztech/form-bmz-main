/**
 * Cards do linktree exibido na rota raiz "/" — um card por oferta.
 * `href` aqui é o destino "cru"; `page.tsx` acrescenta as UTMs de entrada
 * via `buildTrackedHref` antes de passar pro componente.
 */

export type LinktreeLink = {
  id: string;
  href: string;
  label: string;
  description: string;
  /** true = abre em nova aba (destino fora do site). */
  external?: boolean;
};

export const LINKTREE_LINKS: LinktreeLink[] = [
  {
    id: "aux-acidente",
    // Passa pelo rodízio de times antes de cair no funil.
    href: "/go/aux-acidente",
    label: "Auxílio-Acidente",
    description:
      "Sofreu um acidente e ficou com alguma sequela? Veja se você tem direito a um benefício do INSS.",
  },
  {
    id: "trabalhista",
    // Passa pelo rodízio de times antes de cair no funil.
    href: "/go/trabalhista",
    label: "Acidente de Trabalho",
    description:
      "Sofreu um acidente de trabalho e ficou com sequelas? Você pode ter direito a uma indenização da empresa.",
  },
  {
    id: "adic-25",
    href: "/adic-25",
    label: "Adicional de 25%",
    description:
      "Já é aposentado por invalidez e precisa de ajuda de outra pessoa no dia a dia? Pode ter direito a um acréscimo.",
  },
  {
    id: "previdenciario",
    href: "https://previdenciario.bmzadvogados.adv.br/",
    label: "Previdenciário",
    description:
      "Outros benefícios do INSS: aposentadoria, BPC/LOAS e mais — fale com nosso time previdenciário.",
    external: true,
  },
];
