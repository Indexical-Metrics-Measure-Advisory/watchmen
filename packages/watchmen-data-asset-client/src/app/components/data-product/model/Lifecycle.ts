/**
 * Interface representing the history of a lifecycle state change.
 */
export interface LifecycleHistory {
  /** Status of the product during this period */
  status: string;
  /** Date when the status change occurred */
  date: string;
  /** Duration of the status */
  duration: string;
  /** Operator who performed the change */
  operator: string;
}

/**
 * Interface representing a Data Product with lifecycle information.
 */
export interface LifecycleProduct {
  /** Unique identifier for the product */
  id: string;
  /** Display name of the product */
  name: string;
  /** Version string of the product */
  version: string;
  /** Current lifecycle status */
  currentStatus: string;
  /** Owner of the product */
  owner: string;
  /** Creation date */
  createdAt: string;
  /** Date of the last lifecycle transition */
  lastTransition: string;
  /** Scheduled date for the next review */
  nextReview: string;
  /** Number of consumers */
  consumers: number;
  /** History of lifecycle changes */
  history: LifecycleHistory[];
}
