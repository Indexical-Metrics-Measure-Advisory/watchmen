import { describe, expect, it } from "vitest";
import type { ProductGraphEdge, ProductGraphNode } from "@/model/dataProduct";
import { computeProductLayout, PRODUCT_NODE_HEIGHT, PRODUCT_NODE_WIDTH } from "./graphLayout";

const product = (id: string): ProductGraphNode => ({ id, type: "DataProduct", "x-name": id });
const dependency = (from: string, to: string): ProductGraphEdge => ({ from, to, type: "dependsOn", confidence: "high" });

describe("computeProductLayout", () => {
  it("places upstream products to the left of downstream products", () => {
    const positions = computeProductLayout(
      [product("downstream"), product("upstream"), product("independent")],
      [dependency("upstream", "downstream")],
    );

    expect(positions.get("upstream")!.x).toBeLessThan(positions.get("downstream")!.x);
    expect(positions.get("independent")!.x).toBe(positions.get("upstream")!.x);
  });

  it("keeps a minimum gap between independent nodes in one column", () => {
    const positions = computeProductLayout(
      [product("a"), product("b"), product("c")],
      [],
    );
    const ys = ["a", "b", "c"].map((id) => positions.get(id)!.y).sort((a, b) => a - b);

    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(PRODUCT_NODE_HEIGHT);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(PRODUCT_NODE_HEIGHT);
    expect(PRODUCT_NODE_WIDTH).toBeGreaterThan(0);
  });

  it("handles dependency cycles without recursing forever", () => {
    const positions = computeProductLayout(
      [product("a"), product("b"), product("c")],
      [dependency("a", "b"), dependency("b", "a"), dependency("b", "c")],
    );

    ["a", "b", "c"].forEach((id) => {
      expect(Number.isFinite(positions.get(id)!.x)).toBe(true);
      expect(Number.isFinite(positions.get(id)!.y)).toBe(true);
    });
  });
});
