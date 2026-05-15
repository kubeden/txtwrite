import { appendFileSync } from "node:fs";

export function setOutput(name, value) {
  const serialized = value === undefined || value === null ? "" : String(value);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<__EOF__\n${serialized}\n__EOF__\n`);
  } else {
    console.log(`${name}=${serialized}`);
  }
}

export function mask(value) {
  if (value) console.log(`::add-mask::${value}`);
}
