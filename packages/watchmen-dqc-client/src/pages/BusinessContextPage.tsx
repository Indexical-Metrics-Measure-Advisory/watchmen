import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Tabs } from "@radix-ui/themes";
import {
  BookmarkIcon,
  PlusIcon,
  CheckCircledIcon,
  ClockIcon,
  MinusCircledIcon,
  ArrowRightIcon,
  LockClosedIcon,
  InfoCircledIcon
} from "@radix-ui/react-icons";

type GlossaryTerm = {
  term: string;
  category: string;
  definition: string;
  owner: string;
  relatedTerms: string[];
  status: "approved" | "draft" | "pending";
};

type ClassificationItem = {
  name: string;
  description: string;
  level: "public" | "internal" | "confidential" | "restricted";
  assetCount: number;
};

const glossaryTerms: GlossaryTerm[] = [
  { term: "GWP (Gross Written Premium)", category: "Financial Metric", definition: "Total premium written by the insurer before reinsurance ceding.", owner: "Actuarial Team", relatedTerms: ["NWP", "Earned Premium"], status: "approved" },
  { term: "Claim Frequency", category: "Risk Metric", definition: "Number of claims per 100 policies in a period, used for exposure assessment.", owner: "Risk Team", relatedTerms: ["Severity", "Loss Ratio"], status: "approved" },
  { term: "Policyholder", category: "Business Entity", definition: "The legal person or entity that signs the policy and pays the premium.", owner: "Policy Team", relatedTerms: ["Insured", "Beneficiary"], status: "draft" },
  { term: "Loss Ratio", category: "Financial Metric", definition: "Incurred claims divided by net premium, a key underwriting performance metric.", owner: "Finance Team", relatedTerms: ["Combined Ratio", "GWP"], status: "pending" },
  { term: "NWP (Net Written Premium)", category: "Financial Metric", definition: "Net written premium equal to GWP minus ceded reinsurance premium.", owner: "Actuarial Team", relatedTerms: ["GWP"], status: "approved" },
  { term: "Combined Ratio", category: "Financial Metric", definition: "Combined ratio = (incurred claims + underwriting expense) / net earned premium.", owner: "Finance Team", relatedTerms: ["Loss Ratio", "Expense Ratio"], status: "approved" }
];

const classifications: ClassificationItem[] = [
  { name: "Public", description: "Externally publishable data such as product descriptions and stats", level: "public", assetCount: 120 },
  { name: "Internal", description: "Internal-use data not intended for public access", level: "internal", assetCount: 456 },
  { name: "Confidential", description: "Sensitive data available only to authorized users", level: "confidential", assetCount: 234 },
  { name: "Restricted / PII", description: "Strictly protected personal data requiring dynamic masking", level: "restricted", assetCount: 89 }
];

const levelColors = {
  public: "green" as const,
  internal: "blue" as const,
  confidential: "orange" as const,
  restricted: "red" as const,
};

const levelLabels = {
  public: "Public",
  internal: "Internal",
  confidential: "Confidential",
  restricted: "Restricted / PII",
};

const statusConfig = {
  approved: { icon: CheckCircledIcon, color: "green" as const, label: "Approved" },
  draft: { icon: ClockIcon, color: "gray" as const, label: "Draft" },
  pending: { icon: InfoCircledIcon, color: "orange" as const, label: "Pending Review" },
};

function BusinessContextPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Business Context</Heading>
          <Text size="2" color="gray">
            Standardize glossary terms, taxonomy tags, and governance tiers to reduce ambiguity.
          </Text>
        </Box>
        <Flex gap="2">
          <Button>+ New Term</Button>
          <Button variant="outline">Export Glossary</Button>
        </Flex>
      </Flex>

      <Tabs.Root defaultValue="glossary">
        <Tabs.List>
          <Tabs.Trigger value="glossary">
            <BookmarkIcon /> Glossary ({glossaryTerms.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="classification">
            <LockClosedIcon /> Classification ({classifications.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="tiering">
            Tier Governance
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="glossary" mt="3">
          <Flex gap="3" mb="4">
            <Box style={{ flex: 1 }}>
              <TextField.Root placeholder="Search terms..." size="3" />
            </Box>
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Status" />
              <Select.Content>
                <Select.Item value="all">All Status</Select.Item>
                <Select.Item value="approved">Approved</Select.Item>
                <Select.Item value="draft">Draft</Select.Item>
                <Select.Item value="pending">Pending Review</Select.Item>
              </Select.Content>
            </Select.Root>
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Category" />
              <Select.Content>
                <Select.Item value="all">All Categories</Select.Item>
                <Select.Item value="finance">Financial Metric</Select.Item>
                <Select.Item value="risk">Risk Metric</Select.Item>
                <Select.Item value="entity">Business Entity</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Card size="3" className="panel radix-surface">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Term</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Definition</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Related Terms</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {glossaryTerms.map((t) => {
                  const cfg = statusConfig[t.status];
                  return (
                    <Table.Row key={t.term}>
                      <Table.RowHeaderCell>
                        <Text weight="bold">{t.term}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell><Badge variant="soft" color="violet">{t.category}</Badge></Table.Cell>
                      <Table.Cell><Text size="2">{t.definition}</Text></Table.Cell>
                      <Table.Cell><Text size="2">{t.owner}</Text></Table.Cell>
                      <Table.Cell>
                        <Flex gap="1" wrap="wrap">
                          {t.relatedTerms.map((rt) => (
                            <Badge key={rt} variant="outline" size="1">{rt}</Badge>
                          ))}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={cfg.color}>
                          <cfg.icon /> {cfg.label}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="classification" mt="3">
          <section className="kpi-grid" style={{ marginBottom: "16px" }}>
            {classifications.map((c) => (
              <Card key={c.name} className="radix-surface">
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Badge color={levelColors[c.level]} size="2">{levelLabels[c.level]}</Badge>
                    <Text size="2" color="gray">{c.assetCount} assets</Text>
                  </Flex>
                  <Heading size="5">{c.name}</Heading>
                  <Text size="2" color="gray">{c.description}</Text>
                </Flex>
              </Card>
            ))}
          </section>
        </Tabs.Content>

        <Tabs.Content value="tiering" mt="3">
          <section className="tier-grid">
            {[
              { tier: "Tier 1", label: "Critical Assets", color: "red" as const, count: 86, desc: "Mission-critical assets with highest governance priority. Owner assignment and approval are mandatory.", examples: "dim_customer, fact_transaction, risk_score_model_output" },
              { tier: "Tier 2", label: "Important Assets", color: "orange" as const, count: 234, desc: "Important assets requiring periodic quality checks and documentation upkeep.", examples: "policy_master_view, claim_event_stream" },
              { tier: "Tier 3", label: "Standard Assets", color: "gray" as const, count: 927, desc: "General assets managed on demand.", examples: "quotation_summary, temp_staging_*" }
            ].map((t) => (
              <Card key={t.tier} size="3" className="radix-surface tier-card">
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Flex align="center" gap="2">
                      <Heading size="5">{t.tier}</Heading>
                      <Badge color={t.color}>{t.label}</Badge>
                    </Flex>
                    <Text size="3" weight="bold">{t.count}</Text>
                  </Flex>
                  <Text size="2" color="gray">{t.desc}</Text>
                  <Separator size="4" />
                  <Box>
                    <Text size="1" color="gray" weight="bold">Example Assets</Text>
                    <Text size="2" mt="1">{t.examples}</Text>
                  </Box>
                </Flex>
              </Card>
            ))}
          </section>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

export default BusinessContextPage;
