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

### 🧠 Why I wanted this

The thing that actually pushed me to build it wasn't health advice. It was **starting over every single time.**

Every conversation with an AI begins from nothing. You re-explain who you are, what your family history is, that you don't eat fish, that you travel a week a month, that you already tried cutting carbs and it didn't stick. By the time you've set the scene you've lost the will to ask the question. Next week you do it again.

Health is the worst possible fit for that, because it's *entirely* longitudinal. What matters is your weight trend over a year, whether your blood pressure is drifting, what you actually eat most weeks, what your family history implies. None of that fits in a fresh chat window, and none of it is worth retyping.

So I wanted something with three properties:

- **It already knows me.** Profile, family history, labs, preferences — loaded before I ask anything.
- **It remembers.** Tell it once that you won't eat fish and it never suggests salmon again.
- **It's on my phone.** Not a tab I'll forget, not a subscription I'll cancel.

The second thing I wanted came from a bad first experiment. I asked a general chatbot for a ten-year cardiovascular risk and it produced a confident, well-written, entirely invented number. That's the worst failure mode there is — wrong, specific, and impossible to distinguish from a right answer by looking at it.

The actual instruments are public. The Pooled Cohort Equations, FINDRISC, Framingham — all published, all just arithmetic. So the rule became:

> Deterministic maths produces every number. The model only explains it.

Every figure comes from a calculator written in plain TypeScript. The model can't compute one; it has to call a tool. And when a calculator *can't* honestly run — you're outside its validated age range, or you've never had a lipid panel — it returns `not_applicable` or `partial` with the exact tests you're missing, instead of estimating. That refusal turns out to be some of the most useful output in the app: a specific list to take to a doctor beats a fabricated percentage.

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

While building it I pulled the Framingham coefficients from a reference implementation rather than from memory. My recollection of one constant was `23.98`; the real value is `23.9388`. Small enough to look right, large enough to move every cardiovascular number in the app. Exactly the kind of error an LLM makes fluently and a test catches instantly.

### 🔒 Why it all stays on the phone

Family medical history is about as sensitive as personal data gets, and the moment you put it on a server you've created something worth stealing. So there's no server.

There's no backend, no database, and no accounts. The app is a static site — the host hands your browser some JavaScript and never sees anything else. Your profile, family history, labs, journal and chat history live in the browser's IndexedDB, encrypted with AES-GCM behind a passphrase and Face ID.

**Your risk scores are computed on the device and never transmitted.** That's the part I care most about: the actual calculations happen in JavaScript on your phone, so the numbers exist nowhere else.

To be precise about what *does* leave, because this is the bit people usually hand-wave: when you send a chat message, the app builds a context document from your data and sends it along with your question to whichever AI provider you configured with your own key. That document contains your profile summary, your family history, and the computed risk results — the things the model needs to answer usefully. It isn't a token-level dump of your database, but it isn't a couple of anonymous statistics either, and I'd rather say so plainly than pretend otherwise. Point the app at a local model instead and even that stops.

I did briefly consider a hosted multi-user version. That idea survived about ten minutes. Storing other people's medical history means special-category data under GDPR, plausible HIPAA exposure, and a database genuinely worth attacking. A single-user app with no server has none of those problems.

### 💾 How the remembering works

This is the part that fixes the original complaint, so it's worth spelling out.

Two things can write a memory.

**During a conversation**, the model has a `remember` tool. If you mention something durable — *"I don't eat fish"* — it can call it there and then.

**After a conversation**, a second pass re-reads the transcript and pulls out anything worth keeping. Its prompt is deliberately narrow, and most of it is a list of things *not* to extract:

- Anything already in your structured profile (age, weight, conditions, labs, family history) — that's stored properly elsewhere
- Transient state — *"felt tired today"* is not a fact about you
- Things the coach said, as opposed to things you said
- Speculation you never actually confirmed

What survives looks like *"cooks dinner but rarely breakfast — grabs coffee on the way to work"*, or *"travels for work roughly one week a month"*, each tagged as a preference, constraint, goal, history or context.

Then the important bit: **neither path saves anything directly.** Both queue the fact, and you get a small card — *three new things I learned about you* — with keep or discard on each.

<div class="mermaid">
flowchart TD
  A["You mention something in chat"] --> B{Two write paths}
  B -->|during| C["Model calls remember()"]
  B -->|after| D["Second pass distils<br/>the transcript"]
  C --> E["Queued — not saved yet"]
  D --> E
  E --> F["You keep or discard<br/>each proposed fact"]
  F -->|discard| G["Dropped"]
  F -->|keep| H["Encrypted into the vault<br/>with everything else"]
  H --> I["Loaded into the prompt on<br/>every future conversation"]
  I --> A
</div>

The approval gate is the design decision I'd defend hardest here. An automatic memory store slowly fills with confident wrong inferences, and a bad "fact" doesn't announce itself — it silently skews every answer that follows, forever. Ten seconds of review is cheap. A coach that quietly believes something untrue about you is not.

Approved facts are encrypted alongside the rest of your data, grouped by category into a short markdown document, and prepended to every future conversation. You can open the list in settings and delete anything that's gone stale.

So the loop closes: you tell it once, it asks whether it understood you correctly, and then it knows.

### 👪 Family history is the whole point

The onboarding asks who in your family had what, and — this is the part that carries the weight — **at what age**.

A parent diagnosed with heart disease at 48 means something very different from one diagnosed at 78. The first is a formal risk enhancer in the ACC/AHA guidelines. The second is roughly what happens to everybody.

So the app encodes the actual referral rules rather than letting the model paraphrase them. As a worked example: say you enter a father with high blood pressure from his forties, and a grandfather who had a heart attack at 54. You get back something like:

> **Premature heart disease in your grandfather (age 54)**
> Heart disease before 55 in a male relative is a recognised risk enhancer. It means your calculated 10-year risk understates your true risk.
> *Action:* this is a strong argument for getting a lipid panel including ApoB and Lp(a) earlier than standard guidelines suggest. Lp(a) is genetic, measured once in a lifetime, and commonly missed.

Then the coach has that context permanently. Ask it what to cook this week and it already knows sodium matters more for you than it would for someone else, without you re-explaining.

The rules are hand-written on purpose — Amsterdam-II criteria, NCCN referral thresholds, the premature-CVD age cutoffs. These are discrete, published, and consequential, and a model reciting them from memory drifts. This is the one place where boring `if` statements are unambiguously the right tool.

### 🧬 Ethnicity changes the arithmetic

This surprised me enough to be worth its own section.

The standard "overweight" BMI threshold of 25 is not universal. WHO, NICE and the ADA all use **23** for people of South and East Asian ancestry, because cardiometabolic risk shows up at a lower BMI. The waist thresholds shift too. And South Asian ancestry is itself a listed risk enhancer in the ACC/AHA cholesterol guideline.

An app that quietly applies 25 to everyone will tell a large fraction of the world they're fine when the guidelines say otherwise. So ethnicity is asked during onboarding, and the app explains why rather than just collecting it.

### 🗺️ The shape of it

Nowhere except your phone.

<img src="/img/healthify-architecture.png" alt="Healthify architecture: everything inside a device boundary, with only chat requests crossing it" style="width:100%;border-radius:8px;margin:1.5em 0;">

There's no backend, no database, and no accounts. It's a static site — the host hands your browser some JavaScript and never sees anything else. Your profile, family history, labs and chat history sit in the browser's IndexedDB, encrypted with AES-GCM.

The key handling is the part I'd defend most: a random data key encrypts the records, and that key is then wrapped **separately** by a passphrase-derived key (PBKDF2, 600k iterations) and optionally by a Face ID key using the WebAuthn PRF extension. Wrapping one key twice, instead of encrypting the data twice, means enrolling Face ID never re-encrypts the database and changing your passphrase rewrites about a hundred bytes.

I checked this rather than assumed it — dumped the raw IndexedDB after entering a profile and grepped it. No plaintext. Just `{iv, ct}`.

The only thing that ever leaves the device is a chat message, and only to the AI provider you chose with your own key. Your **risk scores never leave at all** — they're computed in JavaScript on the phone. Point it at a local model and nothing leaves the house.

I did briefly consider making it multi-user with hosted accounts. That idea survived about ten minutes. Storing other people's family medical history means special-category data under GDPR, plausible HIPAA exposure, and a database genuinely worth attacking. A single-user app with no server has none of those problems, and the best way to keep data safe is for it to never exist on your infrastructure.

### 🔧 The boring engineering bits

**Everything portable lives in `src/core/`** with zero DOM or React imports — schema, calculators, prompt construction, unit conversion. If this ever becomes a native app, that's untouched and the UI is a rewrite. It also means the risk engine is testable without a browser.

**Model IDs are fetched, not hardcoded.** My first version pinned `claude-sonnet-4-6-20250929`, and I'd guessed the date suffix. It 404'd. Now the settings screen calls the provider's models endpoint and populates a dropdown from your actual account, which doubles as a key test.

**Bring your own provider.** Anthropic, Gemini, Ollama, or anything OpenAI-compatible, each keeping its own key so switching is lossless. Gemini's free tier is genuinely free, which matters for something you'd otherwise abandon over a subscription.

**Token cost got attention.** The system prompt carries your profile, family history and computed risks — a few thousand tokens, resent every turn. Marking that block cacheable plus defaulting to brief replies took a typical exchange from roughly 4¢ to under 1¢. Five dollars of credit lasts hundreds of conversations.

**The markdown renderer is hand-written.** Model output goes through it, so `dangerouslySetInnerHTML` would be one prompt injection away from script execution against a database of medical history. It builds React nodes directly instead, which makes that impossible by construction, and link hrefs are scheme-checked so a `javascript:` URL renders as inert text.

### ⚠️ What it isn't

**It's not a diagnosis, and it's not a medical device.** Risk calculators describe populations, not individuals — a low number isn't a guarantee and a high one isn't a verdict. The most valuable thing it produces isn't a score at all, it's a specific list of questions to take to an actual doctor.

The models it implements are also re-implementations. They're tested against published examples, but there could still be bugs. If you find one and can point at a source, that's the most useful issue you could open.

### 🚀 Try it

There's no hosted version, deliberately. You deploy your own copy and it's yours:

```bash
git clone https://github.com/kunalkohli/healthify.git
cd healthify && npm install
npx vercel --prod
```

No environment variables — the API key is entered on your phone and stored encrypted on it. Open the deployment in Safari, add it to your home screen, set a passphrase, turn on Face ID. Full walkthrough in the repo's `DEPLOY.md`.

The thing I keep coming back to is how much of this project turned out to be about **restraint**. The hard part wasn't getting a model to talk about health — that's easy and mostly useless. It was building the scaffolding that stops it saying anything it can't back up, and then discovering that "I can't tell you that, but here's what would let me" is the answer people actually needed.
