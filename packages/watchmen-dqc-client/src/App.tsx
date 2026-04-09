import { useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Separator,
  Text,
  TextField,
  Theme
} from "@radix-ui/themes";
import {
  ArchiveIcon,
  BarChartIcon,
  CheckCircledIcon,
  ChevronDownIcon,
  ComponentNoneIcon,
  ExitIcon,
  FileTextIcon,
  GearIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  QuestionMarkIcon,
  BookmarkIcon,
  ChatBubbleIcon
} from "@radix-ui/react-icons";

import CatalogPage from "./pages/CatalogPage";
import LineagePage from "./pages/LineagePage";
import BusinessContextPage from "./pages/BusinessContextPage";
import DataQualityPage from "./pages/DataQualityPage";
import SecurityPage from "./pages/SecurityPage";
import CollaborationPage from "./pages/CollaborationPage";
import ExpectationsPage from "./pages/ExpectationsPage";
import CheckpointsPage from "./pages/CheckpointsPage";
import ValidationResultsPage from "./pages/ValidationResultsPage";
import DataDocsPage from "./pages/DataDocsPage";

type PageKey =
  | "catalog" | "lineage" | "context" | "quality" | "security" | "collaboration"
  | "expectations" | "checkpoints" | "validation" | "datadocs";

type SectionKey = "governance" | "quality";

const governanceItems: { key: PageKey; label: string; icon: typeof ArchiveIcon; desc: string }[] = [
  { key: "catalog", label: "Data Catalog", icon: ArchiveIcon, desc: "Asset inventory, search, and lifecycle" },
  { key: "lineage", label: "Data Lineage", icon: ComponentNoneIcon, desc: "End-to-end lineage visualization" },
  { key: "context", label: "Business Context", icon: BookmarkIcon, desc: "Glossary, taxonomy, and semantic alignment" },
  { key: "quality", label: "Data Quality", icon: BarChartIcon, desc: "Profiling, tests, and alerting" },
  { key: "security", label: "Security & Compliance", icon: LockClosedIcon, desc: "Access policies, masking, and ownership" },
  { key: "collaboration", label: "Collaboration & Workflow", icon: ChatBubbleIcon, desc: "Certification, approvals, and Q&A" }
];

const qualityItems: { key: PageKey; label: string; icon: typeof LightningBoltIcon; desc: string }[] = [
  { key: "expectations", label: "Expectations", icon: CheckCircledIcon, desc: "Declarative quality rules for columns and tables" },
  { key: "checkpoints", label: "Checkpoints", icon: LightningBoltIcon, desc: "Bundled Expectation suites, scheduled or on-demand" },
  { key: "validation", label: "Validation Results", icon: BarChartIcon, desc: "Outcomes from Checkpoint runs with pass/fail breakdown" },
  { key: "datadocs", label: "Data Docs", icon: FileTextIcon, desc: "Human-readable reports from profiling and validation" }
];

const allMenuItems: { key: PageKey; label: string; icon: typeof ArchiveIcon; desc: string }[] = [
  ...governanceItems,
  ...qualityItems
];

const pageComponents: Record<PageKey, React.FC> = {
  catalog: CatalogPage,
  lineage: LineagePage,
  context: BusinessContextPage,
  quality: DataQualityPage,
  security: SecurityPage,
  collaboration: CollaborationPage,
  expectations: ExpectationsPage,
  checkpoints: CheckpointsPage,
  validation: ValidationResultsPage,
  datadocs: DataDocsPage
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState<PageKey>("catalog");
  const [activeSection, setActiveSection] = useState<SectionKey>("governance");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isLoggedIn) {
    return (
      <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
        <div className="login-page">
          <Card size="4" className="login-card radix-surface">
            <Flex direction="column" gap="4">
              <Box>
                <Flex align="center" gap="3" mb="2">
                  <Box className="logo-dot">
                    <LockClosedIcon width={18} height={18} />
                  </Box>
                  <Heading size="7">DataMO</Heading>
                </Flex>
                <Text size="3" color="gray">
                  Enterprise data governance platform powered by metadata-driven collaboration
                </Text>
              </Box>
              <Separator size="4" />
              <Flex direction="column" gap="3">
                <TextField.Root placeholder="Username" size="3" />
                <TextField.Root placeholder="Password" type="password" size="3" />
                <Button size="3" onClick={() => setIsLoggedIn(true)}>
                  Sign In
                </Button>
              </Flex>
              <Text size="1" color="gray" align="center">
                v2.0 · Multi-source integration · Automated quality · Intelligent lineage
              </Text>
            </Flex>
          </Card>
        </div>
      </Theme>
    );
  }

  const currentItems = activeSection === "governance" ? governanceItems : qualityItems;
  const ActivePageComponent = pageComponents[activePage];
  const activeMenuInfo = allMenuItems.find(m => m.key === activePage)!;

  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" scaling="100%">
      <div className="layout">
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <Flex align="center" justify="between" className="sidebar-brand">
            <Flex align="center" gap="2">
              <Box className="logo-dot">
                <LockClosedIcon width={16} height={16} />
              </Box>
              {!sidebarCollapsed && (
                <Box>
                  <Text weight="bold">DataMO</Text>
                  <Text size="1" color="gray">Data Governance Platform</Text>
                </Box>
              )}
            </Flex>
            <Button
              variant="ghost"
              size="1"
              color="gray"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? "»" : "«"}
            </Button>
          </Flex>

          <Separator size="4" mb="2" />

          <Flex gap="1" wrap="wrap" px="2" mb="2">
            <Button
              size="1"
              variant={activeSection === "governance" ? "solid" : "outline"}
              color={activeSection === "governance" ? "blue" : "gray"}
              onClick={() => setActiveSection("governance")}
            >
              Governance
            </Button>
            <Button
              size="1"
              variant={activeSection === "quality" ? "solid" : "outline"}
              color={activeSection === "quality" ? "blue" : "gray"}
              onClick={() => setActiveSection("quality")}
            >
              Data Quality
            </Button>
          </Flex>

          <Text size="1" color="gray" mb="1" style={{ paddingLeft: 8 }}>
            {activeSection === "governance" ? "CATALOG & GOVERNANCE" : "DATA QUALITY"}
          </Text>
          <nav className="sidebar-nav">
            {currentItems.map((item) => (
              <Button
                key={item.key}
                variant={activePage === item.key ? "solid" : "ghost"}
                color={activePage === item.key ? "blue" : "gray"}
                onClick={() => setActivePage(item.key)}
                className="nav-item"
                title={item.label}
              >
                <item.icon width={16} height={16} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <Box className="sidebar-footer" mt="auto">
              <Separator size="4" mb="2" />
              <Flex align="center" gap="2" px="2">
                <BellIcon />
                <Text size="1" color="gray">3 notifications</Text>
              </Flex>
              <Flex align="center" gap="2" px="2" mt="1">
                <QuestionMarkIcon />
                <Text size="1" color="gray">Help Center</Text>
              </Flex>
            </Box>
          )}
        </aside>

        <main className="main">
          <Card size="2" className="topbar">
            <Flex justify="between" align="center">
              <Flex align="center" gap="3">
                <Flex align="center" gap="2">
                  <activeMenuInfo.icon width={16} height={16} />
                  <Heading size="4">{activeMenuInfo.label}</Heading>
                </Flex>
                <Text size="2" color="gray">{activeMenuInfo.desc}</Text>
              </Flex>
              <Flex align="center" gap="4">
                <Box style={{ flex: 1, maxWidth: 300 }}>
                  <TextField.Root placeholder="Global search..." size="2">
                    <TextField.Slot><MagnifyingGlassIcon /></TextField.Slot>
                  </TextField.Root>
                </Box>
                <GearIcon />
                <Flex align="center" gap="2">
                  <Box className="user-meta">
                    <Text size="2" weight="medium">governance_admin</Text>
                    <Text size="1" color="gray">Administrator</Text>
                  </Box>
                  <Avatar fallback="G" radius="full" size="2" />
                  <ChevronDownIcon />
                </Flex>
              </Flex>
            </Flex>
          </Card>

          <Box className="page-content">
            <ActivePageComponent />
          </Box>
        </main>
      </div>
    </Theme>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 11.5C14 12.3284 13.3284 13 12.5 13H2.5C1.67157 13 1 12.3284 1 11.5C1 11.5 1 11.5 1 11.5V10.5H14V11.5ZM12 5.5C12 6.32843 11.3284 7 10.5 7C9.67157 7 9 6.32843 9 5.5C9 4.80617 9.28051 4.16488 9.72764 3.71677L8 2H7L5.27236 3.71677C5.71949 4.16488 6 4.80617 6 5.5C6 6.32843 5.32843 7 4.5 7C3.67157 7 3 6.32843 3 5.5H5C5 5.77614 5.22386 6 5.5 6C5.77614 6 6 5.77614 6 5.5C6 5.22386 5.77614 5 5.5 5C5.27616 5 5.22386 5 5 5H3V3.5C3 2.67157 3.67157 2 4.5 2H10.5C11.3284 2 12 2.67157 12 3.5V5.5Z" fill="currentColor" />
    </svg>
  );
}

export default App;
