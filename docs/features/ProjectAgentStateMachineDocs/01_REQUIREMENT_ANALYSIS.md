# Requirement Analysis

## Feature

- Feature slug: `ProjectAgentStateMachineDocs`
- Request date: `2026-05-22`
- Owner role: `requirement-analyst`
- Current state: `Requirement Analysis`
- Next state: `Solution Design`

## 1. Requirement Summary

接入项目级 agent delivery state machine，并要求每个非平凡需求都沉淀到固定目录结构下的阶段文档，而不是只以聊天消息作为交付记录。

## 2. Scope

- 在 `.agent/rule.md` 中增加状态机硬规则。
- 在 `.agent/rule.md` 中增加每个需求的文档落地规则。
- 新增 `docs/features/_TEMPLATE/`，提供六个阶段文档模板。
- 新增 `docs/features/README.md`，说明需求文档目录入口。
- 在 `AGENTS.md` 中补充项目级入口约束。
- 为本次需求创建 `docs/features/ProjectAgentStateMachineDocs/` 交付文档。

## 3. Non-Scope

- 不修改业务代码。
- 不修改 Aura 页面功能、接口、导出能力或更新公告逻辑。
- 不修改全局 `/Users/zengjiaqi/.codex/skill-teams/project-dev-team`。
- 不引入自动化脚本或 CI 检查。

## 4. Main Flow

1. 用户提出接入状态机硬规则和需求落地文档。
2. 项目规则文件定义状态机、回退规则、阻断条件和阶段文档要求。
3. 新需求从模板复制出 `docs/features/<FeatureSlug>/`。
4. 每个阶段由对应 agent 更新自己的文档。
5. 最终回答引用已更新的落地文档。

## 5. Exception Flow

- Gate Review 有阻塞项时，不允许进入 Development，必须回退到 Requirement Analysis 或 Solution Design。
- Code Review 有 P0/P1 或 must-fix 时，不允许进入 Test Verification，必须回退 Development。
- Test Verification 有阻塞缺陷时，必须回退 Development。
- 同一阶段连续回退 3 次时，停止并向用户汇报，建议重审需求。

## 6. Ambiguity and Questions

| Question | Impact | Owner | Status |
| --- | --- | --- | --- |
| 是否需要 CI 强制检查文档存在 | 当前仅规则约束，未自动校验 | User / PM | Deferred |
| 是否所有小修都必须建文档 | 规则限定为 non-trivial requirement，避免小改过度流程化 | PM | Resolved |

## 7. Non-Functional Requirements

- Peak QPS: Not applicable.
- RT 99: Not applicable.
- Availability: Documentation-only change, no runtime impact.
- Compatibility: Must not affect existing static pages or Aura behavior.
- Security: Must not expose secrets or modify global user files.
- Observability: Delivery trace must be visible in feature documents.
- Rollback: Remove added docs/rules or revert the specific documentation commit.

## 8. Acceptance Criteria

- Given a non-trivial requirement, when an agent starts delivery, then it must create or update `docs/features/<FeatureSlug>/`.
- Given Gate Review has blocking items, when development is requested, then the agent must refuse to start and route back.
- Given Code Review has unresolved P0/P1 or must-fix findings, when testing is requested, then the agent must route back to Development.
- Given Test Verification has blocking defects, when release readiness is requested, then the agent must route back to Development.
- Given the same stage rolls back three consecutive times, when the next rollback would occur, then the agent must stop and report to the user.
- Given feature work is complete, when final response is sent, then links to updated feature documents must be included.

## 9. State Trace

| Time | State | Decision | Rollback count | Notes |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Requirement Analysis | Requirement clear enough for docs-only harness update | 0 | Proceed to Solution Design |

