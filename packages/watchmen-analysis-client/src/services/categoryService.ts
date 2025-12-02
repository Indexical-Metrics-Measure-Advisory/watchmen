import { Category } from '@/model/metricsManagement';

// Mock data - in a real application, this would come from a database
const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Business Metrics',
    description: 'Core business performance indicators',
    color: '#3B82F6',
    icon: 'BarChart3',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    sortOrder: 1,
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'User Engagement',
    description: 'User behavior and engagement metrics',
    color: '#10B981',
    icon: 'Users',
    createdAt: '2024-01-02T00:00:00Z',
    isActive: true,
    sortOrder: 2,
    updatedAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    name: 'Technical Performance',
    description: 'System and technical performance metrics',
    color: '#F59E0B',
    icon: 'Activity',
    createdAt: '2024-01-03T00:00:00Z',
    isActive: true,
    sortOrder: 3,
    updatedAt: '2024-01-03T00:00:00Z'
  },
  {
    id: '4',
    name: 'Financial',
    description: 'Revenue and cost metrics',
    color: '#8B5CF6',
    icon: 'DollarSign',
    createdAt: '2024-01-04T00:00:00Z',
    isActive: true,
    sortOrder: 4,
    updatedAt: '2024-01-04T00:00:00Z'
  },
  {
    id: '5',
    name: 'Marketing',
    description: 'Marketing campaign and channel performance',
    color: '#EC4899',
    icon: 'Megaphone',
    createdAt: '2024-01-05T00:00:00Z',
    isActive: true,
    sortOrder: 5,
    updatedAt: '2024-01-05T00:00:00Z'
  }
];

// In-memory storage for mock data (simulates database)
let categories: Category[] = [...mockCategories];

/**
 * Simulates API delay
 */
const simulateApiDelay = (ms: number = 300): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get all categories
 */
export const getCategories = async (): Promise<Category[]> => {
  await simulateApiDelay(500);
  return [...categories];
};

/**
 * Get category by ID
 */
export const getCategoryById = async (id: string): Promise<Category | null> => {
  await simulateApiDelay();
  return categories.find(cat => cat.id === id) || null;
};

/**
 * Create a new category
 */
export const createCategory = async (request: Partial<Category>): Promise<Category> => {
  await simulateApiDelay();
  
  const newCategory: Category = {
    id: Date.now().toString(),
    name: request.name || '',
    description: request.description,
    color: request.color,
    icon: request.icon,
    createdAt: new Date().toISOString(),
    isActive: true,
    sortOrder: categories.length + 1,
    updatedAt: new Date().toISOString()
  };
  
  categories.push(newCategory);
  return newCategory;
};

/**
 * Update an existing category
 */
export const updateCategory = async (id: string, request: Partial<Category>): Promise<Category> => {
  await simulateApiDelay();
  
  const categoryIndex = categories.findIndex(cat => cat.id === id);
  if (categoryIndex === -1) {
    throw new Error(`Category with id ${id} not found`);
  }
  
  const updatedCategory: Category = {
    ...categories[categoryIndex],
    ...request,
    updatedAt: new Date().toISOString()
  };
  
  categories[categoryIndex] = updatedCategory;
  return updatedCategory;
};

/**
 * Delete a category
 */
export const deleteCategory = async (id: string): Promise<void> => {
  await simulateApiDelay();
  
  const categoryIndex = categories.findIndex(cat => cat.id === id);
  if (categoryIndex === -1) {
    throw new Error(`Category with id ${id} not found`);
  }
  
  categories.splice(categoryIndex, 1);
};

/**
 * Check if category name already exists (for validation)
 */
export const isCategoryNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  await simulateApiDelay(100);
  
  return categories.some(cat => 
    cat.name.toLowerCase() === name.toLowerCase() && 
    cat.id !== excludeId
  );
};

/**
 * Reset categories to initial mock data (for testing purposes)
 */
export const resetCategories = (): void => {
  categories = [...mockCategories];
};
