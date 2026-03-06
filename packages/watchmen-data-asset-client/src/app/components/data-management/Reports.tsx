import { useState } from "react";
import { Search, Plus, MoreVertical, FileText, Calendar, Users, Download, Eye } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CreateReportDialog } from "./CreateReportDialog";

interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  owner: string;
  createdAt: string;
  lastRun: string;
  status: 'published' | 'draft' | 'scheduled';
  frequency: string;
  views: number;
}

export function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      name: 'Q4 Business Analysis Report',
      description: 'Overall business performance analysis for Q4 2024',
      type: 'Business Report',
      owner: 'John Doe',
      createdAt: '2024-12-01',
      lastRun: '2024-12-15 14:30',
      status: 'published',
      frequency: 'Quarterly',
      views: 1234,
    },
    {
      id: '2',
      name: 'Weekly User Growth Report',
      description: 'Weekly analysis of user growth and activity',
      type: 'User Report',
      owner: 'Jane Smith',
      createdAt: '2024-11-15',
      lastRun: '2024-12-15 10:00',
      status: 'published',
      frequency: 'Weekly',
      views: 856,
    },
    {
      id: '3',
      name: 'Marketing Campaign Effectiveness Analysis',
      description: 'ROI and conversion analysis of Double 12 marketing campaign',
      type: 'Marketing Report',
      owner: 'Alice Johnson',
      createdAt: '2024-12-10',
      lastRun: '2024-12-14 16:45',
      status: 'draft',
      frequency: 'Once',
      views: 234,
    },
    {
      id: '4',
      name: 'Monthly Financial Report',
      description: 'Monthly analysis of revenue, cost and profit',
      type: 'Financial Report',
      owner: 'Bob Wilson',
      createdAt: '2024-10-01',
      lastRun: '2024-12-01 09:00',
      status: 'published',
      frequency: 'Monthly',
      views: 2345,
    },
    {
      id: '5',
      name: 'Product Usage Report',
      description: 'Usage of core product features and user feedback',
      type: 'Product Report',
      owner: 'John Doe',
      createdAt: '2024-11-20',
      lastRun: '2024-12-16 08:00',
      status: 'scheduled',
      frequency: 'Daily',
      views: 567,
    },
  ]);

  const statusConfig = {
    published: { label: 'Published', className: 'bg-green-100 text-green-700' },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateReport = (data: any) => {
    const newReport: Report = {
      id: String(reports.length + 1),
      name: data.name,
      description: data.description,
      type: data.type,
      owner: 'Current User',
      createdAt: new Date().toISOString().split('T')[0],
      lastRun: '-',
      status: 'draft',
      frequency: data.frequency,
      views: 0,
    };
    setReports([newReport, ...reports]);
  };

  const handleDeleteReport = (id: string) => {
    setReports(reports.filter(r => r.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Report Management</h2>
          <p className="text-gray-500 mt-1">Create and manage data analysis reports</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Report
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search report name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y">
          {filteredReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium text-gray-900">{report.name}</h3>
                    <Badge className={statusConfig[report.status].className}>
                      {statusConfig[report.status].label}
                    </Badge>
                    <Badge variant="outline">{report.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{report.owner}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created at {report.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Last run: {report.lastRun}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{report.views} views</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {report.frequency}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                      <DropdownMenuItem>View History</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteReport(report.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No matching reports found</p>
          </div>
        )}
      </div>

      <CreateReportDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateReport}
      />
    </div>
  );
}
