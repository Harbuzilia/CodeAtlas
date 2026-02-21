import type { ApprovalStrategy } from './approval-strategy.js';
import type { PermissionRequestEvent } from '../event-stream-handler.js';

/**
 * Strategy that automatically approves all permission requests
 * Use for tests where you want the agent to proceed without intervention
 */
export class AutoApproveStrategy implements ApprovalStrategy {
  async shouldApprove(event: PermissionRequestEvent): Promise<boolean> {
    return true;
  }

  describe(): string {
    return 'Auto-approve all permission requests';
  }
}
