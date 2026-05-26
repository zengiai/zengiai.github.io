# Solution Design

## Feature

- Feature slug:
- Owner role: `solution-architect` or `java-architect`
- Current state: `Solution Design`
- Previous state: `Requirement Analysis`
- Next state: `Gate Review`

## 1. Scenario Analysis

Summarize the scenario and affected user/system paths.

## 2. Traffic Model Assumptions

- Peak QPS:
- RT 99 target:
- Data volume:
- Hotspot risk:
- External dependency assumptions:

## 3. Architecture Design

Describe module boundaries, dependency direction, and runtime flow.

## 4. Data Model Design

Document tables, fields, state enums, storage changes, or no-data-change conclusion.

## 5. Interface and Module Boundaries

| Module | Responsibility | Upstream | Downstream | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 6. Concurrency and Consistency

Describe idempotency, optimistic locking, cache consistency, MQ consistency, retry, timeout, compensation, and rollback strategy.

## 7. Performance Bottleneck Prediction

List likely bottlenecks in CPU, DB, Redis, MQ, thread pools, locks, remote calls, or browser/runtime behavior.

## 8. Risks and Fallback Plan

| Risk | Severity | Fallback | Owner |
| --- | --- | --- | --- |
|  |  |  |  |

## 9. Monitoring and Alerting

Document logs, metrics, alerts, dashboards, and release observation checks.

## 10. Rollout and Rollback

Describe feature flags, gray release, rollback steps, and data reconciliation when relevant.

## 11. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
|  | Solution Design |  | 0 |  |

