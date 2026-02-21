import type { ApprovalStrategy } from './approval-strategy.js';
import type { PermissionRequestEvent } from '../event-stream-handler.js';

export interface SmartApprovalConfig {
  /**
   * Tools to always approve
   */
  allowedTools?: string[];

  /**
   * Tools to always deny
   */
  deniedTools?: string[];

  /**
   * Patterns in messages that should be approved
   */
  approvePatterns?: RegExp[];

  /**
   * Patterns in messages that should be denied
   */
  denyPatterns?: RegExp[];

  /**
   * Max number of approvals to give (for testing)
   */
  maxApprovals?: number;

  /**
   * Default decision if no rules match
   */
  defaultDecision?: boolean;
}

/**
 * Smart approval strategy with configurable rules
 * Use for tests where you want fine-grained control
 */
export class SmartApprovalStrategy implements ApprovalStrategy {
  private approvalCount = 0;

  constructor(private config: SmartApprovalConfig = {}) {
    this.config.defaultDecision = config.defaultDecision ?? true;
  }

  async shouldApprove(event: PermissionRequestEvent): Promise<boolean> {
    const { tool, message } = event.properties;

    // Check max approvals limit
    if (this.config.maxApprovals !== undefined && this.approvalCount >= this.config.maxApprovals) {
      return false;
    }

    // Check denied tools first
    if (tool && this.config.deniedTools?.includes(tool)) {
      return false;
    }

    // Check allowed tools
    if (tool && this.config.allowedTools?.includes(tool)) {
      this.approvalCount++;
      return true;
    }

    // Check deny patterns in message
    if (message && this.config.denyPatterns) {
      for (const pattern of this.config.denyPatterns) {
        if (pattern.test(message)) {
          return false;
        }
      }
    }

    // Check approve patterns in message
    if (message && this.config.approvePatterns) {
      for (const pattern of this.config.approvePatterns) {
        if (pattern.test(message)) {
          this.approvalCount++;
          return true;
        }
      }
    }

    // Use default decision
    const decision = this.config.defaultDecision!;
    if (decision) {
      this.approvalCount++;
    }
    return decision;
  }

  describe(): string {
    return `Smart approval (${this.approvalCount} approved so far)`;
  }

  /**
   * Reset the approval counter
   */
  reset(): void {
    this.approvalCount = 0;
  }

  /**
   * Get the current approval count
   */
  getApprovalCount(): number {
    return this.approvalCount;
  }
}
