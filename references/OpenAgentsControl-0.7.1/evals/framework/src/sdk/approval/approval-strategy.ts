import type { PermissionRequestEvent } from '../event-stream-handler.js';

/**
 * Base interface for approval strategies
 */
export interface ApprovalStrategy {
  /**
   * Decide whether to approve a permission request
   * @returns true to approve, false to deny
   */
  shouldApprove(event: PermissionRequestEvent): Promise<boolean>;

  /**
   * Get a description of this strategy
   */
  describe(): string;
}

/**
 * Approval decision with reasoning
 */
export interface ApprovalDecision {
  approved: boolean;
  reason: string;
}
