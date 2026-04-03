import { Badge, Box, Card, Flex, Heading, Text, Button, Separator, Tabs } from "@radix-ui/themes";
import {
  ComponentNoneIcon,
  ArrowTopRightIcon,
  PlusIcon,
  Link2Icon,
  ArrowRightIcon,
  MinusCircledIcon,
  LockClosedIcon,
  GroupIcon,
  PersonIcon,
  BarChartIcon
} from "@radix-ui/react-icons";

type LineageNode = {
  id: string;
  name: string;
  type: "source" | "etl" | "dw" | "bi" | "app";
  owner: string;
};

type LineageEdge = {
  from: string;
  to: string;
  label: string;
};

const lineageNodes: LineageNode[] = [
  { id: "src1", name: "MySQL\npolicy_db", type: "source", owner: "DBA Team" },
  { id: "src2", name: "Kafka\nclaim_events", type: "source", owner: "Platform Team" },
  { id: "etl1", name: "dbt model\nstg_policy", type: "etl", owner: "Data Eng" },
  { id: "etl2", name: "Spark job\nenrich_claims", type: "etl", owner: "Data Eng" },
  { id: "dw1", name: "Snowflake\ndim_customer", type: "dw", owner: "Data Platform" },
  { id: "dw2", name: "Snowflake\nfact_transaction", type: "dw", owner: "Finance Team" },
  { id: "dw3", name: "Snowflake\nfact_claim", type: "dw", owner: "Claims Team" },
  { id: "bi1", name: "Metabase\nclaim_dashboard", type: "bi", owner: "BI Team" },
  { id: "bi2", name: "Looker\npremium_report", type: "bi", owner: "Finance Team" },
];

const lineageEdges: LineageEdge[] = [
  { from: "src1", to: "etl1", label: "CDC" },
  { from: "src1", to: "etl2", label: "CDC" },
  { from: "src2", to: "etl2", label: "Stream" },
  { from: "etl1", to: "dw1", label: "Transform" },
  { from: "etl1", to: "dw2", label: "Transform" },
  { from: "etl2", to: "dw3", label: "Load" },
  { from: "dw1", to: "bi1", label: "Query" },
  { from: "dw2", to: "bi2", label: "Query" },
  { from: "dw3", to: "bi1", label: "Query" },
];

const nodeColors: Record<string, string> = {
  source: "#6366f1",
  etl: "#f59e0b",
  dw: "#10b981",
  bi: "#3b82f6",
  app: "#ec4899",
};

const nodeLabels: Record<string, string> = {
  source: "Source",
  etl: "ETL / Processing",
  dw: "Data Warehouse",
  bi: "BI / Reports",
  app: "Application",
};

function LineagePage() {
  const getNodeById = (id: string) => lineageNodes.find((n) => n.id === id);

  // Simple horizontal layout positions
  const layerMap: Record<string, number> = { source: 0, etl: 1, dw: 2, bi: 3 };
  const nodePositions: Record<string, { x: number; y: number }> = {};
  const layerGroups: Record<number, LineageNode[]> = {};

  lineageNodes.forEach((n) => {
    const layer = layerMap[n.type] ?? 0;
    if (!layerGroups[layer]) layerGroups[layer] = [];
    layerGroups[layer].push(n);
  });

  Object.entries(layerGroups).forEach(([layer, nodes]) => {
    nodes.forEach((n, idx) => {
      nodePositions[n.id] = { x: parseInt(layer) * 220 + 80, y: idx * 130 + 50 };
    });
  });

  const svgWidth = 1000;
  const svgHeight = 450;

  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Data Lineage Visualization</Heading>
          <Text size="2" color="gray">
            Track end-to-end data flows and support column-level impact analysis.
          </Text>
        </Box>
        <Flex gap="2">
          <Button variant="soft" color="gray"><PlusIcon /> Manual Link</Button>
          <Button variant="outline"><ComponentNoneIcon /> Column Lineage</Button>
        </Flex>
      </Flex>

      <Flex gap="2" mb="4" wrap="wrap">
        {Object.entries(nodeLabels).map(([key, label]) => (
          <Flex key={key} align="center" gap="1">
            <Box style={{ width: 12, height: 12, borderRadius: 3, background: nodeColors[key] }} />
            <Text size="1">{label}</Text>
          </Flex>
        ))}
      </Flex>

      <Card size="3" className="panel radix-surface" style={{ overflow: "hidden" }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "auto" }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Edges */}
          {lineageEdges.map((e, i) => {
            const from = nodePositions[e.from];
            const to = nodePositions[e.to];
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const path = `M${from.x + 55},${from.y + 20} C${midX},${from.y + 20} ${midX},${to.y + 20} ${to.x + 55},${to.y + 20}`;
            return (
              <g key={i}>
                <path d={path} fill="none" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
                <text x={midX} y={Math.min(from.y, to.y) + 12} textAnchor="middle" fontSize="9" fill="#64748b">
                  {e.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {lineageNodes.map((n) => {
            const pos = nodePositions[n.id];
            if (!pos) return null;
            const color = nodeColors[n.type];
            return (
              <g key={n.id}>
                <rect
                  x={pos.x - 50} y={pos.y - 10}
                  width={110} height={60} rx={8}
                  fill="white" stroke={color} strokeWidth="2"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))" }}
                />
                <rect
                  x={pos.x - 50} y={pos.y - 10}
                  width={110} height={22} rx={8}
                  fill={color}
                />
                <rect x={pos.x - 50} y={pos.y + 4} width={110} height={8} fill={color} />
                <text x={pos.x + 5} y={pos.y + 5} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">
                  {n.owner}
                </text>
                {n.name.split("\n").map((line, idx) => (
                  <text key={idx} x={pos.x + 5} y={pos.y + 25 + idx * 14} textAnchor="middle" fontSize="10" fill="#334155">
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </Card>

      <Card size="3" className="panel radix-surface" mt="3">
        <Heading size="5" mb="3">Impact Analysis</Heading>
        <Separator my="2" size="4" />
        <Text size="2" color="gray" mb="3">
          Select any node to inspect upstream dependencies and downstream impact. Below is the analysis for <Badge color="blue" variant="soft">dim_customer</Badge>.
        </Text>
        <Flex gap="4" wrap="wrap">
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Flex direction="column" gap="2">
              <Heading size="4">Upstream Dependencies <Badge color="violet" size="1">{2}</Badge></Heading>
              {["MySQL · policy_db (CDC)", "dbt model · stg_policy"].map((s) => (
                <Card key={s} size="1"><Text size="2"><ArrowRightIcon /> {s}</Text></Card>
              ))}
            </Flex>
          </Box>
          <Box style={{ flex: 1, minWidth: 200 }}>
            <Flex direction="column" gap="2">
              <Heading size="4">Downstream Impact <Badge color="blue" size="1">{2}</Badge></Heading>
              {["Metabase · claim_dashboard", "Data quality rules · 3 items"].map((s) => (
                <Card key={s} size="1"><Text size="2"><MinusCircledIcon color="red" /> {s}</Text></Card>
              ))}
            </Flex>
          </Box>
        </Flex>
      </Card>
    </Box>
  );
}

export default LineagePage;
