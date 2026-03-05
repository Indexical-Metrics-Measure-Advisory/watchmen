import { Catalog } from "./BusinessDomain";

/**
 * Props for the CreateCatalogDialog component.
 */
export interface CreateCatalogDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to handle open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback to handle catalog creation */
  onCreateCatalog: (data: any) => void;
  /** Callback to handle catalog update (optional) */
  onUpdateCatalog?: (data: any) => void;
  /** The catalog currently being edited (if in edit mode) */
  editingCatalog?: Catalog | null;
  /** List of available catalogs for relationship selection */
  availableCatalogs?: Catalog[];
}
