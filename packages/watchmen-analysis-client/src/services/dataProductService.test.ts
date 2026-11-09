import { afterEach, describe, expect, it, vi } from "vitest";

const emptyGraph = {
  schema: "ODPG/v1.0",
  version: "1.0.0",
  kind: "DataProductGraph",
  graph: { metadata: {}, nodes: [], edges: [] },
};

const mockBrowser = () => {
  vi.stubGlobal("window", { location: { hostname: "localhost" } });
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
};

describe("dataProductService.getProductGraph", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the raw product id rather than a graph node id as focus", async () => {
    mockBrowser();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyGraph), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { dataProductService } = await import("./dataProductService");

    await dataProductService.getProductGraph({ focus: "product:customer-profile", depth: 1 });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("focus=customer-profile");
    expect(url).not.toContain("product%3A");
  });

  it("leaves an already raw focus id unchanged", async () => {
    mockBrowser();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyGraph), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { dataProductService } = await import("./dataProductService");

    await dataProductService.getProductGraph({ focus: "customer-profile", depth: 1 });

    expect(String(fetchMock.mock.calls[0][0])).toContain("focus=customer-profile");
  });
});
