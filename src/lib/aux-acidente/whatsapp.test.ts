import { describe, expect, it } from "vitest";
import type { Answers } from "./form";
import { WHATSAPP_NUMBER, WHATSAPP_NUMBERS } from "./config";
import { buildMessage, buildWhatsAppUrl } from "./whatsapp";

describe("buildMessage — bloco de origem com UTMs", () => {
  const answers: Answers = {};

  it("inclui o bloco de origem quando há UTMs com valor", () => {
    const message = buildMessage(answers, {
      utm_source: "google",
      utm_medium: "cpc",
    });

    expect(message).toContain("— origem —");
    expect(message).toContain("utm_source: google");
    expect(message).toContain("utm_medium: cpc");
  });

  it("omite o bloco de origem quando não há tracking", () => {
    const message = buildMessage(answers, {});
    expect(message).not.toContain("— origem —");
  });

  it("filtra campos de tracking com valor vazio", () => {
    const message = buildMessage(answers, {
      utm_source: "google",
      utm_medium: "",
    });

    expect(message).toContain("utm_source: google");
    expect(message).not.toContain("utm_medium:");
  });
});

describe("buildWhatsAppUrl — número de destino por unidade", () => {
  const answers: Answers = {};

  it("usa o WHATSAPP_NUMBER padrão quando nenhum número é informado", () => {
    const url = buildWhatsAppUrl(answers, {});
    expect(url).toBe(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(answers, {}))}`,
    );
  });

  it("usa o número informado para cada unidade (aux-a/b/c)", () => {
    expect(buildWhatsAppUrl(answers, {}, WHATSAPP_NUMBERS.a)).toContain(
      `https://wa.me/${WHATSAPP_NUMBERS.a}?`,
    );
    expect(buildWhatsAppUrl(answers, {}, WHATSAPP_NUMBERS.b)).toContain(
      `https://wa.me/${WHATSAPP_NUMBERS.b}?`,
    );
    expect(buildWhatsAppUrl(answers, {}, WHATSAPP_NUMBERS.c)).toContain(
      `https://wa.me/${WHATSAPP_NUMBERS.c}?`,
    );
  });

  // Provisoriamente o Time A compartilha o número do Time C, por isso não
  // exigimos números distintos — apenas que cada unidade tenha um número válido.
  it("todas as unidades têm um número de WhatsApp válido", () => {
    const values = Object.values(WHATSAPP_NUMBERS);
    expect(values).toHaveLength(3);
    for (const number of values) {
      expect(number).toMatch(/^55\d{10,11}$/);
    }
  });
});

describe("buildMessage — etiqueta de time (rota raiz, rodízio A/B/C)", () => {
  const answers: Answers = {};

  it("com unit, abre com [TIME X] e lista a unidade no bloco de origem", () => {
    const message = buildMessage(answers, {}, "a");

    expect(message.startsWith("[TIME A]\n")).toBe(true);
    expect(message).toContain("— origem —");
    expect(message).toContain("unidade: A");
  });

  it("sem unit, a mensagem sai igual ao formato atual (rotas fixas aux-a/b/c)", () => {
    const withUnit = buildMessage(answers, {}, undefined);
    expect(withUnit).not.toContain("[TIME");
    expect(withUnit).not.toContain("unidade:");
    expect(withUnit).not.toContain("— origem —");
  });

  it("com unit e sem UTM, o bloco de origem aparece só com a unidade", () => {
    const message = buildMessage(answers, {}, "b");

    expect(message).toContain("— origem —");
    expect(message).toContain("unidade: B");
  });

  it("com unit e UTMs, a unidade vem antes das UTMs no bloco de origem", () => {
    const message = buildMessage(answers, { utm_source: "instagram" }, "c");
    const origem = message.slice(message.indexOf("— origem —"));

    expect(origem.indexOf("unidade: C")).toBeLessThan(
      origem.indexOf("utm_source: instagram"),
    );
  });
});

describe("buildMessage — tipo de lesão", () => {
  const base: Answers = {
    nome: "Fulano",
    sequela: "sim",
    vinculo: "carteira",
    inss: "afastado",
    whatsapp: "(41) 99999-0000",
  };

  it("limitação de movimento: cabeçalho com a região e linhas de tipo/região", () => {
    const message = buildMessage(
      { ...base, tipoLesao: "limitacao", regiao: "braco", lesao: "fratura" },
      {},
    );

    expect(message.startsWith("Caso: fratura na região do braço ou mão\n")).toBe(true);
    expect(message).toContain("Tipo de lesão: Limitação de Movimento");
    expect(message).toContain("Região: Braço ou mão");
  });

  it("amputação: sem região, mesmo que o lead tenha respondido antes e voltado", () => {
    const message = buildMessage(
      { ...base, tipoLesao: "amputacao", regiao: "braco", lesao: "perdi dois dedos" },
      {},
    );

    expect(message.startsWith("Caso: perdi dois dedos\n")).toBe(true);
    expect(message).toContain("Tipo de lesão: Amputação");
    expect(message).not.toContain("Região:");
  });
});
