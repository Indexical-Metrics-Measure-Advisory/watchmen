import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Tabs } from "@radix-ui/themes";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  ComponentNoneIcon,
  BarChartIcon,
  LockClosedIcon,
  GroupIcon,
  ChatBubbleIcon,
  BellIcon,
  CheckCircledIcon,
  ClockIcon,
  InfoCircledIcon,
  ReloadIcon
} from "@radix-ui/react-icons";

type Asset = {
  name: string;
  type: string;
  source: string;
  owner: string;
  tier: string;
  tags: string[];
  lastUpdated: string;
};

type GlossaryItem = {
  term: string;
  definition: string;
  owner: string;
  status: "approved" | "draft" | "pending";
};

const assets: Asset[] = [
  { name: "dim_customer", type: "Table", source: "Snowflake · ANALYTICS_DB", owner: "Data Platform Team", tier: "Tier 1", tags: ["PII", "Core"], lastUpdated: "2026-04-02" },
  { name: "fact_transaction", type: "Table", source: "Snowflake · ANALYTICS_DB", owner: "Finance Team", tier: "Tier 1", tags: ["Core", "Financial"], lastUpdated: "2026-04-01" },
  { name: "policy_master_view", type: "View", source: "BigQuery · INSIGHTS_WAREHOUSE", owner: "Policy Team", tier: "Tier 2", tags: ["Insurance", "Internal"], lastUpdated: "2026-03-30" },
  { name: "claim_event_stream", type: "Topic", source: "Kafka · CLAIM_EVENTS", owner: "Claims Team", tier: "Tier 2", tags: ["Streaming", "Internal"], lastUpdated: "2026-03-29" },
  { name: "risk_score_model_output", type: "Table", source: "Snowflake · ML_RESULTS", owner: "Risk Team", tier: "Tier 1", tags: ["ML", "Confidential"], lastUpdated: "2026-04-02" },
  { name: "quotation_summary", type: "View", source: "BigQuery · INSIGHTS_WAREHOUSE", owner: "Actuarial Team", tier: "Tier 3", tags: ["Insurance"], lastUpdated: "2026-03-28" }
];

const glossaryItems: GlossaryItem[] = [
  { term: "GWP (Gross Written Premium)", definition: "Total premium amount written by the insurer before any reinsurance ceding.", owner: "Actuarial Team", status: "approved" },
  { term: "Claim Frequency", definition: "Number of claim events per 100 policies in a period, used to measure exposure risk.", owner: "Risk Team", status: "approved" },
  { term: "Policyholder", definition: "The legal entity or person who signs the policy contract and pays the premium.", owner: "Policy Team", status: "draft" },
  { term: "Loss Ratio", definition: "Ratio of incurred claims to net premium, used to evaluate underwriting performance.", owner: "Finance Team", status: "pending" }
];

function CatalogPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Unified Data Catalog</Heading>
          <Text size="2" color="gray">
            Search and manage enterprise data assets with multi-source integration and version tracking.
          </Text>
        </Box>
        <Button>+ Register New Asset</Button>
      </Flex>

      <Flex gap="3" mb="4">
        <Box style={{ flex: 1 }}>
          <TextField.Root placeholder="Search assets (table, tag, owner)..." size="3">
            <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
          </TextField.Root>
        </Box>
        <Select.Root defaultValue="all">
          <Select.Trigger placeholder="Data Source" />
          <Select.Content>
            <Select.Item value="all">All Sources</Select.Item>
            <Select.Item value="snowflake">Snowflake</Select.Item>
            <Select.Item value="bigquery">BigQuery</Select.Item>
            <Select.Item value="kafka">Kafka</Select.Item>
          </Select.Content>
        </Select.Root>
        <Select.Root defaultValue="all">
          <Select.Trigger placeholder="Tier" />
          <Select.Content>
            <Select.Item value="all">All Tiers</Select.Item>
            <Select.Item value="tier1">Tier 1 · Critical</Select.Item>
            <Select.Item value="tier2">Tier 2 · Important</Select.Item>
            <Select.Item value="tier3">Tier 3 · Standard</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
              ["Total Assets", "1,247", "Registered and cataloged assets"],
              ["Tier 1 Assets", "86", "Mission-critical data assets"],
              ["Integrated Sources", "12", "Connected data platforms"],
              ["Weekly Changes", "34", "Schema change records"]
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

      <Card size="3" className="panel radix-surface">
        <Flex justify="between" align="center" mb="3">
          <Heading size="5">Asset List</Heading>
          <Flex gap="2">
            <Button variant="soft" color="gray" size="1"><ReloadIcon /> Refresh</Button>
            <Button variant="outline" size="1">Export CSV</Button>
          </Flex>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Asset Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Source</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Tier</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Tags</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Last Updated</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {assets.map((a) => (
              <Table.Row key={a.name}>
                <Table.RowHeaderCell>
                  <Flex align="center" gap="2">
                    <CubeIcon />
                    <Box>
                      <Text weight="bold">{a.name}</Text>
                    </Box>
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell><Badge variant="soft" color="blue">{a.type}</Badge></Table.Cell>
                <Table.Cell><Text size="2">{a.source}</Text></Table.Cell>
                <Table.Cell><Text size="2">{a.owner}</Text></Table.Cell>
                <Table.Cell>
                  <Badge color={a.tier === "Tier 1" ? "red" : a.tier === "Tier 2" ? "orange" : "gray"}>
                    {a.tier}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="1" wrap="wrap">
                    {a.tags.map((t) => (
                      <Badge key={t} variant="outline" color="gray" size="1">{t}</Badge>
                    ))}
                  </Flex>
                </Table.Cell>
                <Table.Cell><Text size="2" color="gray">{a.lastUpdated}</Text></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
}

export default CatalogPage;
