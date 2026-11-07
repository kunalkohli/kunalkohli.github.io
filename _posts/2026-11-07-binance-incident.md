---
layout: post
title:  "The Binance Incident: A $6.34B Hack That Started With an AI Coding Tool"
date:   2026-11-07 09:00:00
categories: [security, ai, blockchain, incident-response]
comments: true
published: true
---

On **29 October 2026**, Binance published an initial security incident report that shocked the industry: roughly **$6.34 billion** in digital assets had been impacted by a sophisticated attack, and about **$2.85 billion** had been frozen or intercepted.

The final unauthorized transfer — **2,961.9 ETH** — settled on-chain at **23:56 UTC**. The FBI later attributed the campaign to the **Democratic People's Republic of Korea**.

<!--more-->

The company said the incident should not have happened, absorbed the financial impact rather than passing losses to users, and walked through what it knew at the time.

### 🕯️ The short version

- **The entry point:** a compromised AI coding toolchain / developer environment.
- **The pivot:** internal wallet signing infrastructure was later reached through the attacker.
- **The movement:** 233.46M XRP, ~970,500 SOL, 44.2M OP and later 18,270 BTC; final transfer 2,961.9 ETH.
- **The containment:** withdrawals suspended, assets frozen, attacker forced to keep moving via on-chain authorization manipulation.

### 🎬 The incident, as a sequence

{% include binance-incident-snapshot.html %}

### What the snapshot captures — and what it leaves out

The animation above condenses the publicly reported timeline into six beats: the supply-chain start, the social-engineering springboard, the signing-service intrusion, the fund movement, the containment, and the final remediation.

It deliberately leaves out the operational detail that made this incident unusually hard — that because the hot wallet ran through **Multi-Party Computation (MPC)**, revoking malicious **EIP-7702** authorizations could not be done with a single key, and that suspending withdrawals alone could not stop authorizations already standing on-chain.

The full picture, including the independent review, expanded AI-security investment and the industry sharing that followed, is still unfolding.

---

*This post is a working draft of the Binance incident write-up, paired with an animated snapshot of the reported timeline. Technical details remain confidential to the responding teams and will be covered as the investigation matures.*
