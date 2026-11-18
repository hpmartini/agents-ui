/**
 * Validation of cloud session targets for `claude --cloud <id|url>` / `claude --teleport`.
 *
 * Only an ID or a claude.ai/code URL is accepted: `--cloud` treats any other text as the
 * description of a NEW cloud session, so free text must never reach the CLI.
 * Mirrored in server/services/agentService.js (parseCloudTarget) - keep both in sync.
 */
import { type PanelsLabels } from '../labels/panels';
export type CloudTarget = {
    ok: true;
    id: string;
} | {
    ok: false;
    error: string;
};
/** Extract the session id from a raw ID or a https://claude.ai/code/<id> URL. */
export declare function parseCloudTarget(input: string, t?: Pick<PanelsLabels, 'cloudInvalid' | 'cloudOnlyClaudeAi' | 'cloudNoId'>): CloudTarget;
/** CLI args for opening a session: `--cloud <id>`, or `--teleport` (picker) without a target. */
export declare function buildCloudArgs(target?: string | null): string[];
