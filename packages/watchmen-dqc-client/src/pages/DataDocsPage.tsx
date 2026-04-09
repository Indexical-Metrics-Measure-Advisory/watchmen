import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Progress, Tooltip } from "@radix-ui/themes";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  ReloadIcon,
  DownloadIcon,
  EyeOpenIcon,
  LightningBoltIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ClockIcon,
  UpdateIcon
} from "@radix-ui/react-icons";

type DataDoc = {
  id: string;
  name: string;
  type: "Validation Results" | "Expectation Suite" | "Profiling Report" | "Anomaly Report";
  generatedAt: string;
  assetName: string;
  size: string;
  status?: "pass" | "fail" | "warning";
  generatedBy: string;
};

type ProfilingSection = {
  table: string;
  totalRows: string;
  nullCounts: { column: string; nullCount: number; nullPercent: number }[];
  cardinality: { column: string; distinctCount: number }[];
  minMax: { column: string; min: string; max: string }[];
  lastUpdated: string;
};

const dataDocs: DataDoc[] = [
  {
    id: "dd-001",
    name: "dim_customer_profiling_20260402",
    type: "Profiling Report",
    generatedAt: "2026-04-02 22:00",
    assetName: "public.dim_customer",
    size: "2.3 MB",
    generatedBy: "auto-profiler"
  },
  {
    id: "dd-002",
    name: "fact_transaction_validation_20260402",
    type: "Validation Results",
    generatedAt: "2026-04-02 23:00",
    assetName: "public.fact_transaction",
    size: "856 KB",
    status: "fail",
    generatedBy: "fact_transaction_freshness_checkpoint"
  },
  {
    id: "dd-003",
    name: "dim_customer_quality_suite",
    type: "Expectation Suite",
    generatedAt: "2026-04-02 22:00",
    assetName: "public.dim_customer",
    size: "124 KB",
    status: "pass",
    generatedBy: "data_engineer_01"
  },
  {
    id: "dd-004",
    name: "policy_master_anomaly_report_202604",
    type: "Anomaly Report",
    generatedAt: "2026-04-02 21:00",
    assetName: "public.policy_master_view",
    size: "445 KB",
    status: "warning",
    generatedBy: "policy_master_completeness_checkpoint"
  },
  {
    id: "dd-005",
    name: "fact_claims_reconciliation_20260401",
    type: "Validation Results",
    generatedAt: "2026-04-01 06:00",
    assetName: "public.fact_claims",
    size: "1.1 MB",
    status: "pass",
    generatedBy: "fact_claims_reconciliation_checkpoint"
  }
];

const profilingData: ProfilingSection = {
  table: "public.dim_customer",
  totalRows: "2,345,678",
  nullCounts: [
    { column: "customer_id", nullCount: 0, nullPercent: 0.0 },
    { column: "customer_name", nullCount: 234, nullPercent: 0.01 },
    { column: "gender", nullCount: 1234, nullPercent: 0.05 },
    { column: "birth_date", nullCount: 8921, nullPercent: 0.38 },
    { column: "email", nullCount: 45678, nullPercent: 1.95 },
    { column: "mobile_phone", nullCount: 3456, nullPercent: 0.15 }
  ],
  cardinality: [
    { column: "customer_id", distinctCount: 2345678 },
    { column: "customer_name", distinctCount: 2103456 },
    { column: "gender", distinctCount: 3 },
    { column: "id_card_no", distinctCount: 2345621 },
    { column: "email", distinctCount: 2234567 }
  ],
  minMax: [
    { column: "age", min: "18", max: "95" },
    { column: "annual_income", min: "36000", max: "8500000" },
    { column: "customer_tenure_years", min: "0", max: "42" }
  ],
  lastUpdated: "2026-04-02 22:00"
};

const docTypeCfg = {
  "Validation Results": { color: "blue" as const },
  "Expectation Suite": { color: "green" as const },
  "Profiling Report": { color: "purple" as const },
  "Anomaly Report": { color: "orange" as const }
};

function DataDocsPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Data Docs</Heading>
          <Text size="2" color="gray">
            Human-readable data quality reports generated from validation runs and profiling.
          </Text>
        </Box>
        <Flex gap="2">
          <Button variant="outline"><LightningBoltIcon /> Generate New Doc</Button>
          <Button variant="outline"><DownloadIcon /> Export All (HTML)</Button>
        </Flex>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
          ["Total Docs", `${dataDocs.length}`, "Stored documentation pages"],
          ["Validation Docs", `${dataDocs.filter(d => d.type === "Validation Results").length}`, "From Checkpoint runs"],
          ["Profiling Reports", `${dataDocs.filter(d => d.type === "Profiling Report").length}`, "Automated data profiling"],
          ["Auto-updated", "Daily", "At 22:00 UTC each day"]
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
          <Heading size="5">Documentation List</Heading>
          <Flex gap="2">
            <TextField.Root placeholder="Search docs..." size="2">
              <TextField.Slot><FileTextIcon /></TextField.Slot>
            </TextField.Root>
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Type" />
              <Select.Content>
                <Select.Item value="all">All Types</Select.Item>
                <Select.Item value="Validation Results">Validation Results</Select.Item>
                <Select.Item value="Expectation Suite">Expectation Suite</Select.Item>
                <Select.Item value="Profiling Report">Profiling Report</Select.Item>
                <Select.Item value="Anomaly Report">Anomaly Report</Select.Item>
              </Select.Content>
            </Select.Root>
            <Button variant="soft" color="gray" size="1"><ReloadIcon /></Button>
          </Flex>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Data Asset</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Generated At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Generated By</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Size</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {dataDocs.map((doc) => {
              const cfg = docTypeCfg[doc.type];
              return (
                <Table.Row key={doc.id}>
                  <Table.RowHeaderCell>
                    <Flex align="center" gap="2">
                      <FileTextIcon />
                      <Text weight="medium">{doc.name}</Text>
                    </Flex>
                  </Table.RowHeaderCell>
                  <Table.Cell><Badge variant="outline" color={cfg.color}>{doc.type}</Badge></Table.Cell>
                  <Table.Cell><Badge variant="soft" color="purple">{doc.assetName}</Badge></Table.Cell>
                  <Table.Cell><Text size="2" color="gray">{doc.generatedAt}</Text></Table.Cell>
                  <Table.Cell><Text size="2">{doc.generatedBy}</Text></Table.Cell>
                  <Table.Cell><Text size="2" color="gray">{doc.size}</Text></Table.Cell>
                  <Table.Cell>
                    {doc.status
                      ? <Badge color={doc.status === "pass" ? "green" : doc.status === "fail" ? "red" : "orange"}>
                          {doc.status === "pass" ? <CheckCircledIcon /> : doc.status === "fail" ? <CrossCircledIcon /> : <InfoCircledIcon />}
                          {doc.status.toUpperCase()}
                        </Badge>
                      : <Text size="2" color="gray">—</Text>
                    }
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1">
                      <Button variant="outline" size="1"><EyeOpenIcon /> View</Button>
                      <Button variant="soft" size="1"><ExternalLinkIcon /></Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card>

      <Card size="3" className="panel radix-surface">
        <Flex justify="between" align="center" mb="3">
          <Flex align="center" gap="2">
            <FileTextIcon />
            <Heading size="5">Sample Profiling Report: public.dim_customer</Heading>
          </Flex>
          <Flex gap="2">
            <Button variant="soft" size="1"><UpdateIcon /> Refresh</Button>
            <Button variant="outline" size="1"><DownloadIcon /> Export HTML</Button>
          </Flex>
        </Flex>
        <Separator mb="3" size="4" />

        <Flex gap="4" mb="4">
          <Card size="2" className="radix-surface">
            <Text size="2" color="gray">Total Rows</Text>
            <Heading size="6">{profilingData.totalRows}</Heading>
          </Card>
          <Card size="2" className="radix-surface">
            <Text size="2" color="gray">Last Profiled</Text>
            <Heading size="6">{profilingData.lastUpdated}</Heading>
          </Card>
          <Card size="2" className="radix-surface">
            <Text size="2" color="gray">Columns Analyzed</Text>
            <Heading size="6">{profilingData.nullCounts.length}</Heading>
          </Card>
        </Flex>

        <Heading size="4" mb="2">Null Value Analysis</Heading>
        <Table.Root mb="4">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Column</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Null Count</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Null %</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Health</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {profilingData.nullCounts.map((nc) => (
              <Table.Row key={nc.column}>
                <Table.Cell><Text weight="medium">{nc.column}</Text></Table.Cell>
                <Table.Cell><Text size="2">{nc.nullCount.toLocaleString()}</Text></Table.Cell>
                <Table.Cell><Text size="2">{nc.nullPercent.toFixed(2)}%</Text></Table.Cell>
                <Table.Cell>
                  <Progress
                    value={100 - nc.nullPercent}
                    size="1"
                    style={{ width: 100 }}
                    color={nc.nullPercent === 0 ? "green" : nc.nullPercent < 1 ? "orange" : "red"}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <Flex gap="4">
          <Box style={{ flex: 1 }}>
            <Heading size="4" mb="2">Cardinality</Heading>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Column</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Distinct Values</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {profilingData.cardinality.map((c) => (
                  <Table.Row key={c.column}>
                    <Table.Cell><Text size="2">{c.column}</Text></Table.Cell>
                    <Table.Cell><Text size="2">{c.distinctCount.toLocaleString()}</Text></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
          <Box style={{ flex: 1 }}>
            <Heading size="4" mb="2">Min / Max Ranges</Heading>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Column</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Min</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Max</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {profilingData.minMax.map((mm) => (
                  <Table.Row key={mm.column}>
                    <Table.Cell><Text size="2">{mm.column}</Text></Table.Cell>
                    <Table.Cell><Text size="2">{mm.min}</Text></Table.Cell>
                    <Table.Cell><Text size="2">{mm.max}</Text></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Flex>
      </Card>
    </Box>
  );
}

export default DataDocsPage;
