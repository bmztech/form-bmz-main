import { beforeEach, describe, expect, it } from "vitest";
import { resetRotation } from "@/lib/aux-acidente/rotation";
import { GET, HEAD } from "./route";

beforeEach(() => {
  resetRotation();
});

function locationOf(res: Response): URL {
  const location = res.headers.get("Location");
  expect(location).toBeTruthy();
  return new URL(location as string, "http://localhost/");
}

describe("GET /go/aux-acidente", () => {
  it("redireciona com 307 e sem cache", () => {
    const res = GET(new Request("http://localhost/go/aux-acidente"));
    expect(res.status).toBe(307);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("avança o rodízio a cada chamada, caindo em /aux-a, /aux-b, /aux-c", () => {
    const paths = Array.from({ length: 3 }, () => {
      const res = GET(new Request("http://localhost/go/aux-acidente"));
      return locationOf(res).pathname;
    });
    expect(paths).toEqual(["/aux-a", "/aux-b", "/aux-c"]);
  });

  it("preserva as UTMs de entrada no Location", () => {
    const res = GET(
      new Request(
        "http://localhost/go/aux-acidente?utm_source=instagram&utm_medium=cpc&utm_campaign=inss_acidente",
      ),
    );
    const url = locationOf(res);

    expect(url.pathname).toBe("/aux-a");
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_medium")).toBe("cpc");
    expect(url.searchParams.get("utm_campaign")).toBe("inss_acidente");
  });

  it("preserva o ttclid do TikTok no Location", () => {
    const res = GET(
      new Request(
        "http://localhost/go/aux-acidente?utm_source=tiktok&ttclid=E.C.P.abc123",
      ),
    );
    const url = locationOf(res);

    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("ttclid")).toBe("E.C.P.abc123");
  });

  it("não deixa parâmetros extras da entrada vazarem pro destino", () => {
    const res = GET(
      new Request("http://localhost/go/aux-acidente?foo=bar&time=c"),
    );
    const url = locationOf(res);

    expect(url.pathname).toBe("/aux-a");
    expect(url.searchParams.has("foo")).toBe(false);
    expect(url.searchParams.has("time")).toBe(false);
  });
});

describe("HEAD /go/aux-acidente", () => {
  it("responde sem avançar o rodízio", () => {
    const before = locationOf(
      GET(new Request("http://localhost/go/aux-acidente")),
    ).pathname;

    const head = HEAD();
    expect(head.status).toBe(204);
    expect(head.headers.get("Cache-Control")).toBe("no-store");

    const after = locationOf(
      GET(new Request("http://localhost/go/aux-acidente")),
    ).pathname;

    // /aux-b, não /aux-c: a chamada a HEAD não consumiu posição da fila.
    expect(before).toBe("/aux-a");
    expect(after).toBe("/aux-b");
  });
});
