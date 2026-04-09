import { Badge, Box, Card, Flex, Heading, Text, Table, TextField, Select, Button, Separator, Tabs, Progress, Callout } from "@radix-ui/themes";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircledIcon,
  InfoCircledIcon,
  ReloadIcon,
  LightningBoltIcon,
  TrashIcon,
  CrossCircledIcon
} from "@radix-ui/react-icons";

type Expectation = {
  id: string;
  expectationType: string;
  column: string;
  table: string;
  kwargs: Record<string, any>;
  success: boolean;
  createdAt: string;
  createdBy: string;
  description: string;
};

const mockExpectations: Expectation[] = [
  {
    id: "exp-001",
    expectationType: "expect_column_values_to_not_be_null",
    column: "customer_id",
    table: "dim_customer",
    kwargs: { mostly: 0.99 },
    success: true,
    createdAt: "2026-03-15",
    createdBy: "data_engineer_01",
    description: "Ensures customer_id column has less than 1% null values"
  },
  {
    id: "exp-002",
    expectationType: "expect_column_values_to_be_between",
    column: "transaction_amount",
    table: "fact_transaction",
    kwargs: { min_value: 0, max_value: 1000000, strict_min: false, strict_max: false },
    success: true,
    createdAt: "2026-03-18",
    createdBy: "data_engineer_02",
    description: "Validates transaction amounts are within valid financial range"
  },
  {
    id: "exp-003",
    expectationType: "expect_column_distinct_values_to_be_in_set",
    column: "policy_status",
    table: "policy_master_view",
    kwargs: { value_set: ["ACTIVE", "LAPSED", "SURRENDERED", "CLAIMED"] },
    success: true,
    createdAt: "2026-03-20",
    createdBy: "data_engineer_01",
    description: "Restricts policy status to known enumerated values only"
  },
  {
    id: "exp-004",
    expectationType: "expect_column_proportion_of_unique_values_to_be_between",
    column: "claim_id",
    table: "fact_claims",
    kwargs: { min_value: 0.95, max_value: 1.0 },
    success: false,
    createdAt: "2026-03-22",
    createdBy: "risk_analyst_01",
    description: "Claim IDs should be highly unique (low duplicate rate)"
  },
  {
    id: "exp-5",
    expectationType: "expect_column_values_to_match_regex",
    column: "email",
    table: "dim_customer",
    kwargs: { regex: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
    success: true,
    createdAt: "2026-04-01",
    createdBy: "data_engineer_03",
    description: "Email addresses must conform to standard email format"
  }
];

function ExpectationsPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Expectations</Heading>
          <Text size="2" color="gray">
            Declarative quality tests that define how your data should behave.
          </Text>
        </Box>
        <Flex gap="2">
          <Button variant="outline"><PlusIcon /> New Expectation</Button>
          <Button variant="outline"><LightningBoltIcon /> Auto-generate from Profiling</Button>
        </Flex>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
          ["Total Expectations", `${mockExpectations.length}`, "Configured validation rules"],
          ["Active (Passing)", `${mockExpectations.filter(e => e.success).length}`, "Currently satisfying data quality rules"],
          ["Failing", `${mockExpectations.filter(e => !e.success).length}`, "Need immediate attention"],
          ["Coverage (Tables)", "4 / 12", "Tables with at least one Expectation"]
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
          <Heading size="5">Expectation Library</Heading>
          <Flex gap="2">
            <TextField.Root placeholder="Search expectations..." size="2">
              <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
            </TextField.Root>
            <Select.Root defaultValue="all">
              <Select.Trigger placeholder="Status" />
              <Select.Content>
                <Select.Item value="all">All</Select.Item>
                <Select.Item value="pass">Passing</Select.Item>
                <Select.Item value="fail">Failing</Select.Item>
              </Select.Content>
            </Select.Root>
            <Button variant="soft" color="gray" size="1"><ReloadIcon /></Button>
          </Flex>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Column</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Table</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Parameters</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created By</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {mockExpectations.map((exp) => (
              <Table.Row key={exp.id}>
                <Table.Cell>
                  <Badge variant="outline" color="blue" size="1">
                    {exp.expectationType}
                  </Badge>
                </Table.Cell>
                <Table.Cell><Text weight="medium">{exp.column}</Text></Table.Cell>
                <Table.Cell><Badge variant="soft" color="purple">{exp.table}</Badge></Table.Cell>
                <Table.Cell>
                  <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>
                    {JSON.stringify(exp.kwargs)}
                  </Text>
                </Table.Cell>
                <Table.Cell><Text size="2">{exp.description}</Text></Table.Cell>
                <Table.Cell><Text size="2" color="gray">{exp.createdBy}</Text></Table.Cell>
                <Table.Cell>
                  {exp.success
                    ? <Badge color="green"><CheckCircledIcon /> Pass</Badge>
                    : <Badge color="red"><CrossCircledIcon /> Fail</Badge>
                  }
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="1">
                    <Button variant="soft" color="gray" size="1">Edit</Button>
                    <Button variant="soft" color="red" size="1"><TrashIcon /></Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>

      <Card size="3" className="panel radix-surface">
        <Flex align="center" gap="2" mb="3">
          <InfoCircledIcon />
          <Heading size="5">What are Expectations?</Heading>
        </Flex>
        <Separator mb="3" size="4" />
        <Text size="2" color="gray">
          Expectations are declarative, human-readable assertions about your data. Each Expectation describes a single, testable property of data. They are the core building blocks of data quality validation in the platform.
        </Text>
        <Box mt="3">
          <Heading size="3" mb="2">Common Expectation Types</Heading>
          <Flex direction="column" gap="2">
            {[
              ["expect_column_values_to_not_be_null", "Ensure a column has no null values above a threshold"],
              ["expect_column_values_to_be_in_set", "Validate values belong to a defined set of allowed values"],
              ["expect_column_values_to_be_between", "Check numeric values fall within a specified range"],
              ["expect_column_distinct_values_to_be_in_set", "All distinct values must appear in a reference set"],
              ["expect_table_row_count_to_be_between", "Total row count should fall within a range"],
              ["expect_column_values_to_match_regex", "Validate string values conform to a regex pattern"]
            ].map(([type, desc]) => (
              <Card key={type} size="2" className="radix-surface">
                <Flex justify="between" align="center">
                  <Box>
                    <Text size="2" weight="medium" style={{ fontFamily: "monospace" }}>{type}</Text>
                    <Text size="1" color="gray">{desc}</Text>
                  </Box>
                  <Button variant="outline" size="1">+ Add</Button>
                </Flex>
              </Card>
            ))}
          </Flex>
        </Box>
      </Card>
    </Box>
  );
}

export default ExpectationsPage;
