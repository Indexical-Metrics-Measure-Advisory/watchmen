import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Progress } from "@radix-ui/themes";
import {
  BarChartIcon,
  PlusIcon,
  BellIcon,
  CheckCircledIcon,
  MinusCircledIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  TimerIcon
} from "@radix-ui/react-icons";

type ProfilingResult = {
  table: string;
  totalRows: string;
  nullRate: number;
  cardinality: number;
  lastScan: string;
};

type QualityRule = {
  id: string;
  name: string;
  table: string;
  type: string;
  threshold: string;
  passRate: number;
  lastRun: string;
  status: "pass" | "fail" | "warning";
};

type AlertItem = {
  id: string;
  rule: string;
  table: string;
  message: string;
  severity: "critical" | "warning" | "info";
  assignedTo: string;
  createdAt: string;
  status: "open" | "acked" | "resolved";
};

const profilingResults: ProfilingResult[] = [
  { table: "dim_customer", totalRows: "2,345,678", nullRate: 0.3, cardinality: 2345678, lastScan: "2026-04-02 22:00" },
  { table: "fact_transaction", totalRows: "18,923,451", nullRate: 0.01, cardinality: 18923451, lastScan: "2026-04-02 22:00" },
  { table: "policy_master_view", totalRows: "567,890", nullRate: 5.2, cardinality: 567890, lastScan: "2026-04-02 21:00" },
  { table: "risk_score_model_output", totalRows: "3,456,789", nullRate: 0.0, cardinality: 1024, lastScan: "2026-04-02 22:00" }
];

const qualityRules: QualityRule[] = [
  { id: "QR-001", name: "Customer ID Not Null", table: "dim_customer", type: "NOT_NULL", threshold: "> 99.9%", passRate: 99.97, lastRun: "2026-04-02 22:05", status: "pass" },
  { id: "QR-002", name: "Transaction Amount Range", table: "fact_transaction", type: "RANGE", threshold: "> 95%", passRate: 94.2, lastRun: "2026-04-02 22:05", status: "fail" },
  { id: "QR-003", name: "Policy Status Enum", table: "policy_master_view", type: "ENUM", threshold: "> 99%", passRate: 97.8, lastRun: "2026-04-02 21:05", status: "warning" },
  { id: "QR-004", name: "Risk Score Domain Check", table: "risk_score_model_output", type: "RANGE", threshold: "= 100%", passRate: 100.0, lastRun: "2026-04-02 22:05", status: "pass" },
  { id: "QR-005", name: "Claim Event Freshness", table: "claim_event_stream", type: "FRESHNESS", threshold: "< 15min", passRate: 99.5, lastRun: "2026-04-02 22:00", status: "pass" }
];

const alertItems: AlertItem[] = [
  { id: "ALT-301", rule: "Transaction Amount Range", table: "fact_transaction", message: "1,095,432 records have negative amount values. Threshold 95% violated.", severity: "critical", assignedTo: "Finance Team", createdAt: "2026-04-02 22:05", status: "open" },
  { id: "ALT-300", rule: "Policy Status Enum", table: "policy_master_view", message: "2.2% records contain unidentified policy status values.", severity: "warning", assignedTo: "Policy Team", createdAt: "2026-04-02 21:05", status: "acked" },
  { id: "ALT-298", rule: "Customer ID Not Null", table: "dim_customer", message: "Null rate rose from 0.1% to 0.3%, attention recommended.", severity: "info", assignedTo: "Data Platform Team", createdAt: "2026-04-01 22:00", status: "resolved" }
];

const statusCfg = {
  pass: { color: "green" as const, label: "Pass" },
  fail: { color: "red" as const, label: "Fail" },
  warning: { color: "orange" as const, label: "Warning" }
};

const severityCfg = {
  critical: { color: "red" as const, label: "Critical" },
  warning: { color: "orange" as const, label: "Warning" },
  info: { color: "blue" as const, label: "Info" }
};

function DataQualityPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Data Quality & Profiling</Heading>
          <Text size="2" color="gray">
            Automated profiling, declarative tests, and intelligent alerts for trusted data.
          </Text>
        </Box>
        <Flex gap="2">
          <Button>+ Create Quality Rule</Button>
          <Button variant="outline"><TimerIcon /> Trigger Scan</Button>
        </Flex>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
          ["Quality Rules", `${qualityRules.length}`, "Configured validation rules"],
          ["Today's Pass Rate", "80%", `${qualityRules.filter(r => r.status === "pass").length}/${qualityRules.length} rules passed`],
          ["Active Alerts", `${alertItems.filter(a => a.status === "open").length}`, "Unresolved quality alerts"],
          ["Last Scan", "5 min ago", "Most recent full profiling run"]
        ].map(([title, value, desc]) => (
          <Card key={title} className="radix-surface">
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">{title}</Text>
              <Heading size="7">{value}</Heading>
              <Text size="1" color="gray">{desc}</Text>
            </Flex>
          </Card>
        ))}
      </section>

      <Card size="3" className="panel radix-surface" mb="3">
        <Flex justify="between" align="center" mb="3">
          <Heading size="5"><BarChartIcon /> Profiling Results</Heading>
          <Button variant="soft" color="gray" size="1">Refresh</Button>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Table</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Total Rows</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Null Rate</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Cardinality</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Scan</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {profilingResults.map((p) => (
              <Table.Row key={p.table}>
                <Table.RowHeaderCell><Text weight="bold">{p.table}</Text></Table.RowHeaderCell>
                <Table.Cell><Text size="2">{p.totalRows}</Text></Table.Cell>
                <Table.Cell>
                  <Flex align="center" gap="2">
                    <Progress value={100 - p.nullRate} size="1" style={{ width: 80 }} color={p.nullRate > 5 ? "red" : p.nullRate > 1 ? "orange" : "green"} />
                    <Text size="2">{p.nullRate.toFixed(1)}%</Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell><Text size="2">{p.cardinality.toLocaleString()}</Text></Table.Cell>
                <Table.Cell><Text size="2" color="gray">{p.lastScan}</Text></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>

      <Card size="3" className="panel radix-surface" mb="3">
        <Flex justify="between" align="center" mb="3">
          <Heading size="5">Quality Rules</Heading>
          <Flex gap="2">
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Status" />
              <Select.Content>
                <Select.Item value="all">All</Select.Item>
                <Select.Item value="pass">Pass</Select.Item>
                <Select.Item value="fail">Fail</Select.Item>
                <Select.Item value="warning">Warning</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Rule Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Target Table</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Threshold</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Pass Rate</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Run</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {qualityRules.map((r) => {
              const cfg = statusCfg[r.status];
              return (
                <Table.Row key={r.id}>
                  <Table.RowHeaderCell><Text size="2" color="gray">{r.id}</Text></Table.RowHeaderCell>
                  <Table.Cell><Text weight="bold">{r.name}</Text></Table.Cell>
                  <Table.Cell><Badge variant="soft" color="blue">{r.table}</Badge></Table.Cell>
                  <Table.Cell><Badge variant="outline">{r.type}</Badge></Table.Cell>
                  <Table.Cell><Text size="2">{r.threshold}</Text></Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Progress value={r.passRate} size="1" style={{ width: 60 }} color={r.passRate >= 99 ? "green" : r.passRate >= 95 ? "orange" : "red"} />
                      <Text size="2">{r.passRate.toFixed(1)}%</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell><Text size="2" color="gray">{r.lastRun}</Text></Table.Cell>
                  <Table.Cell><Badge color={cfg.color}>{cfg.label}</Badge></Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card>

      <Card size="3" className="panel radix-surface">
        <Flex justify="between" align="center" mb="3">
          <Heading size="5"><BellIcon /> Quality Alerts</Heading>
          <Badge color="red" size="2">{alertItems.filter(a => a.status === "open").length} Open</Badge>
        </Flex>
        <Separator my="2" size="4" />
        {alertItems.map((a) => {
          const scfg = severityCfg[a.severity];
          return (
            <Card key={a.id} size="2" mb="2" style={{ borderColor: a.severity === "critical" ? "var(--red-6)" : a.severity === "warning" ? "var(--orange-6)" : undefined }}>
              <Flex justify="between" align="center">
                <Flex gap="3" align="start">
                  <Badge color={scfg.color}>{scfg.label}</Badge>
                  <Box>
                    <Flex align="center" gap="2" mb="1">
                      <Text weight="bold">{a.id}</Text>
                      <Badge variant="soft" color="blue">{a.rule}</Badge>
                      <Badge variant="outline">{a.table}</Badge>
                    </Flex>
                    <Text size="2" color="gray">{a.message}</Text>
                    <Text size="1" color="gray" mt="1">Assigned to: {a.assignedTo} · {a.createdAt}</Text>
                  </Box>
                </Flex>
                <Badge color={a.status === "resolved" ? "green" : a.status === "acked" ? "orange" : "red"}>
                  {a.status === "open" ? "Open" : a.status === "acked" ? "Acknowledged" : "Resolved"}
                </Badge>
              </Flex>
            </Card>
          );
        })}
      </Card>
    </Box>
  );
}

export default DataQualityPage;
