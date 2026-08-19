export const parseFlexibleDate = (input: any): Date | null => {
  if (input === undefined || input === null || input === "") {
    return null;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // Handle Excel serial date numbers (e.g. 46312 or "46312")
  const num = typeof input === "number" ? input : Number(input);
  if (!isNaN(num) && num > 25569 && num < 100000) {
    // Excel serial dates: 25569 is Jan 1, 1970 UTC
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === "string") {
    const str = input.trim();
    if (!str) return null;

    // 1. Try native Date constructor
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d;
    }

    // 2. Parse ISO-like strings e.g. "2026-8-20T00:00:00.000Z" or "2026-8-2"
    const isoMatch = str.match(
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?(?:Z|([+-]\d{2}:?\d{2}))?)?$/i,
    );
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
      const minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
      const second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
      const millisecond = isoMatch[7]
        ? parseInt(isoMatch[7].padEnd(3, "0").slice(0, 3), 10)
        : 0;

      if (str.toUpperCase().endsWith("Z")) {
        d = new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
      } else {
        d = new Date(year, month, day, hour, minute, second, millisecond);
      }

      if (!isNaN(d.getTime())) {
        return d;
      }
    }

    // 3. Parse DD/MM/YYYY or MM/DD/YYYY formats
    const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmyMatch) {
      const part1 = parseInt(dmyMatch[1], 10);
      const part2 = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);

      // Try DD-MM-YYYY (day: part1, month: part2 - 1)
      d = new Date(year, part2 - 1, part1);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  return null;
};

