import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Progress, Callout } from "@radix-ui/themes";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  InfoCircledIcon,
  ReloadIcon,
  LightningBoltIcon,
  PlayIcon,
  ClockIcon,
  TimerIcon
} from "@radix-ui/react-icons";

type Checkpoint = {
  id: string;
  name: string;
  description: string;
  expectationCount: number;
  runCount: number;
  lastRun: string;
  lastStatus: "pass" | "fail" | "warning" | "none";
  runFrequency: string;
  nextScheduledRun: string;
  createdBy: string;
};

type RunHistory = {
  runId: string;
  checkpointName: string;
  status: "pass" | "fail" | "warning";
  runAt: string;
  durationSec: number;
  successRate: string;
  errorMessage?: string;
};

const checkpoints: Checkpoint[] = [
  {
    id: "cp-001",
    name: "dim_customer_quality_checkpoint",
    description: "Validates all critical expectations for customer dimension table",
    expectationCount: 8,
    runCount: 156,
    lastRun: "2026-04-02 22:00",
    lastStatus: "pass",
    runFrequency: "DAILY",
    nextScheduledRun: "2026-04-03 22:00",
    createdBy: "data_engineer_01"
  },
  {
    id: "cp-002",
    name: "fact_transaction_freshness_checkpoint",
    description: "Monitors transaction data freshness and volume anomaly detection",
    expectationCount: 5,
    runCount: 430,
    lastRun: "2026-04-02 23:00",
    lastStatus: "fail",
    runFrequency: "HOURLY",
    nextScheduledRun: "2026-04-03 00:00",
    createdBy: "data_engineer_02"
  },
  {
    id: "cp-003",
    name: "policy_master_completeness_checkpoint",
    description: "Ensures policy master view meets completeness thresholds",
    expectationCount: 6,
    runCount: 89,
    lastRun: "2026-04-02 21:00",
    lastStatus: "warning",
    runFrequency: "DAILY",
    nextScheduledRun: "2026-04-03 21:00",
    createdBy: "risk_analyst_01"
  },
  {
    id: "cp-004",
    name: "fact_claims_reconciliation_checkpoint",
    description: "Reconciles claim facts against source ledger systems",
    expectationCount: 11,
    runCount: 45,
    lastRun: "2026-04-01 06:00",
    lastStatus: "pass",
    runFrequency: "WEEKLY",
    nextScheduledRun: "2026-04-08 06:00",
    createdBy: "actuarial_team"
  }
];

const runHistory: RunHistory[] = [
  { runId: "run-1001", checkpointName: "fact_transaction_freshness_checkpoint", status: "fail", runAt: "2026-04-02 23:00", durationSec: 14, successRate: "82.3%", errorMessage: "Volume dropped below 95% threshold" },
  { runId: "run-1000", checkpointName: "dim_customer_quality_checkpoint", status: "pass", runAt: "2026-04-02 22:00", durationSec: 23, successRate: "100%" },
  { runId: "run-0999", checkpointName: "policy_master_completeness_checkpoint", status: "warning", runAt: "2026-04-02 21:00", durationSec: 18, successRate: "97.2%" },
  { runId: "run-0998", checkpointName: "fact_transaction_freshness_checkpoint", status: "pass", runAt: "2026-04-02 22:00", durationSec: 12, successRate: "99.1%" },
  { runId: "run-0997", checkpointName: "fact_claims_reconciliation_checkpoint", status: "pass", runAt: "2026-04-01 06:00", durationSec: 45, successRate: "100%" }
];

const statusCfg = {
  pass: { color: "green" as const, label: "Pass", icon: CheckCircledIcon },
  fail: { color: "red" as const, label: "Fail", icon: CrossCircledIcon },
  warning: { color: "orange" as const, label: "Warning", icon: InfoCircledIcon },
  none: { color: "gray" as const, label: "Never Run", icon: ClockIcon }
};

function CheckpointsPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Checkpoints</Heading>
          <Text size="2" color="gray">
            Batches of Expectations bundled together and executed on a schedule or on-demand.
          </Text>
        </Box>
        <Flex gap="2">
          <Button variant="outline"><PlusIcon /> New Checkpoint</Button>
          <Button><PlayIcon /> Run All Checkpoints</Button>
        </Flex>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
          ["Total Checkpoints", `${checkpoints.length}`, "Configured validation batches"],
          ["Passing", `${checkpoints.filter(c => c.lastStatus === "pass").length}`, "Checkpoints passing all Expectations"],
          ["Failing", `${checkpoints.filter(c => c.lastStatus === "fail").length}`, "Need immediate investigation"],
          ["Warnings", `${checkpoints.filter(c => c.lastStatus === "warning").length}`, "Partially met thresholds"]
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
          <Heading size="5">Checkpoint List</Heading>
          <Flex gap="2">
            <TextField.Root placeholder="Search checkpoints..." size="2">
              <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
            </TextField.Root>
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Status" />
              <Select.Content>
                <Select.Item value="all">All Status</Select.Item>
                <Select.Item value="pass">Pass</Select.Item>
                <Select.Item value="fail">Fail</Select.Item>
                <Select.Item value="warning">Warning</Select.Item>
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
              <Table.ColumnHeaderCell>Expectations</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Frequency</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Run</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Next Scheduled</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {checkpoints.map((cp) => {
              const cfg = statusCfg[cp.lastStatus];
              return (
                <Table.Row key={cp.id}>
                  <Table.RowHeaderCell>
                    <Box>
                      <Text weight="bold">{cp.name}</Text>
                      <Text size="1" color="gray">{cp.description}</Text>
                    </Box>
                  </Table.RowHeaderCell>
                  <Table.Cell><Badge variant="soft" color="blue">{cp.expectationCount}</Badge></Table.Cell>
                  <Table.Cell><Badge variant="outline">{cp.runFrequency}</Badge></Table.Cell>
                  <Table.Cell><Text size="2" color="gray">{cp.lastRun}</Text></Table.Cell>
                  <Table.Cell>
                    <Badge color={cfg.color}><cfg.icon /> {cfg.label}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="1">
                      <TimerIcon width={12} height={12} />
                      <Text size="2">{cp.nextScheduledRun}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1">
                      <Button variant="soft" size="1"><PlayIcon /> Run</Button>
                      <Button variant="outline" size="1">Edit</Button>
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
            <ClockIcon />
            <Heading size="5">Recent Run History</Heading>
          </Flex>
          <Button variant="soft" color="gray" size="1"><ReloadIcon /> View All Runs</Button>
        </Flex>
        <Separator mb="3" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Run ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Checkpoint</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Run At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Duration</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Success Rate</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {runHistory.map((run) => {
              const cfg = statusCfg[run.status];
              return (
                <Table.Row key={run.runId}>
                  <Table.Cell><Text size="2" color="gray">{run.runId}</Text></Table.Cell>
                  <Table.Cell><Text size="2">{run.checkpointName}</Text></Table.Cell>
                  <Table.Cell><Badge color={cfg.color}><cfg.icon /> {cfg.label}</Badge></Table.Cell>
                  <Table.Cell><Text size="2" color="gray">{run.runAt}</Text></Table.Cell>
                  <Table.Cell><Text size="2">{run.durationSec}s</Text></Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Progress value={parseFloat(run.successRate)} size="1" style={{ width: 60 }} color={run.successRate === "100%" ? "green" : "orange"} />
                      <Text size="2">{run.successRate}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    {run.errorMessage
                      ? <Text size="1" color="red">{run.errorMessage}</Text>
                      : <Text size="1" color="gray">—</Text>
                    }
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
}

export default CheckpointsPage;
