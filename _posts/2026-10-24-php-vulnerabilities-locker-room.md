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

Imagine a visitor deliberately overwhelms the attendant's temporary workspace. The attendant runs out of room halfway through preparing an internal storage record.

An unfinished record isn't automatically a security disaster. The dangerous part comes next: **during cleanup, the attendant follows that record as though all its fields were valid.**

{% include php-locker-diagram.html id="unfinished" title="Bug 1: a failure during setup becomes unsafe cleanup" %}

In PHP, this is **CVE-2026-109618**. An out-of-memory failure can interrupt initialization of internal request data. Cleanup may then treat partially initialized data as valid.

Running out of memory is the trigger. **Unsafe use of the unfinished data is the vulnerability.** A big upload alone does not automatically give someone control of a server; exploitation depends on crafted input and the affected execution path.

### 🎟️ Bug 2: keeping the slip after the locker is released

Now imagine a task ends unexpectedly. The old belongings are removed and locker A becomes available again—but the attendant keeps a slip saying “use locker A.”

Later, the **same attendant** serves another visitor. Locker A might now hold different belongings. Following the old slip no longer means retrieving the original items.

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
