# Solution Design

## Feature

- Feature slug: `ProjectAgentStateMachineDocs`
- Owner role: `solution-architect`
- Current state: `Solution Design`
- Previous state: `Requirement Analysis`
- Next state: `Gate Review`

## 1. Scenario Analysis

The project needs a lightweight but strict delivery harness for agent work. The PM Orchestrator acts as the state machine owner, while specialist agents produce persistent stage documents under `docs/features/<FeatureSlug>/`.

## 2. Traffic Model Assumptions

- Peak QPS: Not applicable.
- RT 99 target: Not applicable.
- Data volume: Small markdown files per feature.
- Hotspot risk: Not applicable.
- External dependency assumptions: None.

## 3. Architecture Design

The design is documentation-only:

- `.agent/rule.md` is the authoritative harness rule file.
- `AGENTS.md` exposes the rule entrypoint at repository root.
- `docs/features/README.md` explains the feature document convention.
- `docs/features/_TEMPLATE/` provides reusable stage templates.
- `docs/features/<FeatureSlug>/` stores actual delivery evidence per requirement.

## 4. Data Model Design

No runtime data model changes.

Document model:

| Document | Stage | Required |
| --- | --- | --- |
| `01_REQUIREMENT_ANALYSIS.md` | Requirement Analysis | Yes |
| `02_SOLUTION_DESIGN.md` | Solution Design | Yes |
| `03_GATE_REVIEW.md` | Gate Review | Yes |
| `04_DEVELOPMENT.md` | Development | Yes |
| `05_CODE_REVIEW.md` | Code Review | Yes |
| `06_TEST_REPORT.md` | Test Verification | Yes |

## 5. Interface and Module Boundaries

| Module | Responsibility | Upstream | Downstream | Notes |
| --- | --- | --- | --- | --- |
| `.agent/rule.md` | State machine and hard rules | User instruction / AGENTS.md | Agent execution | Authoritative rule source |
| `docs/features/_TEMPLATE/` | Stage document templates | `.agent/rule.md` | Feature document directories | Reused per requirement |
| `docs/features/<FeatureSlug>/` | Per-requirement delivery record | Agent outputs | Final user response | Must be kept current |

## 6. Concurrency and Consistency

No runtime concurrency impact.

Consistency rule: stage documents must align with current delivery state. If implementation changes approved design, Solution Design and Gate Review must be updated or the state must return to Gate Review.

## 7. Performance Bottleneck Prediction

No application performance risk. The only operational risk is process overhead if very small edits are forced through the full workflow, so the rule applies to non-trivial requirements.

## 8. Risks and Fallback Plan

| Risk | Severity | Fallback | Owner |
| --- | --- | --- | --- |
| Agents ignore docs and only answer in chat | P1 | `.agent/rule.md` hard rule requires persisted docs and final links | PM Orchestrator |
| Workflow becomes too heavy for tiny edits | P2 | Scope says non-trivial requirements; direct small edits remain allowed | PM Orchestrator |
| State rollback count is not tracked | P2 | Each stage template includes State Trace | Stage owner |

## 9. Monitoring and Alerting

No runtime monitoring. Process observability is provided by:

- State Trace tables in each stage document.
- Git diff review of `docs/features/<FeatureSlug>/`.
- Final response links to changed documents.

## 10. Rollout and Rollback

Rollout:

- Add rules and templates in one repository change.
- Start using templates for all future non-trivial requirements.

Rollback:

- Revert `.agent/rule.md` state-machine sections.
- Remove `docs/features/README.md`, `_TEMPLATE/`, and the feature-specific docs if needed.

## 11. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Solution Design | Docs-only design is acceptable | 0 | Proceed to Gate Review |

