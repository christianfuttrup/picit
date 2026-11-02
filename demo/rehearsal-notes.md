# Rehearsal notes

Run on the local branch `rehearsal` (never pushed, never merged), using `demo/prompt.md`. The work is at commit `3a47c24` on that branch if you want to look at one possible outcome: `git show rehearsal`.

## What happened

1. Grilling, plan, spec, failing tests, code, `npm run check`, review agent. Every step worked.
2. The failing tests failed for the right reason: missing modules, and 404 on the new route.
3. After the code was in, `npm run check` passed on the first full run: 16 unit and 22 integration tests, lint and typecheck clean.
4. The review agent found no critical issues, one major, three minor and some informational notes. Risk tier: "Human review required" (domain, migration and transaction code all changed).

## How long it took

About 4 minutes from branch to green check, plus about 1 minute for the review. This was Claude answering its own grilling questions, so the recording will be longer: your spoken answers, reading the diff and explaining the transaction will add most of the time. Expect the AI part of the recording to take 8 to 10 minutes.

## Grilling questions and the defaults I used

The skill asks in rounds, with a recommended answer each. I answered with the recommendation. You will answer out loud.

| Question                                        | Default I used                                                                   |
| :---------------------------------------------- | :------------------------------------------------------------------------------- |
| Where does `version` live and does GET show it? | `shipments.version INTEGER NOT NULL DEFAULT 1`. Exposed on GET as an extra field |
| Is the idempotency key global or per shipment?  | Global, key alone. Same key replays the first response whatever the body         |
| Are error responses stored under the key?       | No. Only 200s, so a retry after a fix can succeed                                |
| What if the destination equals the current one? | No-op 200. No version bump, audit row or outbox event                            |
| Which check comes first, version or status?     | Version (409), then status and terminal rules (422)                              |
| What happens to an expired key?                 | Treated as absent and replaced inside the transaction                            |

Good moments to answer out loud: the global key question (a real design trade-off) and the same-destination question.

## What tripped it up

- **Real review finding.** `src/domain/clock.ts` defines `systemClock` with `new Date()`. That breaks our own rule "no `Date.now()` in the domain". Claude put it there itself. This is a true catch you can fix on camera: move `systemClock` out of `src/domain/` and update the two imports.
- **Lint on a compile-time test.** The AC1 test that proves `changeDestination` rejects a `LoadedShipment` (via `@ts-expect-error`) first ended in `expect(true).toBe(true)`. SonarJS rejected it as a trivial assertion. It was fixed by asserting on a wrapped function. Expect this to come up again.
- **Plan mode and the grilling questions are not exercised here.** The rehearsal ran without a human, so Claude asked and answered itself. On camera, check that it actually stops and waits for you.
- **Version on GET.** Adding `version` to the GET response is additive, but CLAUDE.md says "never change the shape of an existing endpoint's response". The reviewer accepted it as consistent with the spec, with a note. Be ready to explain why it is needed (clients need it to send `version`).
- **Orchestration sits in `src/db/change-destination.ts`.** The architecture section has no home for a multi-repository transaction. Claude put it in the db layer. The reviewer called this acceptable but worth watching. You may want to say how you'd name that layer in a larger service.
- **Prettier reformatted test files after writing.** Harmless, but run `npx prettier --write .` before committing or the Husky hook will do it for you.
- **Agent discovery.** A session started before `.claude/agents/code-reviewer.md` existed does not list it. Start a fresh Claude Code session in `shipment-service/` for the recording.

## Other things the reviewer said

- Minor: the request body is cast in the route. Narrow it with a small parse helper.
- Minor: `version` has no `CHECK (version >= 1)`. SQLite cannot add that to an existing column without a table rebuild.
- Minor: the "update matched zero rows" branch is correct but untested, because one synchronous connection cannot race. Worth saying when you talk about concurrency.
- Informational: nothing sweeps expired idempotency keys. A clean-up job is a good "what I'd build next" line, next to the outbox publisher.

## Review agent test on the baseline

On a throwaway branch (deleted) a migration that drops `created_at` was reported as critical with "DO NOT MERGE" and "Human review required". It also found that the read path, the seed and two tests would break. One slip: it named the function `getShipment`, but the real name is `findById`.

## Setup facts for the recording

- Local Node is v25. `.nvmrc` pins 22.18 and CI uses it. Scripts run TypeScript natively, so there is no build step.
- A commit with a lint error is blocked by Husky (tested: `no-explicit-any` stopped it).
- The pre-commit hook runs lint-staged, typecheck and unit tests, so each commit takes a few seconds.
