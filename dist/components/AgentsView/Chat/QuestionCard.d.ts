import type { AgentDialog, DialogAnswer } from '../../../utils/agentDialog';
interface QuestionCardProps {
    dialog: AgentDialog;
    onAnswer: (answer: DialogAnswer) => void;
    /** Keys went out for this step: answered until the agent's screen moves on */
    sent?: boolean;
    disabled?: boolean;
}
/**
 * A question or permission the agent waits on, as a card: the dialog's step on its screen,
 * structured, answered with clicks that the chat pane turns into the TUI's keys. Claude's question
 * tabs are buttons (and ←/→ on the card): back to an answered question shows its pick, and only
 * Submit on the review sends the answers.
 */
export declare function QuestionCard({ dialog, onAnswer, sent, disabled, }: QuestionCardProps): import("react").JSX.Element;
export {};
