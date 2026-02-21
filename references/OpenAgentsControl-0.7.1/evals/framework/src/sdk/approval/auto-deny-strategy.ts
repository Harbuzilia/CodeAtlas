import type { ApprovalStrategy } from './approval-strategy.js';
import type { PermissionRequestEvent } from '../event-stream-handler.js';

/**
 * Strategy that automatically denies all permission requests
 * Use for tests where you want to verify the agent asks for approval
 */
export class AutoDenyStrategy implements ApprovalStrategy {
  async shouldApprove(event: PermissionRequestEvent): Promise<boolean> {
    return false;
  }

  describe(): string {
    return 'Auto-deny all permission requests';
  }
}
