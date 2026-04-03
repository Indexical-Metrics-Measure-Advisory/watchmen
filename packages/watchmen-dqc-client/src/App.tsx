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
  ComponentNoneIcon,
  BookmarkIcon,
  BarChartIcon,
  LockClosedIcon,
  ChatBubbleIcon,
  BellIcon,
  ChevronDownIcon,
  ExitIcon,
  GearIcon,
  MagnifyingGlassIcon,
  QuestionMarkIcon
} from "@radix-ui/react-icons";
import CatalogPage from "./pages/CatalogPage";
import LineagePage from "./pages/LineagePage";
import BusinessContextPage from "./pages/BusinessContextPage";
import DataQualityPage from "./pages/DataQualityPage";
import SecurityPage from "./pages/SecurityPage";
import CollaborationPage from "./pages/CollaborationPage";

type PageKey = "catalog" | "lineage" | "context" | "quality" | "security" | "collaboration";

const menuItems: { key: PageKey; label: string; icon: typeof ArchiveIcon; desc: string }[] = [
  { key: "catalog", label: "Data Catalog", icon: ArchiveIcon, desc: "Asset inventory, search, and lifecycle" },
  { key: "lineage", label: "Data Lineage", icon: ComponentNoneIcon, desc: "End-to-end lineage visualization" },
  { key: "context", label: "Business Context", icon: BookmarkIcon, desc: "Glossary, taxonomy, and semantic alignment" },
  { key: "quality", label: "Data Quality", icon: BarChartIcon, desc: "Profiling, tests, and alerting" },
  { key: "security", label: "Security & Compliance", icon: LockClosedIcon, desc: "Access policies, masking, and ownership" },
  { key: "collaboration", label: "Collaboration & Workflow", icon: ChatBubbleIcon, desc: "Certification, approvals, and Q&A" }
];

const pageComponents: Record<PageKey, React.FC> = {
  catalog: CatalogPage,
  lineage: LineagePage,
  context: BusinessContextPage,
  quality: DataQualityPage,
  security: SecurityPage,
  collaboration: CollaborationPage
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState<PageKey>("catalog");
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

  const ActivePageComponent = pageComponents[activePage];
  const activeMenuInfo = menuItems.find(m => m.key === activePage)!;

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

          <nav className="sidebar-nav">
            {menuItems.map((item) => (
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

export default App;
