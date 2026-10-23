export interface KeypadEntry {
  code: string;
  qty: number;
}

export interface KeypadParseResult {
  entries: KeypadEntry[];
  invalid: string[];
}

export interface ResolvedKeypad extends KeypadParseResult {
  unknown: string[];
}

const TOKEN_PATTERN = /^([A-Za-z0-9_-]+?)(?:[*xX](\d+))?$/;

export function parseKeypad(input: string): KeypadParseResult {
  const tokens = input.split(/[\s,]+/).filter(Boolean);
  const entries: KeypadEntry[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    const match = token.match(TOKEN_PATTERN);
    if (!match) {
      invalid.push(token);
      continue;
    }

    const code = match[1];
    const qty = match[2] == null ? 1 : Number(match[2]);

    if (!Number.isInteger(qty) || qty <= 0) {
      invalid.push(token);
      continue;
    }

    entries.push({ code, qty });
  }

  return { entries, invalid };
}

export function resolveKeypad(
  input: string,
  knownCodes: Set<string>,
): ResolvedKeypad {
  const parsed = parseKeypad(input);
  const entries: KeypadEntry[] = [];
  const unknown: string[] = [];

  for (const entry of parsed.entries) {
    if (knownCodes.has(entry.code)) entries.push(entry);
    else unknown.push(entry.code);
  }

  return { entries, unknown, invalid: parsed.invalid };
}
