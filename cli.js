#!/usr/bin/env node
// Friendly command-line front-end for the assistant.
import { createInterface } from 'node:readline/promises';
import { ask, ConfigError } from './src/assistant.js';

const HELP = `
Job Application Assistant

Usage:
  node cli.js                          # interactive mode — keep asking questions
  node cli.js "your question or pasted email"
  node cli.js --mode email "paste a recruiter email here"
  echo "Do you require sponsorship?" | node cli.js
  node cli.js --json "question"        # raw JSON output (for apps / the future UI)

Options:
  -m, --mode   auto | form | email     (overrides OUTPUT_MODE in .env)
      --json   print raw JSON instead of the friendly view
  -h, --help   show this help
`;

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const c = {
  dim: color(2), bold: color(1), green: color(32), yellow: color(33), red: color(31), cyan: color(36),
};

function parseArgs(argv) {
  const out = { mode: undefined, json: false, help: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode' || a === '-m') out.mode = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else rest.push(a);
  }
  out.input = rest.join(' ').trim();
  return out;
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

function render(r) {
  const line = c.dim('─'.repeat(56));
  const conf =
    r.confidence === 'high' ? c.green(r.confidence) :
    r.confidence === 'medium' ? c.yellow(r.confidence) :
    c.red(r.confidence || 'unknown');

  console.log('\n' + line);
  console.log(c.bold('ANSWER ') + c.dim('(copy this):') + '\n');
  console.log('  ' + String(r.answer ?? '').split('\n').join('\n  '));
  console.log(line);
  console.log(`${c.dim('input:')} ${r.input_type}    ${c.dim('type:')} ${r.answer_type}    ${c.dim('confidence:')} ${conf}`);
  if (r.selected_option) console.log(`${c.dim('selected option:')} ${c.cyan(r.selected_option)}`);
  if (Array.isArray(r.needs_input) && r.needs_input.length) {
    console.log('\n' + c.yellow('⚠ needs your input:'));
    for (const n of r.needs_input) console.log('  • ' + n);
  }
  if (r.note) console.log('\n' + c.dim('note: ') + r.note);
  console.log('');
}

function printError(err) {
  if (err instanceof ConfigError) {
    console.error('\n' + c.red('Setup needed:') + '\n  ' + String(err.message).split('\n').join('\n  ') + '\n');
  } else {
    console.error('\n' + c.red('Error: ') + err.message + '\n');
  }
}

async function answer(input, { mode, json }) {
  try {
    const result = await ask(input, { mode });
    if (json) console.log(JSON.stringify(result, null, 2));
    else render(result);
    return true;
  } catch (err) {
    printError(err);
    return false;
  }
}

async function repl({ mode, json }) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let current = mode; // undefined → uses OUTPUT_MODE from .env
  console.log('\n' + c.bold('Job Application Assistant') + c.dim('  —  type a question and press Enter.'));
  console.log(c.dim("Tip: paste an email for a reply.  Commands: ':form' ':email' ':auto' set mode, ':q' to quit.") + '\n');
  while (true) {
    let line;
    try {
      line = (await rl.question(c.cyan('ask ▸ '))).trim();
    } catch {
      break; // Ctrl-D / stream closed
    }
    if (!line) continue;
    const low = line.toLowerCase();
    if (low === ':q' || low === 'exit' || low === 'quit') break;
    if (low === ':form' || low === ':email' || low === ':auto') {
      current = low.slice(1);
      console.log(c.dim(`(mode set to ${current})`));
      continue;
    }
    await answer(line, { mode: current, json });
  }
  rl.close();
  console.log(c.dim('\nBye 👋\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);

  // No input given and a real terminal is attached → interactive mode.
  if (!args.input && process.stdin.isTTY) {
    return repl({ mode: args.mode, json: args.json });
  }

  const input = args.input || (await readStdin()).trim();
  if (!input) {
    console.log(HELP);
    process.exit(1);
  }

  const ok = await answer(input, args);
  if (!ok) process.exit(1);
}

main();
