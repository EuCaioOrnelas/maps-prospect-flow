import re, os
from pathlib import Path

BASE = Path("supabase/functions/_integration-core")
CORE_FILES = [
    "response.ts","errors/catalog.ts","filters/filterSchema.ts",
    "cache.ts","audit.ts","rateLimit.ts","auth.ts",
    "registry/ProviderInterface.ts","registry/ProviderRegistry.ts",
    "providers/cockpitProvider.ts","providers/crmProvider.ts",
    "providers/pipelineProvider.ts","providers/campaignsProvider.ts",
    "providers/opportunitiesProvider.ts","providers/financeProvider.ts",
    "providers/stubs.ts","registry/index.ts",
]

def read_module(path):
    txt = Path(path).read_text()
    externals = []
    body_lines = []
    lines = txt.split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if s.startswith("import "):
            buf = ln
            while 'from "' not in buf and "from '" not in buf and i+1 < len(lines):
                i += 1
                buf += "\n" + lines[i]
            m = re.search(r'from\s+["\']([^"\']+)["\']', buf)
            if m:
                src = m.group(1)
                if not (src.startswith("./") or src.startswith("../")):
                    externals.append(buf.strip())
            i += 1
            continue
        if re.match(r'^\s*export\s*\{\s*[A-Za-z_,\s]+\s*\}\s*;?\s*$', s):
            body_lines.append("// " + ln)
            i += 1
            continue
        body_lines.append(ln)
        i += 1
    return externals, "\n".join(body_lines)

# Providers with a top-level `async function execute` we must rename per file.
PROVIDER_FILES_WITH_EXECUTE = {
    "providers/cockpitProvider.ts": "cockpit",
    "providers/crmProvider.ts": "crm",
    "providers/pipelineProvider.ts": "pipeline",
    "providers/campaignsProvider.ts": "campaigns",  # also declares metaProvider but only one execute
    "providers/opportunitiesProvider.ts": "opportunities",
    "providers/financeProvider.ts": "finance",
}

def rename_execute(body: str, suffix: str) -> str:
    new_name = f"execute_{suffix}"
    # Rename top-level declaration
    body = re.sub(r'\bfunction\s+execute\b', f'function {new_name}', body)
    # Update references in object literals: `execute,` or `execute }` or `execute\n`
    body = re.sub(r'(\bexecute\b)(?=\s*[,}])', f'execute: {new_name}', body)
    return body

def fix_cockpit_any(body: str) -> str:
    # Add explicit type to filter callbacks over `scores`
    body = re.sub(r'scores\.filter\(\s*s\s*=>', 'scores.filter((s: number) =>', body)
    return body

SEEN_ENV = set()
ENV_PATTERN = re.compile(r'^\s*const\s+(SUPABASE_URL|ANON_KEY|SERVICE_KEY)\s*=')

def dedupe_env(body: str) -> str:
    out = []
    for ln in body.split("\n"):
        m = ENV_PATTERN.match(ln)
        if m:
            name = m.group(1)
            if name in SEEN_ENV:
                out.append("// " + ln + "  // deduped")
                continue
            SEEN_ENV.add(name)
        out.append(ln)
    return "\n".join(out)

def build_bundle(endpoint_file, out_path):
    global SEEN_ENV
    SEEN_ENV = set()
    all_ext = []
    seen_ext = set()
    body_parts = []

    def add_module(path, label, rel_key=None):
        ext, body = read_module(path)
        for e in ext:
            key = re.sub(r'\s+', ' ', e)
            if key not in seen_ext:
                seen_ext.add(key)
                all_ext.append(e)
        body = dedupe_env(body)
        if rel_key and rel_key in PROVIDER_FILES_WITH_EXECUTE:
            body = rename_execute(body, PROVIDER_FILES_WITH_EXECUTE[rel_key])
        if rel_key == "providers/cockpitProvider.ts":
            body = fix_cockpit_any(body)
        body_parts.append(f"\n// ================= {label} =================\n{body}")

    for f in CORE_FILES:
        add_module(BASE / f, f"_integration-core/{f}", rel_key=f)
    add_module(endpoint_file, os.path.basename(os.path.dirname(endpoint_file)) + "/index.ts")

    header = ("// AUTO-BUNDLED — do not edit by hand.\n"
              "// All shared _integration-core modules inlined so this file works via Supabase Web Editor.\n\n")
    out = header + "\n".join(all_ext) + "\n" + "\n".join(body_parts)
    Path(out_path).write_text(out)
    print(f"Wrote {out_path} ({len(out)} bytes)")

build_bundle("supabase/functions/integration-v1-context/index.ts",
             "wiize-integration-export/supabase/functions/integration-v1-context/index.ts")
build_bundle("supabase/functions/integration-v1-provider/index.ts",
             "wiize-integration-export/supabase/functions/integration-v1-provider/index.ts")
