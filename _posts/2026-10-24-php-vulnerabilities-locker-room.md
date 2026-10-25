---
layout: post
title: "Two PHP Bugs, Explained with a Locker Room"
date: 2026-10-24 00:00:00 -0400
categories: [security, infrastructure, explainers]
comments: true
published: true
---

On October 21, 2026, two critical bugs in PHP were publicly disclosed. A request sent to a vulnerable server could do more than load a page: it could crash the worker, expose information, or, in some circumstances, make it run an attacker's code.

Why did this matter so much? PHP powers **roughly 70% of websites whose server-side programming language can be identified**, according to [W3Techs](https://w3techs.com/technologies/details/pl-php). That's a measure of PHP's reach—not a claim that 70% of websites were breached or equally exploitable.

Both bugs involve how PHP handles temporary memory when something goes wrong. One trusts data that was never finished; the other follows a reference after its data is gone. To understand the difference, let's step away from the server and into a **locker room**. 🔐

<!--more-->

<div class="php-explainer" markdown="1">

<link rel="stylesheet" href="{{ '/css/php-locker-post.css' | relative_url }}?v=3">

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

A normal task is straightforward: put belongings in a locker, finish the record, use the right slip, then release the locker **and retire the old slip** when the task ends.

The same attendant can serve another visitor afterward. Likewise, a PHP worker can handle many requests over its lifetime.

### 🧾 Bug 1: trusting an unfinished record

Here's the locker-room sequence, with the PHP equivalent in parentheses:

1. 📨 **A visitor brings a tricky request.** They deliberately give the locker-room attendant a task designed to overwhelm the temporary workspace. (PHP: an attacker sends a crafted HTTP request.)
2. 🗄️ **The attendant starts organizing the belongings.** They set aside temporary storage and begin filling out a storage record. (PHP: the worker reserves memory and starts preparing internal request data.)
3. 🛑 **Space runs out halfway through the paperwork.** The attendant has to stop before the record is complete. (PHP: an out-of-memory failure interrupts initialization, leaving some internal data unfinished.)
4. ⚠️ **The attendant trusts that unfinished record during cleanup.** They follow its directions even though some fields were never filled in. **Trusting the incomplete record—not just running out of space—is the dangerous mistake.** (PHP: cleanup treats partially initialized data as valid, creating unsafe memory access an attacker may exploit.)

{% include php-locker-diagram.html id="unfinished" title="Bug 1: a failure during setup becomes unsafe cleanup" %}

In PHP, this is **CVE-2026-109618**. An out-of-memory failure can interrupt initialization of internal request data. Cleanup may then treat partially initialized data as valid.

Running out of memory is the trigger. **Unsafe use of the unfinished data is the vulnerability.** A big upload alone does not automatically give someone control of a server; exploitation depends on crafted input and the affected execution path.

### 🎟️ Bug 2: keeping the slip after the locker is released

This time, the mistake can carry over from one visitor's task to the next:

1. 📥 **A visitor checks in their belongings.** The attendant puts them in locker A and keeps a slip saying where they are. (PHP: a request holds a reference to memory containing its data.)
2. 💥 **The task fails, but the old slip survives.** The belongings are cleared out and locker A becomes available again, yet the attendant keeps the location slip. (PHP: a fatal error ends the request; its memory is freed, but an old internal reference survives.)
3. ♻️ **Another visitor reaches the same attendant.** Locker A may now hold different belongings, but the old slip still says to look there. (PHP: a later request runs on the same worker, and the released memory may be reused for different data.)
4. 🎟️ **The attendant follows the old slip.** They may retrieve the wrong belongings or act on an invalid record. **The problem is an outdated slip—not someone guessing a locker combination.** (PHP: stale state is used before normal initialization resets it, allowing access to invalid or unrelated memory.)

{% include php-locker-diagram.html id="stale" title="Bug 2: an old reference survives into a later request" %}

In PHP, this is **CVE-2026-109619**. A fatal error can leave internal state pointing to memory that is freed when the request ends. A later request on that same worker may use the stale state before normal initialization resets it.

The useful distinction is:

- **Bug 1:** trust information that was never fully prepared.
- **Bug 2:** trust a reference after the information it pointed to is no longer valid.

This is an analogy for memory handling, not guessing locker combinations or bypassing a login. Not every later visitor or request will encounter the vulnerable state.

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

The guard can help in two ways:

1. **Check what comes in.** A recognizable malicious request can be blocked before it reaches PHP—like rejecting an obviously suspicious form at the entrance.
2. **Check the whole exchange.** Some forms look ordinary on their own. Cloudflare's **full transaction detection** combines signals from the incoming request and the outgoing response. A matching response can then be blocked before it reaches the requester.

For example, imagine the guard lets a form through because it doesn't provide enough evidence of trouble. The attendant processes it and starts handing back belongings. Now the form **together with what is leaving** reveals a suspicious exchange. The guard can stop that return at the door, reducing the chance of someone walking away with another visitor's belongings.

But **stopping belongings at the exit cannot undo something the attendant already did**. Likewise, blocking a response doesn't reverse code already executed on the server. This protection buys time and adds defense in depth; PHP still needs its security update. Coverage also depends on the applicable rules being enabled and traffic actually passing through the WAF.

The mental model I want to keep is simple: **temporary storage needs accurate references, and failure paths need just as much care as the happy path.**

### 📚 Sources and diagrams

Sources for the October 2026 disclosures and PHP usage figure:

- [PHP: October 21 critical security advisory](https://www.php.net/archive/2026.php#2026-10-21-5)
- [PHP: October 23 session upload progress advisory](https://www.php.net/archive/2026.php#2026-10-23-1)
- [Cloudflare: php2shell vulnerabilities and WAF protection](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/)
- [OpenAI: coordinated disclosure and the global response](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)
- [W3Techs: PHP usage statistics and what the percentage measures](https://w3techs.com/technologies/details/pl-php)

Diagrams generated with [Archify](https://github.com/tt-a1i/archify). They illustrate the failure paths, not the mechanics of a working exploit.

</div>
