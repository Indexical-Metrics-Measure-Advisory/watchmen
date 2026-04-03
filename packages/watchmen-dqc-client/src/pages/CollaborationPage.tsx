import { Badge, Box, Card, Flex, Heading, Text, Table, Button, Separator, Avatar, TextField, TextArea } from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ClockIcon,
  ChatBubbleIcon,
  BellIcon,
  PersonIcon,
  ArrowRightIcon,
  ComponentNoneIcon,
  PlusIcon,
  QuestionMarkIcon,
  StarFilledIcon,
  SpeakerOffIcon
} from "@radix-ui/react-icons";

type Certification = {
  asset: string;
  type: string;
  owner: string;
  certifiedBy: string;
  certifiedAt: string;
  status: "certified" | "pending" | "expired";
};

type ApprovalItem = {
  id: string;
  type: string;
  title: string;
  requester: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
};

type QAItem = {
  id: number;
  asset: string;
  question: string;
  askedBy: string;
  answeredBy: string | null;
  answer: string | null;
  createdAt: string;
};

type Announcement = {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  scope: string;
  priority: "high" | "normal" | "low";
};

const certifications: Certification[] = [
  { asset: "dim_customer", type: "Table", owner: "Data Platform Team", certifiedBy: "Data Governance Board", certifiedAt: "2026-03-15", status: "certified" },
  { asset: "fact_transaction", type: "Table", owner: "Finance Team", certifiedBy: "Data Governance Board", certifiedAt: "2026-03-20", status: "certified" },
  { asset: "risk_score_model_output", type: "Table", owner: "Risk Team", certifiedBy: "Data Governance Board", certifiedAt: "2026-02-28", status: "expired" },
  { asset: "policy_master_view", type: "View", owner: "Policy Team", certifiedBy: "Data Governance Board", certifiedAt: "2026-03-30", status: "pending" }
];

const approvals: ApprovalItem[] = [
  { id: "APR-045", type: "Glossary Update", title: "Add term definition: Combined Ratio", requester: "Finance Team", createdAt: "2026-04-02 14:00", status: "pending" },
  { id: "APR-044", type: "Access Request", title: "Risk Team requests read access to fact_transaction", requester: "Risk Team", createdAt: "2026-04-02 10:30", status: "pending" },
  { id: "APR-043", type: "Asset Certification", title: "dim_customer renewal certification request", requester: "Data Platform Team", createdAt: "2026-04-01 16:00", status: "approved" },
  { id: "APR-042", type: "Classification Change", title: "claim_event_stream upgraded from Internal to Confidential", requester: "Claims Team", createdAt: "2026-04-01 09:00", status: "rejected" }
];

const qaItems: QAItem[] = [
  { id: 1, asset: "dim_customer", question: "What is the difference between customer_id and legacy_cust_no, and which one is the primary key?", askedBy: "Hua Li", answeredBy: "Ming Zhang", answer: "customer_id is the system primary key (Snowflake UUID). legacy_cust_no is migrated business ID from legacy CRM with uniqueness constraints.", createdAt: "2026-04-02 11:20" },
  { id: 2, asset: "fact_transaction", question: "Does transaction_amount include tax and fee?", askedBy: "Lei Wang", answeredBy: null, answer: null, createdAt: "2026-04-02 15:00" },
  { id: 3, asset: "risk_score_model_output", question: "What is the risk_score range and interpretation?", askedBy: "Xin Chen", answeredBy: "Lei Zhao", answer: "Range is 0-1000: 0-300 low risk, 301-600 medium risk, 601-1000 high risk. Output from XGBoost v3.2.", createdAt: "2026-04-01 09:30" }
];

const announcements: Announcement[] = [
  { id: 1, title: "[Maintenance] Snowflake ANALYTICS_DB Upgrade Window", content: "Snowflake cluster upgrade is scheduled for 2026-04-05 02:00-06:00. Queries against ANALYTICS_DB will be unavailable during the window.", author: "Data Platform Team", createdAt: "2026-04-02 18:00", scope: "All Teams", priority: "high" },
  { id: 2, title: "[Deprecation] old_crm_legacy to be archived next month", content: "Historical migration is completed and old_crm_legacy will be archived to cold storage on 2026-05-01. Raise concerns before April 20.", author: "DBA Team", createdAt: "2026-04-01 10:00", scope: "Data Platform Team, Finance Team", priority: "normal" },
  { id: 3, title: "[Feature] Column-level lineage is now available", content: "The lineage module now supports field-level impact tracing. Click any column in lineage graph to inspect upstream/downstream impact.", author: "Data Governance Team", createdAt: "2026-03-30 14:00", scope: "All Teams", priority: "low" }
];

function CollaborationPage() {
  return (
    <Box>
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Box>
          <Heading size="6">Collaboration & Workflow</Heading>
          <Text size="2" color="gray">
            Asset certification, approvals, knowledge Q&A, and platform announcements.
          </Text>
        </Box>
      </Flex>

      <section className="kpi-grid" style={{ marginBottom: "16px" }}>
        {[
          ["Certified Assets", `${certifications.filter(c => c.status === "certified").length}`, "Trusted and certified assets"],
          ["Pending Approvals", `${approvals.filter(a => a.status === "pending").length}`, "Requests awaiting decision"],
          ["Knowledge Q&A", `${qaItems.length}`, "Accumulated domain knowledge threads"],
          ["Active Announcements", `${announcements.length}`, "Latest platform announcements"]
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
          <Heading size="5"><StarFilledIcon /> Asset Certification</Heading>
          <Button>+ Request Certification</Button>
        </Flex>
        <Separator my="2" size="4" />
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Asset</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Certified By</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Certified At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {certifications.map((c) => (
              <Table.Row key={c.asset}>
                <Table.RowHeaderCell>
                  <Flex align="center" gap="2">
                    {c.status === "certified" && <CheckCircledIcon color="green" />}
                    <Text weight="bold">{c.asset}</Text>
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell><Badge variant="soft" color="blue">{c.type}</Badge></Table.Cell>
                <Table.Cell><Text size="2">{c.owner}</Text></Table.Cell>
                <Table.Cell><Text size="2">{c.certifiedBy}</Text></Table.Cell>
                <Table.Cell><Text size="2" color="gray">{c.certifiedAt}</Text></Table.Cell>
                <Table.Cell>
                  <Badge color={c.status === "certified" ? "green" : c.status === "pending" ? "orange" : "red"}>
                    {c.status === "certified" ? "Certified" : c.status === "pending" ? "In Review" : "Expired"}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>

      <Flex gap="3" wrap="wrap">
        <Box style={{ flex: 1, minWidth: 380 }}>
          <Card size="3" className="panel radix-surface" style={{ height: "100%" }}>
            <Flex justify="between" align="center" mb="3">
              <Heading size="5"><ComponentNoneIcon /> Approval Queue</Heading>
              <Badge color="orange">{approvals.filter(a => a.status === "pending").length} pending</Badge>
            </Flex>
            <Separator my="2" size="4" />
            {approvals.map((a) => (
              <Card key={a.id} size="2" mb="2">
                <Flex justify="between" align="start" mb="1">
                  <Box>
                    <Flex align="center" gap="2">
                      <Text size="1" color="gray">{a.id}</Text>
                      <Badge variant="soft" color="violet" size="1">{a.type}</Badge>
                    </Flex>
                    <Text weight="bold" mt="1">{a.title}</Text>
                  </Box>
                  <Badge color={a.status === "pending" ? "orange" : a.status === "approved" ? "green" : "red"}>
                    {a.status === "pending" ? "Pending" : a.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                </Flex>
                <Text size="1" color="gray">Requester: {a.requester} · {a.createdAt}</Text>
                {a.status === "pending" && (
                  <Flex gap="2" mt="2">
                    <Button size="1" color="green">Approve</Button>
                    <Button size="1" color="red" variant="soft">Reject</Button>
                  </Flex>
                )}
              </Card>
            ))}
          </Card>
        </Box>

        <Box style={{ flex: 1, minWidth: 380 }}>
          <Card size="3" className="panel radix-surface" style={{ height: "100%" }}>
            <Flex justify="between" align="center" mb="3">
              <Heading size="5"><ChatBubbleIcon /> Knowledge Q&A</Heading>
            </Flex>
            <Separator my="2" size="4" />
            {qaItems.map((q) => (
              <Card key={q.id} size="2" mb="2">
                <Flex align="center" gap="2" mb="1">
                  <QuestionMarkIcon />
                  <Badge variant="soft" color="blue" size="1">{q.asset}</Badge>
                  <Text size="1" color="gray">{q.createdAt}</Text>
                </Flex>
                <Text size="2" mb="1">{q.question}</Text>
                <Flex align="center" gap="2" mt="1">
                  <Avatar size="1" fallback={q.askedBy[0]} />
                  <Text size="1" color="gray">{q.askedBy}</Text>
                </Flex>
                {q.answer && (
                  <Box mt="2" p="2" style={{ background: "var(--gray-a2)", borderRadius: 6 }}>
                    <Flex align="center" gap="2" mb="1">
                      <Avatar size="1" fallback={q.answeredBy![0]} />
                      <Text size="1" weight="bold">{q.answeredBy}</Text>
                    </Flex>
                    <Text size="2">{q.answer}</Text>
                  </Box>
                )}
                {!q.answer && (
                  <Box mt="2">
                    <TextField.Root placeholder="Write an answer..." size="1" />
                  </Box>
                )}
              </Card>
            ))}
          </Card>
        </Box>
      </Flex>

      <Card size="3" className="panel radix-surface" mt="3">
        <Flex justify="between" align="center" mb="3">
          <Heading size="5"><SpeakerOffIcon /> Platform Announcements</Heading>
          <Button variant="outline" size="1">+ Publish Announcement</Button>
        </Flex>
        <Separator my="2" size="4" />
        {announcements.map((a) => (
          <Card key={a.id} size="2" mb="2" style={{ borderLeft: a.priority === "high" ? "3px solid var(--red-8)" : a.priority === "normal" ? "3px solid var(--blue-8)" : "3px solid var(--gray-6)" }}>
            <Flex justify="between" align="start">
              <Box>
                <Flex align="center" gap="2" mb="1">
                  <Text weight="bold">{a.title}</Text>
                  <Badge color={a.priority === "high" ? "red" : a.priority === "normal" ? "blue" : "gray"} size="1">
                    {a.priority === "high" ? "Urgent" : a.priority === "normal" ? "Normal" : "Notice"}
                  </Badge>
                </Flex>
                <Text size="2" color="gray">{a.content}</Text>
                <Flex gap="2" mt="2" align="center">
                  <Text size="1" color="gray">{a.author}</Text>
                  <Text size="1" color="gray">·</Text>
                  <Text size="1" color="gray">{a.createdAt}</Text>
                  <Text size="1" color="gray">·</Text>
                  <Badge variant="outline" size="1">{a.scope}</Badge>
                </Flex>
              </Box>
            </Flex>
          </Card>
        ))}
      </Card>
    </Box>
  );
}

export default CollaborationPage;
