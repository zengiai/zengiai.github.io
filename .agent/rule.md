# Project Agent Development Harness

## 1. Scope

This project uses a project-local team development skill bundle:

- Project-local path: `.agent/project-dev-team`
- Original source for manual sync only: `/Users/zengjiaqi/.codex/skill-teams/project-dev-team`
- Target repository: `zengiai.github.io`

Agents working in this repository MUST read project-local skill files from `.agent/project-dev-team/<skill-name>/SKILL.md` first. The global source directory MUST NOT be treated as the runtime authority for this project.

## 2. Rule Precedence

When rules conflict, apply them in this order:

1. The user's current explicit instruction.
2. The repository root `AGENTS.md`.
3. This file: `.agent/rule.md`.
4. The selected project-local skill file under `.agent/project-dev-team`.
5. General engineering conventions.

If a conflict affects data correctness, release safety, core transaction flow, user-visible behavior, or rollback capability, the agent MUST stop and report the conflict before continuing.

## 3. Operating Boundaries

### 3.1 File Boundaries

- The agent MUST operate inside the current repository by default.
- The agent MUST NOT modify `/Users/zengjiaqi/.codex/skill-teams/project-dev-team`; that directory is only a sync source.
- The agent MUST NOT modify global Codex config, system config, IDE config, or user home files unless the user explicitly asks for it.
- `.agent/project-dev-team` is a vendored project dependency. Feature work SHOULD NOT edit it unless the task is specifically about updating the project skill bundle.
- Changes to Aura tool behavior MUST also follow the root `AGENTS.md` requirements for `aura_tool/GUIDE.md`, `GUIDE_VERSION`, resource version query params, and one-time update announcements.

### 3.2 Command Boundaries

- The agent MUST NOT run destructive commands such as repository cleanup, branch reset, or user-file deletion unless explicitly authorized.
- The agent MUST NOT install dependencies or access the network without a clear reason and required approval.
- The agent SHOULD NOT start long-running background processes by default. If a dev server is required, the agent MUST record the port, purpose, and stop procedure.
- The agent MUST NOT claim completion without the nearest useful validation. If validation cannot run, the agent MUST state why.

### 3.3 Design Boundaries

- Stability first, performance second, extensibility third, elegance last.
- The agent MUST NOT introduce heavy architecture for small changes.
- The agent MUST NOT blindly use microservices, distributed transactions, or distributed locks.
- A distributed lock MUST NOT become the throughput bottleneck of a core path.
- Changes affecting core flows, data models, transactions, cache, MQ, permissions, payment, inventory, marketing, or risk control MUST pass design and gate review before implementation.

## 4. Team Roles

| Role | Local path | Use when | Must not |
| --- | --- | --- | --- |
| PM Orchestrator | `.agent/project-dev-team/pm-orchestrator` | Multi-stage planning, role routing, delivery state control | Write production code directly |
| Requirement Analyst | `.agent/project-dev-team/requirement-analyst` | Requirements are unclear, scope is unstable, acceptance criteria are missing | Invent business decisions |
| Solution Architect | `.agent/project-dev-team/solution-architect` | Requirements are clear and a technical design is needed | Skip rollout, rollback, or observability design |
| Java Architect | `.agent/project-dev-team/java-architect` | Java high-concurrency, e-commerce core flow, or complex refactoring design | Jump into implementation details |
| Gate Reviewer | `.agent/project-dev-team/gate-reviewer` | Before development starts for risky or multi-file changes | Approve unresolved P0/P1 risks |
| Developer Agent | `.agent/project-dev-team/developer-agent` | Approved implementation work for Java, Python, or frontend | Redesign the system silently |
| Java Engineer | `.agent/project-dev-team/java-engineer` | Spring Boot, MyBatis, Redis, MQ, 交易, 库存, 支付, 营销, 风控 implementation | Omit transaction, exception, cache, or thread-safety notes |
| Code Reviewer | `.agent/project-dev-team/code-reviewer` | Production-risk-oriented review after code exists | Replace real risk review with style nits |
| QA Tester | `.agent/project-dev-team/qa-tester` | Test plan, regression scope, release evidence | Only test the happy path |
| Performance Optimizer | `.agent/project-dev-team/performance-optimizer` | QPS, RT, hotspot key, thread pool, DB, cache, or MQ backlog analysis | Give capacity conclusions without assumptions |

## 5. Model Routing Policy

The project-local skill bundle MUST use this model policy:

| Skill | Model | Reasoning effort |
| --- | --- | --- |
| `developer-agent` | `gpt-5.5` | `xhigh` |
| `java-engineer` | `gpt-5.5` | `xhigh` |
| `code-reviewer` | `gpt-5.5` | `xhigh` |
| `gate-reviewer` | `gpt-5.5` | `xhigh` |
| `pm-orchestrator` | `gpt-5.4` | `medium` |
| `requirement-analyst` | `gpt-5.4` | `medium` |
| `solution-architect` | `gpt-5.4` | `medium` |
| `java-architect` | `gpt-5.4` | `medium` |
| `performance-optimizer` | `gpt-5.4` | `medium` |
| `qa-tester` | `gpt-5.4` | `medium` |

Coding roles and reviewer roles MUST use the highest-accuracy route: `gpt-5.5` with `xhigh` reasoning. All other roles MUST use the lightweight route: `gpt-5.4` with `medium` reasoning.

Each `.agent/project-dev-team/<skill-name>/agents/openai.yaml` file MUST keep its `runtime.model` and `runtime.reasoning_effort` aligned with this table.

## 6. Delivery State Machine

PM Orchestrator owns the delivery state machine. Every non-trivial requirement MUST move through this state machine unless the user explicitly requests a smaller direct edit.

```text
[Requirement Analysis]
  -> [Solution Design]
  -> [Gate Review]
  -> [Development]
  -> [Code Review]
  -> [Test Verification]
  -> [Release Ready]

Gate Review BLOCKED     -> return to [Requirement Analysis] or [Solution Design]
Code Review MUST_FIX    -> return to [Development]
Test Verification BLOCKED -> return to [Development]
Same-stage rollback 3 times -> stop and report to the user; recommend requirement re-review
```

### 6.1 State Hard Rules

- The agent MUST NOT start development when Gate Review has blocking items.
- The agent MUST NOT enter Test Verification when Code Review has unresolved `P0`, `P1`, or explicit must-fix items.
- The agent MUST return to Development when Test Verification finds blocking defects.
- The agent MUST stop and report to the user when the same stage rolls back three consecutive times.
- The agent MUST NOT skip Requirement Analysis when scope, acceptance criteria, data semantics, permission rules, or rollback behavior are unclear.
- The agent MUST NOT skip Solution Design when the change affects module boundaries, API contracts, data models, transactions, cache, MQ, concurrency, rollout, or rollback.
- The agent MUST NOT mark Release Ready without test evidence and residual-risk notes.
- PM Orchestrator MUST maintain the current stage, next stage, rollback target, blocking items, and owner in the relevant feature document.

### 6.2 State Transition Table

| Current state | Success transition | Blocked transition | Required document |
| --- | --- | --- | --- |
| Requirement Analysis | Solution Design | Stay in Requirement Analysis | `01_REQUIREMENT_ANALYSIS.md` |
| Solution Design | Gate Review | Return to Requirement Analysis | `02_SOLUTION_DESIGN.md` |
| Gate Review | Development | Return to Requirement Analysis or Solution Design | `03_GATE_REVIEW.md` |
| Development | Code Review | Stay in Development | `04_DEVELOPMENT.md` |
| Code Review | Test Verification | Return to Development | `05_CODE_REVIEW.md` |
| Test Verification | Release Ready | Return to Development | `06_TEST_REPORT.md` |

## 7. Feature Delivery Documents

Every requirement MUST have a feature delivery directory under `docs/features/<FeatureSlug>/`.

The directory name MUST be a stable English slug in PascalCase or kebab-case. It SHOULD describe the business capability, for example `SchedulePostUpdateBehavior` or `aura-guide-update-notice`.

Required structure:

```text
docs/features/<FeatureSlug>/
|-- 01_REQUIREMENT_ANALYSIS.md
|-- 02_SOLUTION_DESIGN.md
|-- 03_GATE_REVIEW.md
|-- 04_DEVELOPMENT.md
|-- 05_CODE_REVIEW.md
`-- 06_TEST_REPORT.md
```

### 7.1 Documentation Hard Rules

- Agent output for feature work MUST be persisted into the matching document. Chat-only output is not enough.
- The agent MUST create the feature directory before or during Requirement Analysis.
- Each stage owner MUST update only the document owned by that stage unless a cross-stage correction is explicitly required.
- A later stage MUST reference earlier document conclusions instead of restating them from memory.
- If implementation changes the approved design, `02_SOLUTION_DESIGN.md` and `03_GATE_REVIEW.md` MUST be updated or the task MUST return to Gate Review.
- If review or testing changes acceptance criteria, the task MUST return to Requirement Analysis.
- The final answer to the user MUST include links to the updated feature documents.

### 7.2 Document Ownership

| Document | Owner role | Purpose |
| --- | --- | --- |
| `01_REQUIREMENT_ANALYSIS.md` | `requirement-analyst` | Scope, non-scope, flows, ambiguity, non-functional requirements, acceptance criteria |
| `02_SOLUTION_DESIGN.md` | `solution-architect` or `java-architect` | Architecture, data model, contracts, consistency, risk, monitoring, rollout |
| `03_GATE_REVIEW.md` | `gate-reviewer` | GO / CONDITIONAL GO / NO GO decision and blocking items |
| `04_DEVELOPMENT.md` | `developer-agent` or `java-engineer` | Implementation record, changed files, transaction/cache/thread-safety/error handling notes |
| `05_CODE_REVIEW.md` | `code-reviewer` | Findings, must-fix items, residual risks, review conclusion |
| `06_TEST_REPORT.md` | `qa-tester` | Test scope, cases, results, regression evidence, release readiness |

The template directory is `docs/features/_TEMPLATE/`. New feature directories SHOULD be copied from this template before work starts.

## 8. Harness Workflow

This project follows a staged harness. Each stage MUST have explicit inputs, outputs, and exit criteria.

### Stage 0: Intake

Inputs:

- User goal.
- Repository constraints.
- Affected files or modules.

Outputs:

- Task type: requirement, design, implementation, bug fix, review, test, performance, or release.
- Whether a team skill is required.
- Whether the change touches more than three files. If yes, split the work into bounded tasks.

Exit criteria:

- The agent has made clear whether it will edit files, change docs, run commands, or start services.

### Stage 1: Requirement Clarification

Trigger this stage when:

- Business intent is unclear.
- Acceptance criteria are missing.
- The change touches 状态机, 权限, 资金, 库存, 营销, 风控, or any core user path.

Use:

- `requirement-analyst`

Exit criteria:

- Scope, non-scope, main flow, exception flow, acceptance criteria, and non-functional requirements are clear.
- `docs/features/<FeatureSlug>/01_REQUIREMENT_ANALYSIS.md` is created or updated.

### Stage 2: Solution Design

Trigger this stage when the task changes:

- Module boundaries.
- API contracts.
- Data models.
- Transaction boundaries.
- Cache behavior.
- MQ behavior.
- Concurrency control.
- Rollout or rollback strategy.

Use:

- General multi-language design: `solution-architect`
- Java high-concurrency or e-commerce core flow: `java-architect`
- Throughput, latency, or capacity issue: `performance-optimizer`

Exit criteria:

- The design covers scenario analysis, traffic assumptions, architecture, data model, concurrency control, bottleneck prediction, fallback plan, monitoring, alerting, and evolution path.
- `docs/features/<FeatureSlug>/02_SOLUTION_DESIGN.md` is created or updated.

### Stage 3: Development Gate

Trigger this stage before implementation when:

- The change affects more than three files.
- The change affects core flow, data consistency, cache, MQ, permissions, or user-visible workflows.
- The implementation depends on non-trivial architecture decisions.

Use:

- `gate-reviewer`

Exit criteria:

- Decision is `GO`, or `CONDITIONAL GO` with all blocking conditions resolved.
- `docs/features/<FeatureSlug>/03_GATE_REVIEW.md` is created or updated.

### Stage 4: Implementation

Trigger this stage when:

- Requirements are clear.
- Design is approved or risk is low enough for direct implementation.
- Gate review has passed when required.

Use:

- General implementation: `developer-agent`
- Spring Boot / Java middleware / e-commerce implementation: `java-engineer`

Implementation rules:

- Inspect existing code before editing.
- Keep the change focused and small.
- Preserve user changes.
- Do not perform unrelated refactors.
- Do not put business logic in controllers.
- Do not cross architecture layers.
- Make transaction boundaries, cache strategy, exception handling, and thread-safety assumptions traceable.
- Frontend work MUST cover relevant loading, empty, error, success, and disabled states.

Exit criteria:

- Code, documentation, and configuration are synchronized.
- The nearest useful validation has run, or the reason it could not run is documented.
- `docs/features/<FeatureSlug>/04_DEVELOPMENT.md` is created or updated.

### Stage 5: Code Review

Trigger this stage when:

- Implementation is complete.
- The user asks for review.
- The change has stability, performance, security, data consistency, or release risk.

Use:

- `code-reviewer`

Exit criteria:

- P0/P1 issues are fixed or explicitly blocking.
- P2 issues have an accepted plan or rationale.
- `docs/features/<FeatureSlug>/05_CODE_REVIEW.md` is created or updated.

### Stage 6: QA and Release Gate

Trigger this stage when validation, regression planning, performance risk, or release readiness is required.

Use:

- `qa-tester`
- Add `performance-optimizer` when throughput, latency, or capacity risk exists.

Exit criteria:

- Test scope, non-test scope, test cases, automation suggestions, regression scope, release criteria, and residual risks are documented.
- `docs/features/<FeatureSlug>/06_TEST_REPORT.md` is created or updated.

## 9. Bug Fix Protocol

Bug fixes MUST follow this order:

1. Reproduce: record inputs, environment, operation path, expected result, and actual result.
2. Diagnose: inspect logs, state, call chain, data, cache, thread pool, slow SQL, GC, network, or browser console as relevant.
3. Fix: use the smallest compatible change.
4. Validate: run unit tests, integration tests, build, browser smoke test, or the original reproduction path.
5. Pressure-test when required: if the bug affects concurrency, cache, MQ, DB, performance, or core flow, state the load-test requirement.

If the bug cannot be reproduced, the agent MUST NOT make a large speculative change. It MUST report evidence, assumptions, and the next minimal validation step.

## 10. Output Requirements

### 10.1 System Design Output

System design answers MUST use this structure:

1. Scenario Analysis
2. Traffic Model Assumptions
3. Architecture Design
4. Data Model Design
5. Concurrency Control
6. Performance Bottleneck Prediction
7. Risks and Fallback Plan
8. Monitoring and Alerting
9. Evolution Path

Chinese domain terms such as 下单链路, 库存扣减, 防超卖, 优惠券核销, 支付回调幂等, 退款流程, 秒杀, 热点 Key, 缓存击穿, and MQ 堆积 SHOULD be preserved when they carry precise business meaning.

### 10.2 Implementation Output

Implementation summaries MUST state:

- Implementation approach.
- Modified files.
- Transaction boundary.
- Cache strategy.
- Thread-safety assumptions.
- Exception handling.
- Test and validation result.
- Residual risk.

Java examples MUST default to Spring Boot 3 style and include useful Chinese comments for non-obvious business logic, rollback, compensation, cross-resource operations, or invariants.

### 10.3 Review Output

Reviews MUST lead with findings, ordered by severity:

- `P0`: funds risk, inventory oversell, data corruption, core flow unavailable, security vulnerability.
- `P1`: main flow blocked, consistency risk, rollback unavailable, missing critical observability.
- `P2`: non-core defect, compatibility issue, UX issue, or deferrable boundary problem.

Each finding SHOULD include location, problem, risk, recommendation, and sample code only when useful.

## 11. Project-Specific Constraints

This repository contains static pages, frontend assets, Python backend code, and the Aura tool. Agents MUST follow these constraints:

- Do not change unrelated pages or generated artifacts.
- Do not commit `.DS_Store`, IDE workspace files, or temporary files.
- When changing `aura_tool.html`, `aura_tool/js/main.js`, `aura_tool/css/style.css`, or Aura behavior, update `aura_tool/GUIDE.md`.
- `GUIDE_VERSION`, `GUIDE_UPDATE_HIGHLIGHTS`, and HTML resource version query params MUST be updated together.
- The Aura update announcement MUST remain one-time per browser per `GUIDE_VERSION`.

## 12. Skill Bundle Sync Policy

`.agent/project-dev-team` was copied from the global skill team directory. Future global updates require manual sync:

1. Compare `/Users/zengjiaqi/.codex/skill-teams/project-dev-team` with `.agent/project-dev-team`.
2. Sync only the team skill bundle. Do not overwrite `.agent/rule.md`.
3. Verify role names, trigger boundaries, and output formats remain compatible with this harness.
4. If sync changes the workflow, update the role table and staged workflow in this file.
