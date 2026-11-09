---
layout: post
title: "The $6.34B Binance Heist, Explained"
date: 2026-11-07 09:00:00
categories: [security, ai, blockchain, incident-response]
comments: true
published: true
attack_animation: true
mermaid: true
read_time: 4
description: "A concise explainer of the $6.34B Binance incident: the fake job interview, the poisoned AI coding tool, the pyenv foothold, the signing-service breach, and the race to freeze the funds."
excerpt: "A concise explainer of the $6.34B Binance incident — from a fake job interview and a poisoned AI coding tool to the signing-service breach and the on-chain race to freeze the funds."
---

## What happened

On 29 October 2026, attackers moved about **$6.34 billion** out of Binance's hot wallets across 10–11 blockchains — the largest crypto theft on record.

Binance says no private key was stolen. The attackers spent five months getting into the laptops of the engineers who run the wallets, then used Binance's own signing service to approve the transfers. About **$2.85 billion** was frozen; Binance absorbed the rest and says users lost nothing.

<table class="bordered">
  <thead>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Impacted</strong></td>
      <td>$6.34B (Elliptic estimates $8.43B)</td>
    </tr>
    <tr>
      <td><strong>Frozen</strong></td>
      <td>$2.85B, about 45%</td>
    </tr>
    <tr>
      <td><strong>Main drain</strong></td>
      <td>~20 minutes, 20:05–20:24 UTC</td>
    </tr>
    <tr>
      <td><strong>User losses</strong></td>
      <td>$0</td>
    </tr>
    <tr>
      <td><strong>Attribution</strong></td>
      <td>North Korea's TraderTraitor group (FBI)</td>
    </tr>
  </tbody>
</table>

## How they did it

{% include binance-attack-animation.html %}

### Attack path

<div class="attack-path">
  <div class="mermaid">
flowchart LR
  A["Poisoned install<br/>AI coding tool"] --> B["Lure<br/>fake job interview"]
  B --> C["Malicious repo<br/>take-home"]
  C --> D["Foothold<br/>pyenv backdoor"]
  D --> E["Pivot<br/>internal AI tool"]
  E --> F["Deploy token<br/>signing service"]
  </div>
</div>
<p class="attack-path-hint">Swipe to follow the path →</p>

## The breach

- **Malicious deployment.** The token let the attackers deploy a malicious container next to Binance's internal signing service.
- **Controls bypassed.** They triggered transfers outside the normal withdrawal process, skipping the withdrawal service, risk checks and approvals.
- **Keys protected, transactions not.** MPC protected the private keys; it did not stop a trusted service from signing the wrong transaction.

## The drain

- **First transfers:** XRP began moving at **20:05 UTC**. Within about 20 minutes, hot wallets on ten chains were empty.
- **Largest sweep:** One Ethereum transaction at **20:24** moved **$2.53 billion** — 187,464 ETH and 63 tokens, including 1.6B USDT.
- **Last transfer:** The final unauthorized transfer, **2,961.9 ETH**, settled at **23:56**.
- **Why pausing wasn't enough:** The attackers had used **EIP-7702** to delegate an Ethereum hot wallet to their own contract. Pausing withdrawals did not revoke that permission, so funds kept leaving until Binance cleared the delegation.

## Aftermath

- **Out of reach:** About **$3.49 billion** was out of reach. Bitcoin, ETH, XRP and SOL have no issuer that can freeze them.
- **Following the money:** The attackers swapped roughly **$760 million** of stablecoins into ETH and TRX before the freezes landed, at a 12–20% loss, then split the Bitcoin across 19 addresses and moved Tron funds through bridges.
- **Attribution:** Elliptic and Chainalysis linked the laundering to the September Bitget theft; the FBI attributed the campaign to North Korea.
- **What was frozen:** Issuers froze **$2.85 billion**, 94% of it stablecoins. Tether froze $1.57B and Circle $823M; Ripple, Paxos, First Digital and World Liberty Financial also froze their tokens.
- **Chain-level response:** Arbitrum and Optimism governance moved stolen assets out of reach.
- **Recovery:** Binance refilled the wallets, absorbed the loss, and reopened withdrawals on **1 November at 06:39 UTC**. Users lost nothing.

## Lessons for everyone

- 🧰 **Don't install untrusted third-party tools.** A package that looks normal can replace a trusted binary with a same-name copy.
- 🎭 **Treat job interviews as an attack surface.** Fake recruiters, fake assignments and fake repos are standard social engineering now.
- 🧠 **Train people, not just systems.** The first click was human; the controls around it were not enough. Make it easy to question unexpected requests and report them without blame.
- 🔑 **Scope credentials tightly.** A deployment token on a laptop turned a workstation breach into a path to production.
- 🛑 **Pausing is not revoking.** On-chain permissions live outside your infrastructure. Design the emergency path before you need it.

**Humans can still be the weakest link.** Alongside technical weaknesses, attackers exploit human trust. Companies should invest in understanding how social engineering is evolving—not just patching code. Verify recruiters through independent channels, run unfamiliar assignments in isolated environments, and give staff realistic, recurring training backed by controls that limit the damage when someone is deceived.

*Sources: [Binance initial findings](https://www.binance.com/en/blog/community/3229153443759566763), 3 Nov 2026; [Elliptic](https://www.elliptic.co/blog); [FBI](https://www.fbi.gov/news/press-releases); [Chainalysis](https://www.chainalysis.com/blog).*
