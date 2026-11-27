---
layout: post
title: "The Microsoft 365 Outage, Explained: When Failover Spread the Failure"
date: 2026-11-26 09:00:00
categories: [systems, incident-response, cloud]
comments: true
published: true
m365_outage: true
read_time: 7
description: "A hidden gateway bug, routine maintenance, redirected Teams traffic, and peak load combined to disrupt Microsoft 365. A visual guide to the cascade—and why recovery took almost a day."
excerpt: "Microsoft 365 had backup gateways and automatic failover. On 12 November, those recovery paths helped turn a hidden defect into a global outage. Here is what happened, in diagrams."
---

## What happened

On **12 November 2026**, many people could not open Outlook, reach their mailbox, or reliably send and receive email. Parts of Teams, Copilot, SharePoint, and other Microsoft 365 services were affected too.

The surprising part: this was not a cyberattack or an AI-generated change. According to Microsoft's final report, a **connection-handling defect introduced months earlier** met a particular combination of everyday operating conditions. Servers stopped responding. The systems meant to route around failures then helped the problem spread.

| At a glance | What the final report says |
| --- | --- |
| **Primary impact** | Exchange Online mailbox access and email delivery |
| **Official impact window** | 12 Nov, 16:20 → 13 Nov, 16:10 UTC: **23 hours, 50 minutes** |
| **Formal resolution** | 14 Nov, 04:15 UTC, after extended monitoring |
| **North American low point** | More than **80% of gateway servers** were unresponsive—not 80% of all Microsoft servers |
| **Data** | No enterprise mail permanently lost; customer data at rest was not affected |
| **Incident IDs** | EX1550543 / MO1550821 |

Impact varied by region, connection method, and time. This was not every Microsoft service being completely offline for the whole window. The account below follows the **20 November final report**, rather than the preliminary explanation.

## First, what is a gateway?

Think of your mailbox as an office inside a large building. The **network gateway is the reception desk**: it accepts your connection and helps get it to the right service. The office can still be there even when nobody can get through reception.

Microsoft runs two independent gateway systems so that many services can use the other path when one has trouble. That switch is called **failover**. Inside a gateway, traffic is spread across thousands of smaller groups of servers and networking equipment, called **capacity units**.

Those are two different kinds of redundancy: an alternative gateway, and alternative capacity within a gateway. Both matter to this story.

## The outage, step by step

Follow the six panels below. The drawings simplify the architecture; arrows show connection traffic, not a literal map of Microsoft's network.

{% include m365-outage-player.html %}

## Four ingredients, one failure

A busy workday alone was not the explanation. Microsoft's report describes a latent defect plus three operational conditions that, without the defect, would normally have been manageable together.

{% include m365-outage-factors.html %}

The defect involved **lock contention** inside a Windows process that establishes connections. A lock is a way to let one piece of work access a shared resource at a time. If too many workers compete for it, adding workers can make the queue worse rather than make the work faster.

Here, contention exhausted CPU and memory until affected servers stopped responding. It was **specific to the configuration on these Microsoft 365 gateway servers**, not a defect affecting ordinary Windows installations.

There is an important testing detail: **newer, higher-core servers were affected; older server types were not**. More cores allowed more simultaneous requests, increasing contention. The test labs used older, lower-core machines and a different traffic mix, so they did not reproduce the failure.

The change began rolling out in July and had been deployed worldwide for more than three months without observed impact. A long quiet period was not proof that the defect could never be triggered.

## How a local problem became global

Early on 12 November, a routing issue in US East caused Teams connection timeouts. At **01:07 UTC**, automatic failover moved Teams traffic onto the gateway also serving Exchange Online. The report's repair plan clarifies that a regional issue had moved **Teams traffic worldwide**, not just traffic from the affected region.

Hours later, North American traffic approached its daily peak. Nearly **14% of gateway server capacity** was also out of service for routine operations. Together, these conditions exposed the defect.

The cascade then fed on itself:

1. Some servers stopped responding.
2. Traffic moved to healthy capacity units in the same region.
3. Those units now had more connections to handle, making the same defect more likely to trigger.
4. As regional capacity ran out, traffic moved to other regions—with the same defect deployed there too.

Within about two hours of the broad North American failures, servers in **every region** were affected. That does not mean every server failed, but the problem was no longer regional.

**The failure spread through the recovery paths.** Spare capacity helps only if it can safely handle the redirected work. A different location is not necessarily a different failure mode.

## Why restarting did not fix it

Restarting a server can clear a bad state. It does not remove the defect that created it.

Recovering servers immediately faced queued connections and sustained reconnection demand. They became overwhelmed again. The automated recovery process was not designed for this combination of widespread failure and waiting traffic.

Microsoft first moved Teams, OneDrive, SharePoint, and Office app traffic to the alternative gateway, easing their impact. Exchange recovery still required finding the old connection-handling change and applying a corrective update across the fleet.

The server-level repair was not one reboot. It was five steps:

{% include m365-outage-recovery.html %}

Microsoft took large groups of capacity units out of traffic rotation, repaired their unresponsive servers concurrently, and returned the groups to service. The update reverted the defective change; its first application to part of the capacity was at **07:20 UTC on 13 November**. Expansion prioritized regions in or approaching peak business hours.

The difficult part was not merely writing a fix. It was getting that fix onto unresponsive machines and restoring enough working capacity without overwhelming it again.

## The recovery timeline

All times below are **UTC**. Different connection methods recovered at different times.

| Time | Milestone |
| --- | --- |
| **12 Nov, 01:07** | Teams traffic fails over onto the gateway shared with Exchange. |
| **12 Nov, ~16:00** | Broad North American failures begin near peak traffic. |
| **12 Nov, 16:20** | Official incident start; Exchange alert and service-health communication. |
| **12 Nov, 23:55** | Responders confirm restarted servers fail again when traffic returns. |
| **13 Nov, 07:20** | Corrective update applied to part of the capacity. |
| **13 Nov, 11:00 / 11:35** | Recovery milestone in parts of Asia Pacific / healthy availability in Europe. |
| **13 Nov, 14:17** | Global webmail availability returns to expected levels. |
| **13 Nov, 15:54** | Most major access methods return to normal traffic levels. |
| **13 Nov, 16:10** | Active customer impact ends; extended monitoring and backlog recovery continue. |
| **14 Nov, 04:15** | Incident formally resolved after stability monitoring. |

### What about delayed email?

Microsoft extended Exchange's delivery retry window from **24 to 48 hours**, giving delayed messages longer to reach their destination before generating a non-delivery report.

The final report says all queued enterprise messages were delivered and no enterprise messages were permanently lost. There was an exception worth keeping visible: **some delayed messages to consumer mailboxes inactive for more than 30 days expired**, and their senders received non-delivery reports. "Nothing was deleted" and "every attempted email reached its recipient" are not the same claim.

## What changes after this?

The final report lists completed fixes and longer-term work. As of that report, the defective change had been reverted, the server image updated, capacity added, and temporary traffic-distribution guardrails introduced.

The planned changes go beyond patching the bug:

- **Smaller failure boundaries:** prevent cross-region cascades and design smaller fault zones. Cross-region distribution changes were targeted for Q4 2026; smaller fault zones had no date yet.
- **Less shared fate:** partition gateway capacity by workload, targeted for Q1 2027. Teams failover should also stay scoped to the affected region, targeted for Q4 2026.
- **More realistic testing:** test newer, high-core hardware with production-like traffic and peak conditions, targeted for Q1 2027.
- **Safer recovery:** gradual traffic ramp-up, admission control, and better retry/back-off behavior. These items did not yet have completion dates.

These are **the report's targets, not claims that the work is already finished**.

## Lessons for anyone building systems

- **Test combinations, not just components.** Maintenance, failover, and peak load can be individually normal yet interact with a hidden defect.
- **Redundancy needs isolation.** A backup destination carrying the same bug can become the next failure, not the escape route.
- **A healthy process is not necessarily a recovered service.** Check whether a returning server can handle real traffic, and give it a controlled path back in.
- **Recovery deserves its own design.** Plan how to repair an entire fleet when the machines are stuck and users keep reconnecting.
- **Look beyond the newest deployment.** A months-old change can become relevant when hardware, concurrency, or traffic patterns change.

The lesson I take away is simple: **a system needs a safe way to say “not yet” to traffic during recovery—not just another place to send it.**

## Sources

- **Primary:** [Microsoft's final post-incident report, 20 November 2026 (PDF, hosted by 365Fanatic)](https://www.365fanatic.com/wp-content/uploads/2026/11/postincidentreport-mo1550821.pdf). Impact and email caveat: pp. 2–5; causes and recovery: pp. 6–9; timeline: pp. 9–13; repair items: pp. 14–15.
- **Plain-language reference:** [365Fanatic's final-report summary](https://www.365fanatic.com/m365-outage-12-november-2026-final-report/), updated 21 November 2026.
- **For tenant administrators:** [Microsoft 365 service-health history](https://admin.microsoft.com/Adminportal/Home#/servicehealth/history), incident IDs **EX1550543 / MO1550821** (admin sign-in required).

*Diagrams are original explanatory illustrations based on the final report, not Microsoft's internal topology or measured traffic charts.*
