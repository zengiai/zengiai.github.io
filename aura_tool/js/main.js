        // 环境域名配置
        const ENV_CONFIG = {
            sit: 'https://aipu-sit.aura-connect.ai',
            stg: 'https://aipu-stg.aura-connect.ai'
        };

        // 接口路径
        const API_PATHS = {
            fetchAllMerchant: '/aipusaasapi/test/merchant/list',
            queryMessage: '/aipusaasapi/test/session/list',
            sessionMessageList: '/aipusaasapi/test/message/list',
            getAiAssistant: '/aipusaasapi/test/getAiAssistant',
            fetchMerchantInfo: '/aipusaasapi/test/fetchMerchantInfo',
            getSessionUserInfo: '/aipusaasapi/test/queryExternalUserBySession',
            queryBySessionIds: '/aipusaasapi/test/queryBySessionIds',
            getMerchantSetting: '/aipusaasapi/test/getMerchantSetting',
            discountList: '/aipusaasapi/test/discountList',
            overview: '/aipusaasapi/test/overview',
            sessionCategory: '/aipusaasapi/test/session/category',
            sessionCategoryCount: '/aipusaasapi/test/session/category/count'
        };

        // 运行时 API 地址（按环境拼接）
        const API = {
            fetchAllMerchant: '',
            queryMessage: '',
            sessionMessageList: '',
            getAiAssistant: '',
            fetchMerchantInfo: '',
            getSessionUserInfo: '',
            queryBySessionIds: '',
            getMerchantSetting: '',
            discountList: '',
            overview: '',
            sessionCategory: '',
            sessionCategoryCount: ''
        };

        const ENV_STORAGE_KEY = 'aura_env';
        const GUIDE_DOC_PATH = 'aura_tool/GUIDE.md';
        const GUIDE_VERSION = '2026.04.01-14';
        const GUIDE_ANNOUNCEMENT_STORAGE_KEY = 'aura_tool_guide_announcement_seen_version';
        const GUIDE_UPDATE_HIGHLIGHTS = [
            '会话 UI 图例弹层改成稳定可滚动，首次强制展示时也能完整查看。',
            '环境选择也移到左侧边栏，页面主区域只保留当前工具表单。',
            '会话标签说明改成直接对应 feedbackStatus、isTurnHuman、tagName。'
        ];
        const SESSION_UI_GUIDE_MARKER = ':::session-ui-guide:::';
        const SESSION_UI_GUIDE_STEPS = [
            {
                title: '第 1 步：先选环境和工具，再填条件',
                summary: '先在左侧确认环境并点“会话查询”，再填写商户、开始时间、结束时间；其他字段都是可选筛选项。',
                notes: [
                    { title: '左侧先看环境，再切工具', desc: '环境选择和“会话查询”“人设查询”“店铺数据查询”“统计数据”都在左侧边栏。' },
                    { title: '商户 + 开始时间 + 结束时间必填', desc: '这 3 个字段填完整后，再点“查询会话”。' },
                    { title: '其余 3 个标签只是附加过滤', desc: '“反馈状态”“是否转人工”“Email”只在你想缩小结果时再填。' }
                ]
            },
            {
                title: '第 2 步：会话卡片标签怎么读',
                summary: '列表标签只对应 3 个字段，直接按字段理解，不要混着看。',
                notes: [
                    { title: 'feedbackStatus', desc: '状态标签直接显示反馈状态值，比如“AI处理中”“未解决”“人工介入结束”。' },
                    { title: 'isTurnHuman', desc: '只有 `isTurnHuman = true` 才会出现橙色标签“要求转人工”。' },
                    { title: 'tagName', desc: '灰色标签就是分类标签；`tagName` 为空时统一显示 `Uncategoried`。' }
                ]
            },
            {
                title: '第 3 步：右侧详情只看 3 个位置',
                summary: '先看消息头，再看正文，最后按需要点右上角“查询用户信息”。',
                notes: [
                    { title: '消息头', desc: '每条消息头部都会显示“角色 + 消息类型 + 时间”。' },
                    { title: '正文区', desc: '聊天正文在气泡里，支持 Markdown；原始内容只在需要追字段时再展开。' },
                    { title: '查询用户信息', desc: '右上角按钮就是查当前会话用户信息，不需要切出去。' }
                ]
            }
        ];
        const SESSION_PAGE_SIZE = 20;
        const FEEDBACK_STATUS_OPTIONS = [
            { value: 'AI_PROCESSING', label: 'AI处理中' },
            { value: 'AI_SOLVED', label: '已解决' },
            { value: 'AI_NOT_SOLVED', label: '未解决' },
            { value: 'MANUAL_INTERVENTION', label: '人工介入' },
            { value: 'MANUAL_INTERVENTION_END', label: '人工介入结束' }
        ];
        const FEEDBACK_STATUS_LABEL_MAP = FEEDBACK_STATUS_OPTIONS.reduce((acc, item) => {
            acc[item.value] = item.label;
            return acc;
        }, {});
        let currentEnv = 'sit';
        let currentModule = 'message';

        // 商户缓存
        let merchantList = [];

        // 当前查询会话时使用的商户ID(用于会话用户信息查询)
        let currentQueryMerchantId = null;

        // JSON 数据缓存(用于复制功能)
        const jsonDataCache = new Map();

        // 当前统计看板导出上下文(用于导出饼图分类占比)
        let currentStatisticsExportContext = null;
        let activeUserInfoTrigger = null;

        // 会话查询上下文
        let sessionQueryState = createDefaultSessionQueryState();
        let latestSessionQueryToken = 0;
        let currentSessionDetailState = createDefaultSessionDetailState();
        let latestSessionDetailToken = 0;

        // 操作指南缓存
        let guideHtmlCache = '';
        let currentSessionUiGuideStep = 0;
        let guideModalState = createDefaultGuideModalState();

        // 页面加载时初始化
        window.addEventListener('DOMContentLoaded', () => {
            initEnvSelector();
            initDateTimeInputs();
            initFeedbackStatusOptions();
            bindMerchantEvents();
            bindModuleNavEvents();
            initGuideExperience();
            fetchAllMerchant();
        });

        function initDateTimeInputs() {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const startTimeValue = formatDateForDateTimeLocal(startOfToday);
            const endTimeValue = formatDateForDateTimeLocal(now);
            const inputIds = ['startTime', 'endTime', 'statsStartTime', 'statsEndTime'];

            inputIds.forEach(id => {
                const input = document.getElementById(id);
                if (!input) return;
                input.value = id.toLowerCase().includes('start') ? startTimeValue : endTimeValue;
            });
        }

        function formatDateForDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        function createDefaultSessionQueryState() {
            return {
                merchantId: '',
                merchantName: '',
                startTime: '',
                endTime: '',
                email: '',
                feedbackStatus: '',
                isTurnHuman: '',
                page: 1,
                pageSize: SESSION_PAGE_SIZE,
                total: 0,
                currentPageList: []
            };
        }

        function createDefaultSessionDetailState() {
            return {
                selectedSessionId: '',
                selectedSession: null,
                loading: false,
                error: '',
                messages: []
            };
        }

        function createDefaultGuideModalState() {
            return {
                mode: 'document',
                markSeenOnClose: false,
                showUpdateHighlights: false
            };
        }

        function initFeedbackStatusOptions() {
            const feedbackStatusSelect = document.getElementById('feedbackStatus');
            if (!feedbackStatusSelect) {
                return;
            }

            const currentValue = feedbackStatusSelect.value || '';
            feedbackStatusSelect.innerHTML = `
                <option value="">全部</option>
                ${FEEDBACK_STATUS_OPTIONS.map(item => `
                    <option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>
                `).join('')}
            `;
            feedbackStatusSelect.value = currentValue;
        }

        function initGuideExperience() {
            const guideModalTitle = document.getElementById('guideModalTitle');
            const guideVersionText = document.getElementById('guideVersionText');

            if (guideModalTitle) {
                guideModalTitle.textContent = 'Aura 工具操作指南';
            }

            if (guideVersionText) {
                guideVersionText.textContent = `文档版本：${GUIDE_VERSION}`;
            }

            document.addEventListener('keydown', handleGlobalEscape);

            const guideOverlay = document.getElementById('guideModalOverlay');
            if (guideOverlay) {
                guideOverlay.addEventListener('click', event => {
                    if (event.target === guideOverlay) {
                        closeGuideModal();
                    }
                });
            }

            maybeForceShowSessionUiGuide();
        }

        async function loadGuideContent(forceReload = false) {
            const guideContent = document.getElementById('guideContent');
            if (!guideContent) return;
            currentSessionUiGuideStep = 0;

            if (guideHtmlCache && !forceReload) {
                renderContentWithTransition(guideContent, guideHtmlCache);
                return;
            }

            guideContent.innerHTML = buildInlineLoadingMarkup('加载指南中...');

            try {
                const response = await fetch(`${GUIDE_DOC_PATH}?v=${encodeURIComponent(GUIDE_VERSION)}`, {
                    cache: 'no-store'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const markdown = await response.text();
                guideHtmlCache = buildGuideDocumentHtml(markdown);
                renderContentWithTransition(guideContent, guideHtmlCache);
            } catch (error) {
                console.error('Failed to load guide document:', error);
                renderContentWithTransition(guideContent, `
                    <div class="guide-load-error">
                        操作指南加载失败：${escapeHtml(error.message)}
                    </div>
                `);
            }
        }

        function hasSeenCurrentGuideVersion() {
            try {
                return (localStorage.getItem(GUIDE_ANNOUNCEMENT_STORAGE_KEY) || '') === GUIDE_VERSION;
            } catch (error) {
                console.warn('Unable to read guide version from localStorage:', error);
                return false;
            }
        }

        function markCurrentGuideVersionAsSeen() {
            try {
                localStorage.setItem(GUIDE_ANNOUNCEMENT_STORAGE_KEY, GUIDE_VERSION);
            } catch (error) {
                console.warn('Unable to persist guide version:', error);
            }
        }

        function maybeForceShowSessionUiGuide() {
            if (hasSeenCurrentGuideVersion()) {
                return;
            }

            openSessionUiGuideModal({
                markSeenOnClose: true,
                showUpdateHighlights: true
            });
        }

        function openGuideModal() {
            guideModalState = createDefaultGuideModalState();
            updateGuideModalMeta('Aura 工具操作指南');

            const overlay = document.getElementById('guideModalOverlay');
            if (!overlay) return;

            currentSessionUiGuideStep = 0;
            overlay.classList.add('active');
            loadGuideContent();
        }

        function openSessionUiGuideModal(options = {}) {
            guideModalState = {
                mode: 'session-ui',
                markSeenOnClose: Boolean(options.markSeenOnClose),
                showUpdateHighlights: Boolean(options.showUpdateHighlights)
            };
            updateGuideModalMeta('会话 UI 图例');

            const overlay = document.getElementById('guideModalOverlay');
            const guideContent = document.getElementById('guideContent');
            if (!overlay || !guideContent) return;

            currentSessionUiGuideStep = 0;
            overlay.classList.add('active');
            renderContentWithTransition(guideContent, buildSessionUiGuideStandaloneHtml());
        }

        function updateGuideModalMeta(title) {
            const guideModalTitle = document.getElementById('guideModalTitle');
            const guideVersionText = document.getElementById('guideVersionText');

            if (guideModalTitle) {
                guideModalTitle.textContent = title;
            }

            if (guideVersionText) {
                const prefix = title === '会话 UI 图例' ? '图例版本' : '文档版本';
                guideVersionText.textContent = `${prefix}：${GUIDE_VERSION}`;
            }
        }

        function closeGuideModal() {
            const overlay = document.getElementById('guideModalOverlay');
            if (!overlay) return;
            overlay.classList.remove('active');

            if (guideModalState.markSeenOnClose) {
                markCurrentGuideVersionAsSeen();
            }

            guideModalState = createDefaultGuideModalState();
            updateGuideModalMeta('Aura 工具操作指南');
        }

        function handleGlobalEscape(event) {
            if (event.key !== 'Escape') {
                return;
            }

            closeGuideModal();
            closeUserInfoPopover();
        }

        function buildGuideDocumentHtml(markdown) {
            const normalizedMarkdown = String(markdown || '');
            const segments = normalizedMarkdown.split(SESSION_UI_GUIDE_MARKER);

            if (segments.length === 1) {
                return `<div class="guide-markdown">${renderMarkdown(normalizedMarkdown)}</div>`;
            }

            return segments.map((segment, index) => {
                const renderedSegment = segment.trim()
                    ? `<div class="guide-markdown">${renderMarkdown(segment)}</div>`
                    : '';

                if (index >= segments.length - 1) {
                    return renderedSegment;
                }

                return `${renderedSegment}${renderSessionUiGuideSection()}`;
            }).join('');
        }

        function buildSessionUiGuideStandaloneHtml() {
            const updateBanner = guideModalState.showUpdateHighlights
                ? renderGuideUpdateHighlights()
                : '';

            return `
                <div class="guide-standalone">
                    ${updateBanner}
                    ${renderSessionUiGuideSection()}
                </div>
            `;
        }

        function renderGuideUpdateHighlights() {
            const listHtml = GUIDE_UPDATE_HIGHLIGHTS
                .map(item => `<li>${escapeHtml(item)}</li>`)
                .join('');

            return `
                <section class="guide-update-banner">
                    <div class="guide-update-banner-title">本次更新重点</div>
                    <div class="guide-update-banner-version">版本：${escapeHtml(GUIDE_VERSION)}</div>
                    <ul class="guide-update-banner-list">${listHtml}</ul>
                </section>
            `;
        }

        function renderSessionUiGuideSection() {
            const step = SESSION_UI_GUIDE_STEPS[currentSessionUiGuideStep] || SESSION_UI_GUIDE_STEPS[0];
            const totalSteps = SESSION_UI_GUIDE_STEPS.length;

            return `
                <section class="session-ui-guide" data-session-ui-guide>
                    <div class="session-ui-guide-panel">
                        <div class="session-ui-guide-head">
                            <div>
                                <div class="session-ui-guide-eyebrow">会话查询 UI 指南</div>
                                <div class="session-ui-guide-title">${escapeHtml(step.title)}</div>
                                <div class="session-ui-guide-summary">${escapeHtml(step.summary)}</div>
                            </div>
                            <div class="session-ui-guide-progress">${currentSessionUiGuideStep + 1} / ${totalSteps}</div>
                        </div>
                        <div class="session-ui-guide-stage">
                            <div class="session-ui-guide-preview">
                                ${renderSessionUiGuidePreview(currentSessionUiGuideStep)}
                            </div>
                            <div class="session-ui-guide-notes">
                                ${step.notes.map((note, index) => `
                                    <div class="session-ui-guide-note">
                                        <div class="session-ui-guide-note-index">${index + 1}</div>
                                        <div>
                                            <div class="session-ui-guide-note-title">${escapeHtml(note.title)}</div>
                                            <div class="session-ui-guide-note-desc">${escapeHtml(note.desc)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="session-ui-guide-footer">
                            <div class="session-ui-guide-dots">
                                ${SESSION_UI_GUIDE_STEPS.map((_, index) => `
                                    <button
                                        type="button"
                                        class="session-ui-guide-dot ${index === currentSessionUiGuideStep ? 'active' : ''}"
                                        onclick="goToSessionUiGuideStep(${index})"
                                        aria-label="查看第 ${index + 1} 步"
                                    ></button>
                                `).join('')}
                            </div>
                            <div class="session-ui-guide-actions">
                                <button
                                    type="button"
                                    class="session-ui-guide-btn"
                                    onclick="prevSessionUiGuideStep()"
                                    ${currentSessionUiGuideStep === 0 ? 'disabled' : ''}
                                >上一步</button>
                                <button
                                    type="button"
                                    class="session-ui-guide-btn primary"
                                    onclick="nextSessionUiGuideStep()"
                                >${currentSessionUiGuideStep === totalSteps - 1 ? '回到第 1 张' : '下一张 ▶'}</button>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        }

        function renderSessionUiGuidePreview(stepIndex) {
            if (stepIndex === 0) {
                return `
                    <div class="session-ui-mock session-ui-mock-form">
                        <div class="session-ui-mock-layout">
                            <div class="session-ui-mock-sidebar">
                                <span class="session-ui-mock-nav-item active">会话查询</span>
                                <span class="session-ui-mock-nav-item">人设查询</span>
                                <span class="session-ui-mock-nav-item">店铺数据查询</span>
                                <span class="session-ui-mock-nav-item">统计数据</span>
                            </div>
                            <div class="session-ui-mock-main">
                                <div class="session-ui-form-card session-ui-focus">
                                    <div class="session-ui-form-field full">
                                        <span class="session-ui-field-label">选择商户</span>
                                        <span class="session-ui-field-value">sitLuckmoda3-test</span>
                                    </div>
                                    <div class="session-ui-form-grid">
                                        <div class="session-ui-form-field session-ui-focus-soft">
                                            <span class="session-ui-field-label">开始时间</span>
                                            <span class="session-ui-field-value">2026/03/30 00:00</span>
                                        </div>
                                        <div class="session-ui-form-field session-ui-focus-soft">
                                            <span class="session-ui-field-label">结束时间</span>
                                            <span class="session-ui-field-value">2026/04/01 16:30</span>
                                        </div>
                                    </div>
                                    <div class="session-ui-form-grid dimmed">
                                        <div class="session-ui-form-field">
                                            <span class="session-ui-field-label">反馈状态（可选）</span>
                                            <span class="session-ui-field-value">全部</span>
                                        </div>
                                        <div class="session-ui-form-field">
                                            <span class="session-ui-field-label">是否转人工（可选）</span>
                                            <span class="session-ui-field-value">全部</span>
                                        </div>
                                    </div>
                                    <div class="session-ui-form-field full dimmed">
                                        <span class="session-ui-field-label">Email（可选）</span>
                                        <span class="session-ui-field-value empty">例如：PJY2077@gmail.com</span>
                                    </div>
                                    <div class="session-ui-form-actions">
                                        <button type="button" class="session-ui-cta">查询会话</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            if (stepIndex === 1) {
                return `
                    <div class="session-ui-mock session-ui-mock-list">
                        <div class="session-ui-list-shell">
                            <div class="session-ui-list-title">会话列表</div>
                            <div class="session-ui-list-card dimmed">
                                <div class="session-ui-list-line strong">1920 <span>|</span> 2077pjy@gmail.com</div>
                                <div class="session-ui-chip-row">
                                    <span class="session-ui-chip blue">AI处理中</span>
                                    <span class="session-ui-chip gray">Uncategoried</span>
                                </div>
                            </div>
                            <div class="session-ui-list-card focus">
                                <div class="session-ui-list-line strong">1889 <span>|</span> user_dfa79</div>
                                <div class="session-ui-chip-row">
                                    <span class="session-ui-chip slate">人工介入结束</span>
                                    <span class="session-ui-chip orange">要求转人工</span>
                                    <span class="session-ui-chip gray">Uncategoried</span>
                                </div>
                                <div class="session-ui-list-line meta">lastChatTime 2026-03-31 15:27:08 | createDt 2026-03-31 15:07:01</div>
                            </div>
                            <div class="session-ui-list-card dimmed">
                                <div class="session-ui-list-line strong">1862 <span>|</span> user_1b4fd</div>
                                <div class="session-ui-chip-row">
                                    <span class="session-ui-chip red">未解决</span>
                                    <span class="session-ui-chip gray">Check Order Status</span>
                                </div>
                            </div>
                            <div class="session-ui-pagination dimmed">
                                <span>共 8 条</span>
                                <div class="session-ui-pagination-btns">
                                    <span class="session-ui-page-btn">上一页</span>
                                    <span class="session-ui-page-btn active">1</span>
                                    <span class="session-ui-page-btn">下一页</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="session-ui-mock session-ui-mock-detail">
                    <div class="session-ui-detail-shell">
                        <div class="session-ui-detail-header">
                            <div class="session-ui-detail-title">会话详情</div>
                            <button type="button" class="session-ui-detail-btn">查询用户信息</button>
                        </div>
                        <div class="session-ui-chat-row right dimmed">
                            <div class="session-ui-meta-row">
                                <span class="session-ui-chip green">客服</span>
                                <span class="session-ui-chip gray">文字</span>
                                <span class="session-ui-time">2026-03-31 15:07:01</span>
                            </div>
                            <div class="session-ui-bubble service">Ah welcome! I’m your Wardrobe Whisperer...</div>
                        </div>
                        <div class="session-ui-chat-row left focus">
                            <div class="session-ui-meta-row">
                                <span class="session-ui-chip blue">用户</span>
                                <span class="session-ui-chip gray">文字</span>
                                <span class="session-ui-time">2026-03-31 15:07:08</span>
                            </div>
                            <div class="session-ui-bubble user">转人工</div>
                        </div>
                        <div class="session-ui-chat-row right focus-soft">
                            <div class="session-ui-meta-row">
                                <span class="session-ui-chip green">客服</span>
                                <span class="session-ui-chip gold">商户联系邮箱表单</span>
                                <span class="session-ui-time">2026-03-31 15:07:14</span>
                            </div>
                            <div class="session-ui-bubble service">展开原始内容</div>
                        </div>
                    </div>
                </div>
            `;
        }

        function updateSessionUiGuideSection() {
            const currentGuide = document.querySelector('#guideContent [data-session-ui-guide]');
            if (!currentGuide) {
                return;
            }
            currentGuide.outerHTML = renderSessionUiGuideSection();
        }

        function goToSessionUiGuideStep(stepIndex) {
            const totalSteps = SESSION_UI_GUIDE_STEPS.length;
            currentSessionUiGuideStep = Math.min(Math.max(Number(stepIndex) || 0, 0), totalSteps - 1);
            updateSessionUiGuideSection();
        }

        function prevSessionUiGuideStep() {
            if (currentSessionUiGuideStep <= 0) {
                return;
            }
            goToSessionUiGuideStep(currentSessionUiGuideStep - 1);
        }

        function nextSessionUiGuideStep() {
            const totalSteps = SESSION_UI_GUIDE_STEPS.length;
            if (currentSessionUiGuideStep >= totalSteps - 1) {
                goToSessionUiGuideStep(0);
                return;
            }
            goToSessionUiGuideStep(currentSessionUiGuideStep + 1);
        }

        function renderMarkdown(markdown, options = {}) {
            const { preserveLineBreaksInParagraph = false } = options;
            const lines = String(markdown || '').replace(/\r/g, '').split('\n');
            const htmlParts = [];
            const paragraphLines = [];
            let currentListType = '';
            let listItems = [];
            let inCodeBlock = false;
            let codeLines = [];

            const flushParagraph = () => {
                if (paragraphLines.length === 0) return;
                const paragraphHtml = preserveLineBreaksInParagraph
                    ? paragraphLines.map(line => renderInlineMarkdown(line)).join('<br>')
                    : renderInlineMarkdown(paragraphLines.join(' '));
                htmlParts.push(`<p>${paragraphHtml}</p>`);
                paragraphLines.length = 0;
            };

            const flushList = () => {
                if (listItems.length === 0 || !currentListType) return;
                const itemsHtml = listItems.map(item => `<li>${renderInlineMarkdown(item)}</li>`).join('');
                htmlParts.push(`<${currentListType}>${itemsHtml}</${currentListType}>`);
                listItems = [];
                currentListType = '';
            };

            const flushCodeBlock = () => {
                if (!inCodeBlock) return;
                htmlParts.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
                codeLines = [];
                inCodeBlock = false;
            };

            lines.forEach(line => {
                const trimmed = line.trim();

                if (trimmed.startsWith('```')) {
                    flushParagraph();
                    flushList();
                    if (inCodeBlock) {
                        flushCodeBlock();
                    } else {
                        inCodeBlock = true;
                        codeLines = [];
                    }
                    return;
                }

                if (inCodeBlock) {
                    codeLines.push(line);
                    return;
                }

                if (!trimmed) {
                    flushParagraph();
                    flushList();
                    return;
                }

                const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
                if (headingMatch) {
                    flushParagraph();
                    flushList();
                    const level = headingMatch[1].length;
                    htmlParts.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
                    return;
                }

                const blockquoteMatch = trimmed.match(/^>\s+(.*)$/);
                if (blockquoteMatch) {
                    flushParagraph();
                    flushList();
                    htmlParts.push(`<blockquote>${renderInlineMarkdown(blockquoteMatch[1])}</blockquote>`);
                    return;
                }

                const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
                if (unorderedMatch) {
                    flushParagraph();
                    if (currentListType && currentListType !== 'ul') {
                        flushList();
                    }
                    currentListType = 'ul';
                    listItems.push(unorderedMatch[1]);
                    return;
                }

                const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
                if (orderedMatch) {
                    flushParagraph();
                    if (currentListType && currentListType !== 'ol') {
                        flushList();
                    }
                    currentListType = 'ol';
                    listItems.push(orderedMatch[1]);
                    return;
                }

                paragraphLines.push(trimmed);
            });

            flushParagraph();
            flushList();
            flushCodeBlock();

            return htmlParts.join('');
        }

        function renderInlineMarkdown(text) {
            const source = String(text || '');
            const tokens = [];

            const createToken = html => {
                const token = `__MD_TOKEN_${tokens.length}__`;
                tokens.push({ token, html });
                return token;
            };

            let html = source.replace(/`([^`]+)`/g, (_, code) => {
                return createToken(`<code>${escapeHtml(code)}</code>`);
            });

            html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
                const safeUrl = sanitizeMarkdownUrl(url);
                if (!safeUrl) {
                    return createToken(`${escapeHtml(label)} (${escapeHtml(url)})`);
                }
                return createToken(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
            });

            html = escapeHtml(html);
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            tokens.forEach(({ token, html: tokenHtml }) => {
                html = html.replaceAll(token, tokenHtml);
            });

            return html;
        }

        function sanitizeMarkdownUrl(url) {
            const normalizedUrl = String(url || '').trim();
            if (!normalizedUrl) {
                return '';
            }

            return /^(https?:\/\/|mailto:|tel:)/i.test(normalizedUrl) ? normalizedUrl : '';
        }

        function renderMessageContent(content) {
            const normalizedContent = String(content || '').trim();
            if (!normalizedContent) {
                return 'N/A';
            }

            return `<div class="message-markdown">${renderMarkdown(normalizedContent, { preserveLineBreaksInParagraph: true })}</div>`;
        }

        function initEnvSelector() {
            const storedEnv = localStorage.getItem(ENV_STORAGE_KEY);
            if (storedEnv && ENV_CONFIG[storedEnv]) {
                currentEnv = storedEnv;
            }

            const sitRadio = document.getElementById('env-sit');
            const stgRadio = document.getElementById('env-stg');

            if (currentEnv === 'stg') {
                stgRadio.checked = true;
            } else {
                sitRadio.checked = true;
            }

            sitRadio.addEventListener('change', () => {
                if (sitRadio.checked) {
                    switchEnv('sit');
                }
            });

            stgRadio.addEventListener('change', () => {
                if (stgRadio.checked) {
                    switchEnv('stg');
                }
            });

            updateApiByEnv();
        }

        function switchEnv(env) {
            if (!ENV_CONFIG[env] || env === currentEnv) {
                return;
            }

            currentEnv = env;
            localStorage.setItem(ENV_STORAGE_KEY, env);
            updateApiByEnv();
            resetMerchantState();
            fetchAllMerchant();
        }

        function updateApiByEnv() {
            const baseUrl = ENV_CONFIG[currentEnv];
            API.fetchAllMerchant = API_PATHS.fetchAllMerchant ? `${baseUrl}${API_PATHS.fetchAllMerchant}` : '';
            API.queryMessage = API_PATHS.queryMessage ? `${baseUrl}${API_PATHS.queryMessage}` : '';
            API.sessionMessageList = API_PATHS.sessionMessageList ? `${baseUrl}${API_PATHS.sessionMessageList}` : '';
            API.getAiAssistant = API_PATHS.getAiAssistant ? `${baseUrl}${API_PATHS.getAiAssistant}` : '';
            API.fetchMerchantInfo = API_PATHS.fetchMerchantInfo ? `${baseUrl}${API_PATHS.fetchMerchantInfo}` : '';
            API.getSessionUserInfo = API_PATHS.getSessionUserInfo ? `${baseUrl}${API_PATHS.getSessionUserInfo}` : '';
            API.queryBySessionIds = API_PATHS.queryBySessionIds ? `${baseUrl}${API_PATHS.queryBySessionIds}` : '';
            API.getMerchantSetting = API_PATHS.getMerchantSetting ? `${baseUrl}${API_PATHS.getMerchantSetting}` : '';
            API.discountList = API_PATHS.discountList ? `${baseUrl}${API_PATHS.discountList}` : '';
            API.overview = API_PATHS.overview ? `${baseUrl}${API_PATHS.overview}` : '';
            API.sessionCategory = API_PATHS.sessionCategory ? `${baseUrl}${API_PATHS.sessionCategory}` : '';
            API.sessionCategoryCount = API_PATHS.sessionCategoryCount ? `${baseUrl}${API_PATHS.sessionCategoryCount}` : '';
        }

        function resetMerchantState() {
            merchantList = [];
            // 清除消息查询模块的商户选择
            document.getElementById('merchantInput').value = '';
            document.getElementById('merchantId').value = '';
            document.getElementById('feedbackStatus').value = '';
            document.getElementById('isTurnHuman').value = '';
            document.getElementById('email').value = '';
            const merchantDropdown = document.getElementById('merchantDropdown');
            merchantDropdown.style.display = 'none';
            merchantDropdown.innerHTML = '';
            // 清除人设查询模块的商户选择
            document.getElementById('personaMerchantInput').value = '';
            document.getElementById('personaMerchantId').value = '';
            const personaDropdown = document.getElementById('personaMerchantDropdown');
            personaDropdown.style.display = 'none';
            personaDropdown.innerHTML = '';
            // 清除店铺信息查询模块的商户选择
            document.getElementById('merchantInfoInput').value = '';
            document.getElementById('merchantInfoMerchantId').value = '';
            const merchantInfoDropdown = document.getElementById('merchantInfoDropdown');
            merchantInfoDropdown.style.display = 'none';
            merchantInfoDropdown.innerHTML = '';
            // 清除统计数据模块的商户选择
            document.getElementById('statsMerchantInput').value = '';
            document.getElementById('statsMerchantId').value = '';
            const statsDropdown = document.getElementById('statsMerchantDropdown');
            statsDropdown.style.display = 'none';
            statsDropdown.innerHTML = '';
            // 清空结果和错误
            document.getElementById('results').innerHTML = '';
            currentStatisticsExportContext = null;
            currentQueryMerchantId = null;
            sessionQueryState = createDefaultSessionQueryState();
            currentSessionDetailState = createDefaultSessionDetailState();
            hideError();
        }

        function bindMerchantEvents() {
            // 消息查询模块的商户选择
            bindSingleMerchantPicker('merchantInput', 'merchantId', 'merchantDropdown');

            // 人设查询模块的商户选择
            bindSingleMerchantPicker('personaMerchantInput', 'personaMerchantId', 'personaMerchantDropdown');

            // 店铺信息查询模块的商户选择
            bindSingleMerchantPicker('merchantInfoInput', 'merchantInfoMerchantId', 'merchantInfoDropdown');

            // 统计数据模块的商户选择
            bindSingleMerchantPicker('statsMerchantInput', 'statsMerchantId', 'statsMerchantDropdown');
        }

        function bindSingleMerchantPicker(inputId, hiddenId, dropdownId) {
            const merchantInput = document.getElementById(inputId);
            const merchantDropdown = document.getElementById(dropdownId);
            const merchantPicker = merchantInput.closest('.merchant-picker');

            // 输入时进行模糊匹配
            merchantInput.addEventListener('input', () => {
                document.getElementById(hiddenId).value = '';
                renderDropdownForPicker(merchantInput.value, dropdownId, inputId, hiddenId);
            });

            // 聚焦时展开下拉
            merchantInput.addEventListener('focus', () => {
                renderDropdownForPicker(merchantInput.value, dropdownId, inputId, hiddenId);
            });

            // 回车选择第一条匹配项
            merchantInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    const firstItem = merchantDropdown.querySelector('.dropdown-item');
                    if (firstItem) {
                        event.preventDefault();
                        selectMerchantForPicker(
                            firstItem.getAttribute('data-id') || '',
                            firstItem.getAttribute('data-name') || '',
                            inputId, hiddenId, dropdownId
                        );
                    }
                }
            });

            // 点击外部区域关闭下拉
            document.addEventListener('click', (event) => {
                if (!merchantPicker.contains(event.target)) {
                    merchantDropdown.style.display = 'none';
                }
            });
        }

        function bindModuleNavEvents() {
            const moduleNavItems = document.querySelectorAll('.module-nav-item');
            moduleNavItems.forEach(item => {
                item.addEventListener('click', () => {
                    const module = item.getAttribute('data-module');
                    switchModule(module);
                });
            });
        }

        function switchModule(module) {
            if (module === currentModule) return;

            currentModule = module;

            // 更新左侧工具栏样式
            document.querySelectorAll('.module-nav-item').forEach(item => {
                const isActive = item.getAttribute('data-module') === module;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            // 切换表单显示
            document.querySelectorAll('.module-form').forEach(form => {
                form.style.display = 'none';
            });

            const formMap = {
                'message': 'messageForm',
                'persona': 'personaForm',
                'merchant': 'merchantInfoForm',
                'statistics': 'statisticsForm'
            };

            const targetForm = document.getElementById(formMap[module]);
            if (targetForm) {
                targetForm.style.display = 'block';
            }

            // 清空结果和错误
            document.getElementById('results').innerHTML = '';
            currentStatisticsExportContext = null;
            hideError();
        }

        function renderDropdownForPicker(keyword, dropdownId, inputId, hiddenId) {
            const merchantDropdown = document.getElementById(dropdownId);
            const inputValue = (keyword || '').trim().toLowerCase();

            if (!merchantList || merchantList.length === 0) {
                merchantDropdown.style.display = 'none';
                return;
            }

            // 模糊匹配：名称或ID包含关键字
            const filtered = inputValue
                ? merchantList.filter(item =>
                    item.merchantNameLower.includes(inputValue) ||
                    item.merchantIdStr.includes(inputValue)
                )
                : merchantList;

            if (filtered.length === 0) {
                merchantDropdown.innerHTML = '<div class="dropdown-empty">无匹配商户</div>';
                merchantDropdown.style.display = 'block';
                return;
            }

            merchantDropdown.innerHTML = filtered.map(item => {
                return `<div class="dropdown-item" data-id="${item.merchantId}" data-name="${item.merchantName}">${item.merchantName} (${item.merchantId})</div>`;
            }).join('');
            merchantDropdown.style.display = 'block';

            // 绑定点击选择
            Array.from(merchantDropdown.querySelectorAll('.dropdown-item')).forEach(el => {
                el.addEventListener('click', () => {
                    selectMerchantForPicker(
                        el.getAttribute('data-id') || '',
                        el.getAttribute('data-name') || '',
                        inputId, hiddenId, dropdownId
                    );
                });
            });
        }

        function selectMerchantForPicker(merchantId, merchantName, inputId, hiddenId, dropdownId) {
            document.getElementById(inputId).value = merchantName;
            document.getElementById(hiddenId).value = merchantId;
            document.getElementById(dropdownId).style.display = 'none';
        }

        async function fetchAllMerchant() {
            // 获取所有需要商户选择的模块输入框
            const merchantInputs = [
                document.getElementById('merchantInput'),
                document.getElementById('personaMerchantInput'),
                document.getElementById('merchantInfoInput'),
                document.getElementById('statsMerchantInput')
            ];

            const setAllPlaceholders = (text) => {
                merchantInputs.forEach(input => {
                    if (input) input.placeholder = text;
                });
            };

            if (!API.fetchAllMerchant) {
                setAllPlaceholders('请先配置商户接口');
                return;
            }

            try {
                const params = new URLSearchParams({
                    page: '1',
                    pageSize: '200'
                });
                const url = `${API.fetchAllMerchant}?${params.toString()}`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const merchants = data.result?.list || [];

                if (!Array.isArray(merchants) || merchants.length === 0) {
                    merchantList = [];
                    setAllPlaceholders('暂无商户数据');
                    return;
                }

                // 缓存商户列表
                merchantList = merchants.map(item => ({
                    merchantId: item.merchantId,
                    merchantName: item.merchantName || item.nickname || '未命名商户',
                    merchantNameLower: (item.merchantName || item.nickname || '').toLowerCase(),
                    merchantIdStr: String(item.merchantId)
                }));

                setAllPlaceholders('输入商户名称或ID搜索...');
            } catch (error) {
                console.error('Error fetching merchants:', error);
                setAllPlaceholders('商户加载失败');
                showError(`商户加载失败: ${error.message}`);
            }
        }

        async function fetchMessages() {
            const merchantInputValue = document.getElementById('merchantInput').value.trim();
            let merchantId = document.getElementById('merchantId').value;
            const startTimeInput = document.getElementById('startTime').value;
            const endTimeInput = document.getElementById('endTime').value;
            const feedbackStatus = document.getElementById('feedbackStatus').value.trim();
            const isTurnHuman = document.getElementById('isTurnHuman').value;
            const email = document.getElementById('email').value.trim();

            if (!merchantId && merchantInputValue) {
                // 兜底：若输入与商户名或ID完全一致，则自动选中
                const inputLower = merchantInputValue.toLowerCase();
                const matched = merchantList.find(item =>
                    item.merchantNameLower === inputLower ||
                    item.merchantIdStr === merchantInputValue
                );
                if (matched) {
                    merchantId = matched.merchantId;
                    document.getElementById('merchantId').value = merchantId;
                }
            }

            if (!merchantId) {
                showError('请选择商户');
                return;
            }
            if (!startTimeInput || !endTimeInput) {
                showError('请选择开始时间和结束时间');
                return;
            }

            const startTime = new Date(startTimeInput);
            const endTime = new Date(endTimeInput);

            if (endTime <= startTime) {
                showError('结束时间必须晚于开始时间');
                return;
            }

            const maxRangeMs = 7 * 24 * 60 * 60 * 1000;
            if (endTime - startTime > maxRangeMs) {
                showError('时间跨度不能超过 7 天');
                return;
            }

            if (!API.queryMessage) {
                showError('请先配置会话查询接口');
                return;
            }

            const startTimeStr = convertDateTimeFormat(startTimeInput);
            const endTimeStr = convertDateTimeFormat(endTimeInput);

            // 保存当前商户ID，用于会话用户信息查询
            currentQueryMerchantId = merchantId;

            const matchedMerchant = merchantList.find(item => String(item.merchantId) === String(merchantId));
            sessionQueryState = {
                merchantId: String(merchantId),
                merchantName: matchedMerchant?.merchantName || merchantInputValue || String(merchantId),
                startTime: startTimeStr,
                endTime: endTimeStr,
                email,
                feedbackStatus,
                isTurnHuman,
                page: 1,
                pageSize: SESSION_PAGE_SIZE,
                total: 0
            };

            await fetchSessionListPage(sessionQueryState);
        }

        async function fetchSessionListPage(queryState) {
            const requestToken = ++latestSessionQueryToken;
            const requestBody = {
                merchantId: Number(queryState.merchantId),
                startTime: queryState.startTime,
                endTime: queryState.endTime,
                needFold: false,
                page: Number(queryState.page) || 1,
                pageSize: Number(queryState.pageSize) || SESSION_PAGE_SIZE
            };

            if (queryState.feedbackStatus) {
                requestBody.feedbackStatus = queryState.feedbackStatus;
            }

            if (queryState.email) {
                requestBody.email = queryState.email;
            }

            if (queryState.isTurnHuman !== '') {
                requestBody.isTurnHuman = queryState.isTurnHuman === 'true';
            }

            showLoading(true);
            hideError();

            try {
                const response = await fetch(API.queryMessage, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const result = normalizeApiResult(data, '会话查询');
                const total = Number(result?.total) || 0;
                const list = Array.isArray(result?.list) ? result.list : [];

                if (requestToken !== latestSessionQueryToken) {
                    return;
                }

                sessionQueryState = {
                    ...queryState,
                    total,
                    page: requestBody.page,
                    pageSize: requestBody.pageSize,
                    currentPageList: list
                };

                displayMessages({
                    list,
                    total,
                    page: requestBody.page,
                    pageSize: requestBody.pageSize,
                    queryMeta: {
                        merchantId: queryState.merchantId,
                        merchantName: queryState.merchantName,
                        startTime: queryState.startTime,
                        endTime: queryState.endTime,
                        feedbackStatus: queryState.feedbackStatus,
                        isTurnHuman: queryState.isTurnHuman
                    }
                });
            } catch (error) {
                console.error('Error fetching sessions:', error);
                if (requestToken === latestSessionQueryToken) {
                    showError(`查询失败: ${error.message}`);
                }
            } finally {
                if (requestToken === latestSessionQueryToken) {
                    showLoading(false);
                }
            }
        }

        async function goToSessionPage(page) {
            if (!sessionQueryState.merchantId) {
                return;
            }

            const totalPages = Math.max(1, Math.ceil((sessionQueryState.total || 0) / (sessionQueryState.pageSize || SESSION_PAGE_SIZE)));
            const nextPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
            sessionQueryState = {
                ...sessionQueryState,
                page: nextPage
            };

            await fetchSessionListPage(sessionQueryState);
        }

        async function fetchStatistics() {
            const merchantInputValue = document.getElementById('statsMerchantInput').value.trim();
            let merchantId = document.getElementById('statsMerchantId').value;
            const startTimeInput = document.getElementById('statsStartTime').value;
            const endTimeInput = document.getElementById('statsEndTime').value;

            if (!merchantId && merchantInputValue) {
                const inputLower = merchantInputValue.toLowerCase();
                const matched = merchantList.find(item =>
                    item.merchantNameLower === inputLower ||
                    item.merchantIdStr === merchantInputValue
                );
                if (matched) {
                    merchantId = matched.merchantId;
                    document.getElementById('statsMerchantId').value = merchantId;
                }
            }

            if (!merchantId) {
                showError('请选择商户');
                return;
            }

            if (!startTimeInput || !endTimeInput) {
                showError('请选择开始时间和结束时间');
                return;
            }

            const startTime = new Date(startTimeInput);
            const endTime = new Date(endTimeInput);

            if (endTime <= startTime) {
                showError('结束时间必须晚于开始时间');
                return;
            }

            const maxRangeMs = 7 * 24 * 60 * 60 * 1000;
            if (endTime - startTime > maxRangeMs) {
                showError('时间跨度不能超过 7 天');
                return;
            }

            if (!API.overview || !API.sessionCategory || !API.sessionCategoryCount) {
                showError('请先配置统计看板接口');
                return;
            }

            const startTimeStr = convertDateTimeToCompactDate(startTimeInput);
            const endTimeStr = convertDateTimeToCompactDate(endTimeInput);
            const matchedMerchant = merchantList.find(item => String(item.merchantId) === String(merchantId));
            const merchantName = matchedMerchant?.merchantName || merchantInputValue || String(merchantId);

            showLoading(true);
            hideError();

            try {
                const [overviewRes, categoryRes, categoryCountRes] = await Promise.allSettled([
                    fetchOverviewPanelData(merchantId, startTimeStr, endTimeStr),
                    fetchCategoryPanelData(merchantId, startTimeStr, endTimeStr),
                    fetchCategoryCountPanelData(merchantId, startTimeStr, endTimeStr)
                ]);

                const overviewData = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
                const categoryData = categoryRes.status === 'fulfilled' ? categoryRes.value : null;

                if (!overviewData && !categoryData) {
                    const reasons = [];
                    if (overviewRes.status === 'rejected') reasons.push(`overview失败: ${overviewRes.reason?.message || '未知错误'}`);
                    if (categoryRes.status === 'rejected') reasons.push(`分类占比失败: ${categoryRes.reason?.message || '未知错误'}`);
                    throw new Error(reasons.join(' | '));
                }

                displayStatisticsResult({
                    overviewData,
                    categoryData,
                    categoryCountData: categoryCountRes.status === 'fulfilled' ? categoryCountRes.value : null,
                    queryMeta: {
                        merchantId: String(merchantId),
                        merchantName,
                        startTime: startTimeStr,
                        endTime: endTimeStr
                    }
                });
            } catch (error) {
                console.error('Error fetching statistics:', error);
                showError(`查询失败: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        async function fetchOverviewPanelData(merchantId, startTime, endTime) {
            const params = new URLSearchParams({
                merchantId: String(merchantId),
                startTime,
                endTime
            });
            const url = `${API.overview}?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const result = normalizeApiResult(data, 'overview');
            return result && typeof result === 'object' ? result : null;
        }

        async function fetchCategoryPanelData(merchantId, startTime, endTime) {
            const params = new URLSearchParams({
                merchantId: String(merchantId),
                startTime,
                endTime
            });
            const url = `${API.sessionCategory}?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    'x-language': 'en'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const result = normalizeApiResult(data, '分类占比');
            return result && typeof result === 'object' ? result : null;
        }

        async function fetchCategoryCountPanelData(merchantId, startTime, endTime) {
            const params = new URLSearchParams({
                merchantId: String(merchantId),
                startTime,
                endTime
            });
            const url = `${API.sessionCategoryCount}?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    'x-language': 'en'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const result = normalizeApiResult(data, '分类数量');
            return result && typeof result === 'object' ? result : null;
        }

        function displayStatisticsResult(payload) {
            const resultsDiv = document.getElementById('results');
            const overviewData = payload?.overviewData || null;
            const categoryData = payload?.categoryData || null;
            const categoryCountData = payload?.categoryCountData || null;
            const queryMeta = payload?.queryMeta || {};

            const queryInfo = `
                <div class="statistics-query-info">
                    <span>商户ID：${escapeHtml(String(queryMeta.merchantId || 'N/A'))}</span>
                    <span>查询范围：${escapeHtml(String(queryMeta.startTime || 'N/A'))} ~ ${escapeHtml(String(queryMeta.endTime || 'N/A'))}</span>
                </div>
            `;

            const overviewFields = [
                { key: 'totalSession', label: '总会话量', type: 'number' },
                { key: 'aiResolutionRate', label: 'AI解决率', type: 'percent' },
                { key: 'transferToHumanRate', label: '转人工率', type: 'percent' },
                { key: 'countTrend', label: '会话量趋势', type: 'trend' },
                { key: 'aiResolutionRateTrend', label: 'AI解决率趋势', type: 'trend' },
                { key: 'transferToHumanRateTrend', label: '转人工率趋势', type: 'trend' }
            ];

            const overviewItemsHtml = overviewFields
                .map(field => {
                    const rawValue = overviewData ? overviewData[field.key] : null;
                    if (rawValue === null || rawValue === undefined || rawValue === '') {
                        return '';
                    }

                    let valueText = '';
                    let trendClass = '';
                    if (field.type === 'percent') {
                        valueText = formatPercentValue(rawValue);
                    } else if (field.type === 'trend') {
                        valueText = formatTrendPercentValue(rawValue);
                        const trendNumber = parsePercentToNumber(rawValue);
                        if (Number.isFinite(trendNumber)) {
                            trendClass = trendNumber > 0 ? 'up' : (trendNumber < 0 ? 'down' : 'flat');
                        }
                    } else {
                        valueText = String(rawValue);
                    }

                    return `
                        <div class="statistics-overview-item">
                            <div class="statistics-overview-label">${field.label}</div>
                            <div class="statistics-overview-value ${trendClass}">${escapeHtml(valueText)}</div>
                        </div>
                    `;
                })
                .filter(Boolean)
                .join('');

            const categoryItems = Object.entries(categoryData || {})
                .map(([key, value]) => ({
                    key: String(key),
                    value: parsePercentToNumber(value),
                    count: parseCountToNumber(categoryCountData ? categoryCountData[key] : null)
                }))
                .filter(item => Number.isFinite(item.value) && item.value > 0)
                .sort((left, right) => {
                    const leftCount = Number.isFinite(left.count) ? left.count : Number.NEGATIVE_INFINITY;
                    const rightCount = Number.isFinite(right.count) ? right.count : Number.NEGATIVE_INFINITY;
                    if (rightCount !== leftCount) {
                        return rightCount - leftCount;
                    }

                    if (right.value !== left.value) {
                        return right.value - left.value;
                    }

                    return left.key.localeCompare(right.key, 'zh-CN');
                });

            currentStatisticsExportContext = {
                queryMeta: {
                    merchantId: String(queryMeta.merchantId || ''),
                    merchantName: String(queryMeta.merchantName || ''),
                    startTime: String(queryMeta.startTime || ''),
                    endTime: String(queryMeta.endTime || '')
                },
                categoryItems: categoryItems.map(item => ({
                    name: item.key,
                    value: item.value,
                    count: item.count
                }))
            };

            const categoryPalette = ['#1f77b4', '#2ca02c', '#ff7f0e', '#d62728', '#9467bd', '#17becf', '#8c564b', '#bcbd22'];
            const categoryTotal = categoryItems.reduce((sum, item) => sum + item.value, 0);

            let pieGradient = '';
            if (categoryItems.length > 0) {
                const segments = [];
                let currentDeg = 0;

                if (categoryTotal <= 100) {
                    categoryItems.forEach((item, index) => {
                        const nextDeg = currentDeg + item.value * 3.6;
                        segments.push(`${categoryPalette[index % categoryPalette.length]} ${currentDeg}deg ${nextDeg}deg`);
                        currentDeg = nextDeg;
                    });
                    if (currentDeg < 360) {
                        segments.push(`#eaeef2 ${currentDeg}deg 360deg`);
                    }
                } else {
                    // 异常数据保护：总和超过 100 时按占比归一化，避免饼图溢出
                    categoryItems.forEach((item, index) => {
                        const ratio = item.value / categoryTotal;
                        const nextDeg = currentDeg + ratio * 360;
                        segments.push(`${categoryPalette[index % categoryPalette.length]} ${currentDeg}deg ${nextDeg}deg`);
                        currentDeg = nextDeg;
                    });
                }

                pieGradient = segments.join(', ');
            }

            const categoryLegendHtml = categoryItems.length > 0
                ? categoryItems.map((item, index) => {
                    const color = categoryPalette[index % categoryPalette.length];
                    return `
                        <div class="statistics-legend-item">
                            <span class="statistics-legend-dot" style="background:${color};"></span>
                            <span class="statistics-legend-name">${escapeHtml(item.key)}</span>
                            <span class="statistics-legend-value">${formatPercentValue(item.value)} (${formatCountValue(item.count)})</span>
                        </div>
                    `;
                }).join('')
                : '<div class="statistics-empty-text">暂无大于 0 的分类占比数据</div>';

            let html = `
                <div class="info-card">
                    <div class="info-card-header">统计查询条件</div>
                    <div class="info-card-body">
                        ${queryInfo}
                    </div>
                </div>

                <div class="info-card">
                    <div class="info-card-header">Overview 看板</div>
                    <div class="info-card-body">
                        <div class="statistics-overview-grid">
                            ${overviewItemsHtml || '<div class="statistics-empty-text">暂无 overview 数据</div>'}
                        </div>
                    </div>
                </div>

                <div class="info-card">
                    <div class="info-card-header">
                        <span class="info-card-header-title">分类占比看板</span>
                        ${categoryItems.length > 0
                            ? `
                                <div class="info-card-header-buttons">
                                    <button type="button" class="jump-btn jump-btn-admin statistics-export-btn" onclick="exportStatisticsPieExcel()">
                                        导出 Excel
                                    </button>
                                </div>
                            `
                            : ''
                        }
                    </div>
                    <div class="info-card-body">
                        ${categoryItems.length > 0
                            ? `
                                <div class="statistics-category-wrap">
                                    <div class="statistics-pie-chart" style="background: conic-gradient(${pieGradient});"></div>
                                    <div class="statistics-legend-list">
                                        ${categoryLegendHtml}
                                    </div>
                                </div>
                            `
                            : `<div class="statistics-empty-text">暂无大于 0 的分类占比数据</div>`
                        }
                    </div>
                </div>
            `;

            renderResultsContent(html);
        }

        function formatPercentValue(value) {
            const num = Number(value);
            if (Number.isFinite(num)) {
                return `${num}%`;
            }
            const str = String(value);
            return str.endsWith('%') ? str : `${str}%`;
        }

        function formatTrendPercentValue(value) {
            const num = Number(value);
            if (Number.isFinite(num)) {
                if (num > 0) return `+${num}%`;
                return `${num}%`;
            }
            const str = String(value);
            if (str.startsWith('+') || str.startsWith('-') || str.endsWith('%')) {
                return str.endsWith('%') ? str : `${str}%`;
            }
            return `+${str}%`;
        }

        function parseCountToNumber(value) {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        }

        function formatCountValue(value) {
            if (!Number.isFinite(value)) {
                return '-';
            }
            return new Intl.NumberFormat('zh-CN').format(value);
        }

        function exportStatisticsPieExcel() {
            if (!currentStatisticsExportContext || !Array.isArray(currentStatisticsExportContext.categoryItems) || currentStatisticsExportContext.categoryItems.length === 0) {
                showError('当前没有可导出的饼图数据');
                return;
            }

            hideError();

            const workbookHtml = buildStatisticsPieExcelHtml(currentStatisticsExportContext);
            const fileName = buildStatisticsPieExportFileName(currentStatisticsExportContext.queryMeta);
            const blob = new Blob(['\ufeff', workbookHtml], {
                type: 'application/vnd.ms-excel;charset=utf-8;'
            });

            downloadBlob(blob, fileName);
        }

        function buildStatisticsPieExcelHtml(exportContext) {
            const queryMeta = exportContext.queryMeta || {};
            const rowsHtml = exportContext.categoryItems.map((item, index) => {
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(queryMeta.merchantId || '')}</td>
                        <td>${escapeHtml(queryMeta.merchantName || '')}</td>
                        <td>${escapeHtml(queryMeta.startTime || '')}</td>
                        <td>${escapeHtml(queryMeta.endTime || '')}</td>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(formatPercentValue(item.value))}</td>
                        <td>${escapeHtml(formatCountValue(item.count))}</td>
                    </tr>
                `;
            }).join('');

            return `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:x="urn:schemas-microsoft-com:office:excel"
                      xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="UTF-8">
                    <!--[if gte mso 9]>
                    <xml>
                        <x:ExcelWorkbook>
                            <x:ExcelWorksheets>
                                <x:ExcelWorksheet>
                                    <x:Name>分类占比</x:Name>
                                    <x:WorksheetOptions>
                                        <x:DisplayGridlines/>
                                    </x:WorksheetOptions>
                                </x:ExcelWorksheet>
                            </x:ExcelWorksheets>
                        </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <style>
                        table { border-collapse: collapse; }
                        th, td {
                            border: 1px solid #d0d7de;
                            padding: 8px 12px;
                            font-size: 13px;
                        }
                        th {
                            background: #f6f8fa;
                            font-weight: 700;
                        }
                    </style>
                </head>
                <body>
                    <table>
                        <thead>
                            <tr>
                                <th>序号</th>
                                <th>商户ID</th>
                                <th>商户名称</th>
                                <th>开始时间</th>
                                <th>结束时间</th>
                                <th>分类名称</th>
                                <th>占比</th>
                                <th>数量</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </body>
                </html>
            `;
        }

        function buildStatisticsPieExportFileName(queryMeta) {
            const merchantId = sanitizeFileNamePart(queryMeta?.merchantId || 'unknown');
            const startTime = sanitizeFileNamePart(queryMeta?.startTime || 'start');
            const endTime = sanitizeFileNamePart(queryMeta?.endTime || 'end');
            return `statistics-pie-${merchantId}-${startTime}-${endTime}.xls`;
        }

        function sanitizeFileNamePart(value) {
            return String(value).replace(/[\\/:*?"<>|\s]+/g, '_');
        }

        function downloadBlob(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 0);
        }

        function normalizeApiResult(data, apiLabel) {
            if (!data || typeof data !== 'object') {
                throw new Error(`${apiLabel} 接口返回为空`);
            }

            const status = data.status;
            const hasStatus = status !== undefined && status !== null;
            const statusNum = Number(status);
            const isSuccess = status === true || statusNum === 1 || statusNum === 200;

            if (hasStatus && !isSuccess) {
                throw new Error(data.msg || `${apiLabel} 接口返回失败`);
            }

            if (Object.prototype.hasOwnProperty.call(data, 'result')) {
                return data.result;
            }

            // 兼容后端直接返回业务对象
            return data;
        }

        function parsePercentToNumber(value) {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const cleaned = value.replace('%', '').trim();
                const num = Number(cleaned);
                return Number.isFinite(num) ? num : NaN;
            }
            return NaN;
        }

        function convertDateTimeFormat(dateTimeStr) {
            const date = new Date(dateTimeStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = '00';
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        function convertDateTimeToCompactDate(dateTimeStr) {
            const date = new Date(dateTimeStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        }

        function buildInlineLoadingMarkup(text = '加载中...') {
            return `
                <div class="popover-loading">
                    <div class="spinner inline-loading-spinner"></div>
                    <span>${escapeHtml(text)}</span>
                </div>
            `;
        }

        function renderContentWithTransition(container, html) {
            if (!container) {
                return;
            }

            container.innerHTML = `<div class="result-fade-enter">${html}</div>`;
            const animatedBlock = container.firstElementChild;
            window.requestAnimationFrame(() => {
                animatedBlock?.classList.add('is-visible');
            });
        }

        function renderResultsContent(html) {
            renderContentWithTransition(document.getElementById('results'), html);
        }

        // 格式化显示时间：将 T 替换为空格
        function formatDisplayTime(timeStr) {
            if (!timeStr) return 'N/A';
            return timeStr.replace('T', ' ');
        }

        function displayMessages(payload) {
            const list = Array.isArray(payload?.list) ? payload.list : [];
            const total = Number(payload?.total) || 0;
            const page = Number(payload?.page) || 1;
            const pageSize = Number(payload?.pageSize) || SESSION_PAGE_SIZE;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));

            if (!currentSessionDetailState.selectedSessionId || !list.some(item => String(item?.sessionId ?? item?.id ?? '') === String(currentSessionDetailState.selectedSessionId))) {
                currentSessionDetailState = createDefaultSessionDetailState();
            } else if (currentSessionDetailState.selectedSessionId) {
                currentSessionDetailState = {
                    ...currentSessionDetailState,
                    selectedSession: list.find(item => String(item?.sessionId ?? item?.id ?? '') === String(currentSessionDetailState.selectedSessionId)) || currentSessionDetailState.selectedSession
                };
            }

            renderResultsContent(`
                <div class="session-workbench">
                    <section class="session-workbench-panel session-workbench-list">
                        <div class="session-workbench-header">
                            <div class="session-workbench-title">会话列表</div>
                        </div>
                        <div class="session-summary-list">
                            ${list.length > 0 ? list.map(item => renderSessionSummaryCard(item)).join('') : renderSessionEmptyState()}
                        </div>
                        ${renderSessionPagination(page, totalPages, total)}
                    </section>
                    <aside class="session-workbench-panel session-workbench-detail">
                        <div class="session-workbench-detail-body">
                            ${renderSessionDetailPanel()}
                        </div>
                    </aside>
                </div>
            `);
        }

        function renderSessionSummaryCard(session) {
            const sessionId = session?.sessionId ?? session?.id ?? 'N/A';
            const username = session?.username || 'N/A';
            const tagName = session?.tagName === null || session?.tagName === undefined || String(session?.tagName || '').trim() === ''
                ? 'Uncategoried'
                : String(session.tagName);
            const feedbackValue = session?.feedbackStatus || '-';
            const feedbackDesc = formatFeedbackStatusLabel(feedbackValue, session?.feedbackStatusDesc);
            const turnHumanBadge = normalizeTurnHumanValue(session?.isTurnHuman)
                ? renderSessionBadge('要求转人工', 'tone-human')
                : '';
            const isSelected = String(currentSessionDetailState.selectedSessionId || '') === String(sessionId);

            return `
                <article class="session-summary-card ${isSelected ? 'selected' : ''}" onclick="fetchSessionMessages('${escapeHtml(String(sessionId))}')" role="button" tabindex="0">
                    <div class="session-summary-line session-summary-line-primary">
                        <span class="session-summary-id">${escapeHtml(String(sessionId))}</span>
                        <span class="session-summary-divider">|</span>
                        <span class="session-summary-username">${escapeHtml(username)}</span>
                    </div>
                    <div class="session-summary-line session-summary-line-tags">
                        ${renderSessionBadge(feedbackDesc, getSessionToneClass(feedbackValue, 'feedback'), feedbackValue)}
                        ${turnHumanBadge}
                        ${renderSessionBadge(tagName, 'tone-neutral', tagName)}
                    </div>
                    <div class="session-summary-line session-summary-line-meta">
                        <span>lastChatTime ${escapeHtml(formatDisplayTime(session?.lastChatTime || '-'))}</span>
                        <span class="session-summary-divider">|</span>
                        <span>createDt ${escapeHtml(formatDisplayTime(session?.createDt || '-'))}</span>
                    </div>
                </article>
            `;
        }

        function renderSessionDetailPanel() {
            if (currentSessionDetailState.loading) {
                return `
                    <div class="session-detail-loading">
                        <div class="spinner"></div>
                        <span>加载会话详情中...</span>
                    </div>
                `;
            }

            if (currentSessionDetailState.error) {
                return `
                    <div class="session-detail-error">
                        <div class="empty-state-title">会话详情加载失败</div>
                        <div class="empty-state-desc">${escapeHtml(currentSessionDetailState.error)}</div>
                    </div>
                `;
            }

            if (!currentSessionDetailState.selectedSessionId) {
                return `
                    <div class="session-placeholder">
                        <div class="session-placeholder-eyebrow">Session Detail</div>
                        <div class="session-placeholder-title">Choose a session</div>
                        <div class="session-placeholder-desc">点击左侧会话后，右侧会按 IM 形式展示完整聊天记录。</div>
                    </div>
                `;
            }

            const selectedSession = currentSessionDetailState.selectedSession || {};
            const messages = Array.isArray(currentSessionDetailState.messages) ? currentSessionDetailState.messages : [];
            const sessionId = selectedSession?.sessionId ?? currentSessionDetailState.selectedSessionId;

            return `
                <div class="session-detail-shell">
                    <div class="session-detail-header">
                        <div class="session-detail-header-row">
                            <div>
                                <div class="session-detail-title">会话详情</div>
                            </div>
                            <button class="session-detail-user-btn" type="button" onclick="fetchSessionUserInfo('${escapeHtml(String(sessionId))}', event)">查询用户信息</button>
                        </div>
                    </div>
                    <div class="session-detail-chat-list">
                        ${messages.length > 0 ? messages.map(message => renderSessionMessageItem(message)).join('') : `
                            <div class="session-detail-empty">
                                <div class="empty-state-title">没有消息数据</div>
                                <div class="empty-state-desc">当前会话还没有可展示的聊天记录。</div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }

        async function fetchSessionMessages(sessionId) {
            const normalizedSessionId = String(sessionId || '').trim();
            if (!normalizedSessionId) {
                return;
            }

            if (!currentQueryMerchantId) {
                showError('商户ID不存在，请重新查询会话');
                return;
            }

            if (!API.sessionMessageList) {
                showError('请先配置会话消息接口');
                return;
            }

            currentSessionDetailState = {
                selectedSessionId: normalizedSessionId,
                selectedSession: findSessionSummaryById(normalizedSessionId),
                loading: true,
                error: '',
                messages: []
            };
            rerenderSessionWorkbench();

            const requestToken = ++latestSessionDetailToken;

            try {
                const params = new URLSearchParams({
                    merchantId: String(currentQueryMerchantId),
                    sessionId: normalizedSessionId
                });
                const response = await fetch(`${API.sessionMessageList}?${params.toString()}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const result = normalizeApiResult(data, '会话消息');
                const messages = Array.isArray(result) ? result : [];

                if (requestToken !== latestSessionDetailToken) {
                    return;
                }

                currentSessionDetailState = {
                    selectedSessionId: normalizedSessionId,
                    selectedSession: findSessionSummaryById(normalizedSessionId),
                    loading: false,
                    error: '',
                    messages
                };
                rerenderSessionWorkbench();
            } catch (error) {
                console.error('Error fetching session messages:', error);
                if (requestToken !== latestSessionDetailToken) {
                    return;
                }

                currentSessionDetailState = {
                    selectedSessionId: normalizedSessionId,
                    selectedSession: findSessionSummaryById(normalizedSessionId),
                    loading: false,
                    error: error.message,
                    messages: []
                };
                rerenderSessionWorkbench();
            }
        }

        function rerenderSessionWorkbench() {
            displayMessages({
                list: Array.isArray(sessionQueryState.currentPageList) ? sessionQueryState.currentPageList : [],
                total: sessionQueryState.total,
                page: sessionQueryState.page,
                pageSize: sessionQueryState.pageSize,
                queryMeta: {
                    merchantId: sessionQueryState.merchantId,
                    merchantName: sessionQueryState.merchantName,
                    startTime: sessionQueryState.startTime,
                    endTime: sessionQueryState.endTime,
                    feedbackStatus: sessionQueryState.feedbackStatus,
                    isTurnHuman: sessionQueryState.isTurnHuman
                }
            });
        }

        function findSessionSummaryById(sessionId) {
            const currentPageList = Array.isArray(sessionQueryState.currentPageList) ? sessionQueryState.currentPageList : [];
            return currentPageList.find(item => String(item?.sessionId ?? item?.id ?? '') === String(sessionId)) || null;
        }

        function renderSessionMessageItem(message) {
            const messageType = String(message?.type || '').trim().toUpperCase();
            if (messageType === 'TIP') {
                return `
                    <div class="chat-tip-row">
                        <span class="chat-tip-bubble">${escapeHtml(message?.content || '-')}</span>
                    </div>
                `;
            }

            const from = String(message?.from || '').trim().toUpperCase();
            const isRight = from === 'CUSTOMER';
            const roleLabel = isRight ? '客服' : '用户';
            const wrapperClass = isRight ? 'chat-row right' : 'chat-row left';
            const bubbleClass = isRight ? 'chat-bubble service' : 'chat-bubble user';
            const messageTypeLabel = formatMessageTypeLabel(messageType || message?.type || '-');
            const messageTypeTone = getMessageTypeToneClass(messageType);
            const faqHtml = renderFaqList(message?.faq);
            const picturesHtml = renderMessagePictures(message?.pictures);
            const rawPayload = buildMessageRawPayload(message);

            return `
                <div class="${wrapperClass}">
                    <div class="chat-message-stack ${isRight ? 'align-right' : ''}">
                        <div class="chat-message-meta ${isRight ? 'align-right' : ''}">
                            <span class="chat-role-badge ${isRight ? 'service' : 'user'}">${roleLabel}</span>
                            <span class="chat-type-badge ${messageTypeTone}">${escapeHtml(messageTypeLabel)}</span>
                            <span class="chat-time">${escapeHtml(formatDisplayTime(message?.createDt || '-'))}</span>
                        </div>
                        <div class="${bubbleClass}">
                            <div class="chat-message-content">${renderMessageContent(message?.content || '-')}</div>
                            ${picturesHtml}
                            ${faqHtml}
                            ${rawPayload ? `
                                <details class="chat-raw-details">
                                    <summary>展开原始内容</summary>
                                    <pre class="chat-raw-json"><code>${escapeHtml(JSON.stringify(rawPayload, null, 2))}</code></pre>
                                </details>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        function renderMessagePictures(pictures) {
            if (!Array.isArray(pictures) || pictures.length === 0) {
                return '';
            }

            return `
                <div class="chat-picture-grid">
                    ${pictures.map(pic => `
                        <div class="picture-item">
                            <img src="${escapeHtml(String(pic))}" alt="消息图片" onclick="openModal(this.src)">
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function renderFaqList(faq) {
            if (!faq) {
                return '';
            }

            const faqItems = Array.isArray(faq) ? faq : [faq];
            const normalizedItems = faqItems.map(item => normalizeFaqItem(item)).filter(Boolean);
            if (normalizedItems.length === 0) {
                return '';
            }

            return `
                <div class="chat-faq-block">
                    <div class="chat-faq-title">FAQ</div>
                    <ul class="chat-faq-list">
                        ${normalizedItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        function normalizeFaqItem(item) {
            if (item === null || item === undefined) {
                return '';
            }

            if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
                return String(item);
            }

            if (typeof item === 'object') {
                return item.question || item.title || item.content || item.answer || JSON.stringify(item);
            }

            return '';
        }

        function formatMessageTypeLabel(type) {
            const normalized = String(type || '').trim().toUpperCase();
            const typeLabelMap = {
                TEXT: '文字',
                IMG: '图片',
                VIDEO: '视频',
                COMPLEX: '复合',
                FAQ: '常见问题',
                TIP: '提示',
                MERCHANT_EMAIL_FORM: '商户联系邮箱表单',
                CUSTOMER_EMAIL_FORM: '客户联系邮箱表单',
                PRODUCTS: '商品列表'
            };
            return typeLabelMap[normalized] || (type || '-');
        }

        function getMessageTypeToneClass(type) {
            const normalized = String(type || '').trim().toUpperCase();
            const toneMap = {
                TEXT: 'tone-neutral',
                IMG: 'tone-info',
                VIDEO: 'tone-human',
                COMPLEX: 'tone-warning',
                FAQ: 'tone-success',
                TIP: 'tone-muted',
                MERCHANT_EMAIL_FORM: 'tone-warning',
                CUSTOMER_EMAIL_FORM: 'tone-info',
                PRODUCTS: 'tone-human'
            };
            return toneMap[normalized] || 'tone-neutral';
        }

        function buildMessageRawPayload(message) {
            const payload = {};
            if (message?.merchantEmailForm !== null && message?.merchantEmailForm !== undefined) {
                payload.merchantEmailForm = message.merchantEmailForm;
            }
            if (message?.customerEmailForm !== null && message?.customerEmailForm !== undefined) {
                payload.customerEmailForm = message.customerEmailForm;
            }
            if (message?.products !== null && message?.products !== undefined) {
                payload.products = message.products;
            }

            return Object.keys(payload).length > 0 ? payload : null;
        }

        function renderSessionBadge(text, toneClass, title = '') {
            const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
            return `<span class="session-status-badge ${toneClass}"${titleAttr}>${escapeHtml(text)}</span>`;
        }

        function renderSessionEmptyState() {
            return `
                <div class="empty-state session-empty-state">
                    <div class="empty-state-title">没有找到会话</div>
                    <div class="empty-state-desc">调整商户、时间范围或可选筛选项后重新查询。</div>
                </div>
            `;
        }

        function renderSessionPagination(currentPage, totalPages, total) {
            if (total <= 0) {
                return '';
            }

            const pageButtons = buildSessionPageNumbers(currentPage, totalPages).map(item => {
                if (item === '...') {
                    return '<span class="session-pagination-ellipsis">...</span>';
                }

                const isActive = item === currentPage;
                return `
                    <button
                        class="session-page-btn ${isActive ? 'active' : ''}"
                        type="button"
                        ${isActive ? 'disabled' : ''}
                        onclick="goToSessionPage(${item})"
                    >${item}</button>
                `;
            }).join('');

            return `
                <div class="session-pagination">
                    <div class="session-pagination-summary">共 ${total} 条</div>
                    <div class="session-pagination-controls">
                        <button class="session-page-nav" type="button" ${currentPage <= 1 ? 'disabled' : ''} onclick="goToSessionPage(${currentPage - 1})">上一页</button>
                        ${pageButtons}
                        <button class="session-page-nav" type="button" ${currentPage >= totalPages ? 'disabled' : ''} onclick="goToSessionPage(${currentPage + 1})">下一页</button>
                    </div>
                </div>
            `;
        }

        function buildSessionPageNumbers(currentPage, totalPages) {
            if (totalPages <= 7) {
                return Array.from({ length: totalPages }, (_, index) => index + 1);
            }

            const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
            if (currentPage <= 3) {
                pages.add(2);
                pages.add(3);
                pages.add(4);
            }
            if (currentPage >= totalPages - 2) {
                pages.add(totalPages - 1);
                pages.add(totalPages - 2);
                pages.add(totalPages - 3);
            }

            const orderedPages = Array.from(pages)
                .filter(page => page >= 1 && page <= totalPages)
                .sort((left, right) => left - right);

            const result = [];
            orderedPages.forEach((page, index) => {
                if (index > 0 && page - orderedPages[index - 1] > 1) {
                    result.push('...');
                }
                result.push(page);
            });
            return result;
        }

        function getSessionToneClass(value, type = 'status') {
            const normalized = String(value || '').trim().toUpperCase();
            if (!normalized) {
                return 'tone-neutral';
            }

            if (type === 'feedback') {
                const feedbackToneMap = {
                    AI_PROCESSING: 'tone-info',
                    AI_SOLVED: 'tone-success',
                    AI_NOT_SOLVED: 'tone-danger',
                    MANUAL_INTERVENTION: 'tone-human',
                    MANUAL_INTERVENTION_END: 'tone-muted'
                };
                return feedbackToneMap[normalized] || 'tone-neutral';
            }

            const statusToneMap = {
                PROCESSING: 'tone-warning',
                WAIT_HUMAN_PROCESS: 'tone-human',
                PROCESSED: 'tone-success'
            };
            return statusToneMap[normalized] || 'tone-neutral';
        }

        function normalizeTurnHumanValue(value) {
            return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
        }

        function formatSessionStatusLabel(status) {
            const normalized = String(status || '').trim().toUpperCase();
            const statusLabelMap = {
                PROCESSING: '处理中',
                WAIT_HUMAN_PROCESS: '等待人工处理',
                PROCESSED: '处理结束'
            };
            return statusLabelMap[normalized] || (status || '-');
        }

        function formatFeedbackStatusLabel(status, fallbackDesc = '') {
            const normalized = String(status || '').trim().toUpperCase();
            return FEEDBACK_STATUS_LABEL_MAP[normalized] || fallbackDesc || status || '-';
        }

        function formatFilterTurnHuman(value) {
            if (value === '' || value === null || value === undefined) {
                return '全部';
            }
            return String(value) === 'true' ? '是' : '否';
        }

        function showLoading(show) {
            const loading = document.getElementById('loading');
            const resultShell = document.getElementById('resultShell');
            const loadingText = loading?.querySelector('.loading-text');

            if (loadingText) {
                loadingText.textContent = currentModule === 'statistics' ? '正在汇总统计数据...' : '正在加载数据...';
            }

            loading?.classList.toggle('active', show);
            loading?.setAttribute('aria-hidden', show ? 'false' : 'true');
            resultShell?.classList.toggle('is-loading', show);

            // 更新当前模块的按钮状态
            const buttonMap = {
                'message': document.querySelector('#messageForm button'),
                'persona': document.querySelector('#personaForm button'),
                'merchant': document.querySelector('#merchantInfoForm button'),
                'statistics': document.querySelector('#statisticsForm button')
            };

            const btn = buttonMap[currentModule];
            if (btn) {
                if (show) {
                    btn.classList.add('loading-btn');
                    btn.dataset.originalHtml = btn.innerHTML;
                    btn.innerText = '查询中...';
                } else {
                    btn.classList.remove('loading-btn');
                    btn.innerHTML = btn.dataset.originalHtml || '查询';
                }
            }
        }

        function showError(message) {
            const errorDiv = document.getElementById('error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        function hideError() {
            document.getElementById('error').style.display = 'none';
        }

        function openModal(imageSrc) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            modal.style.display = 'flex';
            modalImg.src = imageSrc;
        }

        function closeModal() {
            const modal = document.getElementById('imageModal');
            modal.style.display = 'none';
        }

        // 点击模态框外部区域关闭模态框
        window.onclick = function(event) {
            const modal = document.getElementById('imageModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };

        // ================== 人设查询 ==================
        async function fetchPersona() {
            const merchantInputValue = document.getElementById('personaMerchantInput').value.trim();
            let merchantId = document.getElementById('personaMerchantId').value;

            if (!merchantId && merchantInputValue) {
                const inputLower = merchantInputValue.toLowerCase();
                const matched = merchantList.find(item => item.merchantNameLower === inputLower);
                if (matched) {
                    merchantId = matched.merchantId;
                    document.getElementById('personaMerchantId').value = merchantId;
                }
            }

            if (!merchantId) {
                showError('请选择商户');
                return;
            }

            if (!API.getAiAssistant) {
                showError('请先配置人设查询接口');
                return;
            }

            showLoading(true);
            hideError();

            try {
                const params = new URLSearchParams({
                    merchantId: merchantId
                });
                const url = `${API.getAiAssistant}?${params.toString()}`;
                const response = await fetch(url);
                console.log('Raw response:', response);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Response data:', data);

                const result = data.result || data;
                displayPersonaResult(result);
            } catch (error) {
                console.error('Error fetching persona:', error);
                showError(`查询失败: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        function displayPersonaResult(data) {
            const resultsDiv = document.getElementById('results');

            if (!data) {
                renderResultsContent('<p>没有找到人设数据</p>');
                return;
            }

            // 定义字段标签映射
            const fieldLabels = {
                merchantId: '商户ID',
                merchantName: '商户名称',
                persona: '人设',
                assistantName: '助手名称',
                aiUserId: 'AI用户ID',
                avatarUrl: '头像URL',
                merchantAvatarUrl: '商户头像URL',
                aiAvatarUrl: 'AI头像URL',
                businessScenario: '业务场景'
            };

            let html = `
                <div class="info-card">
                    <div class="info-card-header">AI助手人设信息</div>
                    <div class="info-card-body">
            `;

            Object.keys(fieldLabels).forEach(key => {
                const value = data[key];
                const displayValue = value !== null && value !== undefined ? value : 'N/A';
                html += `
                    <div class="info-row">
                        <div class="info-label">${fieldLabels[key]}</div>
                        <div class="info-value">${displayValue}</div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;

            // JSON 展示
            html += createJsonResultCard(data, '原始JSON数据');

            renderResultsContent(html);
        }

        // ================== 店铺信息查询 ==================
        async function fetchMerchantInfo() {
            const merchantInputValue = document.getElementById('merchantInfoInput').value.trim();
            let merchantId = document.getElementById('merchantInfoMerchantId').value;

            if (!merchantId && merchantInputValue) {
                const inputLower = merchantInputValue.toLowerCase();
                const matched = merchantList.find(item => item.merchantNameLower === inputLower);
                if (matched) {
                    merchantId = matched.merchantId;
                    document.getElementById('merchantInfoMerchantId').value = merchantId;
                }
            }

            if (!merchantId) {
                showError('请选择商户');
                return;
            }

            if (!API.fetchMerchantInfo) {
                showError('请先配置店铺信息查询接口');
                return;
            }

            showLoading(true);
            hideError();

            try {
                // 并行调用三个接口
                const [merchantInfoRes, settingRes, discountRes] = await Promise.allSettled([
                    fetchMerchantInfoBasic(merchantId),
                    fetchMerchantSetting(merchantId),
                    fetchDiscountList(merchantId)
                ]);

                // 处理基本信息接口结果
                let merchantInfoData = null;
                if (merchantInfoRes.status === 'fulfilled') {
                    merchantInfoData = merchantInfoRes.value;
                } else {
                    throw new Error(`店铺信息查询失败: ${merchantInfoRes.reason.message}`);
                }

                // 处理设置接口结果
                let settingData = null;
                if (settingRes.status === 'fulfilled') {
                    settingData = settingRes.value;
                } else {
                    console.warn('获取商户设置失败:', settingRes.reason);
                }

                // 处理折扣接口结果
                let discountData = null;
                if (discountRes.status === 'fulfilled') {
                    discountData = discountRes.value;
                } else {
                    console.warn('获取折扣列表失败:', discountRes.reason);
                }

                displayMerchantInfoResult(merchantInfoData, settingData, discountData);
            } catch (error) {
                console.error('Error fetching merchant info:', error);
                showError(`查询失败: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }

        async function fetchMerchantInfoBasic(merchantId) {
            const params = new URLSearchParams({ merchantId });
            const url = `${API.fetchMerchantInfo}?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.result || data;
        }

        async function fetchMerchantSetting(merchantId) {
            if (!API.getMerchantSetting) {
                throw new Error('商户设置接口未配置');
            }
            const params = new URLSearchParams({ merchantId });
            const url = `${API.getMerchantSetting}?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.result || data;
        }

        async function fetchDiscountList(merchantId) {
            if (!API.discountList) {
                throw new Error('折扣列表接口未配置');
            }
            const params = new URLSearchParams({ merchantId });
            const url = `${API.discountList}?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.result || data;
        }

        function displayMerchantInfoResult(data, settingData, discountData) {
            const resultsDiv = document.getElementById('results');

            if (!data) {
                renderResultsContent('<p>没有找到店铺信息</p>');
                return;
            }

            // 定义字段标签映射
            const fieldLabels = {
                merchantId: '商户ID',
                merchantName: '商户名称',
                merchantEmail: '商户邮箱',
                businessScenario: '业务场景',
                accessToken: 'Access Token',
                thirdPartyId: '第三方ID',
                merchantDomain: '商户域名',
                platformName: '平台名称',
                accessTokenExtend: 'Token扩展信息'
            };

            // 生成跳转按钮 HTML
            let jumpButtonsHtml = '';
            if (data.merchantDomain) {
                const domain = data.merchantDomain;
                const domainPrefix = domain.split('.')[0]; // 获取域名前缀
                const frontendUrl = `https://${domain}`;
                const adminUrl = `https://admin.shopify.com/store/${domainPrefix}`;

                jumpButtonsHtml = `
                    <div class="info-card-header-buttons">
                        <a href="${frontendUrl}" target="_blank" class="jump-btn jump-btn-frontend">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            前台页面
                        </a>
                        <a href="${adminUrl}" target="_blank" class="jump-btn jump-btn-admin">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                <line x1="9" y1="21" x2="9" y2="9"></line>
                            </svg>
                            后台管理
                        </a>
                    </div>
                `;
            }

            let html = `
                <div class="info-card">
                    <div class="info-card-header">
                        <span class="info-card-header-title">店铺数据信息</span>
                        ${jumpButtonsHtml}
                    </div>
                    <div class="info-card-body">
            `;

            Object.keys(fieldLabels).forEach(key => {
                const value = data[key];
                let displayValue = 'N/A';

                if (value !== null && value !== undefined) {
                    // 尝试格式化 JSON 字符串
                    if (key === 'accessTokenExtend' && typeof value === 'string') {
                        try {
                            const parsed = JSON.parse(value);
                            displayValue = `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(parsed, null, 2)}</pre>`;
                        } catch (e) {
                            displayValue = value;
                        }
                    } else {
                        displayValue = value;
                    }
                }

                html += `
                    <div class="info-row">
                        <div class="info-label">${fieldLabels[key]}</div>
                        <div class="info-value">${displayValue}</div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;

            // 商户设置
            html += renderMerchantSettingSection(settingData);

            // 折扣列表
            html += renderDiscountListSection(discountData);

            // JSON 展示
            html += createJsonResultCard(data, '原始JSON数据');

            renderResultsContent(html);
        }

        // 商户设置字段中文映射（优先人工映射，兜底自动翻译）
        const SETTING_LABELS = {
            merchantId: '商户ID',
            merchantName: '商户名称',
            language: '语言设置',
            theme: '主题设置',
            timezone: '时区',
            currency: '货币',
            country: '国家/地区',
            createdAt: '创建时间',
            updatedAt: '更新时间',
            aiReplySwitch: 'AI回复开关',
            aiEnabled: 'AI功能启用',
            faqSwitch: 'FAQ开关',
            autoReplySwitch: '自动回复开关',
            smartReply: '智能回复',
            useGPT: '使用GPT模型',
            notificationSwitch: '通知开关',
            emailNotification: '邮件通知',
            smsNotification: '短信通知',
            pushNotification: '推送通知',
            orderNotification: '订单通知',
            messageNotification: '消息通知',
            turnToManualSetting: '转人工设置',
            autoTransfer: '自动转人工',
            transferTimeout: '转人工超时时间',
            manualTriggerKeywords: '转人工触发关键词',
            maxRetryCount: '最大重试次数',
            welcomeMessage: '欢迎语配置',
            enabled: '是否启用',
            content: '内容',
            title: '标题',
            type: '类型',
            delay: '延迟时间',
            quickReplies: '快捷回复配置',
            replies: '回复列表',
            keyword: '关键词',
            response: '回复内容',
            category: '分类',
            workingHours: '工作时间设置',
            workStartTime: '工作开始时间',
            workEndTime: '工作结束时间',
            workDays: '工作日',
            nonWorkdayAutoReply: '非工作日自动回复',
            botAppearance: '机器人形象设置',
            avatar: '头像',
            name: '名称',
            greeting: '问候语',
            personality: '性格设置',
            knowledgeBase: '知识库设置',
            kbEnabled: '知识库启用',
            kbSources: '知识来源',
            faqCategories: 'FAQ分类',
            autoLearn: '自动学习',
            analytics: '数据分析设置',
            dataCollection: '数据收集',
            reportFrequency: '报告频率',
            metricsEnabled: '指标监控启用',
            security: '安全设置',
            dataEncryption: '数据加密',
            accessControl: '访问控制',
            ipWhitelist: 'IP白名单',
            sessionTimeout: '会话超时时间'
        };

        // 字段英文词片段 -> 中文（未命中 SETTING_LABELS 时自动组合）
        const SETTING_TOKEN_LABELS = {
            ai: 'AI',
            faq: 'FAQ',
            gpt: 'GPT',
            id: 'ID',
            url: '链接',
            api: '接口',
            ip: 'IP',
            merchant: '商户',
            shop: '店铺',
            store: '店铺',
            name: '名称',
            title: '标题',
            content: '内容',
            status: '状态',
            switch: '开关',
            enabled: '启用',
            disabled: '禁用',
            auto: '自动',
            manual: '人工',
            transfer: '转接',
            timeout: '超时',
            retry: '重试',
            count: '数量',
            max: '最大',
            min: '最小',
            trigger: '触发',
            keyword: '关键词',
            message: '消息',
            order: '订单',
            product: '商品',
            shipping: '运费',
            email: '邮箱',
            sms: '短信',
            push: '推送',
            notification: '通知',
            session: '会话',
            user: '用户',
            customer: '客户',
            language: '语言',
            theme: '主题',
            timezone: '时区',
            currency: '货币',
            country: '国家地区',
            created: '创建',
            updated: '更新',
            time: '时间',
            start: '开始',
            end: '结束',
            day: '日',
            days: '日',
            hour: '小时',
            hours: '小时',
            minute: '分钟',
            minutes: '分钟',
            second: '秒',
            seconds: '秒',
            welcome: '欢迎',
            quick: '快捷',
            reply: '回复',
            replies: '回复',
            work: '工作',
            bot: '机器人',
            avatar: '头像',
            greeting: '问候语',
            personality: '人设',
            knowledge: '知识',
            base: '库',
            source: '来源',
            sources: '来源',
            category: '分类',
            categories: '分类',
            analytics: '分析',
            data: '数据',
            report: '报表',
            metrics: '指标',
            security: '安全',
            encryption: '加密',
            access: '访问',
            control: '控制',
            white: '白',
            list: '列表',
            domain: '域名',
            code: '编码',
            version: '版本',
            config: '配置',
            setting: '设置',
            value: '值'
        };

        function renderMerchantSettingSection(settingData) {
            if (!settingData || typeof settingData !== 'object') {
                return `
                    <div class="info-card">
                        <div class="info-card-header">商户设置</div>
                        <div class="info-card-body">暂无商户设置数据</div>
                    </div>
                `;
            }

            const topEntries = Object.entries(settingData);
            if (topEntries.length === 0) {
                return `
                    <div class="info-card">
                        <div class="info-card-header">商户设置</div>
                        <div class="info-card-body">商户设置为空对象 {}</div>
                    </div>
                `;
            }

            const stats = collectSettingStats(settingData);
            const treeHtml = topEntries
                .map(([key, value]) => renderSettingNode(key, value, key, 0))
                .join('');

            return `
                <div class="info-card">
                    <div class="info-card-header">商户设置</div>
                    <div class="info-card-body">
                        <div class="setting-overview">
                            <span class="setting-overview-item">字段总数：${stats.fieldCount}</span>
                            <span class="setting-overview-item">对象节点：${stats.objectCount}</span>
                            <span class="setting-overview-item">数组节点：${stats.arrayCount}</span>
                            <span class="setting-overview-item">最大层级：${stats.maxDepth + 1}</span>
                        </div>
                        <div class="setting-simple-tree">${treeHtml}</div>
                    </div>
                </div>
            `;
        }

        function renderSettingNode(key, value, path, depth, customLabel) {
            if (value !== null && typeof value === 'object') {
                if (Array.isArray(value)) {
                    return renderSettingArrayNode(key, value, path, depth, customLabel);
                }
                return renderSettingObjectNode(key, value, path, depth, customLabel);
            }
            return renderSettingLeafNode(key, value, path, depth, customLabel);
        }

        function renderSettingObjectNode(key, value, path, depth, customLabel) {
            const entries = Object.entries(value);
            if (entries.length === 0) {
                return renderSettingLeafNode(key, '{}', path, depth, customLabel, '空对象');
            }

            const label = customLabel || getSettingLabel(key);
            const rows = entries
                .map(([childKey, childValue]) => {
                    const childPath = `${path}.${childKey}`;
                    return renderSettingNode(childKey, childValue, childPath, depth + 1);
                })
                .join('');

            return `
                <div class="setting-group-card" style="--depth:${depth}">
                    <div class="setting-group-head">
                        <span class="setting-level-tag">L${depth + 1}</span>
                        <span class="setting-group-name">${escapeHtml(label)}</span>
                        <span class="setting-origin-key">${escapeHtml(key)}</span>
                        <span class="setting-data-type">对象（${entries.length}）</span>
                    </div>
                    <div class="setting-group-path">路径：${escapeHtml(path)}</div>
                    <div class="setting-group-body">${rows}</div>
                </div>
            `;
        }

        function renderSettingArrayNode(key, value, path, depth, customLabel) {
            if (value.length === 0) {
                return renderSettingLeafNode(key, '[]', path, depth, customLabel, '空数组');
            }

            const label = customLabel || getSettingLabel(key);
            const rows = value
                .map((item, index) => {
                    const itemPath = `${path}[${index}]`;
                    return renderSettingNode(`[${index}]`, item, itemPath, depth + 1, `第${index + 1}项`);
                })
                .join('');

            return `
                <div class="setting-group-card" style="--depth:${depth}">
                    <div class="setting-group-head">
                        <span class="setting-level-tag">L${depth + 1}</span>
                        <span class="setting-group-name">${escapeHtml(label)}</span>
                        <span class="setting-origin-key">${escapeHtml(key)}</span>
                        <span class="setting-data-type">数组（${value.length}）</span>
                    </div>
                    <div class="setting-group-path">路径：${escapeHtml(path)}</div>
                    <div class="setting-group-body">${rows}</div>
                </div>
            `;
        }

        function renderSettingLeafNode(key, value, path, depth, customLabel, forceType) {
            const keyIsIndex = /^\[\d+\]$/.test(key);
            const label = customLabel || (keyIsIndex ? `第${key.slice(1, -1)}项` : getSettingLabel(key));
            const valueHtml = formatSettingValue(value);
            const typeLabel = forceType || getSettingValueType(value);

            return `
                <div class="setting-leaf-card" style="--depth:${depth}">
                    <div class="setting-leaf-head">
                        <span class="setting-level-tag">L${depth + 1}</span>
                        <span class="setting-leaf-name">${escapeHtml(label)}</span>
                        ${keyIsIndex ? '' : `<span class="setting-origin-key">${escapeHtml(key)}</span>`}
                        <span class="setting-data-type">${escapeHtml(typeLabel)}</span>
                    </div>
                    <div class="setting-group-path">路径：${escapeHtml(path)}</div>
                    <div class="setting-leaf-value">${valueHtml}</div>
                </div>
            `;
        }

        function formatSettingValue(value) {
            if (value === null || value === undefined) {
                return '<span class="setting-value-empty">未设置</span>';
            }

            if (typeof value === 'boolean') {
                const cls = value ? 'on' : 'off';
                const text = value ? '开启' : '关闭';
                return `<span class="setting-bool-badge ${cls}">${text}</span>`;
            }

            if (typeof value === 'number' || typeof value === 'bigint') {
                return `<span class="setting-plain-value">${escapeHtml(String(value))}</span>`;
            }

            if (typeof value === 'string') {
                if (value.trim() === '') {
                    return '<span class="setting-value-empty">空字符串</span>';
                }
                return `<span class="setting-plain-value">${escapeHtml(value)}</span>`;
            }

            return `<span class="setting-plain-value">${escapeHtml(String(value))}</span>`;
        }

        function getSettingValueType(value) {
            if (value === null || value === undefined) return '空值';
            if (typeof value === 'boolean') return '布尔值';
            if (typeof value === 'number' || typeof value === 'bigint') return '数值';
            if (typeof value === 'string') return '文本';
            if (Array.isArray(value)) return '数组';
            if (typeof value === 'object') return '对象';
            return '其他';
        }

        function collectSettingStats(data) {
            const stats = {
                fieldCount: 0,
                objectCount: 0,
                arrayCount: 0,
                maxDepth: 0
            };

            function walk(node, depth) {
                stats.maxDepth = Math.max(stats.maxDepth, depth);

                if (node === null || node === undefined || typeof node !== 'object') {
                    stats.fieldCount += 1;
                    return;
                }

                if (Array.isArray(node)) {
                    stats.arrayCount += 1;
                    if (node.length === 0) {
                        stats.fieldCount += 1;
                        return;
                    }
                    node.forEach(item => walk(item, depth + 1));
                    return;
                }

                const entries = Object.entries(node);
                stats.objectCount += 1;
                if (entries.length === 0) {
                    stats.fieldCount += 1;
                    return;
                }
                entries.forEach(([_, value]) => walk(value, depth + 1));
            }

            walk(data, 0);
            return stats;
        }

        // 获取中文标签
        function getSettingLabel(key) {
            if (!key) return '';
            if (SETTING_LABELS[key]) return SETTING_LABELS[key];
            const translated = tryTranslateSettingKey(key);
            return translated || formatFieldName(key);
        }

        function tryTranslateSettingKey(key) {
            const segments = key
                .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
                .replace(/[-\s]+/g, '_')
                .split('_')
                .filter(Boolean);

            if (segments.length === 0) {
                return '';
            }

            let translatedCount = 0;
            const translated = segments.map(segment => {
                const lower = segment.toLowerCase();
                const mapped = SETTING_TOKEN_LABELS[lower];
                if (mapped) {
                    translatedCount += 1;
                    return mapped;
                }
                return segment;
            });

            return translatedCount > 0 ? translated.join('') : '';
        }

        // 格式化字段名（驼峰转可读格式）
        function formatFieldName(key) {
            if (!key) return '';
            return key
                .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                .replace(/_/g, ' ')
                .replace(/^./, str => str.toUpperCase())
                .trim();
        }

        // HTML 转义
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function renderDiscountListSection(discountData) {
            let list = [];
            if (Array.isArray(discountData)) {
                list = discountData;
            } else if (discountData && Array.isArray(discountData.list)) {
                list = discountData.list;
            }

            if (!list || list.length === 0) {
                return `
                    <div class="info-card">
                        <div class="info-card-header">折扣列表</div>
                        <div class="info-card-body">暂无折扣数据</div>
                    </div>
                `;
            }

            const cards = list.map((discount, index) => {
                const typeRaw = discount.discountType || discount.type || 'UNKNOWN';
                const type = String(typeRaw).toLowerCase();
                const typeClass = ['percentage', 'fixed_amount', 'free_shipping'].includes(type) ? type : 'unknown';
                const badgeText = type.replace('_', ' ');
                const triggerText = discount.triggerType || 'N/A';
                const statusClass = getDiscountStatusClass(discount.status);
                const toggleId = `discount-${Date.now()}-${index}`;

                return `
                    <div class="discount-card">
                        <div class="discount-header" onclick="toggleDiscountCard('${toggleId}')">
                            <div class="discount-title-row">
                                <span class="discount-badge ${typeClass}">${badgeText}</span>
                                <span class="discount-type">${triggerText}</span>
                                <span class="discount-title">${discount.title || '未命名折扣'}</span>
                            </div>
                            <button class="discount-toggle" id="${toggleId}-toggle" onclick="toggleDiscountCard('${toggleId}', event)">▼</button>
                        </div>
                        <div class="discount-details" id="${toggleId}">
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">ID</div>
                                <div class="discount-detail-value">${discount.id || discount.discountId || 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">折扣类型</div>
                                <div class="discount-detail-value">${typeRaw || 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">触发类型</div>
                                <div class="discount-detail-value">${triggerText}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">开始时间</div>
                                <div class="discount-detail-value">${discount.startsAt || discount.startTime || 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">结束时间</div>
                                <div class="discount-detail-value">${discount.endsAt || discount.endTime || 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">摘要</div>
                                <div class="discount-detail-value">${discount.summary || 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">折扣范围</div>
                                <div class="discount-detail-value">${Array.isArray(discount.discountClasses) ? discount.discountClasses.join(', ') : (discount.discountClasses || 'N/A')}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">可与订单叠加</div>
                                <div class="discount-detail-value">${discount.combinesWithOrder !== null && discount.combinesWithOrder !== undefined ? discount.combinesWithOrder : 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">可与商品叠加</div>
                                <div class="discount-detail-value">${discount.combinesWithProduct !== null && discount.combinesWithProduct !== undefined ? discount.combinesWithProduct : 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">可与运费叠加</div>
                                <div class="discount-detail-value">${discount.combinesWithShipping !== null && discount.combinesWithShipping !== undefined ? discount.combinesWithShipping : 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">折扣码数量</div>
                                <div class="discount-detail-value">${discount.codesCount !== null && discount.codesCount !== undefined ? discount.codesCount : 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">折扣码快照</div>
                                <div class="discount-detail-value">${discount.codesSnapshot !== null && discount.codesSnapshot !== undefined ? discount.codesSnapshot : 'N/A'}</div>
                            </div>
                            <div class="discount-detail-row">
                                <div class="discount-detail-label">状态</div>
                                <div class="discount-detail-value ${statusClass}">${discount.status || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="info-card">
                    <div class="info-card-header">折扣列表</div>
                    <div class="info-card-body">
                        ${cards}
                    </div>
                </div>
            `;
        }

        function getDiscountStatusClass(status) {
            const normalized = (status || '').toLowerCase();
            if (normalized === 'active') return 'discount-status-active';
            if (normalized === 'expired') return 'discount-status-expired';
            if (normalized === 'disabled') return 'discount-status-disabled';
            return '';
        }

        function toggleDiscountCard(detailId, event) {
            if (event) {
                event.stopPropagation();
            }
            const detailEl = document.getElementById(detailId);
            const toggleBtn = document.getElementById(`${detailId}-toggle`);
            if (!detailEl) return;

            const isOpen = detailEl.classList.contains('active');
            if (isOpen) {
                detailEl.classList.remove('active');
                if (toggleBtn) toggleBtn.classList.remove('expanded');
            } else {
                detailEl.classList.add('active');
                if (toggleBtn) toggleBtn.classList.add('expanded');
            }
        }

        // ================== 通用工具函数 ==================
        function createJsonResultCard(data, title) {
            const jsonStr = JSON.stringify(data, null, 2);
            const id = 'json-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            // 将 JSON 数据存储到缓存中
            jsonDataCache.set(id, jsonStr);

            return `
                <div class="json-result">
                    <div class="json-result-header">
                        <span>${title}</span>
                        <button class="copy-btn" data-json-id="${id}" onclick="copyToClipboard(this)">复制</button>
                    </div>
                    <div class="json-result-content" id="${id}">${syntaxHighlight(jsonStr)}</div>
                </div>
            `;
        }

        function syntaxHighlight(json) {
            if (!json) return '';
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        function copyToClipboard(btn) {
            const jsonId = btn.getAttribute('data-json-id');
            const text = jsonDataCache.get(jsonId);

            if (!text) {
                console.error('未找到 JSON 数据');
                alert('复制失败: 数据未找到');
                return;
            }

            // 检查浏览器是否支持 clipboard API
            if (!navigator.clipboard || !navigator.clipboard.writeText) {
                // 降级方案：使用传统复制方法
                fallbackCopyToClipboard(text, btn);
                return;
            }

            navigator.clipboard.writeText(text).then(() => {
                const originalText = btn.innerText;
                btn.innerText = '已复制 ✓';
                btn.style.backgroundColor = '#218838';
                btn.disabled = true;
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.backgroundColor = '#28a745';
                    btn.disabled = false;
                }, 2000);
            }).catch(err => {
                console.error('Clipboard API 复制失败:', err);
                // 如果 clipboard API 失败，尝试降级方案
                fallbackCopyToClipboard(text, btn);
            });
        }

        // 降级复制方案（兼容 HTTP 环境）
        function fallbackCopyToClipboard(text, btn) {
            try {
                // 创建临时 textarea 元素
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);

                if (successful) {
                    const originalText = btn.innerText;
                    btn.innerText = '已复制 ✓';
                    btn.style.backgroundColor = '#218838';
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.backgroundColor = '#28a745';
                        btn.disabled = false;
                    }, 2000);
                } else {
                    alert('复制失败，请手动复制');
                }
            } catch (err) {
                console.error('降级复制失败:', err);
                alert('复制失败: ' + err.message);
            }
        }

        function positionUserInfoPopover(triggerElement) {
            const popover = document.getElementById('userInfoPopover');
            if (!popover) {
                return;
            }

            const margin = 12;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const triggerRect = triggerElement?.getBoundingClientRect();

            if (!triggerRect) {
                popover.style.left = `${Math.max(margin, (viewportWidth - 380) / 2)}px`;
                popover.style.top = `${Math.max(margin, (viewportHeight - 320) / 2)}px`;
                popover.dataset.placement = 'bottom';
                popover.style.setProperty('--popover-arrow-left', '48px');
                popover.style.setProperty('--popover-origin-x', '48px');
                return;
            }

            const popoverWidth = Math.min(420, viewportWidth - margin * 2);
            const estimatedHeight = Math.min(380, Math.max(280, viewportHeight * 0.56));
            const gap = 14;
            const spaceBelow = viewportHeight - triggerRect.bottom - margin;
            const spaceAbove = triggerRect.top - margin;
            const placement = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';

            let left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
            left = Math.min(Math.max(margin, left), viewportWidth - popoverWidth - margin);

            let top = placement === 'bottom'
                ? triggerRect.bottom + gap
                : triggerRect.top - estimatedHeight - gap;

            top = Math.max(margin, Math.min(top, viewportHeight - estimatedHeight - margin));

            const triggerCenter = triggerRect.left + triggerRect.width / 2;
            const arrowLeft = Math.min(
                Math.max(triggerCenter - left, 26),
                popoverWidth - 26
            );

            popover.dataset.placement = placement;
            popover.style.left = `${left}px`;
            popover.style.top = `${top}px`;
            popover.style.setProperty('--popover-arrow-left', `${arrowLeft}px`);
            popover.style.setProperty('--popover-origin-x', `${arrowLeft}px`);
        }

        // ================== 会话用户信息查询 ==================
        async function fetchSessionUserInfo(sessionId, event) {
            if (event) {
                event.stopPropagation();
            }

            if (!sessionId) {
                alert('会话ID不能为空');
                return;
            }

            if (!currentQueryMerchantId) {
                alert('商户ID不存在，请重新查询会话');
                return;
            }

            // 显示悬浮窗口
            const popover = document.getElementById('userInfoPopover');
            const overlay = document.getElementById('popoverOverlay');
            const content = document.getElementById('popoverContent');

            const triggerElement = event?.currentTarget || event?.target;
            activeUserInfoTrigger = triggerElement || null;
            if (!triggerElement) {
                content.innerHTML = buildInlineLoadingMarkup('加载用户信息中...');
                positionUserInfoPopover(null);
                popover.classList.add('active');
                overlay.classList.add('active');
            } else {
                positionUserInfoPopover(triggerElement);
                popover.classList.add('active');
                overlay.classList.add('active');
            }

            // 显示加载状态
            content.innerHTML = buildInlineLoadingMarkup('加载用户信息中...');

            try {
                // 使用 getSessionUserInfo 接口，传递 merchantId 和 sessionId
                const params = new URLSearchParams({
                    merchantId: currentQueryMerchantId,
                    sessionId: sessionId
                });
                const url = `${API.getSessionUserInfo}?${params.toString()}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('User info response:', data);

                const result = data.result || data;
                displayUserInfoInPopover(result);
            } catch (error) {
                console.error('Error fetching user info:', error);
                renderContentWithTransition(content, `<div class="popover-error">查询失败: ${escapeHtml(error.message)}</div>`);
            }
        }

        function displayUserInfoInPopover(data) {
            const content = document.getElementById('popoverContent');

            if (!data || Object.keys(data).length === 0) {
                renderContentWithTransition(content, '<div class="popover-error">暂无用户信息</div>');
                return;
            }

            // 定义用户信息字段标签映射
            const userFieldLabels = {
                id: 'ID',
                externalUserId: '用户ID',
                nickname: '昵称',
                avatarUrl: '头像URL',
                merchantId: '商户ID',
                email: '邮箱',
                openId: 'OpenID',
                deviceId: '设备ID',
                createDt: '创建时间',
                updateDt: '更新时间',
                status: '状态',
                lastLoginIp: '最后登录IP',
                isShopifyCustomer: '是否Shopify客户'
            };

            const preferredFieldOrder = [
                'externalUserId',
                'nickname',
                'email',
                'openId',
                'deviceId',
                'merchantId',
                'status',
                'isShopifyCustomer',
                'lastLoginIp',
                'avatarUrl',
                'createDt',
                'updateDt',
                'id'
            ];
            const orderedKeys = [
                ...preferredFieldOrder.filter(key => Object.prototype.hasOwnProperty.call(data, key)),
                ...Object.keys(data).filter(key => !preferredFieldOrder.includes(key))
            ];

            let html = '<div class="user-info-list">';

            orderedKeys.forEach(key => {
                const label = userFieldLabels[key] || key;
                let value = data[key];
                let valueClass = 'user-info-item-value';

                if (value === null || value === undefined) {
                    value = 'N/A';
                    valueClass += ' user-info-item-empty';
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                } else {
                    value = String(value);
                }

                html += `
                    <div class="user-info-item">
                        <div class="user-info-item-label">${label}</div>
                        <div class="${valueClass}">${escapeHtml(value)}</div>
                    </div>
                `;
            });

            html += '</div>';
            renderContentWithTransition(content, html);
        }

        function closeUserInfoPopover() {
            const popover = document.getElementById('userInfoPopover');
            const overlay = document.getElementById('popoverOverlay');
            popover.classList.remove('active');
            overlay.classList.remove('active');
            activeUserInfoTrigger = null;
        }

        // 点击遮罩层关闭悬浮窗口
        document.getElementById('popoverOverlay').addEventListener('click', closeUserInfoPopover);
        window.addEventListener('resize', () => {
            if (activeUserInfoTrigger && document.getElementById('userInfoPopover')?.classList.contains('active')) {
                positionUserInfoPopover(activeUserInfoTrigger);
            }
        });
