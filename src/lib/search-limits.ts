/** A shared `?q=` link is attacker-sized; the work it starts must not be.
 * Each token costs a full dictionary scan and each candidate site an array
 * per token, so both the raw length and the token count are bounded in
 * `searchBook` itself — the input's own maxlength is only politeness. The
 * numbers live here, outside the lazy search chunk, so the input can name
 * the same limit without pulling the index into the page graph. */
export const MAX_QUERY_LENGTH = 120;
export const MAX_QUERY_TOKENS = 8;
