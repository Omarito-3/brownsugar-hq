/**
 * Evaluates a plain arithmetic expression: numbers, + - * / %, and parentheses.
 *
 * Deliberately a hand-written parser rather than `eval` or `new Function` —
 * this runs on user-typed input, and neither of those can be made safe.
 * Anything outside the grammar is rejected rather than coerced.
 */

type Token = { type: "num"; value: number } | { type: "op"; value: string };

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === " ") {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++];
      // Reject things like "1.2.3" that Number() would silently turn into NaN.
      if ((num.match(/\./g) ?? []).length > 1) return null;
      const value = Number(num);
      if (!Number.isFinite(value)) return null;
      tokens.push({ type: "num", value });
      continue;
    }

    if ("+-*/%()".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
}

/** Shunting-yard to RPN, then evaluate. Returns null for malformed input. */
export function safeEvaluate(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  if (!tokens) return null;

  const output: Token[] = [];
  const ops: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "num") {
      output.push(token);
      continue;
    }

    if (token.value === "(") {
      ops.push(token.value);
      continue;
    }

    if (token.value === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") {
        output.push({ type: "op", value: ops.pop()! });
      }
      if (!ops.length) return null; // unbalanced
      ops.pop();
      continue;
    }

    // Unary minus: a leading '-', or one straight after another operator or '('.
    const prev = tokens[i - 1];
    const isUnary =
      token.value === "-" && (!prev || (prev.type === "op" && prev.value !== ")"));
    if (isUnary) {
      const next = tokens[i + 1];
      if (!next || next.type !== "num") return null;
      output.push({ type: "num", value: -next.value });
      i++;
      continue;
    }

    while (
      ops.length &&
      ops[ops.length - 1] !== "(" &&
      PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[token.value]
    ) {
      output.push({ type: "op", value: ops.pop()! });
    }
    ops.push(token.value);
  }

  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null; // unbalanced
    output.push({ type: "op", value: op });
  }

  const stack: number[] = [];
  for (const token of output) {
    if (token.type === "num") {
      stack.push(token.value);
      continue;
    }

    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;

    switch (token.value) {
      case "+":
        stack.push(a + b);
        break;
      case "-":
        stack.push(a - b);
        break;
      case "*":
        stack.push(a * b);
        break;
      case "/":
        if (b === 0) return null;
        stack.push(a / b);
        break;
      case "%":
        if (b === 0) return null;
        stack.push(a % b);
        break;
      default:
        return null;
    }
  }

  if (stack.length !== 1) return null;
  return Number.isFinite(stack[0]) ? stack[0] : null;
}
