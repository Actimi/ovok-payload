---
title: Release tiers
sidebar_position: 2
description: Ovok ships three release tiers — alpha, beta and final. Each describes the maturity of the contract, not the deployment topology. Pick the right one for the work.
keywords:
  - Ovok release tiers
  - alpha beta production API
  - healthcare API environments
---

# Release tiers

Ovok is delivered as three release tiers. The names describe **maturity
of the contract**, not the underlying infrastructure.

| Tier                   | Promise                                                                                                               | API host               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **dev** — sandbox      | Partner sandbox. CMS + Payload stack live here first. Expect change.                                                  | `api.sandbox.ovok.com` |
| **alpha** — preview    | Bleeding edge. Endpoints can change shape day-to-day. Use when you need access to a capability before it ships.       | `api.dev.ovok.com`     |
| **beta** — pre-release | Release-candidate. Stable enough for integration tests and partner walkthroughs, but not bound by deprecation policy. | `api.staging.ovok.com` |
| **final** — production | The supported contract. Breaking changes follow the deprecation policy; production integrations target this tier.     | `api.ovok.com`         |

## Switching tiers in these docs

The dropdown in the top-right navbar flips the active tier. Your
selection persists across pages and reloads. Every code sample and
`<ApiBase />` reference on the site updates immediately.

Currently selected:

<ApiBase inline={false} />

## Versioning rules

- **alpha → beta** — a capability is promoted when the Ovok team signs
  off on its shape. Nothing is automatic.
- **beta → final** — gated by a release checklist (contract review,
  load profile, on-call sign-off).
- **Deprecation policy** — only `final` is bound by a deprecation
  policy. Endpoints there announce a sunset date in the API reference;
  clients have time to migrate before removal.

## Picking a tier

- **Building something new?** Start on **alpha**. Lock to **beta**
  before you ship to internal users.
- **Running in production?** **final**. The preview and pre-release
  tiers are not capacity-managed for production traffic.
- **Writing a partner integration test?** **beta** — the most
  representative stand-in for production short of the real thing.

## Hostnames at a glance

Every public Ovok surface follows the same subdomain pattern. Flip the
tier in the navbar to see the matching hostnames in context.

| Surface        | dev (sandbox)                | alpha                    | beta                         | final                |
| -------------- | ---------------------------- | ------------------------ | ---------------------------- | -------------------- |
| API            | `api.sandbox.ovok.com`       | `api.dev.ovok.com`       | `api.staging.ovok.com`       | `api.ovok.com`       |
| Console        | `console.sandbox.ovok.com`   | `console.dev.ovok.com`   | `console.staging.ovok.com`   | `console.ovok.com`   |
| Data Dashboard | `dashboard.sandbox.ovok.com` | `dashboard.dev.ovok.com` | `dashboard.staging.ovok.com` | `dashboard.ovok.com` |
