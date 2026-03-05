/**
 * Interface representing a Customization for a Data Product.
 */
export interface Customization {
  /** Unique identifier for the customization */
  id: string;
  /** Display name of the customization */
  name: string;
  /** Type of customization */
  type: 'schema' | 'config' | 'transformation' | 'validation';
  /** Tenant identifier associated with the customization */
  tenant: string;
  /** ID of the associated data product */
  dataProduct: string;
  /** Timestamp of the last modification */
  lastModified: string;
  /** Author of the customization */
  author: string;
  /** Description of the customization */
  description: string;
  /** Diff statistics showing changes */
  diff: {
    added: number;
    modified: number;
    deleted: number;
  };
}
