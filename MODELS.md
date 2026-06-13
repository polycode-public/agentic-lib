# MODELS.md — the env-var matrix

agentic-lib 8.x runs the engine via headless `claude -p` (Path B). **Provider
selection is purely environment variables** — the workflow code never branches on
provider. The model upgrade is the value of one variable: `opus` → `fable` is just
that word.

There are two lanes. CI runs are **API-key or Bedrock metered** — there is no
Max-plan / subscription billing on either lane in CI.

## Lane selection (which env vars are set)

| | Anthropic lane | Bedrock lane |
|---|---|---|
| Switch | `ANTHROPIC_API_KEY` present | `CLAUDE_CODE_USE_BEDROCK=1` |
| Auth | the API key | GitHub OIDC → AWS role (`aws-actions/configure-aws-credentials`) |
| Region | n/a | `AWS_REGION=eu-west-2` |
| Model var | `--model <id>` (or `ANTHROPIC_MODEL`) | `ANTHROPIC_MODEL=<inference-profile-id>` |
| Billing | per-token on the key | per-token, your AWS account, own daily caps |

The other providers exist behind the same pattern but are not used here:
`CLAUDE_CODE_USE_VERTEX=1` (Google Vertex AI) and `CLAUDE_CODE_USE_FOUNDRY=1`
(Microsoft Foundry).

## Model ids

`claude -p --model` accepts the short word aliases (`opus`, `sonnet`, `haiku`) on
the Anthropic lane; the Bedrock lane needs a full **inference-profile id** in
`ANTHROPIC_MODEL`. Pick by capability/cost — `transform.yml` defaults to `sonnet`.

| Tier | Anthropic lane (`ANTHROPIC_MODEL` / `--model`) | Bedrock model id | Bedrock **eu-west-2** inference profile |
|---|---|---|---|
| Most capable | `claude-fable-5` | `anthropic.claude-fable-5` | `eu.anthropic.claude-fable-5-*` |
| Opus | `claude-opus-4-8` | `anthropic.claude-opus-4-8` | `eu.anthropic.claude-opus-4-8-*` |
| Sonnet (default) | `claude-sonnet-4-6` | `anthropic.claude-sonnet-4-6` | `eu.anthropic.claude-sonnet-4-6-*` |
| Haiku (cheap/fast) | `claude-haiku-4-5` | `anthropic.claude-haiku-4-5` | `eu.anthropic.claude-haiku-4-5-*` |

Notes:

- **Bedrock requires the cross-region inference profile**, not the bare model id,
  for these models. In `eu-west-2` the profile id carries the **`eu.`** prefix
  (e.g. `eu.anthropic.claude-sonnet-4-6-...`). The exact version suffix (`-vN:M`)
  varies — resolve it once per account with:
  `aws bedrock list-inference-profiles --region eu-west-2` and pin the returned
  `inferenceProfileId` into `ANTHROPIC_MODEL`.
- **Bedrock model access** needs the one-time use-case form approved per AWS
  account before the first invoke.
- `claude-fable-5` requires 30-day data retention (not available under ZDR) and
  has a `refusal` stop reason; treat it as the ceiling tier, above Opus pricing.

## Example CI configuration

Bedrock lane (the §7.7 default), set as repo/org **variables** + OIDC secret:

```
CLAUDE_CODE_USE_BEDROCK = 1
AWS_REGION              = eu-west-2
ANTHROPIC_MODEL         = eu.anthropic.claude-sonnet-4-6-<resolved-suffix>
AWS_OIDC_ROLE           = arn:aws:iam::<acct>:role/agentic-lib-bedrock   (secret)
```

Anthropic lane (the fallback / non-Bedrock path), set as a secret:

```
ANTHROPIC_API_KEY = sk-ant-...
```

`transform.yml` reads these and passes `--model` / the env to `claude -p` with no
code change between lanes.
