---
layout: post
title: "DSConcepts: Learn Data Science with Examples"
date: 2026-11-11 20:00:00 -0500
categories: [projects, data-science, education, sql, open-source]
description: "An app for learning forecasting and experimentation through simple examples, with a SQL code lab for interview prep. Built on open-source tools, with contributions welcome."
comments: true
published: true
---

I built **[DSConcepts](https://dsconcepts.vercel.app)** to help people understand data science concepts through simple examples and hands-on practice. The goal was to build an app that explains concepts in an easy-to-follow way, with diagrams you can play with and questions to check your understanding.

It currently has two parts:

- 🧠 **Concepts:** learning journeys for forecasting and experimentation.
- 💻 **Code lab:** SQL practice with a dataset, an editor, and exercises for interview prep.

<!--more-->

## 🧠 Concepts: learn with examples

There are two learning streams, both using **Northstar**, a fictional online retailer, as the running example:

- 📈 **[Forecasting](https://dsconcepts.vercel.app/forecasting) — 31 stops.** How much might Northstar sell next week? Start with trends, seasonality, and uncertainty, then work through baselines, backtesting, and forecasting methods.
- 🧪 **[Experimentation](https://dsconcepts.vercel.app/experimentation) — 24 stops.** Northstar is testing a faster product page. Does it help customers buy more, and is checkout still reliable? Follow the example through randomization, metrics, confidence intervals, power, and rollout decisions.

Each journey builds up gradually. You can follow it from the beginning or jump to a topic you want to revisit. The same business example carries through the lessons, so you can focus on the concept rather than learn a new setting every time.

<figure>
  <a href="{{ '/img/dsconcepts/forecasting-journey.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/forecasting-journey.jpg' | relative_url }}" alt="The six parts of the forecasting journey, from time-series foundations and evaluation to models and practical decisions." width="1160" height="577" loading="lazy"></a>
  <figcaption>📈 The forecasting journey. Click the image to explore the topics.</figcaption>
</figure>

<figure>
  <a href="{{ '/img/dsconcepts/experimentation-journey.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/experimentation-journey.jpg' | relative_url }}" alt="The experimentation journey, moving from randomization and measurement through inference, hidden traps, and rollout decisions." width="1160" height="509" loading="lazy"></a>
  <figcaption>🧪 The experimentation journey, from setting up a test to deciding what to ship.</figcaption>
</figure>

In the Lab layout, lessons follow a simple flow:

- 📖 **Learn:** read a short explanation with examples and a takeaway.
- 🎛️ **Explore:** change a slider or compare scenarios to see what happens.
- ✅ **Check:** answer a question and read the explanation.

For example, you can change how much sales history a forecast uses, or increase an experiment's sample size while keeping its observed lift the same. Watching the result change helps explain what the method is doing and what its assumptions mean.

The data is simulated, and the playgrounds are teaching tools—not production forecasting or experimentation systems. Lessons include limitations and links to further reading. You can also save notes and export your learning journal.

## 💻 Code lab: SQL interview prep

The second part is a **[SQL code lab](https://dsconcepts.vercel.app/sql-practice)** for practising interview-style questions. It has **24 problems: 12 basic and 12 advanced**, using six related Northstar tables: customers, products, orders, order items, payments, and refunds.

The exercises cover:

- 🟢 **Basics:** filtering, aggregation, joins, dates, and missing values.
- 🔵 **Advanced topics:** cohorts, ranking, `LEAD`/`LAG`, running totals, and calculations involving payments and refunds.

Each problem starts with a blank editor. The schema and sample data are available alongside it, so you can inspect the tables before writing your query.

The practice loop is straightforward:

1. 📝 Read the question and required output columns.
2. ▶️ Write and run your SQL against the provided data.
3. 🔍 Inspect the results and check your answer.
4. 💡 Use a hint or reveal the solution and explanation if you get stuck.

<figure>
  <a href="{{ '/img/dsconcepts/sql-lab.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/sql-lab.jpg' | relative_url }}" alt="The SQL lab showing a monthly-revenue query, its six result rows, and the orders table schema beside the editor." width="1160" height="1082" loading="lazy"></a>
  <figcaption>💻 Running a monthly-revenue query, with the schema beside the editor. Amounts are stored in USD cents.</figcaption>
</figure>

One question asks for customers whose **first-ever completed order was in March and exceeded $100**. Finding the first order *after* filtering to March gives a different answer. These exercises are designed to practise both SQL and reading the question carefully.

Answer checking compares results, not your query text, and uses a second dataset variation to catch some common mistakes. It is useful practice feedback, not a guarantee that a query works for every possible dataset. The dialect is **DuckDB SQL**.

## 🤝 Open source: help improve it

The SQL lab is powered by **[DuckDB-Wasm](https://github.com/duckdb/duckdb-wasm)**, which runs DuckDB in your browser. There is no database server to install, and queries are not uploaded to a query service. **[CodeMirror](https://codemirror.net/)** provides the editor, and the app is built with Next.js and React.

**[DSConcepts is open source under the MIT licence](https://github.com/kunalkohli/stats_learning/blob/main/LICENSE)**, including the lesson content and teaching code. I would love fellow data scientists to contribute:

- ✍️ A simpler explanation or a better example.
- 📊 A diagram or interactive exercise for a concept.
- 🧩 A SQL question, dataset variation, or alternative solution.
- 🐛 A correction where a calculation or explanation is wrong.

You do not need to build a whole learning stream to help. Improving one confusing lesson is a useful contribution. The [README](https://github.com/kunalkohli/stats_learning#readme) explains how to run the app and where the content lives. [Open an issue](https://github.com/kunalkohli/stats_learning/issues) or send a pull request with your suggestion.

No sign-up is needed to try it. Notes, progress, and SQL drafts stay in your browser, so they do not sync across devices.

🚀 **[Try DSConcepts](https://dsconcepts.vercel.app)** or **[explore the source on GitHub](https://github.com/kunalkohli/stats_learning)**. Pick a concept, try an example, or work through a SQL problem—and let me know what would make it more useful.
