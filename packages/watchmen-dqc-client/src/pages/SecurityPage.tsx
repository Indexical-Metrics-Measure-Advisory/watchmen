import { Badge, Box, Card, Flex, Heading, Text, Table, Button, Separator, Tabs } from "@radix-ui/themes";
import {
  PersonIcon,
  LockClosedIcon,
  EyeOpenIcon,
  EyeClosedIcon,
  GroupIcon,
  PlusIcon,
  GearIcon,
  InfoCircledIcon
} from "@radix-ui/react-icons";

type Policy = {
  id: string;
  name: string;
  type: "RBAC" | "ABAC";
  resource: string;
  effect: "allow" | "deny";
  condition: string;
  lastUpdated: string;
  status: "active" | "inactive";
};

type MaskingRule = {
  id: string;
  field: string;
  table: string;
  method: "full" | "partial" | "hash";
  roles: string[];
  preview: { original: string; masked: string };
};

type OwnerRecord = {
  asset: string;
  type: string;
  owner: string;
  team: string;
  since: string;
  steward: string;
};

const policies: Policy[] = [
  { id: "P-001", name: "PII Read Restriction", type: "RBAC", resource: "dim_customer.*", effect: "deny", condition: "role NOT IN (data_analyst, admin)", lastUpdated: "2026-04-01", status: "active" },
  { id: "P-002", name: "Risk Data Department Access", type: "ABAC", resource: "risk_score_model_output", effect: "allow", condition: "department = 'risk' AND clearance >= 'L3'", lastUpdated: "2026-03-28", status: "active" },
  { id: "P-003", name: "Finance Report Download Restriction", type: "RBAC", resource: "premium_report", effect: "deny", condition: "role NOT IN (finance_team, c_suite)", lastUpdated: "2026-03-25", status: "active" },
  { id: "P-004", name: "Dev Environment Masking Policy", type: "ABAC", resource: "*._dev", effect: "allow", condition: "environment = 'dev' AND masking = true", lastUpdated: "2026-03-20", status: "inactive" }
];

const maskingRules: MaskingRule[] = [
  { id: "M-001", field: "customer_name", table: "dim_customer", method: "partial", roles: ["analyst", "viewer"], preview: { original: "Alex Chen", masked: "A*** C***" } },
  { id: "M-002", field: "id_card_number", table: "dim_customer", method: "hash", roles: ["analyst", "viewer", "data_scientist"], preview: { original: "110101199003071234", masked: "a3f2b8c1d4e5..." } },
  { id: "M-003", field: "phone_number", table: "dim_customer", method: "partial", roles: ["analyst", "viewer"], preview: { original: "13812345678", masked: "138****5678" } },
  { id: "M-004", field: "email", table: "dim_customer", method: "full", roles: ["viewer"], preview: { original: "user@example.com", masked: "[MASKED]" } }
];

const owners: OwnerRecord[] = [
  { asset: "dim_customer", type: "Table", owner: "Ming Zhang", team: "Data Platform Team", since: "2025-01-15", steward: "Xiaohua Li" },
  { asset: "fact_transaction", type: "Table", owner: "Fang Wang", team: "Finance Team", since: "2025-02-01", steward: "Wei Chen" },
  { asset: "risk_score_model_output", type: "Table", owner: "Lei Zhao", team: "Risk Team", since: "2025-03-10", steward: "Ming Zhang" },
  { asset: "policy_master_view", type: "View", owner: "Yang Liu", team: "Policy Team", since: "2025-04-20", steward: "Fang Wang" }
];

const methodLabels = {
  full: { label: "Full Mask", color: "red" as const },
  partial: { label: "Partial Mask", color: "orange" as const },
  hash: { label: "Hash", color: "blue" as const }
};

function SecurityPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Security & Compliance</Heading>
          <Text size="2" color="gray">
            RBAC/ABAC policy enforcement, dynamic data masking, and ownership governance.
          </Text>
        </Box>
        <Flex gap="2">
          <Button>+ New Policy</Button>
          <Button variant="outline"><GearIcon /> Policy Engine Settings</Button>
        </Flex>
      </Flex>

      <Tabs.Root defaultValue="policies">
        <Tabs.List>
          <Tabs.Trigger value="policies"><LockClosedIcon /> Access Policies</Tabs.Trigger>
          <Tabs.Trigger value="masking"><EyeClosedIcon /> Dynamic Masking</Tabs.Trigger>
          <Tabs.Trigger value="ownership"><GroupIcon /> Ownership</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="policies" mt="3">
          <section className="kpi-grid" style={{ marginBottom: "16px" }}>
            {[
              ["Active Policies", `${policies.filter(p => p.status === "active").length}`, "Access policies currently in force"],
              ["RBAC Policies", `${policies.filter(p => p.type === "RBAC").length}`, "Role-based access control"],
              ["ABAC Policies", `${policies.filter(p => p.type === "ABAC").length}`, "Attribute-based access control"],
              ["Monthly Changes", "3", "Policies added or modified this month"]
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
              <Heading size="5">Policy List</Heading>
            </Flex>
            <Separator my="2" size="4" />
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Policy Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Resource</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Effect</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Condition</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {policies.map((p) => (
                  <Table.Row key={p.id}>
                    <Table.RowHeaderCell><Text size="2" color="gray">{p.id}</Text></Table.RowHeaderCell>
                    <Table.Cell><Text weight="bold">{p.name}</Text></Table.Cell>
                    <Table.Cell><Badge color={p.type === "RBAC" ? "blue" : "violet"}>{p.type}</Badge></Table.Cell>
                    <Table.Cell><Text size="2" style={{ fontFamily: "monospace" }}>{p.resource}</Text></Table.Cell>
                    <Table.Cell><Badge color={p.effect === "allow" ? "green" : "red"}>{p.effect === "allow" ? "Allow" : "Deny"}</Badge></Table.Cell>
                    <Table.Cell><Text size="2" style={{ fontFamily: "monospace", fontSize: 12 }}>{p.condition}</Text></Table.Cell>
                    <Table.Cell><Badge color={p.status === "active" ? "green" : "gray"}>{p.status === "active" ? "Active" : "Inactive"}</Badge></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="masking" mt="3">
          <Card size="3" className="panel radix-surface" mb="3">
            <Flex justify="between" align="center" mb="3">
              <Heading size="5">Dynamic Masking Rules</Heading>
              <Button>+ Add Masking Rule</Button>
            </Flex>
            <Separator my="2" size="4" />
            {maskingRules.map((m) => {
              const cfg = methodLabels[m.method];
              return (
                <Card key={m.id} size="2" mb="2">
                  <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Flex gap="3" align="center">
                      <Badge color={cfg.color}>{cfg.label}</Badge>
                      <Box>
                        <Flex align="center" gap="2" mb="1">
                          <Text weight="bold">{m.field}</Text>
                          <Badge variant="soft" color="blue">{m.table}</Badge>
                        </Flex>
                        <Flex gap="4" mt="1">
                          <Box>
                            <Text size="1" color="gray">Original</Text>
                            <Text size="2" style={{ fontFamily: "monospace" }}>{m.preview.original}</Text>
                          </Box>
                          <Text color="gray" size="3">→</Text>
                          <Box>
                            <Text size="1" color="gray">Masked</Text>
                            <Text size="2" style={{ fontFamily: "monospace", color: "var(--red-9)" }}>{m.preview.masked}</Text>
                          </Box>
                        </Flex>
                      </Box>
                    </Flex>
                    <Flex gap="1" wrap="wrap">
                      {m.roles.map((r) => (
                        <Badge key={r} variant="outline" size="1">{r}</Badge>
                      ))}
                    </Flex>
                  </Flex>
                </Card>
              );
            })}
          </Card>
        </Tabs.Content>

        <Tabs.Content value="ownership" mt="3">
          <Card size="3" className="panel radix-surface">
            <Flex justify="between" align="center" mb="3">
              <Heading size="5">Asset Ownership</Heading>
              <Button>+ Bulk Assign</Button>
            </Flex>
            <Separator my="2" size="4" />
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Asset</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Team</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Data Steward</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Assigned Since</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {owners.map((o) => (
                  <Table.Row key={o.asset}>
                    <Table.RowHeaderCell><Text weight="bold">{o.asset}</Text></Table.RowHeaderCell>
                    <Table.Cell><Badge variant="soft" color="blue">{o.type}</Badge></Table.Cell>
                    <Table.Cell>
                      <Flex align="center" gap="1">
                        <PersonIcon />
                        <Text size="2">{o.owner}</Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell><Text size="2">{o.team}</Text></Table.Cell>
                    <Table.Cell><Text size="2" color="gray">{o.steward}</Text></Table.Cell>
                    <Table.Cell><Text size="2" color="gray">{o.since}</Text></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

export default SecurityPage;
