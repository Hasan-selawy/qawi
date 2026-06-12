---
name: Spring Boot route conflict pattern
description: Preventing "Ambiguous mapping" startup failures when adding new controllers
---

When you introduce a new `@RestController` with a `@RequestMapping` base path that overlaps methods already declared in another controller, Spring throws:

```
java.lang.IllegalStateException: Ambiguous mapping. Cannot map 'newController' method
to {GET [/api/v1/super/leads]}: There is already 'existingController' bean method mapped.
```

**The rule:** Before registering a new controller that owns a sub-path (e.g. `/super/leads`), grep the existing controllers for any method-level mappings that resolve to the same URL, and delete those methods from the old controller.

**Why:** Spring processes all controllers at startup and registers every `@GetMapping` / `@PostMapping` etc. globally. Two beans mapping to the same verb+path is fatal — there is no "override" mechanism.

**How to apply:** When writing a new controller with `@RequestMapping("/api/v1/super/leads")`, grep for `/leads` or `getLeads` across `controller/` first. Remove duplicates from the old controller before restarting Spring.
