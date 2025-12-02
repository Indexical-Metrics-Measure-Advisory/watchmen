/**
 * Utility functions for cleaning and normalizing data structures
 * Used to handle API validation requirements and data consistency
 */

/**
 * Interface for metadata fields that are commonly required by backend APIs
 */
export interface MetadataFields {
  createdAt?: string | null;
  createdBy?: string | null;
  lastModifiedBy?: string | null;
  tenantId?: string | null;
  userId?: string | null;
  lastModifiedAt?: string | null;
}

/**
 * Default values for metadata fields
 */
export const DEFAULT_METADATA: Required<MetadataFields> = {
  createdAt: new Date().toISOString(),
  createdBy: 'system',
  lastModifiedBy: 'system',
  lastModifiedAt: new Date().toISOString(),
  tenantId: 'default',
  userId: 'system'
} as const;

/**
 * Clean metadata fields from any data structure to avoid validation errors
 * Provides default values for required metadata fields when they are null or undefined
 * 
 * @param data - The data structure to clean
 * @param customDefaults - Optional custom default values for metadata fields
 * @returns Cleaned data structure with proper metadata fields
 */
export function cleanMetadataFields<T>(
  data: T,
  customDefaults?: Partial<MetadataFields>
): T {
  if (!data) return data;
  
  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }
  
  // If it's an array, clean each element
  if (Array.isArray(data)) {
    return data.map(item => cleanMetadataFields(item, customDefaults)) as T;
  }
  
  // If it's an object, clean its properties
  if (data !== null) {
    const cleaned = { ...data } as any;
    const currentTimestamp = new Date().toISOString();
    
    // Merge custom defaults with standard defaults
    const metadataDefaults = {
      ...DEFAULT_METADATA,
      createdAt: currentTimestamp, // Always use current timestamp
      ...customDefaults
    };
    
    // Apply defaults for null or undefined metadata fields
    Object.entries(metadataDefaults).forEach(([field, defaultValue]) => {
      if (field in cleaned && (cleaned[field] === null || cleaned[field] === undefined)) {
        cleaned[field] = defaultValue;
      }
    });
    
    // Recursively clean nested objects and arrays
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] !== null && typeof cleaned[key] === 'object') {
        cleaned[key] = cleanMetadataFields(cleaned[key], customDefaults);
      }
    });
    
    return cleaned;
  }
  
  return data;
}

/**
 * Remove metadata fields from a data structure
 * Useful when you want to strip metadata before certain operations
 * 
 * @param data - The data structure to clean
 * @param fieldsToRemove - Array of metadata field names to remove
 * @returns Data structure without specified metadata fields
 */
export function removeMetadataFields<T>(
  data: T,
  fieldsToRemove: (keyof MetadataFields)[] = ['createdAt', 'createdBy', 'lastModifiedBy', 'tenantId', 'userId']
): T {
  if (!data) return data;
  
  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }
  
  // If it's an array, clean each element
  if (Array.isArray(data)) {
    return data.map(item => removeMetadataFields(item, fieldsToRemove)) as T;
  }
  
  // If it's an object, remove specified fields
  if (data !== null) {
    const cleaned = { ...data } as any;
    
    // Remove specified metadata fields
    fieldsToRemove.forEach(field => {
      delete cleaned[field];
    });
    
    // Recursively clean nested objects and arrays
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] !== null && typeof cleaned[key] === 'object') {
        cleaned[key] = removeMetadataFields(cleaned[key], fieldsToRemove);
      }
    });
    
    return cleaned;
  }
  
  return data;
}

/**
 * Validate that required metadata fields are present and not null/undefined
 * 
 * @param data - The data structure to validate
 * @param requiredFields - Array of required metadata field names
 * @returns Object with validation result and missing fields
 */
export function validateMetadataFields(
  data: any,
  requiredFields: (keyof MetadataFields)[] = ['createdAt', 'createdBy', 'tenantId', 'userId']
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, missingFields: requiredFields as string[] };
  }
  
  requiredFields.forEach(field => {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      missingFields.push(field as string);
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}