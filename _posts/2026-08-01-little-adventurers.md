---
layout: post
title:  "I Built a Free, Screen-Free Learning App for Kids"
date:   2026-08-01 20:00:00
categories: [projects, ai, web, education]
comments: true
published: true
mermaid: true
---

🎈✨ **Try it live → [Little Adventurers](https://little-adventurers.vercel.app)** ✨🎈

It started with a simple frustration. I wanted printable worksheets my kids could do away from a screen — real pencil-and-paper practice for numbers and letters. But every option was either a messy pile of random PDFs, or a subscription app that pulled kids *back onto* the tablet. I wanted the opposite: a little daily routine that celebrates finishing and then gets out of the way. So I built [**Little Adventurers**](https://little-adventurers.vercel.app).

<!--more-->

### The idea

The core loop is deliberately small. Each week is a themed "adventure" (Under the Sea, Blast Off to Space, and so on). Inside a week there are **daily Numbers and Words challenges** — a fresh printable for each weekday — plus a few off-screen missions like a life skill and an imagination task. Kids print the sheet, do it with a crayon, then tap **"We did it!"** to collect points. When the whole week is done, the app throws a little celebration and the next stop on a winding journey map unlocks.

The design goal was **routine + reward without screen time**. The screen is only there to hand out the next sheet and to celebrate — the actual learning happens on paper.

Here's the shape of what a kid actually gets each week. Everything printable is **freshly generated per kid** (their name, level and interests), so no two children get the same sheet:

<div class="mermaid">
flowchart TD
  A["Each week: a themed adventure"] --> B["Printable worksheets<br/>generated fresh for each kid"]
  B --> B1["Numbers"]
  B --> B2["Writing and Words"]
  B --> B3["Coloring and Painting"]
  A --> C["Off-screen missions<br/>explore, imagine, life skill"]
  A --> D["Code Lab (age 5+)"]
  A --> E["Finish the week: points, stickers,<br/>and the next stop unlocks"]
</div>

### How it's put together

The whole thing is a single Next.js app. Pages are React Server Components that read straight from the database, and every action (finishing a task, buying something in the store, talking to the AI buddy) is a server action. There's no separate backend service to run.

<div class="mermaid">
flowchart LR
  A[Kid or parent<br/>browser] -->|HTTPS| B[Vercel<br/>Next.js server]
  B -->|SQL over HTTP| C[(Turso<br/>libSQL)]
  B -->|OpenAI-compatible<br/>request| D[[AI model:<br/>Llama on Groq]]
  C --> B
  D --> B
  B -->|HTML + printable worksheet| A
</div>

### The database

I started with SQLite, which is perfect for local development but doesn't survive on a serverless host with an ephemeral filesystem. The fix was **libSQL** (via Turso): the same SQLite dialect, but it talks over HTTP and runs as a hosted database in production. One neat property is that local dev needs zero setup — if there's no database URL, the app just opens a local SQLite file; if the URL is set, it points at Turso. Same code, two environments.

The schema is intentionally boring: `families`, `kids`, `completions`, plus a few tables for the AI and the store. The key decision was to **derive almost everything at read time**. Points, badges, which week you're on, and pacing are all computed from the `completions` rows — no denormalized "score" column to drift out of sync. Finishing a task is one insert; everything else is a query.

Worksheets are generated on the fly and **seeded** with a string unique to `kid + week + task`. That means the sheets are stable (reprint and you get the same page) but different for every kid, and I can regenerate infinite fresh practice just by changing the seed.

### The AI buddy — the fun part

This is the piece I'm most proud of. Every kid's avatar becomes a **named companion** — a turtle called Toby, a unicorn called Uma — who writes them a short weekly note, tells a printable bedtime story tied to the week's theme, and can **chat** in a strict, kid-safe voice.

Under the hood the AI layer is provider-agnostic: it's a small `fetch` to an **OpenAI-compatible** endpoint. I run it on **Llama 3.1 via Groq**, which is fast, free to start, and needs no credit card — but because it's just the OpenAI chat format, I could swap providers by changing two environment variables.

The interesting engineering isn't the API call, it's the **caching**. Generating a note on every page load would be slow, wasteful, and — worse — the story would keep changing mid-week. So the buddy content is cached in the database, keyed by the kid, the **calendar week**, and a **prompt version** tag.

<div class="mermaid">
sequenceDiagram
  participant K as Kid's dashboard
  participant V as Vercel (server)
  participant DB as Turso
  participant AI as Llama (Groq)
  K->>V: Open buddy note
  V->>DB: Look up cached note (week + version)
  alt cache hit
    DB-->>V: Return saved note
  else cache miss
    V->>AI: Generate note (theme + kid interests)
    AI-->>V: Fresh note
    V->>DB: Save it for the week
  end
  V-->>K: Show the buddy note
</div>

Two details make this robust. First, the **calendar-week key** freezes the note and story for the whole week, so finishing tasks doesn't shuffle them around — they refresh next Monday. Second, the **prompt version** in the cache key means that when I improve a prompt, every old cached row is invalidated automatically just by bumping a number. Chat is the one thing that's never cached — it sends recent turns back as history so the buddy actually remembers the conversation — and if the model ever errors, a deterministic template steps in so the UI never breaks.

To keep it genuinely useful, the note prompt asks for one *true, surprising fact* that ties the week's theme to the child's interests, anchored by real facts so it doesn't hallucinate.

### A weekly story — from real books, not AI

The one place I deliberately *didn't* use AI is the reading. AI-generated stories for kids feel flat and a little off, so instead each week serves a slice of a genuine **public-domain classic**, matched to the child's age:

- **Ages 3–4:** a short **Aesop** fable, with big emoji "picture cues" and the moral.
- **Ages 5–7:** a chapter of **The Wonderful Wizard of Oz**.
- **Ages 8–10:** a chapter of **Alice's Adventures in Wonderland**.

The implementation is pleasingly boring. A one-off script pulls the texts from **Project Gutenberg**, strips the licence boilerplate, and splits each book into chapters (or fables) as static data in the repo. A tiny `readingForWeek(level, week)` picks the right slice — cycling gracefully if the book is shorter than the school year — and a reading page renders it with a progress bar, picture cues for the little ones, and a couple of "let's talk about it" questions. No API calls, no cost, no hallucinations — just Dorothy and the cyclone, a chapter at a time.

### Hosting on Vercel

Vercel made the deploy boring in the best way. Next.js is auto-detected, server components render on demand, and the native database driver is kept out of the bundle with one config line. Environment variables hold the database URL and the AI key, and cookies are marked secure only in production so localhost still works over plain HTTP. The free Hobby tier comfortably covers a project like this.

### A store powered by points

Kids earn points for finishing work, and I wanted them to *spend* those points without ever feeling like they'd lost progress. So the economy has **two currencies**. **Lifetime earned** points (summed from completions) only ever go up and drive the badges. A separate **spendable wallet** is that lifetime total plus a ledger of spends, where each purchase is a negative entry. Buying a hat for your avatar lowers the wallet but never touches the badge count.

Spending is **idempotent**: each purchase writes a ledger row keyed by a reason string, so a double-tap or a retry can't charge twice. The store itself is a small catalog of avatar cosmetics — hats, pets, backgrounds — and equipping them just records the choice, which the avatar component reads everywhere it renders.

### Where it's at

It's live, free, and my kids actually use it — the only metric I cared about. The stack (Next.js, libSQL/Turso, and a swappable AI layer on Vercel) turned out to be a lovely way to build something small and real without standing up a pile of infrastructure. The best part is watching a five-year-old proudly tap "We did it!" on a worksheet she did in pencil, with the tablet nowhere in sight.
