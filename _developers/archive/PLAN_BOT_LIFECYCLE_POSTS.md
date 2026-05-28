# PLAN: Bot Lifecycle Posts

## User Assertions (non-negotiable)

1. On the first workflow run after `init --purge`, the bot must post the website URL and the mission it is working on.
2. When a user requests an update via the discussion thread, the supervisor must post feedback back to the discussion (not just acknowledge and go silent).
3. When the mission is complete or failed, the bot must post to the discussion thread with the website URL.

None of these things currently happen.

## Root Cause Analysis

### Problem 1: No mission-start announcement

**Where it should happen**: The supervisor prompt says under "Mission Initialised": dispatch the bot to announce the new mission with the website URL.

**Why it doesn't**: The supervisor relies on the LLM (gpt-5-mini) noticing the init timestamp in the context and deciding to dispatch the bot. But the LLM prioritises creating issues and dispatching transforms — it doesn't reliably follow the "dispatch bot on init" instruction.

**Fix**: Make the announcement deterministic, not LLM-dependent. Either:
- (A) The init workflow itself posts to the discussion, or
- (B) The supervisor code (`supervise.js`) detects "first run after init" and dispatches the bot automatically before asking the LLM.

Option B is preferred because the supervisor has the context (discussion URL, website URL, mission text) and can compose a meaningful message.

**Files to change**:
- `src/actions/agentic-step/tasks/supervise.js` — add init-detection logic in `supervise()` that dispatches bot before running the LLM

### Problem 2: Supervisor doesn't post feedback after discussion referral

**Where it should happen**: The `respond:discussions` action exists in the supervisor prompt. When the bot receives a user message and uses `request-supervisor`, the supervisor workflow runs with a `message` parameter. The supervisor should process the message and use `respond:discussions` to post back.

**Why it doesn't**: Three issues compound:

1. **The bot dispatches `agentic-lib-workflow` with `-f message=...`** — this sets the `message` input on the workflow. The message reaches the supervisor via `needs.params.outputs.message`.

2. **The supervisor sees the message in context** but the LLM doesn't reliably use `respond:discussions` to reply. It treats the message as advisory context.

3. **Even if the LLM chose `respond:discussions`**, the `executeRespondDiscussions` function dispatches `agentic-lib-bot.yml` — but it doesn't pass the `discussion-url`. Looking at the code:
   ```js
   const inputs = { message };
   if (url) inputs["discussion-url"] = url;
   ```
   The `url` comes from `params["discussion-url"]` which the LLM must include. But even if it does, the bot workflow's `workflow_dispatch` `discussion-url` input is optional and defaults to `""`. And the `Get discussion URL` step only sets the URL from the event payload or the input — so if the input is empty, the response step is skipped entirely (it requires a non-empty URL).

4. **The `dispatch:agentic-lib-bot` action** (the generic dispatch) doesn't pass any inputs at all — not the discussion URL, not the message. It just triggers the workflow with empty inputs, which means the bot has no discussion to respond to and does nothing.

**Fix**: Make the supervisor reliably post back to the discussion when a message referral is present. Two changes:

1. **In `supervise.js`**: When `ctx.activeDiscussionUrl` is set AND there's a `message` input from the workflow, automatically include a `respond:discussions` action with the discussion URL — don't rely on the LLM to do this.

2. **In `executeRespondDiscussions`**: Ensure the discussion URL from the supervisor context is used as fallback when the LLM doesn't specify one.

3. **In `executeDispatch` for `dispatch:agentic-lib-bot`**: Pass the `discussion-url` param if the supervisor has one in context.

**Files to change**:
- `src/actions/agentic-step/tasks/supervise.js` — auto-respond when message referral is present; pass discussion-url in dispatch

### Problem 3: No mission-complete/failed announcement

**Where it should happen**: The supervisor prompt says under "Mission Accomplished": use `mission-complete` then `dispatch:agentic-lib-bot` to announce. Under "Mission Failed": same pattern.

**Why it doesn't**: Two separate code paths can declare mission complete:

1. **The supervisor** via `executeMissionComplete()` — this writes `MISSION_COMPLETE.md` and sets schedule to off. It does NOT dispatch the bot. The prompt tells the LLM to do both `mission-complete` AND `dispatch:agentic-lib-bot` as separate actions, but the LLM may not do both.

2. **The transform** via a keyword match in `transform.js` lines 173-187 — when the LLM output contains "mission is satisfied", "mission is complete", or "no changes needed", it writes `MISSION_COMPLETE.md` directly. This path has NO supervisor involvement and NO bot dispatch.

In the FizzBuzz benchmark, path 2 is what happened (detected by transform, not supervisor).

**Fix**: Make the bot announcement part of the mission-complete/failed action itself, not a separate LLM-dependent step.

1. **In `executeMissionComplete()`**: After writing `MISSION_COMPLETE.md` and setting schedule to off, dispatch the bot with a pre-composed message and the discussion URL.

2. **In `executeMissionFailed()`**: Same — dispatch the bot.

3. **In `transform.js` mission-complete detection**: Either (a) remove this code path entirely and let the supervisor handle it, or (b) also dispatch the bot here.

Option (a) is cleaner — the supervisor should be the single authority for mission lifecycle declarations.

**Files to change**:
- `src/actions/agentic-step/tasks/supervise.js` — add bot dispatch to `executeMissionComplete()` and `executeMissionFailed()`
- `src/actions/agentic-step/tasks/transform.js` — remove the mission-complete detection (lines 173-187) or defer to supervisor

## Implementation Status

All 7 steps implemented. 420 tests passing.

## Implementation Plan

### Step 1: Add discussion URL to supervisor context (DONE)

The supervisor already extracts `activeDiscussionUrl` from the activity log. But it also needs the discussion URL from the init's "Talk to the repository" discussion. Add a fallback: if no discussion URL is in the activity log, look up the latest "Talk to the repository" discussion via the GitHub API.

**File**: `src/actions/agentic-step/tasks/supervise.js` in `gatherContext()`

### Step 2: Auto-announce on first run after init (DONE)

In `supervise()`, before calling the LLM, check if this is the first supervisor run after init (no previous supervisor entries in the activity log since `initTimestamp`). If so, compose a discussion reply announcing the mission and website URL, and dispatch the bot.

**File**: `src/actions/agentic-step/tasks/supervise.js` in `supervise()`

### Step 3: Auto-respond on message referral (DONE)

In `supervise()`, after executing the LLM's chosen actions, check if there was a `message` input and whether any of the executed actions included a discussion response. If not, auto-dispatch a `respond:discussions` with the supervisor's reasoning as the message.

**File**: `src/actions/agentic-step/tasks/supervise.js` in `supervise()`

### Step 4: Bot dispatch on mission-complete/failed (DONE)

In `executeMissionComplete()` and `executeMissionFailed()`, after writing the signal file and setting schedule to off, dispatch the bot with a composed message including the website URL and reason.

**File**: `src/actions/agentic-step/tasks/supervise.js` in `executeMissionComplete()` and `executeMissionFailed()`

### Step 5: Remove transform's mission-complete detection (DONE)

Remove lines 173-187 in `transform.js` that detect mission-complete via keyword matching. The supervisor is the proper authority for this — the transform should just report what it did and let the supervisor decide.

If removing entirely is too aggressive (the supervisor might miss it), keep the detection but instead of writing `MISSION_COMPLETE.md`, set a flag in the output that the supervisor can check on the next cycle.

**File**: `src/actions/agentic-step/tasks/transform.js`

### Step 6: Pass discussion-url through dispatch (DONE)

Update `executeDispatch()` to pass `discussion-url` when dispatching `agentic-lib-bot.yml`, if the supervisor has one in context.

**File**: `src/actions/agentic-step/tasks/supervise.js` in `executeDispatch()`

### Step 7: Find the "Talk to the repository" discussion URL (DONE)

Add a helper that fetches the latest "Talk to the repository" discussion URL via GraphQL. Use this as the default discussion target when the supervisor needs to post.

**File**: `src/actions/agentic-step/tasks/supervise.js` — new helper function

## Testing

- Run the fizz-buzz scenario again after the fix (`init --purge`)
- Verify: first workflow run posts to discussion with mission + website URL
- Verify: commenting on the discussion gets a supervisor reply (not just "acknowledged")
- Verify: when mission completes, a discussion post appears with the website URL

## Files Summary

| File | Changes |
|------|---------|
| `src/actions/agentic-step/tasks/supervise.js` | Steps 1-4, 6-7 |
| `src/actions/agentic-step/tasks/transform.js` | Step 5 |
| `src/agents/agent-supervisor.md` | No changes needed (prompts are already correct, the issue is execution) |
| `src/agents/agent-discussion-bot.md` | No changes needed |
| `.github/workflows/agentic-lib-bot.yml` | No changes needed (accepts discussion-url input already) |
