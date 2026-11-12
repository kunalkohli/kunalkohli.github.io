---
layout: post
title: "I Built a Model Router for My Coding Agent"
date: 2026-11-11 22:45:00 -0500
categories: [projects, ai, developer-tools]
comments: true
published: true
description: "Astra plans. Jev chooses who builds. An OpenCode plugin that routes execution to an eligible free model or Terra/Sol, while keeping native subscription authentication."
excerpt: "Why use the biggest model for every turn? I built an OpenCode plugin that separates planning from execution, makes one routing decision per session, and asks before proceeding when confidence is low."
---

The part of using an AI coding agent that started bothering me wasn't writing prompts. It was choosing the model.

Pick the strongest one and it does everything: understand the problem, make a plan, read files, change a label, add boilerplate, run tests, fix a typo. Pick a cheaper one and I start wondering whether I've given it a problem it can't handle.

I wanted a different arrangement: **use a strong model to plan, then choose a sufficient model to execute that plan.** Not necessarily the strongest. Not blindly the cheapest. And not another model-picker decision for me on every turn.

So I built [smartLLMrouter](https://github.com/kunalkohli/smartLLMrouter), a plugin for [OpenCode](https://opencode.ai/).

<!--more-->

## The idea: plan once, route the build

The entry in the model picker is **smartrouter - openai**. The OpenAI suffix identifies the planning family, not a restriction that every build must use OpenAI.

The workflow is:

1. **Plan with Astra**, through my existing OpenAI sign-in in OpenCode.
2. Switch to Build and send an instruction. **Jev classifies the finished plan and the build request.** Toggling the agent alone doesn't trigger classification.
3. Choose an eligible **free model**, or **OpenAI Terra/Sol** when the work calls for it.
4. Ask for approval if routing confidence is below **0.80**.
5. **Cache the choice for the session** and reuse it for later Build turns.

Astra is Plan-only. It is not an emergency Build fallback.

<figure>
  <a href="{{ '/img/smartrouter/05-user-sketch.png' | relative_url }}">
    <img src="{{ '/img/smartrouter/05-user-sketch.png' | relative_url }}" width="2370" height="1320" loading="lazy" alt="A user selects smartrouter - openai. Astra plans; the first Build instruction goes to Jev, which chooses a free model or Terra/Sol. Confidence below 0.80 requires approval. Later Build turns reuse the cached session choice.">
  </a>
  <figcaption>Astra plans. Jev chooses who builds. Open the diagram for the full-size version.</figcaption>
</figure>

## See it working

This is a live recording of the project, not an animation of the architecture. It has no audio.

- **At the start:** Smart Router is selected in Plan, and Astra prepares a stock-dashboard plan.
- **Around 22 seconds:** the first Build instruction triggers routing, and OpenCode reports the switch to GLM Free.
- **After the handoff:** the picker shows GLM Free and the session contains a Jev decision notice.

The clip ends while the build model is thinking. It demonstrates the handoff, not a completed app.

<figure>
  <video controls playsinline preload="none" width="3018" height="1578" poster="{{ '/img/smartrouter/demo-poster.jpg' | relative_url }}" aria-label="Silent live demonstration of Smart Router in OpenCode" aria-describedby="smartrouter-demo-caption" style="display:block;width:100%;height:auto;border-radius:8px;background:#111;">
    <source src="{{ '/video/smartrouter-demo.mp4' | relative_url }}" type="video/mp4">
    Your browser does not support embedded video. <a href="{{ '/video/smartrouter-demo.mp4' | relative_url }}">Open the MP4 recording</a>.
  </video>
  <figcaption id="smartrouter-demo-caption">A 36-second silent screen recording. Use fullscreen to read the terminal. <a href="{{ '/video/smartrouter-demo.mp4' | relative_url }}">Open the video separately</a>.</figcaption>
</figure>

## One classifier call, several explicit decisions

I didn't want a second conversational LLM deliberating about which conversational LLM to use. This is a bounded classification problem: here is the work, here are the eligible choices, which route fits?

Jev returns structured answers. A single request asks:

- **Family:** is a free model sufficient, or does this need OpenAI?
- **Free model:** if the family is free, which available free model fits?
- **OpenAI model:** if OpenAI is needed, Terra or Sol?
- **Infrastructure risk:** does the work actually change production infrastructure, schemas, migrations, or similar boundaries?
- **Security risk:** does it change authentication, authorization, credential lifecycle, financial execution, or other sensitive boundaries?

Those model questions are **conditional**, not additional votes. If the chosen family is free, a confident conditional answer of “Terra” doesn't make the route OpenAI.

The session notice shows the family and model answers with **separate confidence values**, marks unused choices as conditional, and shows the final route. Risk guards can promote work to OpenAI, with Sol reserved by the guard for high-risk changes.

The approval gate uses the minimum of the relevant confidence values rather than an average that could hide uncertainty. Below 0.80, the user must approve. A high classifier score is not a promise that the resulting code will be correct.

## The interesting bug was in the rubric

An early version routed an ordinary app plan to Terra with low confidence. The tempting response was to add more questions.

That wasn't what the case needed. The existing descriptions overlapped:

- Free models were described as suitable for **small, mechanical, routine work**.
- OpenAI was described as suitable for **substantial features requiring reliable engineering judgment**.

A conventional multi-file dashboard can fit both descriptions. “Substantial” says something about how much there is to type, but not necessarily how difficult the remaining decisions are after a planner has broken the work down.

I clarified the questions instead. Standard charts, search, watchlists, localStorage, conventional tests, and a thin read-only API proxy can qualify for free execution. Merely reading a provider key from a server-side environment variable isn't the same as redesigning credential storage or authorization. Displaying public financial data isn't the same as placing trades.

Hard debugging, unfamiliar cross-system design, real security-boundary changes, and financial execution still belong in a different category.

Replaying the **same private prototype plan** through the classifier changed the result:

| Rubric | Selected route | Approval-gate confidence |
|---|---|---|
| Original | Terra | 0.32 |
| Revised | GLM Free | 0.96 |

An authentication and financial-execution control remained on Sol. I didn't force GLM in code or lower the approval threshold.

**This was a classifier replay, not proof that GLM implemented the app successfully.** It showed that the routing criteria now expressed the distinction I intended. It did not measure executor quality or calibrate the confidence scores.

The lesson for me: before adding questions, check whether the existing answers describe genuinely different things.

## The less glamorous requirement: keep my existing allowance

A router that quietly replaces subscription usage with separately billed API calls would solve the wrong problem.

The native implementation leaves **authentication, OAuth refresh, transport, tools, and streaming with OpenCode**. The plugin selects the native model; it doesn't extract OpenAI tokens or recreate the provider's client.

OpenAI routes require a healthy OAuth connection. Free candidates must be enabled, support tools, and have explicitly zero catalog prices. The current build allowlist includes GLM Flash Free, LongCat Free, DeepSeek Flash Free, Terra, and Sol.

That doesn't make the entire system free. OpenAI calls still consume subscription allowance and remain subject to its limits. Jev is a separate classifier service with its own credential. Free-model availability can change.

There is also a privacy boundary worth stating: **Jev receives a bounded digest of the finished plan and the build instruction.** Keeping model credentials out of the plugin doesn't mean task text never goes to an external service.

Missing credentials, invalid classifier answers, or an unavailable chosen model stop the build. There is no silent fallback to Astra or a paid API.

## Yes, the model picker changes

My original mental picture was that Smart Router would stay selected forever, with the executor hidden underneath.

The working version makes a real native session-model switch. If Jev chooses Terra, the picker shows Terra. If it chooses GLM, it shows GLM. A session notice explains the routing decision.

I initially treated that as a UX issue. I've decided I'm happy with the tradeoff: **the selector tells me which model is actually serving the build**, and the plugin retains the session's cached route.

That route survives plugin reloads. Returning to Plan restores the Astra-backed router selection on the next prompt; returning to Build reuses the cached decision. Choosing a different model manually opts out of the managed route.

Two commands make the state explicit:

- `/smartrouter-status` shows the cached decision without another classifier call.
- `/smartrouter-reset` clears it so the next Build instruction can classify again.

Changing the rubric doesn't silently reclassify existing sessions. A deliberate reset or a fresh session is required.

## What did the free build save?

After the initial stock-app build, OpenCode showed **26.9K (13%)**. That is a context indicator, **not the cumulative tokens processed across the build**. An agent sends context again as it reads files, calls tools, and continues working.

I checked the per-request counters at that exact checkpoint. Across **25 completed GLM Build requests**, the recorded usage was:

| Token category | Recorded tokens | Sol Standard API rate / million | Same-usage Sol estimate |
|---|---:|---:|---:|
| Uncached input | 34,658 | $2.00 | $0.0693 |
| Cached input reads | 444,992 | $0.10 | $0.0445 |
| Output + reasoning | 18,420 | $10.00 | $0.1842 |
| **Build total** | **498,070** | | **$0.2980 ≈ $0.30** |

The output row combines 13,363 visible output tokens and 5,057 reasoning tokens. There were no recorded cache writes. Rates are from [OpenAI's GPT-6.1 Sol model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol), checked on 11 November 2026; this uses Standard pricing, not Fast, Batch, or Flex.

The calculation is:

```text
Sol API-equivalent build cost
  = (34,658 × $2 + 444,992 × $0.10 + 18,420 × $10) / 1,000,000
  = $0.2980152
```

| Build scenario | Build-model token charge |
|---|---:|
| Actual GLM Free build | **$0.00** |
| Hypothetical Sol API build, same tokens and cache-hit profile | **about $0.30** |
| Hypothetical Sol API build, same tokens but all input uncached | **about $1.14** |

**This is a price comparison, not a measured Sol run.** Sol could take different steps, generate different amounts of reasoning, and achieve different cache hits. The $1.14 scenario assumes all 479,650 input tokens are charged at the uncached rate; it is not an upper bound on what a real Sol execution could cost. These figures cover the initial-build checkpoint, not subsequent follow-up work.

For my actual setup, **GLM's build-model charge was zero; Astra still consumed my existing subscription allowance for planning**. If I had used Sol through that same subscription, it would also consume allowance rather than automatically create a $0.30 API invoice. The benefit there is preserving allowance, not claiming a cash refund or a measured percentage reduction in my subscription bill.

There is one more small cost: **Jev is separate**. Its [published rate](https://docs.typesafe.ai/models) is $0.042 per million input tokens, with free output. For scale, 2,000 billed classifier-input tokens would cost $0.000084. That is an illustration, not this run's measured classifier fee—the plugin did not retain Jev's billed token count. Astra planning and Jev classification are excluded from the build-only table, so **the whole workflow is not being claimed as $0**.

I've included the [sanitized usage snapshot and pricing assumptions]({{ '/docs/smartrouter-cost-example.json' | relative_url }}) with the post. It contains counters, not the private plan or credentials.

## What I've verified—and what I haven't

The implementation currently has **48 passing unit tests**, covering routing, approvals, caching, concurrent prompt admission, manual model changes, eligibility checks, and the Plan-only guard.

I also ran native smoke tests: Astra planning followed by a LongCat Free build probe, and a low-confidence Sol route that waited for approval before responding. A second Build turn reused the cached choice without another Jev decision. Those were no-tools probes, not end-to-end software-quality benchmarks.

What I **haven't** established is a measured subscription-allowance saving, equal code quality across executors, or a perfectly calibrated routing policy. The API-equivalent estimate above puts a price on one recorded workload; those broader claims need real comparisons and outcome tracking.

## Try it, or follow the next iteration

The code and setup instructions are in [smartLLMrouter on GitHub](https://github.com/kunalkohli/smartLLMrouter). The native implementation and rubric changes are collected in [PR #5](https://github.com/kunalkohli/smartLLMrouter/pull/5).

It needs OpenCode, an existing OpenAI OAuth sign-in, and a Jev credential. It does not require a separate OpenAI API key for native routing. The repository also retains an older, explicitly opt-in API-proxy mode; that is not the subscription-backed setup described here.

Next I want to measure outcomes and actual allowance usage, beyond routing labels and the API-equivalent estimate. An Anthropic planning-family entry is a future idea, not something the current plugin implements.

The useful shift was smaller than “build a smarter agent.” It was **stop treating planning and execution as the same job**—and make the handoff visible enough that I can tell what the router actually did.
