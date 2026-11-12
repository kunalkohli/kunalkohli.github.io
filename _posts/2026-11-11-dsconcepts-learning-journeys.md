---
layout: post
title: "DSConcepts: Learn Data Science with Examples"
date: 2026-11-11 20:00:00 -0500
categories: [projects, data-science, education, sql, open-source]
description: "An app for learning forecasting and experimentation through simple examples, with a SQL code lab for interview prep. The learning journey is open source, with contributions welcome."
comments: true
published: true
---

I built **[DSConcepts](https://dsconcepts.vercel.app)** to help people understand data science concepts through simple examples and hands-on practice. The goal was to build an app that explains concepts in an easy-to-follow way, with diagrams you can play with and questions to check your understanding.

It is for people learning these topics for the first time, as well as data scientists looking for a refresher. I wanted a place where you could connect a statistical idea to a familiar business question and practise the skills alongside it.

It currently has two parts:

- 🧠 **Concepts:** learning journeys for forecasting and experimentation.
- 💻 **Code lab:** SQL practice with a dataset, an editor, and exercises for interview prep.

<!--more-->

<figure>
  <a href="{{ '/img/dsconcepts/homepage.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/homepage.jpg' | relative_url }}" alt="The DSConcepts homepage showing forecasting and experimentation journeys, SQL Practice, and clearly labelled work-in-progress or planned topics." width="2000" height="1315" loading="lazy"></a>
  <figcaption>🧭 Pick a concept journey or head to SQL Practice. Future topics are marked as planned or work in progress.</figcaption>
</figure>

## 🧠 Concepts: learn with examples

There are two learning streams, both using **Northstar**, a fictional online retailer, as the running example:

- 📈 **[Forecasting](https://dsconcepts.vercel.app/forecasting) — 31 stops.** How much might Northstar sell next week? Start with trends, seasonality, and uncertainty, then work through baselines, backtesting, and forecasting methods.
- 🧪 **[Experimentation](https://dsconcepts.vercel.app/experimentation) — 24 stops.** Northstar is testing a faster product page. Does it help customers buy more, and is checkout still reliable? Follow the example through randomization, metrics, confidence intervals, power, and rollout decisions.

We use fictional examples based on real-world business situations to help you understand how each concept applies in a practical setting.

Here are two examples of the kinds of questions we explore:

- 📦 **Planning stock:** Northstar’s sales increase before the holidays. Should the team expect that growth to continue into January?
  - 📅 Looking at previous years helps explain the difference between a lasting trend and a seasonal pattern.
  - 🚚 That distinction matters when deciding how much stock to order.
- 🛒 **Testing a change:** More customers buy after a new page launches. Was it the new page, or did a promotion bring in different customers?
  - 🧪 This gives random assignment a practical purpose: creating a fair comparison.
  - ⚖️ We also consider whether a change improves purchases while making another part of the experience worse.

The examples give you something concrete to think about as the ideas become more detailed. Terms such as seasonality, uncertainty, or guardrail metrics are easier to discuss when you can relate them to a decision a team needs to make.

## 💻 Code lab: SQL interview prep

The second part is a **[SQL code lab](https://dsconcepts.vercel.app/sql-practice)** for practising interview-style questions. It includes multiple SQL problems covering aggregations, joins, ranking, `ROW_NUMBER`, and other window functions to help you improve your SQL skills.

The questions use business data, so the practice includes deciding what should be counted and how tables relate. For example, joining orders to payments can repeat an order when it has multiple payment attempts. Understanding the data helps you spot why a total is too high, even when the SQL runs without an error.

Window functions introduce another useful set of questions: how do you rank customers, compare a purchase with the previous one, or calculate spending over time? These are skills that come up in both interviews and day-to-day analysis. The lab gives you a place to practise them on provided data without setting up your own database.

## 🤝 Open source: help improve it

The learning journey is **[open source on GitHub](https://github.com/kunalkohli/stats_learning)**. We’d love fellow data scientists to contribute more learning materials, [share feedback](https://github.com/kunalkohli/stats_learning/issues), or send a pull request to improve the existing content.

If you have a useful way of explaining a topic to colleagues, this could be a place to share it. A practical example, a clearer explanation, or a question you often see people struggle with can help improve the material for everyone. Contributions do not need to be large to be useful.

No sign-up is needed to try it. Notes, progress, and SQL drafts stay in your browser, so they do not sync across devices.

🚀 **[Try DSConcepts](https://dsconcepts.vercel.app)** or **[explore the source on GitHub](https://github.com/kunalkohli/stats_learning)**. Pick a concept, try an example, or work through a SQL problem—and let me know what would make it more useful.
