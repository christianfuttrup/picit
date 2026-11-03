# Rehearsal notes

> These notes are from an earlier version of the prompt with six rules, including an idempotency key and key expiry. The demo now uses four rules (AC1 to AC4). The idempotency key is named as a next step instead.

Run on the local branch `rehearsal` (never pushed, never merged), using `demo/prompt.md` with AC1 to AC6. The work is at commit `611bef6` on that branch if you want to look at one possible outcome: `git show rehearsal`.

## What happened

1. Grilling, plan, spec, failing tests, code, `npm run check`, review agent. Every step worked.
2. The failing tests failed for the right reason: missing modules, 404 on the new route, and `no such column: revision`.
3. After the code was in, `npm run check` failed once on lint (the `TODO(integration)` comment, see below). After that it passed: 21 unit and 30 integration tests, lint and typecheck clean.
4. The review agent found no critical or major issues, two minor ones and some informational notes. Risk tier: "Human review required" (domain, migration and transaction code all changed).

## How long it took

About 4 minutes from branch to green check, plus about 1 minute for the review. Claude answered its own grilling questions, so the recording will be longer: your spoken answers, reading the diff and explaining the transaction will add most of the time. Expect the AI part of the recording to take 8 to 10 minutes.

## Grilling questions and the defaults I used

The skill asks in rounds, with a recommended answer each. I answered with the recommendation. You will answer out loud.

| Question                                         | Default I used                                                                      |
| :----------------------------------------------- | :---------------------------------------------------------------------------------- |
| Where does `revision` live and does GET show it? | `shipments.revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1)`. Shown on GET |
| Is the idempotency key global or per shipment?   | Global, key alone. Same key replays the first response whatever the body            |
| Are error responses stored under the key?        | No. Only 200s, so a retry after a fix can succeed                                   |
| What if the destination equals the current one?  | No-op 200. No revision bump, no audit row                                           |
| Which check comes first?                         | Input (400), unknown shipment (404), revision (409), then status and terminal (422) |
| What happens to an expired key?                  | Treated as absent and replaced inside the transaction                               |
| Where does the `TODO(integration)` comment go?   | Inside the transaction, right after the audit row is written                        |

Good moments to answer out loud: the global key question (a real design trade-off), the same-destination question, and the `TODO(integration)` question, which is where you name telling the legacy system and the receiving terminal as the open question.

## What tripped it up

- **`TODO(integration)` fails lint.** SonarJS `sonarjs/todo-tag` rejects any `TODO` comment, so the marker CLAUDE.md asks for broke `npm run check`. It was fixed with a one-line `eslint-disable-next-line sonarjs/todo-tag` above the comment. This will happen on camera too unless you turn the rule off in `eslint.config.js` first. Your call: either is fine, but decide before recording.
- **Lint on a compile-time test.** The AC1 test that proves `changeDestination` rejects a `LoadedShipment` (via `@ts-expect-error`) used to end in `expect(true).toBe(true)`, which SonarJS rejects as a trivial assertion. This run asserted on a wrapped function from the start, so lint passed. The reviewer noted that the runtime assertion cannot fail: the real check is the typecheck. Expect a fresh session to hit the trivial-assertion error at least once.
- **`systemClock` stayed out of the domain this time.** `Clock` is an interface in `src/domain/clock.ts` and the real clock is in `src/system-clock.ts`. Last run Claude put `systemClock` with `new Date()` in the domain. This rehearsal knew about it, so a fresh session may still do it. If the reviewer flags it, fix it on camera: move `systemClock` out of `src/domain/` and update the imports.
- **Plan mode and the grilling questions are not exercised here.** The rehearsal ran without a human, so Claude asked and answered itself. On camera, check that it actually stops and waits for you.
- **Revision on GET.** Adding `revision` to the GET response is additive, but CLAUDE.md says "never change the shape of an existing endpoint's response". The reviewer flagged it as informational and asked for a human to confirm the exception. Be ready to explain why it is needed (clients need it to send `revision`).
- **Orchestration sits in `src/db/change-destination.ts`.** The architecture section has no home for a multi-repository transaction, so it went in the db layer again. You may want to say how you'd name that layer in a larger service.
- **Prettier reformatted test files after writing.** Harmless, but run `npx prettier --write .` before committing or the Husky hook will do it for you.
- **Agent discovery.** A session started before `.claude/agents/code-reviewer.md` existed does not list it. This run had the same problem and used a general agent with the file as its brief. Start a fresh Claude Code session in `shipment-service/` for the recording.

## Other things the reviewer said

- Minor: the "update matched zero rows" branch is correct but untested. Every 409 test is caught first by the domain `checkRevision` check, and one synchronous connection cannot race. Worth saying when you talk about concurrency.
- Minor: the AC2 tests don't prove "changes nothing" fully. The unknown-terminal test does not check the audit and idempotency tables, and the 400 test checks no state at all.
- Informational: body validation runs before the idempotency lookup, so a repeated key with a malformed body gets 400, not the replay. That follows the agreed check order but is worth a line in the spec.
- Informational: nothing sweeps expired idempotency keys.
- Slip: its `file:line` references were off (for example line 202 in a 74-line file). The findings themselves were right.

What I'd build next: telling other systems about the change, and a clean-up job for expired idempotency keys.

## Review agent test on the baseline

On a throwaway branch (deleted) a migration that drops `created_at` was reported as critical with "DO NOT MERGE" and "Human review required". It also found that the read path, the seed and two tests would break. One slip: it named the function `getShipment`, but the real name is `findById`.

## Setup facts for the recording

- Local Node is v25. `.nvmrc` pins 22.18 and CI uses it. Scripts run TypeScript natively, so there is no build step.
- A commit with a lint error is blocked by Husky (tested: `no-explicit-any` stopped it).
- The pre-commit hook runs lint-staged, typecheck and unit tests, so each commit takes a few seconds.
