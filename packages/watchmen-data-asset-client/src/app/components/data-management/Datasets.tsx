import { useState } from "react";
import { Search, Plus, MoreVertical, Database, Calendar, Users, Tag } from "lucide-react";
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
import { CreateDatasetDialog } from "./CreateDatasetDialog";

interface Dataset {
  id: string;
  name: string;
  description: string;
  category: string;
  owner: string;
  updatedAt: string;
  recordCount: string;
  status: 'active' | 'inactive' | 'processing';
  tags: string[];
}

export function Datasets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([
    {
      id: '1',
      name: 'User Behavior Analysis Data',
      description: 'Contains user visit, click, purchase and other behavior data',
      category: 'User Data',
      owner: 'John Doe',
      updatedAt: '2024-12-15',
      recordCount: '1,234,567',
      status: 'active',
      tags: ['Behavior Analysis', 'Core Data'],
    },
    {
      id: '2',
      name: 'Product Sales Data',
      description: 'Detailed and statistical data of product sales on all platforms',
      category: 'Business Data',
      owner: 'Jane Smith',
      updatedAt: '2024-12-14',
      recordCount: '892,345',
      status: 'active',
      tags: ['Sales', 'Finance'],
    },
    {
      id: '3',
      name: 'Marketing Campaign Data',
      description: 'Effect and conversion data of various marketing campaigns',
      category: 'Marketing Data',
      owner: 'Alice Johnson',
      updatedAt: '2024-12-13',
      recordCount: '456,789',
      status: 'processing',
      tags: ['Marketing', 'Conversion'],
    },
    {
      id: '4',
      name: 'Customer Feedback Data',
      description: 'Customer reviews, complaints, suggestions and other feedback information',
      category: 'User Data',
      owner: 'Bob Wilson',
      updatedAt: '2024-12-12',
      recordCount: '123,456',
      status: 'active',
      tags: ['Customer Service', 'Feedback'],
    },
    {
      id: '5',
      name: 'Supply Chain Data',
      description: 'Supplier, inventory, logistics and other supply chain data',
      category: 'Business Data',
      owner: 'John Doe',
      updatedAt: '2024-12-11',
      recordCount: '678,901',
      status: 'inactive',
      tags: ['Supply Chain', 'Inventory'],
    },
  ]);

  const statusConfig = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
    processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  };

  const filteredDatasets = datasets.filter((dataset) => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || dataset.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || dataset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateDataset = (data: any) => {
    const newDataset: Dataset = {
      id: String(datasets.length + 1),
      name: data.name,
      description: data.description,
      category: data.category,
      owner: 'Current User',
      updatedAt: new Date().toISOString().split('T')[0],
      recordCount: '0',
      status: 'active',
      tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
    };
    setDatasets([newDataset, ...datasets]);
  };

  const handleDeleteDataset = (id: string) => {
    setDatasets(datasets.filter(d => d.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dataset Management</h2>
          <p className="text-gray-500 mt-1">Manage and organize your dataset assets</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Dataset
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search dataset name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="User Data">User Data</SelectItem>
                <SelectItem value="Business Data">Business Data</SelectItem>
                <SelectItem value="Marketing Data">Marketing Data</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y">
          {filteredDatasets.map((dataset) => (
            <div key={dataset.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">{dataset.name}</h3>
                    <Badge className={statusConfig[dataset.status].className}>
                      {statusConfig[dataset.status].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{dataset.description}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      <span>{dataset.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{dataset.owner}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Updated at {dataset.updatedAt}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="w-4 h-4" />
                      <span>{dataset.recordCount} records</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {dataset.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Export</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDataset(dataset.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {filteredDatasets.length === 0 && (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No matching datasets found</p>
          </div>
        )}
      </div>

      <CreateDatasetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateDataset}
      />
    </div>
  );
}
