---
layout: post
title:  "I Built a Health Coach That Isn't Allowed to Guess"
date:   2026-09-04 20:00:00
categories: [projects, ai, health, web]
comments: true
published: true
mermaid: true
---

🩺 **Code → [github.com/kunalkohli/healthify](https://github.com/kunalkohli/healthify)** — deploy your own in about ten minutes.

Most people carry around a rough sense of their family's medical history and almost no sense of what it means for them. Maybe a grandparent had a stroke; maybe a parent has been on blood pressure tablets for years. You know it matters. You have no idea what to *do* about it, and it feels like the sort of question to save for a doctor's appointment you'll book eventually.

So I did the obvious thing and asked a chatbot. It gave me a confident, well-written, completely made-up number. That was the moment the project got interesting — not "can an LLM talk about health", but **"how do you build something that is structurally incapable of inventing a risk score?"**

<!--more-->

### The number problem

Ask any general-purpose model for a ten-year cardiovascular risk and it will happily produce "roughly 8–12%". It sounds plausible. It's generated the same way as everything else it says — as text that fits the context.

For most questions that's fine. For a number you might make decisions on, it's the worst possible failure mode: **wrong, specific, and confident.** You can't tell it apart from a right answer by looking at it.

The actual instruments exist and are public. The Pooled Cohort Equations, FINDRISC, the Framingham models — all published, all just arithmetic. So the design rule wrote itself:

> Deterministic maths produces every number. The model only explains it.

Every risk figure in the app comes from a calculator implemented in plain TypeScript. The model can't compute one; it has to call a tool. And the system prompt forbids it from stating a figure that didn't come back from one.

<div class="mermaid">
sequenceDiagram
  participant You
  participant App as App (your phone)
  participant Engine as Risk engine (local)
  participant Model as AI provider
  You->>App: "What should I focus on first?"
  App->>Model: question + your profile and family history
  Model->>App: tool call — compute_risk(findrisc)
  App->>Engine: run the calculator
  Engine-->>App: 12/26 · 1 in 6 over 10 years
  App-->>Model: the number, plus the inputs used
  Model-->>You: explanation, ranked by what you can change
</div>

The interesting consequence is what happens when a calculator *can't* run.

### Refusing is a feature

The ASCVD equations are validated for ages 40–79 and need a lipid panel. If you're 34, or you've never had bloodwork, there is no honest ten-year number. A language model asked this question will estimate anyway. The engine returns one of three things:

```
ok            → here's the number, and every input used to get it
partial       → can't compute; here are the exact tests you're missing
not_applicable → this model doesn't apply to you, and here's why
```

That last one produces some of the most useful output in the app:

> The Pooled Cohort Equations are only validated for ages 40–79, and you're 34. No trustworthy 10-year number exists for you yet. What matters at your age is lifetime risk and the trajectory of your inputs — blood pressure, LDL, weight, activity, smoking.

And when it's `partial`, it turns into a shopping list — *these four tests, and here's what each one unlocks*. Walking into an appointment with that is worth more than a fabricated percentage.

There's a test suite pinning this. Some of it checks published worked examples (a 55-year-old with total cholesterol 213, HDL 50, untreated systolic 120 should come out at 5.3% — if that drifts, a coefficient is wrong and so is everything else). But a good chunk of it just asserts that the engine **refuses correctly**: out of range, missing inputs, already diagnosed.

While building it I pulled the Framingham coefficients from a reference implementation rather than from memory. My recollection of one constant was `23.98`; the real value is `23.9388`. Small enough to look right, large enough to move every cardiovascular number in the app. That's exactly the kind of error an LLM makes fluently and a test catches instantly.

### Family history is the whole point

The onboarding asks who in your family had what, and — this is the part that carries the weight — **at what age**.

A parent diagnosed with heart disease at 48 means something very different from one diagnosed at 78. The first is a formal risk enhancer in the ACC/AHA guidelines. The second is roughly what happens to everybody.

So the app encodes the actual referral rules rather than letting the model paraphrase them. As a worked example: say you enter a father with high blood pressure from his forties, and a grandfather who had a heart attack at 54. You get back something like:

> **Premature heart disease in your grandfather (age 54)**
> Heart disease before 55 in a male relative is a recognised risk enhancer. It means your calculated 10-year risk understates your true risk.
> *Action:* this is a strong argument for getting a lipid panel including ApoB and Lp(a) earlier than standard guidelines suggest. Lp(a) is genetic, measured once in a lifetime, and commonly missed.

Then the coach has that context permanently. Ask it what to cook this week and it already knows sodium matters more for you than it would for someone else, without you re-explaining.

The rules are hand-written on purpose — Amsterdam-II criteria, NCCN referral thresholds, the premature-CVD age cutoffs. These are discrete, published, and consequential, and a model reciting them from memory drifts. This is the one place where boring `if` statements are unambiguously the right tool.

### Ethnicity changes the arithmetic

This surprised me enough to be worth its own section.

The standard "overweight" BMI threshold of 25 is not universal. WHO, NICE and the ADA all use **23** for people of South and East Asian ancestry, because cardiometabolic risk shows up at a lower BMI. The waist thresholds shift too. And South Asian ancestry is itself a listed risk enhancer in the ACC/AHA cholesterol guideline.

An app that quietly applies 25 to everyone will tell a large fraction of the world they're fine when the guidelines say otherwise. So ethnicity is asked during onboarding, and the app explains why rather than just collecting it.

### Where the data lives

Nowhere except your phone.

<img src="/img/healthify-architecture.png" alt="Healthify architecture: everything inside a device boundary, with only chat requests crossing it" style="width:100%;border-radius:8px;margin:1.5em 0;">

There's no backend, no database, and no accounts. It's a static site — the host hands your browser some JavaScript and never sees anything else. Your profile, family history, labs and chat history sit in the browser's IndexedDB, encrypted with AES-GCM.

The key handling is the part I'd defend most: a random data key encrypts the records, and that key is then wrapped **separately** by a passphrase-derived key (PBKDF2, 600k iterations) and optionally by a Face ID key using the WebAuthn PRF extension. Wrapping one key twice, instead of encrypting the data twice, means enrolling Face ID never re-encrypts the database and changing your passphrase rewrites about a hundred bytes.

I checked this rather than assumed it — dumped the raw IndexedDB after entering a profile and grepped it. No plaintext. Just `{iv, ct}`.

The only thing that ever leaves the device is a chat message, and only to the AI provider you chose with your own key. Your **risk scores never leave at all** — they're computed in JavaScript on the phone. Point it at a local model and nothing leaves the house.

I did briefly consider making it multi-user with hosted accounts. That idea survived about ten minutes. Storing other people's family medical history means special-category data under GDPR, plausible HIPAA exposure, and a database genuinely worth attacking. A single-user app with no server has none of those problems, and the best way to keep data safe is for it to never exist on your infrastructure.

### The boring engineering bits

**Everything portable lives in `src/core/`** with zero DOM or React imports — schema, calculators, prompt construction, unit conversion. If this ever becomes a native app, that's untouched and the UI is a rewrite. It also means the risk engine is testable without a browser.

**Model IDs are fetched, not hardcoded.** My first version pinned `claude-sonnet-4-6-20250929`, and I'd guessed the date suffix. It 404'd. Now the settings screen calls the provider's models endpoint and populates a dropdown from your actual account, which doubles as a key test.

**Bring your own provider.** Anthropic, Gemini, Ollama, or anything OpenAI-compatible, each keeping its own key so switching is lossless. Gemini's free tier is genuinely free, which matters for something you'd otherwise abandon over a subscription.

**Token cost got attention.** The system prompt carries your profile, family history and computed risks — a few thousand tokens, resent every turn. Marking that block cacheable plus defaulting to brief replies took a typical exchange from roughly 4¢ to under 1¢. Five dollars of credit lasts hundreds of conversations.

**The markdown renderer is hand-written.** Model output goes through it, so `dangerouslySetInnerHTML` would be one prompt injection away from script execution against a database of medical history. It builds React nodes directly instead, which makes that impossible by construction, and link hrefs are scheme-checked so a `javascript:` URL renders as inert text.

### What it isn't

It's not a diagnosis, and it's not a medical device. Risk calculators describe populations, not individuals — a low number isn't a guarantee and a high one isn't a verdict. The most valuable thing it produces isn't a score at all, it's a specific list of questions to take to an actual doctor.

The models it implements are also re-implementations. They're tested against published examples, but there could still be bugs. If you find one and can point at a source, that's the most useful issue you could open.

### Try it

There's no hosted version, deliberately. You deploy your own copy and it's yours:

```bash
git clone https://github.com/kunalkohli/healthify.git
cd healthify && npm install
npx vercel --prod
```

No environment variables — the API key is entered on your phone and stored encrypted on it. Open the deployment in Safari, add it to your home screen, set a passphrase, turn on Face ID. Full walkthrough in the repo's `DEPLOY.md`.

The thing I keep coming back to is how much of this project turned out to be about **restraint**. The hard part wasn't getting a model to talk about health — that's easy and mostly useless. It was building the scaffolding that stops it saying anything it can't back up, and then discovering that "I can't tell you that, but here's what would let me" is the answer people actually needed.
