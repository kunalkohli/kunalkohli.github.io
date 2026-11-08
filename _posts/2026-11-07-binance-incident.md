---
layout: post
title: "The $6.34B Binance Heist, Explained"
date: 2026-11-07 09:00:00
categories: [security, ai, blockchain, incident-response]
comments: true
published: true
attack_animation: true
read_time: 4
description: "A concise explainer of the $6.34B Binance incident: the fake job interview, the poisoned AI coding tool, the pyenv foothold, the signing-service breach, and the race to freeze the funds."
excerpt: "A concise explainer of the $6.34B Binance incident — from a fake job interview and a poisoned AI coding tool to the signing-service breach and the on-chain race to freeze the funds."
---

## What happened

On 29 October 2026, attackers moved about **$6.34 billion** out of Binance's hot wallets across 10–11 blockchains — the largest crypto theft on record.

Binance says no private key was stolen. The attackers spent five months getting into the laptops of the engineers who run the wallets, then used Binance's own signing service to approve the transfers. About **$2.85 billion** was frozen; Binance absorbed the rest and says users lost nothing.

- **Impacted:** $6.34B (Elliptic estimates $8.43B)
- **Frozen:** $2.85B, about 45%
- **Main drain:** ~20 minutes, 20:05–20:24 UTC
- **User losses:** $0
- **Attribution:** North Korea's TraderTraitor group (FBI)

## How they did it

{% include binance-attack-animation.html %}

Binance calls it a "sophisticated, multi-stage campaign" — "not a single isolated breach or a simple phishing incident." The entry point was a poisoned install of a popular AI coding tool. A fake job interview then got an engineer to run a malicious "assignment" repo on his work laptop, with the malware hidden in the job-application exercise. It hid inside **pyenv**, a trusted developer tool. From there, an internal AI tool led the attackers to two more wallet engineers. One had a container deployment token.

## The breach

That token let the attackers deploy a malicious container next to Binance's internal signing service. They triggered transfers outside the normal withdrawal process, skipping the withdrawal service, risk checks and approvals. MPC protected the private keys; it did not stop a trusted service from signing the wrong transaction.

## The drain

The first XRP transfers began at **20:05 UTC**. Within about 20 minutes, hot wallets on ten chains were empty. One Ethereum transaction at **20:24** moved **$2.53 billion** — 187,464 ETH and 63 tokens, including 1.6B USDT. The last unauthorized transfer, **2,961.9 ETH**, settled at **23:56**.

On Ethereum, the attackers had already used **EIP-7702** to delegate a hot wallet to their own contract. Pausing withdrawals did not revoke that on-chain permission, so funds kept leaving until Binance cleared the delegation.

## Aftermath

**Following the money.** About **$3.49 billion** was out of reach. Bitcoin, ETH, XRP and SOL have no issuer that can freeze them. The attackers swapped roughly **$760 million** of stablecoins into ETH and TRX before the freezes landed, at a 12–20% loss, then split the Bitcoin across 19 addresses and moved Tron funds through bridges. Elliptic and Chainalysis linked the laundering to the September Bitget theft; the FBI attributed the campaign to North Korea.

**What was frozen.** Issuers froze **$2.85 billion**, 94% of it stablecoins. Tether froze $1.57B and Circle $823M; Ripple, Paxos, First Digital and World Liberty Financial also froze their tokens. Arbitrum and Optimism governance moved stolen assets out of reach.

Binance refilled the wallets, absorbed the loss, and reopened withdrawals on **1 November at 06:39 UTC**. Users lost nothing.

## Lessons for everyone

- **Don't install untrusted third-party tools.** A package that looks normal can replace a trusted binary with a same-name copy.
- **Treat job interviews as an attack surface.** Fake recruiters, fake assignments and fake repos are standard social engineering now.
- **Train people, not just systems.** The first click was human; the controls around it were not enough.
- **Scope credentials tightly.** A deployment token on a laptop turned a workstation breach into a path to production.
- **Pausing is not revoking.** On-chain permissions live outside your infrastructure. Design the emergency path before you need it.

*Sources: [Binance initial findings](https://www.binance.com/en/blog/community/3229153443759566763), 3 Nov 2026; [Elliptic](https://www.elliptic.co/blog); [FBI](https://www.fbi.gov/news/press-releases); [Chainalysis](https://www.chainalysis.com/blog).*
