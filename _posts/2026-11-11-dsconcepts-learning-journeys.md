---
layout: post
title: "DSConcepts: Learn the Idea, Then Try It"
date: 2026-11-11 20:00:00 -0500
categories: [projects, data-science, education, sql, open-source]
description: "A hands-on learning journey through forecasting and experimentation, plus a browser-based SQL code lab—built on open-source tools and open to contributions from fellow data scientists."
comments: true
published: true
---

**[Try DSConcepts](https://dsconcepts.vercel.app) · [Explore the source](https://github.com/kunalkohli/stats_learning)**

Recognising a term is not the same as understanding when to use it. You can know what a prediction interval is and still plan around one sales number. You can calculate a p-value and still run an experiment that answers the wrong question.

I built **DSConcepts** around that gap: short learning journeys that connect an idea to a decision, give you something to change, and ask you to explain what happened. The starting points are **forecasting and experimentation**. Alongside them is a **SQL code lab**, with data you can inspect and queries you can actually run.

<!--more-->

## A journey, not a glossary

The goal is not to collect as many definitions as possible. It is to build understanding in an order that makes the next idea easier to reason about.

Both journeys follow one fictional ecommerce business, **Northstar**. Keeping the business context familiar means the question can evolve without introducing a new company and dataset at every stop.

In the Lab layout, each lesson has three modes:

- **Learn:** short cards for the big idea, why it matters, how it works, and what to remember.
- **Explore:** change a control, inspect a diagram, or compare scenarios. Make a prediction before looking at the result.
- **Check:** answer a question, read the feedback, and save a note in your own words.

You can follow the route or jump back to a particular concept. There is no account to create; learning notes and progress stay in your browser, and the journal can be exported.

## Forecasting: start with the decision, not the model

The [forecasting journey](https://dsconcepts.vercel.app/forecasting) currently has **31 stops**. It begins with a practical question: what sales are plausible next Tuesday, and how should Northstar prepare stock and capacity?

That is a different starting point from “Which forecasting model should I fit?” The journey builds toward that choice:

1. **Understand the series.** Separate trend, seasonality, cycles, and unexplained variation. A November climb might be a holiday pattern, not permanent growth.
2. **Build a benchmark.** Try simple baselines before asking whether a more complex method adds value.
3. **Test honestly.** Hold out future observations, walk forward through historical forecast origins, and compare errors at the horizons the decision needs.
4. **Diagnose what remains.** Explore autocorrelation, residual patterns, and the difference between useful memory and noise.
5. **Choose a method for a reason.** Connect smoothing, Fourier terms, ARIMA, and other approaches to the patterns they are intended to represent.
6. **Return to the decision.** Consider uncertainty, driver availability, coherent totals, and the distinction between a forecast, a target, and a plan.

<figure>
  <a href="{{ '/img/dsconcepts/forecasting-journey.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/forecasting-journey.jpg' | relative_url }}" alt="The six parts of the forecasting journey, from time-series foundations and evaluation to models and practical decisions." width="1160" height="577" loading="lazy"></a>
  <figcaption>The forecasting route: foundations first, model choices later. Open the image for a closer look.</figcaption>
</figure>

The playgrounds make those distinctions tangible. Change the amount of history used for a forecast. Step through a rolling backtest. Add Fourier waves and compare how a flexible fit behaves with one year of history versus five.

These are **small teaching implementations using constructed data**, not a production forecasting service. The point is to reveal an assumption or a failure mode—not to suggest that a convincing curve proves a model is good. Lessons also link to deeper reading, including [Forecasting: Principles and Practice](https://otexts.com/fpp3/).

## Experimentation: from a change to a defensible decision

The [experimentation journey](https://dsconcepts.vercel.app/experimentation) has **24 stops**, following Northstar as it tests a new product-page cache. A faster page sounds useful. But does it help buyers complete purchases, and does checkout remain reliable?

The sequence follows the questions an experiment needs to answer:

- **Design the comparison:** define the hypothesis, success metrics, assignment unit, and population being measured.
- **Measure the right outcomes:** distinguish conversion lift from latency improvements, and keep reliability guardrails visible.
- **Reason about evidence:** explore sampling variation, confidence intervals, p-values, power, and minimum detectable effects.
- **Avoid misleading wins:** examine underpowered tests, repeated peeking, multiple comparisons, and interference through shared infrastructure.
- **Make the call:** bring the evidence, uncertainty, cost, and operational risks together before shipping, holding, or stopping.

<figure>
  <a href="{{ '/img/dsconcepts/experimentation-journey.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/experimentation-journey.jpg' | relative_url }}" alt="The experimentation journey, moving from randomization and measurement through inference, hidden traps, and rollout decisions." width="1160" height="509" loading="lazy"></a>
  <figcaption>One running experiment, with each stage adding another part of the decision.</figcaption>
</figure>

For example, keep the observed lift fixed while changing the sample size. The estimated effect can stay the same while its precision changes substantially. That is easier to internalise when you can manipulate it than when it appears only as a formula.

The examples are simulated, not results from a real marketplace. Each playground makes its assumptions and limitations explicit, with further reading from sources such as [Microsoft's Experimentation Platform](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/).

## The SQL code lab: query the data yourself

Conceptual understanding is one half of the work. The other half is being able to ask a precise question of a dataset—and notice when your query answers a different one.

The [SQL lab](https://dsconcepts.vercel.app/sql-practice) has **24 problems: 12 basic and 12 advanced**. They use six related Northstar tables: customers, products, orders, order items, payments, and refunds.

You start with filtering, aggregation, and joins, then move to cohorts, ranking, `LEAD`/`LAG`, running totals, and refund-safe financial calculations. The data includes deliberately awkward cases: missing emails, customers without orders, ties, failed payments, and multiple refunds.

The workspace gives you:

- A problem statement and required output columns.
- A blank SQL editor, with schema and sample data alongside it.
- Real query execution and result tables—not a multiple-choice approximation of SQL.
- Progressive hints and an optional solution with an explanation.
- An answer check based on results, rather than matching your query text to one prescribed solution.

<figure>
  <a href="{{ '/img/dsconcepts/sql-lab.jpg' | relative_url }}"><img src="{{ '/img/dsconcepts/sql-lab.jpg' | relative_url }}" alt="The SQL lab showing a monthly-revenue query, its six result rows, and the orders table schema beside the editor." width="1160" height="1082" loading="lazy"></a>
  <figcaption>A query executed against the simulated Northstar data. Monetary values are stored in USD cents; the engine uses DuckDB SQL.</figcaption>
</figure>

One advanced problem asks for customers whose **first-ever completed order was in March and exceeded $100**. Filtering to March before finding the first order answers a subtly different question. The exercise is about the business definition as much as the window function.

Checking also runs against an amount-variation dataset to catch some hardcoded answers and threshold mistakes. Passing both datasets is useful feedback, not proof that a query is correct for every possible input.

## Built on open source—and open to other data scientists

The SQL lab is powered by **[DuckDB-Wasm](https://github.com/duckdb/duckdb-wasm)**, the open-source WebAssembly build of DuckDB. It runs SQL in a browser worker, so there is no database server to set up and your queries are not uploaded to a query service. **[CodeMirror](https://codemirror.net/)** provides the editor, including syntax highlighting and completion.

The application is built with [Next.js](https://nextjs.org/) and [React](https://react.dev/). The lesson content, diagrams, and teaching calculations live in the project itself; they are not a closed course hidden behind those libraries.

**[DSConcepts is open source under the MIT licence](https://github.com/kunalkohli/stats_learning/blob/main/LICENSE).** I want fellow data scientists to be able to improve the concepts, not just use the finished pages.

Useful contributions can be small:

- **Clarify an explanation:** point out where an assumption is missing or an example could be misunderstood.
- **Add a counterexample:** show when an apparently sensible forecasting or experimentation rule breaks down.
- **Improve a playground:** make a concept more visible, fix a calculation, or add a test for an edge case.
- **Extend the SQL lab:** propose a problem, a dataset variation, or an alternative correct solution that the checker should accept.

The [repository README](https://github.com/kunalkohli/stats_learning#readme) explains how to run the app and where the curricula, teaching helpers, and SQL exercises live. [Open an issue](https://github.com/kunalkohli/stats_learning/issues) with a concrete example, or fork the repository and send a pull request. A clearer explanation backed by a good example is just as welcome as a code change.

## Pick a starting point

- **[Forecasting](https://dsconcepts.vercel.app/forecasting):** follow a series from uncertainty to a useful planning decision.
- **[Experimentation](https://dsconcepts.vercel.app/experimentation):** follow a proposed change from random assignment to a rollout decision.
- **[SQL practice](https://dsconcepts.vercel.app/sql-practice):** inspect the data, write a query, and test your understanding.

The ambition is simple: fewer terms we merely recognise, more ideas we can explain, test, and use. And, with other data scientists contributing, better explanations than any one person could write alone.
