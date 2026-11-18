/**
 * Composer images are scaled down before upload, like Claude Code and omp do with a pasted
 * image: a retina screenshot or photo can be 10+ MB, which the server refuses (413) and the
 * model API would refuse after it (5 MB per image, base64). The limits match what the harnesses
 * resize to themselves.
 */
export declare const IMAGE_MAX_EDGE = 2000;
/** 3.75 MB raw = 5 MB base64, the per-image limit of the Anthropic API */
export declare const IMAGE_MAX_BYTES = 3750000;
/**
 * `file` within `maxEdge` px on its longest side and `maxBytes`; unchanged when it already fits
 * or the browser cannot decode it (the server then decides). PNG and WebP keep their format while
 * they fit, everything else, and anything still too large, becomes JPEG.
 */
export declare function fitImage(file: Blob, { maxEdge, maxBytes }?: {
    maxEdge?: number | undefined;
    maxBytes?: number | undefined;
}): Promise<Blob>;
