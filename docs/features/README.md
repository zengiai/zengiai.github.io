# Feature Delivery Documents

Every non-trivial requirement in this repository MUST create a dedicated feature directory:

```text
docs/features/<FeatureSlug>/
```

Start by copying the templates from `docs/features/_TEMPLATE/` and then update each stage document as the delivery state machine advances.

Required documents:

- `01_REQUIREMENT_ANALYSIS.md`
- `02_SOLUTION_DESIGN.md`
- `03_GATE_REVIEW.md`
- `04_DEVELOPMENT.md`
- `05_CODE_REVIEW.md`
- `06_TEST_REPORT.md`

The authoritative workflow and hard rules are defined in `.agent/rule.md`.

