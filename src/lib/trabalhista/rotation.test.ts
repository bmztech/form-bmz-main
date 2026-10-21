import { beforeEach, describe, expect, it } from "vitest";
import { WHATSAPP_NUMBERS } from "./config";
import { nextUnit, resetRotation } from "./rotation";

beforeEach(() => {
  resetRotation();
});

describe("nextUnit — rodízio sequencial A/B/C (trabalhista)", () => {
  it("segue a ordem de chegada a, b, c, a, b, c...", () => {
    const units = Array.from({ length: 6 }, () => nextUnit().unit);
    expect(units).toEqual(["a", "b", "c", "a", "b", "c"]);
  });

  it("segue a ordem exata de WHATSAPP_NUMBERS", () => {
    const expectedOrder = Object.keys(WHATSAPP_NUMBERS);
    const units = expectedOrder.map(() => nextUnit().unit);
    expect(units).toEqual(expectedOrder);
  });

  it("o número devolvido bate com a unidade devolvida", () => {
    for (let i = 0; i < 6; i++) {
      const { unit, number } = nextUnit();
      expect(number).toBe(WHATSAPP_NUMBERS[unit]);
    }
  });

  it("fecha o ciclo sem estourar o array", () => {
    for (let i = 0; i < 30; i++) {
      const { unit } = nextUnit();
      expect(Object.keys(WHATSAPP_NUMBERS)).toContain(unit);
    }
  });
});
