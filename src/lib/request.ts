const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(val: string | null | undefined): val is string {
  return typeof val === "string" && UUID_REGEX.test(val);
}

/**
 * Parses `page`/`limit` query params, falling back to the given default for
 * anything non-finite or out of range instead of letting NaN/negative values
 * reach the DB layer (e.g. `.limit(NaN)` or a negative `.offset()`).
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number,
  maxLimit?: number
): { page: number; limit: number } {
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;

  const rawLimit = Number(searchParams.get("limit"));
  let limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : defaultLimit;
  if (maxLimit !== undefined) {
    limit = Math.min(limit, maxLimit);
  }

  return { page, limit };
}