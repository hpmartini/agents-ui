/**
 * Actions of the agents view that components deep inside it trigger (e.g. a chat message from
 * another agent links to that agent). Provided by `AgentsView`; null outside it (tests, a pane
 * rendered on its own), where such links render as plain text.
 */
export interface ViewActions {
    /** Opens (attaches) the agent `id` in the workspace */
    openAgent: (id: string) => void;
}
export declare const ViewActionsContext: import("react").Context<ViewActions | null>;
