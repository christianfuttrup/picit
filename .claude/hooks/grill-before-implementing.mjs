// UserPromptSubmit hook. When a prompt asks for an implementation, tell Claude to grill the user first.
// grill-me is user-invoked only (disable-model-invocation) and just calls the `grilling` skill,
// so the hook points Claude at `grilling` directly.
import { readFileSync } from 'node:fs';

const IMPLEMENTATION =
  /\b(implement|add|build|create|change|write|make|fix|refactor|endpoint|feature)\b/i;

const { prompt = '' } = JSON.parse(readFileSync(0, 'utf8'));
const trimmed = prompt.trim();

const isSlashCommand = trimmed.startsWith('/');
if (isSlashCommand || !IMPLEMENTATION.test(trimmed)) {
  process.exit(0);
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext:
        'This looks like a request to implement a change. Before planning or writing any code, ' +
        'invoke the `grilling` skill (the skill behind /grill-me) and interview the user about the change. ' +
        'Ask in rounds, wait for their answers, and only then write the spec to specs/<change>.md. ' +
        'Do not write tests or code until the grilling is finished and the user confirms.',
    },
  }),
);
