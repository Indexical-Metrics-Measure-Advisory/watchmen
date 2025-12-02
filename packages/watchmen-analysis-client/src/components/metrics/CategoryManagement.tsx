import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
  Plus, Edit, Trash2, BarChart3, TrendingUp, Users, Package, 
  Megaphone, Calculator, Calendar, Activity, 
  FolderPlus, Folder, Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as categoryService from '@/services/metricsManagementService';

import { Category } from '@/model/metricsManagement';

interface CategoryManagementProps {
  onCategoriesChanged?: () => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({
  onCategoriesChanged
}) => {
  // 状态管理
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // 对话框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  // 表单状态
  const [createForm, setCreateForm] = useState<Partial<Category>>({
    id: '',
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Folder'
  });
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  
  const { toast } = useToast();

  // 获取分类列表
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const categoriesData = await categoryService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 创建分类
  const handleCreateCategory = async () => {
    if (!createForm.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await categoryService.createCategory(createForm);
      if (result.success && result.data) {
        setCategories(prev => [...prev, result.data!]);
        
        toast({
          title: "Success",
          description: `Category "${createForm.name}" created successfully`
        });
        
        setIsCreateDialogOpen(false);
        setCreateForm({
          id: '',
          name: '',
          description: '',
          color: '#3B82F6',
          icon: 'Folder'
        });
        
        onCategoriesChanged?.();
      } else {
        throw new Error(result.message || "Failed to create category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive"
      });
    }
  };

  // 编辑分类
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setEditForm({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCategory || !editForm.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await categoryService.updateCategory(selectedCategory.id, editForm);
      if (result.success && result.data) {
        const updatedCategory = result.data;
        setCategories(prev => prev.map(cat => 
          cat.id === selectedCategory.id ? updatedCategory : cat
        ));
        
        toast({
          title: "Success",
          description: `Category "${editForm.name}" updated successfully`
        });
        
        setIsEditDialogOpen(false);
        setSelectedCategory(null);
        setEditForm({});
        
        onCategoriesChanged?.();
      } else {
        throw new Error(result.message || "Failed to update category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive"
      });
    }
  };

  // 删除分类
  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const result = await categoryService.deleteCategory(categoryToDelete.id);
      if (result.success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
        
        toast({
          title: "Success",
          description: `Category "${categoryToDelete.name}" deleted successfully`
        });
        
        onCategoriesChanged?.();
      } else {
        throw new Error(result.message || "Failed to delete category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  // 获取图标组件
  const getCategoryIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<{ className?: string; size?: string | number }> } = {
      TrendingUp, Users, Package, Megaphone, Calculator, Calendar,
      Folder, BarChart3, Activity, Tag
    };
    return iconMap[iconName] || Folder;
  };

  // 渲染分类列表
  const renderCategoryList = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No categories</p>
          <p className="text-sm">Create your first category to get started</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {categories.map((category) => {
          const IconComponent = getCategoryIcon(category.icon);

          return (
            <div key={category.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 group">
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-10 h-10 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: category.color }}
                >
                  <IconComponent size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.description?.trim() || 'No Description'}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditCategory(category)}
                  className="h-8 w-8 p-0"
                >
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCategory(category)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <>
      {/* 分类管理卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Category Management
              </CardTitle>
              <CardDescription>
                Manage metric categories to organize and classify metrics
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderCategoryList()}
        </CardContent>
      </Card>

      {/* 创建分类对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your metrics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Enter category description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="category-color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                    className="w-10 h-10 rounded border border-border"
                  />
                  <Input
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-icon">Icon</Label>
                <Select
                  value={createForm.icon}
                  onValueChange={(value) => setCreateForm({ ...createForm, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Folder">📁 Folder</SelectItem>
                    <SelectItem value="BarChart3">📊 Chart</SelectItem>
                    <SelectItem value="TrendingUp">📈 Trending</SelectItem>
                    <SelectItem value="Users">👥 Users</SelectItem>
                    <SelectItem value="Package">📦 Package</SelectItem>
                    <SelectItem value="Calculator">🧮 Calculator</SelectItem>
                    <SelectItem value="Activity">⚡ Activity</SelectItem>
                    <SelectItem value="Tag">🏷️ Tag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑分类对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-description">Description</Label>
              <Textarea
                id="edit-category-description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter category description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-color">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="edit-category-color"
                    value={editForm.color || '#3B82F6'}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-10 h-10 rounded border border-border"
                  />
                  <Input
                    value={editForm.color || ''}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-icon">Icon</Label>
                <Select
                  value={editForm.icon || 'Folder'}
                  onValueChange={(value) => setEditForm({ ...editForm, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Folder">📁 Folder</SelectItem>
                    <SelectItem value="BarChart3">📊 Chart</SelectItem>
                    <SelectItem value="TrendingUp">📈 Trending</SelectItem>
                    <SelectItem value="Users">👥 Users</SelectItem>
                    <SelectItem value="Package">📦 Package</SelectItem>
                    <SelectItem value="Calculator">🧮 Calculator</SelectItem>
                    <SelectItem value="Activity">⚡ Activity</SelectItem>
                    <SelectItem value="Tag">🏷️ Tag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: categoryToDelete.color }}
                >
                  {React.createElement(getCategoryIcon(categoryToDelete.icon), { size: 16, className: "text-white" })}
                </div>
                <div>
                  <div className="font-medium">{categoryToDelete.name}</div>
                  {categoryToDelete.description && (
                    <div className="text-sm text-muted-foreground">{categoryToDelete.description}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCategory}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategoryManagement;