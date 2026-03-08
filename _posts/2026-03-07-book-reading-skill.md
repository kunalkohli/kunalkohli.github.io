---
layout: post
title:  "I Built an AI Skill to Make Me a Better Reader"
date:   2026-03-07 22:00:00
categories: [ai, claude, llm, productivity, books]
comments: true
published: true
---

I love reading, but I had a problem: I'd finish a book and struggle to recall the key ideas two weeks later. Highlighting didn't help. Notes felt like a chore. So I built a "book reading" skill for my AI coding agent that turns every reading session into a conversation and automatically captures structured notes in Obsidian.

<!--more-->

### The Problem with Reading

Most people read passively. You highlight a sentence, nod along, and move on. Two weeks later someone asks what the book was about and you say something like "it was about thinking... and biases... it was really good though."

The issue isn't retention - it's **processing**. Reading is input. Learning requires output. You need to explain what you read, connect it to things you already know, and admit what you didn't understand. That's hard to do alone at 11pm on a Saturday when you close your book.

### What is a Claude Skill?

A skill is a markdown file that gives Claude (or any AI agent) a specific workflow to follow. Instead of explaining what you want every time, you invoke a skill and the agent knows exactly what to do - what questions to ask, what format to use, and where to save the output.

Think of them as reusable "modes" for your AI agent. The book-reading skill is about 100 lines of markdown. No complex tooling, no API integrations, no code. Just a well-designed prompt.

### How the Book Reading Skill Works

The workflow has 5 steps:

**1. Identify the book** - The agent asks what you read and checks if notes already exist. If they do, it picks up where you left off.

**2. Identify the chapter** - It asks what chapter you covered. If you've been logging sessions, it suggests the next chapter automatically.

**3. Discuss the reading** - This is the core. The agent asks open-ended questions one at a time and has a genuine back-and-forth about the material. It's not summarizing the book _for_ you. It's discussing it _with_ you. That's the difference.

**4. Summarize and confirm** - It synthesizes the conversation into TLDR bullet points and detailed chapter notes, then shows you in the terminal before saving anything.

**5. Write to Obsidian** - Once confirmed, it writes everything to a markdown file organized by book. The TLDR section grows over time into a standalone summary.

### A Real Session: The Phoenix Project, Chapter 20

Here's what an actual session looked like tonight. I read Chapter 20 of **The Phoenix Project** and invoked the skill.

The agent asked what stood out. I mentioned the four types of work, how unplanned work silently eats your capacity, and the boy scout analogy about identifying constraints (the slowest scout "Herbie" gets moved to the front so the whole line moves at a predictable pace).

Then I admitted I didn't fully understand the First Way and Second Way. Instead of just defining them, the agent broke them down with practical examples:

- **The First Way** (Systems Thinking): Optimize the entire flow from left to right. A dev team shipping features fast means nothing if Operations can't deploy them. The boy scout march is a First Way example - optimize for the whole line, not individual scouts.

- **The Second Way** (Feedback Loops): Information flows right to left. If a deployment breaks production at 2am and Operations just patches it without telling Development, the same defect keeps happening. Fast feedback to the source prevents recurring problems.

It even connected it to my day-to-day: a data pipeline that keeps breaking without feedback to the upstream team is a missing Second Way.

By the end of a 5-minute conversation, the agent captured this:

```markdown
## TLDR
- Work comes in four types (business projects, IT projects, changes, unplanned work) -
  unplanned work is the most dangerous because it's invisible and cannibalizes capacity
  from the other three
- Identify your constraint (your "Herbie") and subordinate all work to it - optimizing
  anything that isn't the bottleneck is an illusion of progress
```

Along with detailed chapter notes that captured both the book's ideas and my own connections to them. All written to Obsidian automatically.

### Why This Works Better Than Traditional Notes

**1. Discussing forces you to process, not just consume.** When you have to articulate what stood out, you engage with the material differently than when you just highlight it.

**2. Explaining what confused you is where the real learning happens.** I didn't understand the First Way and Second Way. Saying that out loud led to a much clearer understanding than re-reading the chapter would have.

**3. Structured notes accumulate.** By the time I finish a book, the TLDR section is a standalone summary I can scan months later. The chapter notes are a detailed record of what I thought at the time.

**4. Zero friction.** I just say what book and chapter, and the conversation starts. No templates to fill, no apps to open, no formatting to think about.

### The Skill is Open Source

I've published the skill so anyone can fork it and adapt it to their own setup:

[**book-reading/SKILL.md on GitHub**](https://github.com/kunalkohli/personal_claude_explorations/blob/main/CLAUDE_SKILLS/book-reading/SKILL.md)

To use it, you just need to:
1. Copy the SKILL.md into your Claude skills directory
2. Update the Obsidian vault path to point to your vault
3. Invoke it after your next reading session

The best use of AI isn't replacing your thinking. It's giving you a thinking partner available whenever you close your book.
