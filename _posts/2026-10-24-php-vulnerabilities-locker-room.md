---
layout: post
title: "Two PHP Bugs, Explained with a Locker Room"
date: 2026-10-24 00:00:00 -0400
categories: [security, infrastructure, explainers]
comments: true
published: true
---

“A specially crafted request can lead to remote code execution.”

That sentence tells you something is serious. It doesn't explain how a message sent to a website can become a break-in.

The October 2026 PHP disclosures are easier to follow if you picture a locker room: an attendant, temporary storage, and slips that say where things are. The trouble starts when the attendant trusts a record that isn't valid anymore—or was never finished in the first place.

<!--more-->

<div class="php-explainer" markdown="1">

<link rel="stylesheet" href="{{ '/css/php-locker-post.css' | relative_url }}?v=2">

### First, what does PHP do?

When you submit a form, your browser sends a **request**. On many websites, PHP is the software on the server that processes it and prepares a reply. While it works, it needs temporary memory.

Here's the locker-room translation:

| Locker room | Website |
| --- | --- |
| A visitor's request | A message sent to the server |
| The attendant | A PHP worker: a running process doing the work |
| Temporary lockers | Working memory, not a permanent database |
| A location slip saying “use A” | A reference pointing to a memory location |

A normal task is straightforward: put belongings in a locker, finish the record, use the right slip, then release the locker **and retire the old slip** when the task ends.

The same attendant can serve another visitor afterward. Likewise, a PHP worker can handle many requests over its lifetime.

### Bug 1: trusting an unfinished record

Imagine a visitor deliberately overwhelms the attendant's temporary workspace. The attendant runs out of room halfway through preparing an internal storage record.

An unfinished record isn't automatically a security disaster. The dangerous part comes next: **during cleanup, the attendant follows that record as though all its fields were valid.**

{% include php-locker-diagram.html id="unfinished" title="Bug 1: a failure during setup becomes unsafe cleanup" %}

In PHP, this is **CVE-2026-109618**. An out-of-memory failure can interrupt initialization of internal request data. Cleanup may then treat partially initialized data as valid.

Running out of memory is the trigger. **Unsafe use of the unfinished data is the vulnerability.** A big upload alone does not automatically give someone control of a server; exploitation depends on crafted input and the affected execution path.

### Bug 2: keeping the slip after the locker is released

Now imagine a task ends unexpectedly. The old belongings are removed and locker A becomes available again—but the attendant keeps a slip saying “use locker A.”

Later, the **same attendant** serves another visitor. Locker A might now hold different belongings. Following the old slip no longer means retrieving the original items.

{% include php-locker-diagram.html id="stale" title="Bug 2: an old reference survives into a later request" %}

In PHP, this is **CVE-2026-109619**. A fatal error can leave internal state pointing to memory that is freed when the request ends. A later request on that same worker may use the stale state before normal initialization resets it.

The useful distinction is:

- **Bug 1:** trust information that was never fully prepared.
- **Bug 2:** trust a reference after the information it pointed to is no longer valid.

This is an analogy for memory handling, not guessing locker combinations or bypassing a login. Not every later visitor or request will encounter the vulnerable state.

### How does that turn into a break-in?

Unsafe memory use can have different consequences:

- **A crash:** the worker stops, and visitors may get errors.
- **A data leak:** information reaches someone who shouldn't see it.
- **Remote code execution:** an attacker gets instructions to run with the PHP worker's permissions.

Those are possible outcomes, **not three guaranteed stages**. Code execution also doesn't automatically mean full administrator access. But a website worker may already have access to valuable files, credentials, or customer information.

### A security guard helps. It doesn't repair the attendant's procedures.

A web application firewall, or **WAF**, is an extra checkpoint for traffic passing through it.

In the analogy, a guard can inspect incoming requests. Recognizable trouble gets stopped before it reaches the attendant. But sometimes the request alone doesn't provide enough evidence.

Cloudflare describes combining the incoming request with the outgoing response. Think of the guard checking both the visitor's form **and the belongings about to leave**. Together, those signals may reveal a suspicious exchange, and the matching response can be blocked before it reaches the requester.

**Stopping belongings at the exit cannot undo something the attendant already did.** Likewise, blocking a response doesn't reverse code already executed on the server. WAF protection is an additional layer; updating PHP fixes the underlying bugs.

### Why this needed a coordinated response

PHP is shared infrastructure. Many unrelated websites can depend on the same vulnerable software.

OpenAI describes a maintainer-led response involving researchers and infrastructure providers: validate the flaws, prepare fixes and protections, then help operators deploy them. Cloudflare reports deploying protections before public disclosure and observing attack traffic after an early leak.

The important last step is easy to miss: **a released fix is not an installed fix.**

### If you own a website, ask one question

> Has the PHP actually running our website been patched for both original vulnerabilities?

Ask your host or technical team to confirm the live web-serving environment is updated, the relevant workers have been restarted or replaced, and applicable firewall protections remain enabled. **Updating WordPress, a theme, or a plugin alone does not fix PHP runtime bugs.**

The October 21 fixes were PHP **8.2.35, 8.3.36, 8.4.27, and 8.5.12**, or a vendor-confirmed backported fix. Use current supported security releases rather than treating that list as a permanent recommendation.

On October 23, PHP also announced a **separate related issue, CVE-2026-115560**, that can affect those releases under an unusual combination of session settings and application behavior. The advisory recommends disabling session upload progress where appropriate until the next regular bugfix release; applications that never change the serialization handler at runtime can keep it enabled. Cloudflare's known-attempt coverage for this issue depends on the default upload-progress field name. Have your operator check the current guidance linked below.

If compromise is suspected, involve security staff. Installing a patch doesn't remove an attacker who already got in.

The mental model I want to keep is simple: **temporary storage needs accurate references, and failure paths need just as much care as the happy path.**

### Sources and diagrams

Security details checked against these sources on **October 24, 2026**:

- [PHP: October 21 critical security advisory](https://www.php.net/archive/2026.php#2026-10-21-5)
- [PHP: October 23 session upload progress advisory](https://www.php.net/archive/2026.php#2026-10-23-1)
- [Cloudflare: php2shell vulnerabilities and WAF protection](https://blog.cloudflare.com/php-vulnerabilities-waf-protection/)
- [OpenAI: coordinated disclosure and the global response](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)

Diagrams generated with [Archify](https://github.com/tt-a1i/archify). They illustrate the failure paths, not the mechanics of a working exploit.

</div>
