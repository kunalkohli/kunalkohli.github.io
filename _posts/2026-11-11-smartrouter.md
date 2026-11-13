---
layout: post
post_class: smartrouter-post
title: "I Built an LLM Router to Pick Models Intelligently and Save $$"
date: 2026-11-11 22:45:00 -0500
categories: [projects, ai, developer-tools]
comments: true
published: true
description: "Astra plans. Jev chooses who builds. An OpenCode plugin that routes execution to an eligible free model or Terra/Sol, while keeping native subscription authentication."
excerpt: "Why use the biggest model for every turn? I built an OpenCode plugin that separates planning from execution, makes one routing decision per session, and asks before proceeding when confidence is low."
---

The part of using an AI coding agent that started bothering me wasn't writing prompts. It was **choosing the model**.

- 🧠 **Pick the strongest model:** it does everything—understand the problem, make a plan, read files, change a label, add boilerplate, run tests, even fix a typo. **The same model handles both the hard thinking and the routine work, wasting expensive tokens on easy tasks.**
- 💸 **Pick a cheaper model:** it saves money, but **output quality can fall short on tough tasks**.

I wanted a different arrangement:

- **Choose a model with sufficient quality for the task at hand.** Optimize for both cost and output quality, with **quality as the primary driver**.
- **Pick the execution model once for the full implementation in a session**, rather than choosing again on every turn.

So I built [smartLLMrouter](https://github.com/kunalkohli/smartLLMrouter), a plugin for [OpenCode](https://opencode.ai/).

<!--more-->

## 🧭 The idea: plan once, route the build

The entry in the model picker is **smartrouter - openai**. The OpenAI suffix identifies the planning family, not a restriction that every build must use OpenAI.

1. 🧠 **Plan with Astra**, through my existing OpenAI sign-in in OpenCode.
2. 🎯 **Classify with [Jev](https://www.typesafe.ai/):** switch to Build and send an instruction. Jev reads the finished plan and the build request.
3. 🛠️ **Choose the executor:** an eligible **free model**, or **OpenAI Terra/Sol** when the work calls for it.
4. ✋ **Ask before proceeding** if routing confidence is below **0.80**.
5. 💾 **Cache the choice for the session** and reuse it for later Build turns.

**Astra is Plan-only.** It is not an emergency Build fallback.

<figure>
  <a href="{{ '/img/smartrouter/05-user-sketch.png' | relative_url }}">
    <img src="{{ '/img/smartrouter/05-user-sketch.png' | relative_url }}" width="2370" height="1320" loading="lazy" alt="A user selects smartrouter - openai. Astra plans; the first Build instruction goes to Jev, which chooses a free model or Terra/Sol. Confidence below 0.80 requires approval. Later Build turns reuse the cached session choice.">
  </a>
  <figcaption>Astra plans. Jev chooses who builds. Open the diagram for the full-size version.</figcaption>
</figure>

## 🎬 See it working

This is a **live recording of the implementation in play**.

- **At the start:** Smart Router is selected in Plan, and Astra prepares a stock-dashboard plan.
- **Around 22 seconds:** the first Build instruction triggers routing, and **💰 OpenCode reports the switch to GLM Free.**
- **After the handoff:** the picker shows GLM Free and the session contains a Jev decision notice.

<figure>
  <video controls playsinline preload="none" width="3018" height="1578" poster="{{ '/img/smartrouter/demo-poster.jpg' | relative_url }}" aria-label="Silent live demonstration of Smart Router in OpenCode" aria-describedby="smartrouter-demo-caption" style="display:block;width:100%;height:auto;border-radius:8px;background:#111;">
    <source src="{{ '/video/smartrouter-demo.mp4' | relative_url }}" type="video/mp4">
    Your browser does not support embedded video. <a href="{{ '/video/smartrouter-demo.mp4' | relative_url }}">Open the MP4 recording</a>.
  </video>
  <figcaption id="smartrouter-demo-caption">A 36-second silent screen recording. Use fullscreen to read the terminal. <a href="{{ '/video/smartrouter-demo.mp4' | relative_url }}">Open the video separately</a>.</figcaption>
</figure>

### 🖼️ What the routed model built

And this is the resulting stock-dashboard UI after letting the router choose GLM Free for the build.

<figure>
  <a href="{{ '/img/smartrouter/stock-trends-result.jpg' | relative_url }}">
    <img src="{{ '/img/smartrouter/stock-trends-result.jpg' | relative_url }}" width="2000" height="870" loading="lazy" alt="The stocktrends prototype produced after automatic routing to GLM Free: a left-hand watchlist, stock search, market overview, selected ETF price card, green intraday chart, time-range controls, and market statistics.">
  </a>
  <figcaption>The output from the automatically routed build. Open the screenshot for the full-size view.</figcaption>
</figure>

**For a prototype built with a free model, I think this is really decent.** The requirements were stable, and the free model delivered a good result.

## 🎯 Why Jev for classification?

Choosing from a fixed set of models is a **classification problem**, not another open-ended coding task. [Jev](https://www.typesafe.ai/) is built for structured decisions, so I don't need a second conversational LLM to deliberate about the route.

- **One request** chooses the execution family and model, while assessing infrastructure and security risks.
- **Structured answers and confidence values** make the choice visible and let the plugin ask for approval when uncertain.
- **A cached decision** keeps classification out of the repeated Build loop.

## 💰 What did the free build save?

Across **25 completed GLM Build requests**, these were the recorded tokens and their equivalent cost at Sol's Standard API rates:

| Token category | Recorded tokens | Sol Standard API rate / million | Same-usage Sol estimate |
|---|---:|---:|---:|
| Uncached input | 34,658 | $2.00 | $0.0693 |
| Cached input reads | 444,992 | $0.10 | $0.0445 |
| Output + reasoning | 18,420 | $10.00 | $0.1842 |
| **Build total** | **498,070** | | **$0.2980 ≈ $0.30** |

**💰 At Sol's API pricing, the same token usage and cache split would cost about $0.30. With the router, the GLM build cost $0 because it routed to a free model.**

The saving is small here because the requirements were simple. For larger projects spanning multiple conversations, **those avoided build costs can stack up** whenever a free model is sufficient.

## 🚀 Try it

The code and setup instructions are in [smartLLMrouter on GitHub](https://github.com/kunalkohli/smartLLMrouter).

**To use native routing, you need:**

- **OpenCode** with the plugin loaded.
- **An existing OpenAI OAuth sign-in.**
- **A Jev credential** for classification.
