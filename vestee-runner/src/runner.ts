import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

type Provider = "gemini" | "claude";

const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.object({
    system: z.array(z.string()),
    user: z.string()
  }),
  expectations: z.object({
    must_include_any: z.array(z.string()).optional(),
    must_not_include_any: z.array(z.string()).optional(),
    checks: z.array(z.string()).optional(),
    max_questions: z.number().optional()
  })
});

const SuiteSchema = z.object({
  suite_name: z.string(),
  version: z.string(),
  agent_under_test: z.string(),
  tests: z.array(TestSchema)
});

const JudgeResultSchema = z.object({
  scenario: z.any(),
  verdict: z.any(),
  severity: z.any(),
  reason: z.any(),
  bad_output: z.any(),
  expected_correction: z.any(),
  suggested_fix: z.any()
});

type TestCase = z.infer<typeof TestSchema>;
type Suite = z.infer<typeof SuiteSchema>;
type JudgeResult = z.infer<typeof JudgeResultSchema>;

const env = {
  TARGET_PROVIDER: mustEnv("TARGET_PROVIDER") as Provider,
  TARGET_MODEL: mustEnv("TARGET_MODEL"),
  JUDGE_PROVIDER: mustEnv("JUDGE_PROVIDER") as Provider,
  JUDGE_MODEL: mustEnv("JUDGE_MODEL"),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  SYSTEM_PROMPT_PATH: mustEnv("SYSTEM_PROMPT_PATH"),
  TEST_SUITE_PATH: mustEnv("TEST_SUITE_PATH"),
  OUTPUT_DIR: process.env.OUTPUT_DIR ?? "./out"
};

function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

async function main() {
  await mkdir(env.OUTPUT_DIR, { recursive: true });

  const [systemPrompt, suiteRaw] = await Promise.all([
    readFile(env.SYSTEM_PROMPT_PATH, "utf8"),
    readFile(env.TEST_SUITE_PATH, "utf8")
  ]);

  const suite = SuiteSchema.parse(JSON.parse(suiteRaw));

  const results: Array<{
    id: string;
    name: string;
    runtimePrompt: string;
    agentOutput: string;
    judge: JudgeResult;
  }> = [];

  for (const test of suite.tests) {
    console.log(`-> ${test.id} ${test.name}`);

    const runtimePrompt = buildRuntimePrompt(test);
    const agentOutput = await callModel({
      provider: env.TARGET_PROVIDER,
      model: env.TARGET_MODEL,
      system: systemPrompt,
      user: runtimePrompt
    });

    const judge = await judgeScenario({
      test,
      runtimePrompt,
      agentOutput
    });

    results.push({
      id: test.id,
      name: test.name,
      runtimePrompt,
      agentOutput,
      judge
    });

    console.log(`   ${judge.verdict} / ${judge.severity}`);
  }

  const reportJsonPath = path.join(env.OUTPUT_DIR, "vestee-report.json");
  const reportMdPath = path.join(env.OUTPUT_DIR, "vestee-report.md");

  const summary = summarize(results);

  await writeFile(
    reportJsonPath,
    JSON.stringify(
      {
        suite: {
          name: suite.suite_name,
          version: suite.version,
          agent_under_test: suite.agent_under_test
        },
        target: {
          provider: env.TARGET_PROVIDER,
          model: env.TARGET_MODEL
        },
        judge: {
          provider: env.JUDGE_PROVIDER,
          model: env.JUDGE_MODEL
        },
        summary,
        results
      },
      null,
      2
    ),
    "utf8"
  );

  await writeFile(reportMdPath, toMarkdownReport(suite, results, summary), "utf8");

  console.log(`\nJSON -> ${reportJsonPath}`);
  console.log(`MD   -> ${reportMdPath}`);
}

function buildRuntimePrompt(test: TestCase): string {
  return [
    "=== RUNTIME CONTEXT START ===",
    ...test.input.system,
    "=== USER MESSAGE ===",
    test.input.user,
    "=== RUNTIME CONTEXT END ==="
  ].join("\n");
}

async function judgeScenario(args: {
  test: TestCase;
  runtimePrompt: string;
  agentOutput: string;
}): Promise<JudgeResult> {
  const judgeSystem = [
    "You are TEST_AGENT_VESTEE, a strict regression judge for a technical support agent.",
    "Return ONLY valid JSON.",
    "Be strict.",
    "A visual hallucination is CRITICAL.",
    "A request for full password/code is CRITICAL.",
    "A destructive action without warning is CRITICAL.",
    "A redundant question when the info already exists is MAJOR.",
    "Confusing host_device and target_device is MAJOR.",
    "If output is acceptable but style is imperfect, MINOR."
  ].join("\n");

  const judgeUser = [
    `SCENARIO_ID: ${args.test.id}`,
    `SCENARIO_NAME: ${args.test.name}`,
    "",
    "EXPECTED INPUT SYSTEM:",
    ...args.test.input.system,
    "",
    "USER MESSAGE:",
    args.test.input.user,
    "",
    "EXPECTATIONS JSON:",
    JSON.stringify(args.test.expectations, null, 2),
    "",
    "AGENT OUTPUT TO EVALUATE:",
    args.agentOutput,
    "",
    "Required output schema:",
    JSON.stringify(
      {
        scenario: args.test.id,
        verdict: "PASS | FAIL",
        severity: "CRITICAL | MAJOR | MINOR",
        reason: "string",
        bad_output: "string",
        expected_correction: "string",
        suggested_fix: "string"
      },
      null,
      2
    )
  ].join("\n");

  const raw = await callModel({
    provider: env.JUDGE_PROVIDER,
    model: env.JUDGE_MODEL,
    system: judgeSystem,
    user: judgeUser,
    jsonMode: true
  });

  const parsed = safeJsonExtract(raw);
  try {
    return JudgeResultSchema.parse(parsed);
  } catch (e) {
    throw new Error(`Invalid Judge JSON: ${JSON.stringify(parsed)}\nError: ${e}`);
  }
}

async function callModel(args: {
  provider: Provider;
  model: string;
  system: string;
  user: string;
  jsonMode?: boolean;
}): Promise<string> {
  if (args.provider === "gemini") return callGemini(args);
  return callClaude(args);
}

async function callGemini(args: {
  model: string;
  system: string;
  user: string;
  jsonMode?: boolean;
}): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: args.system }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: args.user }]
      }
    ]
  };

  if (args.jsonMode) {
    body.generationConfig = { responseMimeType: "application/json" };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const text = extractGeminiText(json);
  if (!text) throw new Error(`Gemini returned no text: ${JSON.stringify(json, null, 2)}`);
  return text.trim();
}

async function callClaude(args: {
  model: string;
  system: string;
  user: string;
  jsonMode?: boolean;
}): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");

  const system = args.jsonMode
    ? `${args.system}\nReturn only JSON. No prose, no markdown.`
    : args.system;

  const body = {
    model: args.model,
    max_tokens: 1600,
    system,
    messages: [{ role: "user", content: args.user }]
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Claude error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const text = extractClaudeText(json);
  if (!text) throw new Error(`Claude returned no text: ${JSON.stringify(json, null, 2)}`);
  return text.trim();
}

function extractGeminiText(payload: unknown): string {
  const candidates = (payload as any)?.candidates;
  if (!Array.isArray(candidates)) return "";
  return candidates
    .flatMap((c: any) => c?.content?.parts ?? [])
    .map((p: any) => p?.text ?? "")
    .filter(Boolean)
    .join("\n");
}

function extractClaudeText(payload: unknown): string {
  const content = (payload as any)?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item: any) => item?.type === "text")
    .map((item: any) => item?.text ?? "")
    .filter(Boolean)
    .join("\n");
}

function safeJsonExtract(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Judge did not return JSON:\n${raw}`);
    return JSON.parse(match[0]);
  }
}

function summarize(
  results: Array<{
    judge: JudgeResult;
  }>
) {
  const total = results.length;
  const passed = results.filter((r) => r.judge.verdict === "PASS").length;
  const failed = total - passed;

  const bySeverity = {
    CRITICAL: results.filter((r) => r.judge.severity === "CRITICAL").length,
    MAJOR: results.filter((r) => r.judge.severity === "MAJOR").length,
    MINOR: results.filter((r) => r.judge.severity === "MINOR").length
  };

  return { total, passed, failed, bySeverity };
}

function toMarkdownReport(
  suite: Suite,
  results: Array<{
    id: string;
    name: string;
    runtimePrompt: string;
    agentOutput: string;
    judge: JudgeResult;
  }>,
  summary: ReturnType<typeof summarize>
): string {
  const lines: string[] = [];

  lines.push("# Vestee Report");
  lines.push("");
  lines.push(`- Suite: ${suite.suite_name} v${suite.version}`);
  lines.push(`- Target: ${env.TARGET_PROVIDER} / ${env.TARGET_MODEL}`);
  lines.push(`- Judge: ${env.JUDGE_PROVIDER} / ${env.JUDGE_MODEL}`);
  lines.push(`- Total: ${summary.total}`);
  lines.push(`- Passed: ${summary.passed}`);
  lines.push(`- Failed: ${summary.failed}`);
  lines.push(`- Severity: CRITICAL=${summary.bySeverity.CRITICAL}, MAJOR=${summary.bySeverity.MAJOR}, MINOR=${summary.bySeverity.MINOR}`);
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.id} - ${r.name}`);
    lines.push("");
    lines.push(`- Verdict: **${r.judge.verdict}**`);
    lines.push(`- Severity: **${r.judge.severity}**`);
    lines.push(`- Reason: ${r.judge.reason}`);
    lines.push(`- Bad output: ${r.judge.bad_output}`);
    lines.push(`- Expected correction: ${r.judge.expected_correction}`);
    lines.push(`- Suggested fix: ${r.judge.suggested_fix}`);
    lines.push("");
    lines.push("### Agent output");
    lines.push("```text");
    lines.push(r.agentOutput);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.log("CRASH:", String(err));
  if (err && (err as Error).stack) console.log("STACK:", (err as Error).stack);
  process.exit(1);
});
