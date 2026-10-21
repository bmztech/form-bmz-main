import { beforeEach, describe, expect, it } from "vitest";
import { resetRotation } from "@/lib/trabalhista/rotation";
import { GET, HEAD } from "./route";

beforeEach(() => {
  resetRotation();
});

function locationOf(res: Response): URL {
  const location = res.headers.get("Location");
  expect(location).toBeTruthy();
  return new URL(location as string, "http://localhost/");
}

describe("GET /go/trabalhista", () => {
  it("redireciona com 307 e sem cache", () => {
    const res = GET(new Request("http://localhost/go/trabalhista"));
    expect(res.status).toBe(307);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("avança o rodízio a cada chamada, caindo em /trab-a, /trab-b, /trab-c", () => {
    const paths = Array.from({ length: 3 }, () => {
      const res = GET(new Request("http://localhost/go/trabalhista"));
      return locationOf(res).pathname;
    });
    expect(paths).toEqual(["/trab-a", "/trab-b", "/trab-c"]);
  });

  it("preserva as UTMs de entrada no Location", () => {
    const res = GET(
      new Request(
        "http://localhost/go/trabalhista?utm_source=instagram&utm_medium=cpc&utm_campaign=acidente_trabalho",
      ),
    );
    const url = locationOf(res);

    expect(url.pathname).toBe("/trab-a");
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_medium")).toBe("cpc");
    expect(url.searchParams.get("utm_campaign")).toBe("acidente_trabalho");
  });

  it("preserva o ttclid do TikTok no Location", () => {
    const res = GET(
      new Request(
        "http://localhost/go/trabalhista?utm_source=tiktok&ttclid=E.C.P.abc123",
      ),
    );
    const url = locationOf(res);

    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("ttclid")).toBe("E.C.P.abc123");
  });

  it("não deixa parâmetros extras da entrada vazarem pro destino", () => {
    const res = GET(
      new Request("http://localhost/go/trabalhista?foo=bar&time=c"),
    );
    const url = locationOf(res);

    expect(url.pathname).toBe("/trab-a");
    expect(url.searchParams.has("foo")).toBe(false);
    expect(url.searchParams.has("time")).toBe(false);
  });
});

describe("HEAD /go/trabalhista", () => {
  it("responde sem avançar o rodízio", () => {
    const before = locationOf(
      GET(new Request("http://localhost/go/trabalhista")),
    ).pathname;

    const head = HEAD();
    expect(head.status).toBe(204);
    expect(head.headers.get("Cache-Control")).toBe("no-store");

    const after = locationOf(
      GET(new Request("http://localhost/go/trabalhista")),
    ).pathname;

    // /trab-b, não /trab-c: a chamada a HEAD não consumiu posição da fila.
    expect(before).toBe("/trab-a");
    expect(after).toBe("/trab-b");
  });
});
