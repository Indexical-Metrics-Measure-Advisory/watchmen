import type { ProductGraphEdge, ProductGraphNode } from "@/model/dataProduct";

export const PRODUCT_NODE_WIDTH = 190;
export const PRODUCT_NODE_HEIGHT = 68;
const COL_GAP = 105;
const ROW_GAP = 44;

export function computeProductLayout(
  products: ProductGraphNode[],
  edges: ProductGraphEdge[],
): Map<string, { x: number; y: number }> {
  const upstreamOf = new Map<string, string[]>();
  const downstreamOf = new Map<string, string[]>();
  products.forEach((product) => {
    upstreamOf.set(product.id, []);
    downstreamOf.set(product.id, []);
  });
  edges.forEach((edge) => {
    downstreamOf.get(edge.from)?.push(edge.to);
    upstreamOf.get(edge.to)?.push(edge.from);
  });

  const levels = new Map<string, number>();
  const visiting = new Set<string>();
  const levelOf = (id: string): number => {
    if (levels.has(id)) return levels.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let level = 0;
    upstreamOf.get(id)?.forEach((upstream) => {
      level = Math.max(level, levelOf(upstream) + 1);
    });
    visiting.delete(id);
    levels.set(id, level);
    return level;
  };
  products.forEach((product) => levelOf(product.id));

  const columns: string[][] = [];
  products
    .slice()
    .sort((a, b) => (a["x-name"] || a.id).localeCompare(b["x-name"] || b.id))
    .forEach((product) => {
      const level = levels.get(product.id) ?? 0;
      while (columns.length <= level) columns.push([]);
      columns[level].push(product.id);
    });

  const positions = new Map<string, { x: number; y: number }>();
  const placeColumns = () => {
    columns.forEach((ids, level) => {
      const height = (ids.length - 1) * (PRODUCT_NODE_HEIGHT + ROW_GAP);
      ids.forEach((id, index) => {
        positions.set(id, {
          x: level * (PRODUCT_NODE_WIDTH + COL_GAP),
          y: -height / 2 + index * (PRODUCT_NODE_HEIGHT + ROW_GAP),
        });
      });
    });
  };
  placeColumns();

  const rowOf = new Map<string, number>();
  const refreshRows = () => columns.forEach((ids) => ids.forEach((id, index) => rowOf.set(id, index)));
  refreshRows();
  const barycenter = (id: string, neighbors: string[]) => {
    const rows = neighbors.map((neighbor) => rowOf.get(neighbor)).filter((row) => row != null) as number[];
    return rows.length === 0 ? rowOf.get(id)! : rows.reduce((sum, row) => sum + row, 0) / rows.length;
  };
  for (let sweep = 0; sweep < 4; sweep += 1) {
    const downstream = sweep % 2 === 0;
    const order = downstream ? columns.map((_, level) => level) : columns.map((_, level) => level).reverse();
    order.forEach((level) => {
      if ((downstream && level === 0) || (!downstream && level === columns.length - 1)) return;
      columns[level] = columns[level].slice().sort((a, b) =>
        barycenter(a, downstream ? upstreamOf.get(a) || [] : downstreamOf.get(a) || []) -
        barycenter(b, downstream ? upstreamOf.get(b) || [] : downstreamOf.get(b) || []),
      );
      refreshRows();
    });
  }
  placeColumns();

  const enforceGaps = (ids: string[]) => {
    for (let index = 1; index < ids.length; index += 1) {
      const previous = positions.get(ids[index - 1])!;
      const current = positions.get(ids[index])!;
      if (current.y < previous.y + PRODUCT_NODE_HEIGHT + ROW_GAP) current.y = previous.y + PRODUCT_NODE_HEIGHT + ROW_GAP;
    }
    for (let index = ids.length - 2; index >= 0; index -= 1) {
      const next = positions.get(ids[index + 1])!;
      const current = positions.get(ids[index])!;
      if (current.y > next.y - PRODUCT_NODE_HEIGHT - ROW_GAP) current.y = next.y - PRODUCT_NODE_HEIGHT - ROW_GAP;
    }
  };
  const medianOf = (ids: string[]) => {
    const ys = ids.map((id) => positions.get(id)?.y).filter((y) => y != null) as number[];
    if (ys.length === 0) return null;
    ys.sort((a, b) => a - b);
    const middle = Math.floor(ys.length / 2);
    return ys.length % 2 === 1 ? ys[middle] : (ys[middle - 1] + ys[middle]) / 2;
  };
  for (let sweep = 0; sweep < 2; sweep += 1) {
    columns.forEach((ids, level) => {
      if (level === 0) return;
      ids.forEach((id) => {
        const target = medianOf(upstreamOf.get(id) || []);
        if (target != null) positions.get(id)!.y = target;
      });
      enforceGaps(ids);
    });
    columns.map((_, level) => level).reverse().forEach((level) => {
      if (level === columns.length - 1) return;
      columns[level].forEach((id) => {
        const target = medianOf(downstreamOf.get(id) || []);
        if (target != null) positions.get(id)!.y = target;
      });
      enforceGaps(columns[level]);
    });
  }

  return positions;
}
