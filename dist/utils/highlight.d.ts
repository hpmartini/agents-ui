/**
 * Syntax highlighting of fenced code in chat markdown (#19 AK-8). No dependency: the tree has
 * no highlighter, and chats need colour for the common languages only. One regex tokenizer per
 * language family (comments, strings, numbers, keywords); unknown languages stay plain.
 */
export type TokenKind = 'keyword' | 'string' | 'comment' | 'number' | 'literal' | 'type' | 'tag' | 'attr' | 'added' | 'removed' | 'meta';
export interface Token {
    text: string;
    kind: TokenKind | null;
}
/** Longer code is shown plain: the regexes are linear, but rendering 10k spans is not free */
export declare const MAX_HIGHLIGHT_CHARS = 100000;
/** Tokens of `code` in `language` (a fenced block's info string); plain text when unknown */
export declare function highlight(code: string, language?: string | null): Token[];
/** Tailwind class per token kind (dark theme, the chat's palette) */
export declare const TOKEN_CLASS: Record<TokenKind, string>;
