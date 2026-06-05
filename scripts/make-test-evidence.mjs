// Generates HTML terminal evidence from a captured jest log.
// Usage: node scripts/make-test-evidence.mjs <log.txt> <out.html> <date> <tz>
import { readFileSync, writeFileSync } from "node:fs";

const [, , logPath, outPath, date, tz = "Asia/Jakarta"] = process.argv;
const raw = readFileSync(logPath, "utf8").replace(/\s+$/s, "") + "\n";

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const body = raw
  .split("\n")
  .map((line) => {
    const e = esc(line);
    if (/^PASS /.test(line)) return `<span class="pass">${e}</span>`;
    if (/^(Test Suites:|Tests:|Snapshots:|Time:|Ran all test suites\.)/.test(line))
      return `<span class="summary">${e}</span>`;
    return e;
  })
  .join("\n");

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Jest Test Evidence - ${date}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #111827; font-family: Menlo, Monaco, Consolas, "Courier New", monospace; }
  .terminal { width: 1280px; min-height: 720px; background: #0b1020; color: #d1d5db; padding: 28px; box-sizing: border-box; }
  .bar { height: 32px; display: flex; align-items: center; gap: 8px; color: #9ca3af; border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 20px; }
  .dot { width: 12px; height: 12px; border-radius: 999px; display: inline-block; }
  .red { background: #ef4444; } .yellow { background: #f59e0b; } .green { background: #22c55e; }
  .title { margin-left: 12px; font-size: 14px; }
  .prompt { color: #93c5fd; white-space: pre-wrap; font-size: 15px; line-height: 1.45; }
  pre { margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.42; }
  .pass { color: #86efac; font-weight: 700; }
  .summary { color: #fef08a; font-weight: 700; }
</style>
</head>
<body>
  <main class="terminal">
    <div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><span class="title">STEMM Jest Test Evidence - ${date} ${tz}</span></div>
    <div class="prompt">PS C:\\Users\\denni\\Documents\\CodingProjects\\STEMM&gt; npm test -- --runInBand</div>
    <pre>
${body}</pre>
  </main>
</body>
</html>
`;

writeFileSync(outPath, html);
console.log(`wrote ${outPath}`);
