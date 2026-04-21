# Graph Report - .  (2026-04-21)

## Corpus Check
- 7 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 195 nodes · 391 edges · 20 communities detected
- Extraction: 48% EXTRACTED · 52% INFERRED · 0% AMBIGUOUS · INFERRED: 202 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `escapeHtml()` - 19 edges
2. `renderSessionMessageItem()` - 10 edges
3. `WyckoffApp` - 10 edges
4. `fetchStatistics()` - 9 edges
5. `showError()` - 9 edges
6. `fetchSessionListPage()` - 8 edges
7. `hideError()` - 8 edges
8. `fetchMerchantInfo()` - 8 edges
9. `renderSettingLeafNode()` - 8 edges
10. `renderCustomerEmailFormMessage()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `resetMerchantState()` --calls--> `createDefaultSessionDetailState()`  [INFERRED]
  aura_tool/js/main.js → aura_tool/js/main.js  _Bridges community 6 → community 14_
- `openGuideModal()` --calls--> `loadGuideContent()`  [INFERRED]
  aura_tool/js/main.js → aura_tool/js/main.js  _Bridges community 2 → community 13_
- `maybeForceShowSessionUiGuide()` --calls--> `openSessionUiGuideModal()`  [INFERRED]
  aura_tool/js/main.js → aura_tool/js/main.js  _Bridges community 15 → community 13_
- `openSessionUiGuideModal()` --calls--> `buildSessionUiGuideStandaloneHtml()`  [INFERRED]
  aura_tool/js/main.js → aura_tool/js/main.js  _Bridges community 13 → community 9_
- `handleGlobalEscape()` --calls--> `closeGuideModal()`  [INFERRED]
  aura_tool/js/main.js → aura_tool/js/main.js  _Bridges community 13 → community 16_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (6): bindMerchantEvents(), bindSingleMerchantPicker(), buildStatisticsPieExportFileName(), formatDateForDateTimeLocal(), initDateTimeInputs(), sanitizeFileNamePart()

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (22): buildStatisticsPieExcelHtml(), convertDateTimeFormat(), convertDateTimeToCompactDate(), downloadBlob(), exportStatisticsPieExcel(), fetchCategoryCountPanelData(), fetchCategoryPanelData(), fetchDiscountList() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (18): buildGuideDocumentHtml(), buildInlineLoadingMarkup(), displayUserInfoInPopover(), escapeHtml(), fetchSessionUserInfo(), formatFieldName(), formatSettingValue(), getSettingLabel() (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (6): draw_chart(), DummyStdout, get_stock_data(), main(), wyckoff_analysis_core(), WyckoffApp

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (14): buildMessageRawPayload(), formatMessageTypeLabel(), getMessageTypeToneClass(), isStructuredMessageType(), isTextLikeMessageType(), normalizeBooleanValue(), renderFaqList(), renderMarkdown() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (13): buildStructuredRows(), normalizeConversationExportImageContents(), normalizeProductsPayload(), parseJsonSafely(), renderCustomerEmailFormMessage(), renderMerchantEmailFormMessage(), renderProductsMessage(), renderStructuredCard() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (13): buildSessionConversationMessages(), buildSessionPageNumbers(), buildSessionWorkbenchHtml(), countSessionConversationExportMessages(), createDefaultSessionDetailState(), displayMessages(), fetchSessionMessages(), findSessionSummaryById() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.2
Nodes (11): buildSessionConversationExportData(), copyTextValue(), copyToClipboard(), fallbackCopyToClipboard(), generateSessionConversationJson(), openSessionConversationExportModal(), readFirstNonEmptyString(), renderSessionConversationExportPreview() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (9): collectSettingStats(), createJsonResultCard(), displayMerchantInfoResult(), displayPersonaResult(), displayStatisticsResult(), renderDiscountListSection(), renderMerchantSettingSection(), renderResultsContent() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (8): buildSessionUiGuideStandaloneHtml(), goToSessionUiGuideStep(), nextSessionUiGuideStep(), prevSessionUiGuideStep(), renderGuideUpdateHighlights(), renderSessionUiGuidePreview(), renderSessionUiGuideSection(), updateSessionUiGuideSection()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (7): formatDisplayTime(), formatFeedbackStatusLabel(), getSessionToneClass(), normalizeConversationExportStatus(), normalizeTurnHumanValue(), renderSessionBadge(), renderSessionSummaryCard()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (4): decode_string(), encode_string(), 编码字符串的API端点。     支持 Base64, URL encoding, Hex, HTML Entity, GBK。, 解码字符串的API端点。     支持 Base64, URL decoding, Hex, HTML Entity, GBK。

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (6): animateThemeTransition(), applyTheme(), initThemeToggle(), readStoredTheme(), resolvePreferredTheme(), syncThemeToggle()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (6): closeGuideModal(), createDefaultGuideModalState(), markCurrentGuideVersionAsSeen(), openGuideModal(), openSessionUiGuideModal(), updateGuideModalMeta()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (6): createDefaultSessionQueryState(), fetchAllMerchant(), initEnvSelector(), resetMerchantState(), switchEnv(), updateApiByEnv()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (3): hasSeenCurrentGuideVersion(), initGuideExperience(), maybeForceShowSessionUiGuide()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (3): closeSessionConversationExportModal(), closeUserInfoPopover(), handleGlobalEscape()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **2 isolated node(s):** `编码字符串的API端点。     支持 Base64, URL encoding, Hex, HTML Entity, GBK。`, `解码字符串的API端点。     支持 Base64, URL decoding, Hex, HTML Entity, GBK。`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (2 nodes): `app.py`, `index()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `escapeHtml()` connect `Community 2` to `Community 0`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `escapeHtml()` (e.g. with `loadGuideContent()` and `renderGuideUpdateHighlights()`) actually correct?**
  _`escapeHtml()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `renderSessionMessageItem()` (e.g. with `escapeHtml()` and `resolveChatRoleLabel()`) actually correct?**
  _`renderSessionMessageItem()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `fetchStatistics()` (e.g. with `showError()` and `convertDateTimeToCompactDate()`) actually correct?**
  _`fetchStatistics()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `showError()` (e.g. with `fetchAllMerchant()` and `fetchMessages()`) actually correct?**
  _`showError()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `编码字符串的API端点。     支持 Base64, URL encoding, Hex, HTML Entity, GBK。`, `解码字符串的API端点。     支持 Base64, URL decoding, Hex, HTML Entity, GBK。` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._