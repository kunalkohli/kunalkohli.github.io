---
layout: post
title: "Two PHP Bugs, Explained with a Locker Room"
date: 2026-10-24 00:00:00 -0400
categories: [security, infrastructure, explainers]
comments: true
published: true
post_class: php-locker-post
---

<link rel="stylesheet" href="{{ '/css/php-locker-post.css' | relative_url }}?v=6">

On October 21, 2026, two critical PHP bugs were publicly disclosed. A crafted request could crash a vulnerable website worker, expose information, or sometimes make it run an attacker's code.

PHP powers **roughly 70% of websites whose server-side language can be identified**, according to [W3Techs](https://w3techs.com/technologies/details/pl-php). That's PHP's reach—not the percentage breached or equally exploitable.

Both bugs concern temporary storage after something goes wrong. To see the difference, picture **one attendant, locker A, and a paper slip**. 🔐

<!--more-->

<div class="php-explainer" markdown="1">

### 🧩 First, what does PHP do?

When you submit a form, your browser sends a **request**. On many websites, PHP is the software on the server that processes it and prepares a reply. While it works, it needs temporary memory.

Imagine an attendant storing visitors' belongings in temporary lockers. Here's how that maps to a website:

| In the locker room | What it represents on a website |
| --- | --- |
| A visitor hands over a check-in form | An **HTTP request**: a message asking the website to do something |
| The attendant handles the task | A **PHP worker**: a running process doing the work |
| Lockers temporarily hold belongings | **Working memory**: temporary storage, not a permanent database |
| A storage record describes the task | **Internal data** PHP prepares before using it |
| A location slip says “use locker A” | A **memory reference** pointing to where data lives |
| The attendant clears a locker and retires its slip | **Cleanup**: release the memory and remove references that must not survive |

### ✅ The normal locker-room routine

A visitor brings a **blue bag**. The attendant puts it in **locker A** and writes a paper slip saying where it is. When the task ends, the attendant returns the bag, empties A, and **discards the slip**.

<figure class="php-diagram" aria-labelledby="php-caption-normal">
  {% include php-locker-story.html id="normal" %}
  <figcaption id="php-caption-normal">Normal handling: store, retrieve, then clear both the locker and its slip.</figcaption>
</figure>

The same attendant can serve another visitor, who brings an **orange bag**. Keep those objects in mind: the locker is temporary storage, and the slip is a reference to it.

### 🧾 Bug 1: trusting an unfinished record

This time, the paperwork is never finished:

1. 📨 A visitor deliberately overwhelms the attendant's workspace.
2. 🗄️ The attendant starts a storage slip for the blue bag.
3. 🛑 Space runs out before every slip field has been written for this task.
4. ⚠️ During cleanup, the attendant follows the unfinished slip as if it were complete.

{% capture unfinished_php %}
1. (PHP: an attacker sends a crafted HTTP request that pressures memory.)
2. (PHP: the worker allocates memory and starts initializing internal request data.)
3. (PHP: an out-of-memory failure interrupts initialization.)
4. (PHP: cleanup treats partially initialized data as valid, creating unsafe memory access.)

This is **CVE-2026-109618**. A large upload alone does not automatically give someone control of a server; exploitation depends on crafted input and the affected execution path.

Fields that were never initialized are not necessarily safely empty. The recycled-paper example below illustrates the risk of treating their contents as valid; it is not a literal description of PHP's internal fields or an exploit recipe.
{% endcapture %}
{% include php-locker-diagram.html id="unfinished" title="Bug 1: cleanup trusts an unfinished slip" notes=unfinished_php %}

**The mistake is trusting an unfinished slip—not simply running out of space.**

<details id="php-unfinished-example" class="php-example-notes">
<summary>⚠️ Why is unfinished paperwork dangerous?</summary>
<div markdown="1">

The drawing's blank-looking fields mean “not filled in for this task”—not necessarily clean, empty paper.

Imagine the attendant writes slips on **reused scrap paper**. They write “blue bag,” but run out of space before replacing the other entries. Those entries are **old scribbles, not instructions checked for this visitor**:

| Field on the slip | What is on the paper | Was it set for this task? |
| --- | --- | --- |
| Bag | Blue bag | **Yes** — just written by the attendant. |
| Locker | An unchecked scribble | **No** — the location was never set for this task. |
| Cleanup instruction | Another unchecked scribble | **No** — the instruction was never prepared for this task. |

During cleanup, the attendant treats **every field as a real instruction**, including the scribbles. They might try to open a locker that does not exist or carry out an inappropriate cleanup action, instead of stopping safely.

**That is the opening for an attacker: unfinished data is being turned into actions.** A crafted request tries to trigger this unsafe path. On a server, the result can be a crash or memory corruption, potentially leading to code execution—not merely a bag left behind.

The slip's fields are invented to explain the failure; they are not PHP's literal internal record. **Bug 1 uses a record that was never fully prepared for the current task.** Keep the “old slip returns the wrong bag” story for Bug 2 below.

</div>
</details>

### 🎟️ Bug 2: keeping the slip after the locker is released

This time, a once-valid slip outlives the belongings it describes:

1. 📥 The attendant puts the blue bag in locker A and keeps its slip.
2. 💥 The task fails; A is emptied, but the attendant forgets to discard the slip.
3. ♻️ A later visitor's orange bag may be placed in the now-free locker A.
4. 🎟️ The same attendant follows the old blue-bag slip and may retrieve the wrong belongings.

{% capture stale_php %}
1. (PHP: a request holds a reference to memory containing its data.)
2. (PHP: a fatal error ends the request; its memory is freed, but an internal reference survives.)
3. (PHP: a later request runs on the **same worker**; released memory may be reused.)
4. (PHP: stale state is used before normal initialization resets it, allowing access to invalid or unrelated memory.)

This is **CVE-2026-109619**. Not every later request encounters the vulnerable state. The bag swap illustrates reuse of storage, not a guaranteed data leak.
{% endcapture %}
{% include php-locker-diagram.html id="stale" title="Bug 2: the old slip survives after locker A is emptied" notes=stale_php %}

<details id="php-stale-example" class="php-example-notes">
<summary>🔓 How could the attacker get someone else's data?</summary>
<div markdown="1">

Suppose the first visitor is malicious. They arrange for their task to fail, leaving the attendant with the old blue-bag slip. Later, **another visitor's orange bag may occupy locker A**.

1. 🧾 **The old slip still points to A**, even though the original blue bag is gone.
2. 🚪 **A later task reaches the same attendant**, who follows that slip without first resetting it.
3. 🎒 **If the attendant hands back A's current contents to the wrong visitor, someone else's orange bag is exposed.** The slip used to be correct; now it describes storage that may belong to someone else.

On a website, this illustrates a stale memory reference exposing unrelated data in a response. **It does not mean a normal follow-up request automatically receives another user's session**, or that an attacker can choose whose data they get. Reaching the unsafe state, reusing the memory, and having the data returned all depend on the affected execution path.

Both bugs can have several consequences, including data exposure. The difference is **why the memory access is unsafe**: Bug 1 trusts unfinished data during cleanup; Bug 2 follows a once-valid reference after its data is gone.

</div>
</details>

The useful distinction is:

- **Bug 1:** the slip was never finished.
- **Bug 2:** the slip used to be right, but is now out of date.

This is an analogy for memory handling—not guessing locker combinations or bypassing a login.

### 🔓 How does that turn into a break-in?

Following an invalid record can lead to different kinds of harm:

| Possible outcome | Locker-room example | What happens on the server |
| --- | --- | --- |
| **Crash / denial of service** | The attendant stops working, and visitors cannot get service. | A PHP worker crashes; visitors may get errors or lose access. |
| **Data leak** | The attendant hands one visitor someone else's belongings. | Information reaches someone who is not authorized to receive it. |
| **Remote code execution** | The attendant is tricked into performing unauthorized tasks within their authority. | The attacker gets instructions to run with the PHP worker's permissions. |

Those are possible outcomes, **not three guaranteed stages**. Code execution also doesn't automatically mean full administrator access. But a website worker may already have access to valuable files, credentials, or customer information.

### 🛡️ The temporary fix shipped by Cloudflare

While operators deployed PHP updates, Cloudflare shipped an extra layer of protection through its **web application firewall (WAF)**. Cloudflare says these protections were in place before public disclosure on October 21, including for sites using its free WAF.

This was a traffic-level mitigation, **not a repair to the PHP software running on the server**. Think of it as posting a security guard at the locker room while the attendant's faulty procedures are being fixed.

<div class="php-sources" markdown="1">

### 📚 Sources and diagrams

Sources for the October 2026 disclosures and PHP usage figure:

- [PHP: October 21 critical security advisory](https://www.php.net/archive/2026.php#2026-10-21-5)
- [PHP: October 23 session upload progress advisory](https://www.php.net/archive/2026.php#2026-10-23-1)
- [Cloudflare: php2shell vulnerabilities and WAF protection](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/)
- [OpenAI: coordinated disclosure and the global response](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)
- [W3Techs: PHP usage statistics and what the percentage measures](https://w3techs.com/technologies/details/pl-php)

The locker-room strips are custom illustrations. The expandable technical diagrams were generated with [Archify](https://github.com/tt-a1i/archify). Both explain failure paths, not the mechanics of a working exploit.

</div>

</div>
