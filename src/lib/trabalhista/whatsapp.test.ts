import { describe, expect, it } from "vitest";
import type { Answers } from "./form";
import { resolveNext, stepById } from "./form";
import { WHATSAPP_NUMBER, WHATSAPP_NUMBERS } from "./config";
import { buildMessage, buildWhatsAppUrl } from "./whatsapp";

const qualificado: Answers = {
  nome: "Fulano",
  cat: "sim",
  ano: "2010_ou_depois",
  comoAconteceu: "caí de uma escada durante o serviço",
  carteira: "sim",
  empresaExiste: "sim",
  sequela: "sim",
  whatsapp: "(41) 99999-0000",
};

describe("buildMessage — funil trabalhista", () => {
  it("abre com o resumo do acidente e lista as respostas", () => {
    const message = buildMessage(qualificado, {});

    expect(
      message.startsWith(
        "Acidente de trabalho: caí de uma escada durante o serviço\n",
      ),
    ).toBe(true);
    expect(message).toContain("Nome: Fulano");
    expect(message).toContain("CAT emitida: Sim");
    expect(message).toContain("Ano do acidente: 2010 ou depois");
    expect(message).toContain("Carteira assinada: Sim");
    expect(message).toContain("Empresa ainda existe: Sim");
    expect(message).toContain("Sequela: Sim");
    expect(message).toContain("WhatsApp: (41) 99999-0000");
  });

  it("não repete o 'como aconteceu' na lista (já está no cabeçalho)", () => {
    expect(buildMessage(qualificado, {})).not.toContain("Como aconteceu:");
  });

  it("sem descrição, usa o cabeçalho genérico", () => {
    expect(buildMessage({}, {}).startsWith("Caso novo pelo formulário")).toBe(
      true,
    );
  });

  it("inclui o bloco de origem quando há UTMs", () => {
    const message = buildMessage(qualificado, { utm_source: "instagram" });
    expect(message).toContain("— origem —");
    expect(message).toContain("utm_source: instagram");
  });
});

describe("desqualificação", () => {
  const nextOf = (id: string, value: string) =>
    resolveNext(stepById(id)!, value);

  it("acidente antes de 2010 desqualifica; 'não lembro' segue", () => {
    expect(nextOf("ano", "antes_2010")).toBe("disqualified");
    expect(nextOf("ano", "nao_lembro")).toBe("comoAconteceu");
  });

  it("empresa que não existe mais desqualifica; 'não sei' segue", () => {
    expect(nextOf("empresaExiste", "nao")).toBe("disqualified");
    expect(nextOf("empresaExiste", "nao_sei")).toBe("sequela");
  });

  it("sem sequela desqualifica; 'não sei' segue", () => {
    expect(nextOf("sequela", "nao")).toBe("disqualified");
    expect(nextOf("sequela", "nao_sei")).toBe("whatsapp");
  });

  it("CAT e carteira assinada não desqualificam", () => {
    expect(nextOf("cat", "nao")).toBe("ano");
    expect(nextOf("carteira", "nao")).toBe("empresaExiste");
  });
});

describe("buildWhatsAppUrl — número de destino", () => {
  it("usa o WHATSAPP_NUMBER padrão quando nenhum número é informado", () => {
    expect(buildWhatsAppUrl({}, {})).toContain(
      `https://wa.me/${WHATSAPP_NUMBER}?`,
    );
  });

  it("todas as unidades têm um número de WhatsApp válido", () => {
    const values = Object.values(WHATSAPP_NUMBERS);
    expect(values).toHaveLength(3);
    for (const number of values) {
      expect(number).toMatch(/^55\d{10,11}$/);
    }
  });
});
