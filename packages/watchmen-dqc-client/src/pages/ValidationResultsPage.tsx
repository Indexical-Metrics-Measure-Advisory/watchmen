import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Progress, AlertDialog } from "@radix-ui/themes";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  ReloadIcon,
  DownloadIcon,
  EyeOpenIcon,
  LightningBoltIcon,
  BarChartIcon
} from "@radix-ui/react-icons";

type ValidationResult = {
  runId: string;
  checkpoint: string;
  batchId: string;
  runAt: string;
  status: "passed" | "failed" | "warning" | "ran_with_success";
  totalExpectations: number;
  successfulExpectations: number;
  failedExpectations: number;
  successPercent: number;
  durationSec: number;
  dataAsset: string;
  resultUrl?: string;
};

type FailedExpectation = {
  expectationId: string;
  expectationType: string;
  column?: string;
  table: string;
  observedValue?: string;
  threshold?: string;
  unexpectedCount: number;
  unexpectedPercent: number;
  exceptionMessage?: string;
};

const validationResults: ValidationResult[] = [
  {
    runId: "vr-20260402-001",
    checkpoint: "dim_customer_quality_checkpoint",
    batchId: "batch-20260402-2200",
    runAt: "2026-04-02 22:00",
    status: "passed",
    totalExpectations: 8,
    successfulExpectations: 8,
    failedExpectations: 0,
    successPercent: 100,
    durationSec: 23,
    dataAsset: "public.dim_customer",
    resultUrl: "/data-docs/validation/vr-20260402-001"
  },
  {
    runId: "vr-20260402-002",
    checkpoint: "fact_transaction_freshness_checkpoint",
    batchId: "batch-20260402-2300",
    runAt: "2026-04-02 23:00",
    status: "failed",
    totalExpectations: 5,
    successfulExpectations: 4,
    failedExpectations: 1,
    successPercent: 80,
    durationSec: 14,
    dataAsset: "public.fact_transaction",
    resultUrl: "/data-docs/validation/vr-20260402-002"
  },
  {
    runId: "vr-20260402-003",
    checkpoint: "policy_master_completeness_checkpoint",
    batchId: "batch-20260402-2100",
    runAt: "2026-04-02 21:00",
    status: "warning",
    totalExpectations: 6,
    successfulExpectations: 5,
    failedExpectations: 1,
    successPercent: 83.3,
    durationSec: 18,
    dataAsset: "public.policy_master_view",
    resultUrl: "/data-docs/validation/vr-20260402-003"
  },
  {
    runId: "vr-20260401-001",
    checkpoint: "fact_claims_reconciliation_checkpoint",
    batchId: "batch-20260401-0600",
    runAt: "2026-04-01 06:00",
    status: "ran_with_success",
    totalExpectations: 11,
    successfulExpectations: 11,
    failedExpectations: 0,
    successPercent: 100,
    durationSec: 45,
    dataAsset: "public.fact_claims"
  }
];

const failedExpectations: FailedExpectation[] = [
  {
    expectationId: "exp-004",
    expectationType: "expect_column_proportion_of_unique_values_to_be_between",
    column: "claim_id",
    table: "fact_claims",
    observedValue: "0.942",
    threshold: ">= 0.95",
    unexpectedCount: 2847,
    unexpectedPercent: 5.8,
    exceptionMessage: "Proportion of unique values is 0.942, which is below the minimum threshold of 0.95"
  },
  {
    expectationId: "exp-003",
    expectationType: "expect_column_values_to_be_in_set",
    column: "policy_status",
    table: "policy_master_view",
    observedValue: "UNKNOWN value found",
    threshold: "only [ACTIVE, LAPSED, SURRENDERED, CLAIMED]",
    unexpectedCount: 12450,
    unexpectedPercent: 2.2
  }
];

const statusCfg = {
  passed: { color: "green" as const, label: "Passed", icon: CheckCircledIcon },
  failed: { color: "red" as const, label: "Failed", icon: CrossCircledIcon },
  warning: { color: "orange" as const, label: "Warning", icon: InfoCircledIcon },
  ran_with_success: { color: "blue" as const, label: "Ran (Success)", icon: CheckCircledIcon }
};

function ValidationResultsPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Validation Results</Heading>
          <Text size="2" color="gray">
            Detailed outcomes from Checkpoint runs, including per-expectation pass/fail breakdowns.
          </Text>
        </Box>
        <Flex gap="2">
          <Button variant="outline"><LightningBoltIcon /> Re-run Failed Checkpoints</Button>
          <Button variant="outline"><DownloadIcon /> Export Results (JSON)</Button>
          <Button variant="outline"><BarChartIcon /> Trend Analysis</Button>
        </Flex>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
          ["Total Runs (30d)", "1,247", "All Checkpoint executions"],
          ["Passed", `${validationResults.filter(r => r.status === "passed").length + validationResults.filter(r => r.status === "ran_with_success").length}`, "Fully satisfied all Expectations"],
          ["Failed", `${validationResults.filter(r => r.status === "failed").length}`, "At least one Expectation violated"],
          ["Avg Success Rate", "96.8%", "Across all Checkpoints this month"]
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
          <Heading size="5">Validation Run History</Heading>
          <Flex gap="2">
            <TextField.Root placeholder="Search by checkpoint, asset..." size="2">
              <LightningBoltIcon />
            </TextField.Root>
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Status" />
              <Select.Content>
                <Select.Item value="all">All Status</Select.Item>
                <Select.Item value="passed">Passed</Select.Item>
                <Select.Item value="failed">Failed</Select.Item>
                <Select.Item value="warning">Warning</Select.Item>
              </Select.Content>
            </Select.Root>
            <Select.Root defaultValue="30d">
              <Select.Trigger placeholder="Time Range" />
              <Select.Content>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
              </Select.Content>
            </Select.Root>
            <Button variant="soft" color="gray" size="1"><ReloadIcon /></Button>
          </Flex>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Run ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Checkpoint</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Data Asset</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Run At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Expectations</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Success Rate</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {validationResults.map((vr) => {
              const cfg = statusCfg[vr.status];
              return (
                <Table.Row key={vr.runId}>
                  <Table.Cell><Text size="2" color="gray">{vr.runId}</Text></Table.Cell>
                  <Table.Cell><Text weight="medium">{vr.checkpoint}</Text></Table.Cell>
                  <Table.Cell><Badge variant="soft" color="purple">{vr.dataAsset}</Badge></Table.Cell>
                  <Table.Cell><Text size="2" color="gray">{vr.runAt}</Text></Table.Cell>
                  <Table.Cell><Text size="2">{vr.durationSec}s</Text></Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="1">
                      <Text size="2" color="green">{vr.successfulExpectations}</Text>
                      <Text size="2" color="gray">/</Text>
                      <Text size="2" color="red">{vr.failedExpectations}</Text>
                      <Text size="2" color="gray">/{vr.totalExpectations}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Progress
                        value={vr.successPercent}
                        size="1"
                        style={{ width: 80 }}
                        color={vr.successPercent === 100 ? "green" : vr.successPercent >= 95 ? "orange" : "red"}
                      />
                      <Text size="2">{vr.successPercent}%</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell><Badge color={cfg.color}><cfg.icon /> {cfg.label}</Badge></Table.Cell>
                  <Table.Cell>
                    <Flex gap="1">
                      <Button variant="outline" size="1"><EyeOpenIcon /> View</Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card>

      <Card size="3" className="panel radix-surface">
        <Flex align="center" gap="2" mb="3">
          <CrossCircledIcon />
          <Heading size="5">Failed Expectation Details</Heading>
        </Flex>
        <Separator mb="3" size="4" />
        <Flex direction="column" gap="3">
          {failedExpectations.map((fe, idx) => (
            <Card key={idx} size="2" className="radix-surface" style={{ border: "1px solid var(--red-5)", backgroundColor: "var(--red-2)" }}>
              <Flex justify="between" align="start">
                <Box>
                  <Flex gap="2" align="center" mb="1">
                    <Badge variant="outline" color="blue">{fe.expectationType}</Badge>
                    <Text size="2" color="gray">Column: {fe.column} · Table: {fe.table}</Text>
                  </Flex>
                  <Text size="2">{fe.exceptionMessage}</Text>
                  <Flex gap="3" mt="2">
                    <Text size="1" color="gray">Unexpected: <Text weight="bold" color="red">{fe.unexpectedCount.toLocaleString()} ({fe.unexpectedPercent}%)</Text></Text>
                    <Text size="1" color="gray">Threshold: {fe.threshold}</Text>
                    <Text size="1" color="gray">Observed: {fe.observedValue}</Text>
                  </Flex>
                </Box>
                <Button variant="outline" size="1">Investigate</Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Card>
    </Box>
  );
}

export default ValidationResultsPage;
