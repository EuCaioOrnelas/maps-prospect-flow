// VS Code–style code block with lightweight syntax highlighting.
// Zero deps (no prism/shiki). Regex tokenizer for bash, typescript, python, json.
// Colors match VS Code Dark+ palette; fixed dark background even in light theme
// so contrast is stable and identical to a real editor.

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Rule = [RegExp, string];

// ---- Palette (VS Code Dark+) ----
// Uses inline styles (not Tailwind arbitrary classes) so colors are immune to
// theme (light/dark), Tailwind purge, and global CSS overrides like `.prose`.
const COLOR: Record<string, { color: string; fontStyle?: string; fontWeight?: number; textDecoration?: string }> = {
  comment: { color: "#6A9955", fontStyle: "italic" },
  string: { color: "#CE9178" },
  number: { color: "#B5CEA8" },
  keyword: { color: "#C586C0" },
  control: { color: "#569CD6" },
  type: { color: "#4EC9B0" },
  function: { color: "#DCDCAA" },
  property: { color: "#9CDCFE" },
  variable: { color: "#9CDCFE" },
  boolean: { color: "#569CD6" },
  operator: { color: "#D4D4D4" },
  punctuation: { color: "#D4D4D4" },
  regex: { color: "#D16969" },
  tag: { color: "#569CD6" },
  attr: { color: "#9CDCFE" },
  header: { color: "#569CD6", fontWeight: 600 },
  flag: { color: "#DCDCAA" },
  url: { color: "#CE9178", textDecoration: "underline dotted" },
  text: { color: "#D4D4D4" },
};

// Fresh regexes per language (must all be /g).
const RULES: Record<string, () => Rule[]> = {
  typescript: () => [
    [/\/\/[^\n]*/g, "comment"],
    [/\/\*[\s\S]*?\*\//g, "comment"],
    [/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, "string"],
    [/"(?:\\[\s\S]|[^"\\])*"/g, "string"],
    [/'(?:\\[\s\S]|[^'\\])*'/g, "string"],
    [/\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|await|async|import|export|from|default|type|interface|class|new|throw|try|catch|finally|typeof|instanceof|as|extends|implements|of|in|void|readonly|public|private|protected|static)\b/g, "keyword"],
    [/\b(?:true|false|null|undefined)\b/g, "boolean"],
    [/\b(?:string|number|boolean|any|unknown|never|Array|Record|Promise|Response|Request)\b/g, "type"],
    [/\b\d+(?:\.\d+)?\b/g, "number"],
    [/\b([A-Z][A-Za-z0-9_]*)\b/g, "type"],
    [/\b([a-z_$][\w$]*)(?=\s*\()/g, "function"],
    [/([.])([a-z_$][\w$]*)/g, "property"],
    [/[{}[\](),;:]/g, "punctuation"],
    [/[=+\-*/%<>!&|?]+/g, "operator"],
  ],
  python: () => [
    [/#[^\n]*/g, "comment"],
    [/"""[\s\S]*?"""/g, "string"],
    [/'''[\s\S]*?'''/g, "string"],
    [/f?"(?:\\[\s\S]|[^"\\])*"/g, "string"],
    [/f?'(?:\\[\s\S]|[^'\\])*'/g, "string"],
    [/\b(?:def|class|import|from|as|return|if|elif|else|for|while|in|not|and|or|is|with|try|except|finally|raise|pass|lambda|yield|global|nonlocal|async|await)\b/g, "keyword"],
    [/\b(?:True|False|None|self|cls)\b/g, "boolean"],
    [/\b\d+(?:\.\d+)?\b/g, "number"],
    [/\b([a-z_][\w]*)(?=\s*\()/g, "function"],
    [/[{}[\](),;:]/g, "punctuation"],
    [/[=+\-*/%<>!&|]+/g, "operator"],
  ],
  json: () => [
    [/"(?:\\[\s\S]|[^"\\])*"(?=\s*:)/g, "property"],
    [/"(?:\\[\s\S]|[^"\\])*"/g, "string"],
    [/\b(?:true|false|null)\b/g, "boolean"],
    [/-?\b\d+(?:\.\d+)?\b/g, "number"],
    [/[{}[\],:]/g, "punctuation"],
  ],
  bash: () => [
    [/#[^\n]*/g, "comment"],
    [/'(?:\\[\s\S]|[^'\\])*'/g, "string"],
    [/"(?:\\[\s\S]|[^"\\])*"/g, "string"],
    [/\bhttps?:\/\/[^\s'"]+/g, "url"],
    [/\b(curl|echo|export|cd|ls|cat|grep|sudo|apt|npm|bun|yarn|deno|python|node|psql|openssl)\b/g, "function"],
    [/\s(-[a-zA-Z]|--[a-zA-Z][\w-]*)/g, "flag"],
    [/\$\{?[A-Z_][A-Z0-9_]*\}?/g, "variable"],
    [/\b\d+\b/g, "number"],
    [/[|&;()<>]/g, "operator"],
  ],
  sql: () => [
    [/--[^\n]*/g, "comment"],
    [/\/\*[\s\S]*?\*\//g, "comment"],
    [/'(?:''|[^'])*'/g, "string"],
    [/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|LIMIT|OFFSET|CREATE|TABLE|ALTER|DROP|INDEX|POLICY|GRANT|REVOKE|RETURNS|RETURN|AS|WITH|BEGIN|COMMIT|ROLLBACK|IF|THEN|ELSE|END|CASE|WHEN|AND|OR|NOT|NULL|TRUE|FALSE|DEFAULT|PRIMARY|KEY|FOREIGN|REFERENCES|USING|CHECK|CONSTRAINT|UNIQUE|VALUES|INTO|SET|LANGUAGE|SECURITY|DEFINER|INVOKER|FUNCTION|TRIGGER|DECLARE)\b/gi, "keyword"],
    [/\b\d+(?:\.\d+)?\b/g, "number"],
    [/[{}[\](),;:]/g, "punctuation"],
  ],
};

interface Token { type: string; value: string; }

function tokenize(code: string, rules: Rule[]): Token[] {
  const out: Token[] = [];
  let pos = 0;
  const N = code.length;
  while (pos < N) {
    let best: { start: number; end: number; type: string } | null = null;
    for (const [pat, type] of rules) {
      pat.lastIndex = pos;
      const m = pat.exec(code);
      if (!m) continue;
      if (m.index < pos) continue;
      if (!best || m.index < best.start) {
        best = { start: m.index, end: m.index + m[0].length, type };
        if (m.index === pos) break;
      }
    }
    if (!best) { out.push({ type: "text", value: code.slice(pos) }); break; }
    if (best.start > pos) out.push({ type: "text", value: code.slice(pos, best.start) });
    out.push({ type: best.type, value: code.slice(best.start, best.end) });
    pos = best.end === best.start ? best.end + 1 : best.end;
  }
  return out;
}

function langLabel(lang?: string) {
  switch (lang) {
    case "typescript": return "TypeScript";
    case "python": return "Python";
    case "json": return "JSON";
    case "bash": return "Bash";
    case "sql": return "SQL";
    default: return lang ?? "";
  }
}

function langDot(lang?: string) {
  switch (lang) {
    case "typescript": return "bg-[#3178C6]";
    case "python": return "bg-[#3572A5]";
    case "json": return "bg-[#CE9178]";
    case "bash": return "bg-[#4EAA25]";
    case "sql": return "bg-[#C586C0]";
    default: return "bg-muted-foreground";
  }
}

export interface CodeBlockProps {
  code: string;
  lang?: "typescript" | "python" | "json" | "bash" | "sql" | string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ code, lang, filename, showLineNumbers = false, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => {
    const rules = lang && RULES[lang] ? RULES[lang]() : null;
    return rules ? tokenize(code, rules) : [{ type: "text", value: code } as Token];
  }, [code, lang]);

  const lines = useMemo(() => {
    if (!showLineNumbers) return null;
    return code.split("\n").length;
  }, [code, showLineNumbers]);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={cn(
        "group rounded-lg overflow-hidden border border-[#1e1e1e] bg-[#1e1e1e] shadow-sm",
        className,
      )}
    >
      {/* Header — VS Code editor tab */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#1e1e1e] px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0", langDot(lang))} />
          <span className="text-[11px] font-mono text-[#cccccc] truncate">
            {filename ?? langLabel(lang) ?? "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="opacity-70 hover:opacity-100 transition text-[#cccccc] hover:text-white p-1 rounded hover:bg-white/5"
          aria-label="Copiar código"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#4EC9B0]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Body */}
      <div className="flex overflow-x-auto text-[12.5px] leading-[1.6] font-mono">
        {showLineNumbers && lines ? (
          <div className="select-none shrink-0 px-3 py-3 text-right text-[#858585] bg-[#1e1e1e] border-r border-[#2d2d2d]">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        ) : null}
        <pre className="flex-1 px-4 py-3 text-[#d4d4d4] whitespace-pre">
          <code>
            {tokens.map((t, i) => (
              <span key={i} className={COLOR[t.type] ?? ""}>{t.value}</span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;
