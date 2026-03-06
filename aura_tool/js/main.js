        // 环境域名配置
        const ENV_CONFIG = {
            sit: 'https://aipu-sit.aura-connect.ai',
            stg: 'https://aipu-stg.aura-connect.ai'
        };

        // 接口路径
        const API_PATHS = {
            fetchAllMerchant: '/aipusaasapi/test/merchant/list',
            queryMessage: '/aipusaasapi/test/selectMessageDetail',
            getAiAssistant: '/aipusaasapi/test/getAiAssistant',
            fetchMerchantInfo: '/aipusaasapi/test/fetchMerchantInfo',
            getSessionUserInfo: '/aipusaasapi/test/queryExternalUserBySession',
            queryBySessionIds: '/aipusaasapi/test/queryBySessionIds',
            getMerchantSetting: '/aipusaasapi/test/getMerchantSetting',
            discountList: '/aipusaasapi/test/discountList'
        };

        // 运行时 API 地址（按环境拼接）
        const API = {
            fetchAllMerchant: '',
            queryMessage: '',
            getAiAssistant: '',
            fetchMerchantInfo: '',
            getSessionUserInfo: '',
            queryBySessionIds: '',
            getMerchantSetting: '',
            discountList: ''
        };

        const ENV_STORAGE_KEY = 'aura_env';
        let currentEnv = 'sit';
        let currentModule = 'message';

        // 商户缓存
        let merchantList = [];

        // 当前查询消息时使用的商户ID(用于会话用户信息查询)
        let currentQueryMerchantId = null;

        // 会话详情数据缓存
        const sessionDetailsCache = new Map();

        // JSON 数据缓存(用于复制功能)
        const jsonDataCache = new Map();

        // 页面加载时初始化
        window.addEventListener('DOMContentLoaded', () => {
            initEnvSelector();
            initDateTimeInputs();
            bindMerchantEvents();
            bindModuleNavEvents();
            fetchAllMerchant();
        });

        function initDateTimeInputs() {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            document.getElementById('startTime').value = formatDateForDateTimeLocal(startOfToday);
            document.getElementById('endTime').value = formatDateForDateTimeLocal(startOfTomorrow);
        }

        function formatDateForDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
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
            API.getAiAssistant = API_PATHS.getAiAssistant ? `${baseUrl}${API_PATHS.getAiAssistant}` : '';
            API.fetchMerchantInfo = API_PATHS.fetchMerchantInfo ? `${baseUrl}${API_PATHS.fetchMerchantInfo}` : '';
            API.getSessionUserInfo = API_PATHS.getSessionUserInfo ? `${baseUrl}${API_PATHS.getSessionUserInfo}` : '';
            API.queryBySessionIds = API_PATHS.queryBySessionIds ? `${baseUrl}${API_PATHS.queryBySessionIds}` : '';
            API.getMerchantSetting = API_PATHS.getMerchantSetting ? `${baseUrl}${API_PATHS.getMerchantSetting}` : '';
            API.discountList = API_PATHS.discountList ? `${baseUrl}${API_PATHS.discountList}` : '';
        }

        function resetMerchantState() {
            merchantList = [];
            // 清除消息查询模块的商户选择
            document.getElementById('merchantInput').value = '';
            document.getElementById('merchantId').value = '';
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
            // 清空结果和错误
            document.getElementById('results').innerHTML = '';
            hideError();
        }

        function bindMerchantEvents() {
            // 消息查询模块的商户选择
            bindSingleMerchantPicker('merchantInput', 'merchantId', 'merchantDropdown');

            // 人设查询模块的商户选择
            bindSingleMerchantPicker('personaMerchantInput', 'personaMerchantId', 'personaMerchantDropdown');

            // 店铺信息查询模块的商户选择
            bindSingleMerchantPicker('merchantInfoInput', 'merchantInfoMerchantId', 'merchantInfoDropdown');
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
            const moduleCards = document.querySelectorAll('.module-card');
            moduleCards.forEach(card => {
                card.addEventListener('click', () => {
                    const module = card.getAttribute('data-module');
                    switchModule(module);
                });
            });
        }

        function switchModule(module) {
            if (module === currentModule) return;

            currentModule = module;

            // 更新导航卡片样式
            document.querySelectorAll('.module-card').forEach(card => {
                card.classList.remove('active');
                if (card.getAttribute('data-module') === module) {
                    card.classList.add('active');
                }
            });

            // 切换表单显示
            document.querySelectorAll('.module-form').forEach(form => {
                form.style.display = 'none';
            });

            const formMap = {
                'message': 'messageForm',
                'persona': 'personaForm',
                'merchant': 'merchantInfoForm'
            };

            const targetForm = document.getElementById(formMap[module]);
            if (targetForm) {
                targetForm.style.display = 'block';
            }

            // 清空结果和错误
            document.getElementById('results').innerHTML = '';
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
            // 获取所有三个模块的商户输入框
            const merchantInputs = [
                document.getElementById('merchantInput'),
                document.getElementById('personaMerchantInput'),
                document.getElementById('merchantInfoInput')
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
                showError('请先配置消息查询接口');
                return;
            }

            const startTimeStr = convertDateTimeFormat(startTimeInput);
            const endTimeStr = convertDateTimeFormat(endTimeInput);

            showLoading(true);
            hideError();

            // 保存当前商户ID，用于会话用户信息查询
            currentQueryMerchantId = merchantId;

            try {
                const params = new URLSearchParams({
                    merchantId: merchantId,
                    startTime: startTimeStr,
                    endTime: endTimeStr
                });

                if (email) {
                    params.append('email', email);
                }

                const url = `${API.queryMessage}?${params.toString()}`;
                const response = await fetch(url);
                console.log('Raw response:', response);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Response data:', data);

                const messages = data.result || [];
                displayMessages(messages);
            } catch (error) {
                console.error('Error fetching messages:', error);
                showError(`查询失败: ${error.message}`);
            } finally {
                showLoading(false);
            }
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

        // 格式化显示时间：将 T 替换为空格
        function formatDisplayTime(timeStr) {
            if (!timeStr) return 'N/A';
            return timeStr.replace('T', ' ');
        }

        function displayMessages(messages) {
            const resultsDiv = document.getElementById('results');

            if (!messages || messages.length === 0) {
                resultsDiv.innerHTML = '<p>没有找到消息数据</p>';
                return;
            }

            // 按 sessionId 分组
            const groupedMessages = {};
            messages.forEach(message => {
                const sessionId = message.sessionId;
                if (!groupedMessages[sessionId]) {
                    groupedMessages[sessionId] = [];
                }
                groupedMessages[sessionId].push(message);
            });

            // 对每组内的消息按 id 正序排列
            Object.keys(groupedMessages).forEach(sessionId => {
                groupedMessages[sessionId].sort((a, b) => {
                    const aId = a.id !== null && a.id !== undefined ? a.id : -Infinity;
                    const bId = b.id !== null && b.id !== undefined ? b.id : -Infinity;
                    return aId - bId;
                });
            });

            // 提取所有 sessionId 用于批量查询
            const sessionIds = Object.keys(groupedMessages);

            let html = '';
            Object.keys(groupedMessages).forEach(sessionId => {
                const sessionMessages = groupedMessages[sessionId];
                const firstMessage = sessionMessages[0];

                // 查找 form = CUSTOMER 的消息获取 nickname
                const customerMessage = sessionMessages.find(msg => msg.form === 'CUSTOMER');
                const displayNickname = customerMessage?.nickname || 'N/A';

                html += `
                <div class="session" data-session-id="${sessionId}">
                    <div class="session-header">
                        <span class="session-title" onclick="toggleSessionById('${sessionId}', event)">${sessionId} | ${displayNickname} | ${formatDisplayTime(firstMessage.createDt)}</span>
                        <div class="session-actions">
                            <button class="session-toggle-btn" onclick="toggleSessionById('${sessionId}', event)">▶ 展开</button>
                            <button class="user-info-btn" onclick="fetchSessionUserInfo('${sessionId}', event)">查询用户信息</button>
                        </div>
                    </div>
                    <div class="session-content" style="display: none;">
                `;

                sessionMessages.forEach(message => {
                    const hasPictures = message.pictures && Array.isArray(message.pictures) && message.pictures.length > 0;

                    let typeLabel = '';
                    if (message.senderId != null) {
                        typeLabel = '<span class="message-type-label label-user">用户</span>';
                    } else if (message.replierId != null) {
                        typeLabel = '<span class="message-type-label label-service">客服</span>';
                    }

                    html += `
                        <div class="message">
                            <div class="message-info">
                                ${typeLabel}发送时间: ${formatDisplayTime(message.createDt)} | 消息类型: ${message.type || 'N/A'}
                            </div>
                            <div class="message-content">${message.content ? message.content.replace(/\n/g, '<br>') : 'N/A'}</div>
                            ${hasPictures ? `<div class="message-pictures">${message.pictures.map(pic => `<div class="picture-item"><img src="${pic}" alt="消息图片" onclick="openModal(this.src)" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"150\" height=\"150\" viewBox=\"0 0 150 150\"><rect width=\"150\" height=\"150\" fill=\"%23f0f0f0\"/><text x=\"50%\" y=\"50%\" font-family=\"Arial\" font-size=\"14\" fill=\"%23999\" text-anchor=\"middle\">图片加载失败</text></svg>'"/></div>`).join('')}</div>` : ''}
                            ${message.extendInfo ? `<div class="message-extend-info">额外信息: ${JSON.stringify(message.extendInfo)}</div>` : ''}
                        </div>
                    `;
                });

                html += '</div></div>';
            });

            resultsDiv.innerHTML = html;

            // 自动批量查询会话详情
            if (sessionIds.length > 0) {
                fetchSessionDetails(sessionIds);
            }
        }

        function toggleSessionById(sessionId, event) {
            if (event) {
                event.stopPropagation();
            }
            const sessionEl = document.querySelector(`.session[data-session-id="${sessionId}"]`);
            if (!sessionEl) return;
            const content = sessionEl.querySelector('.session-content');
            if (!content) return;
            const isOpen = content.style.display !== 'none';
            content.style.display = isOpen ? 'none' : 'block';
            updateSessionToggleButton(sessionEl, !isOpen);
        }

        function updateSessionToggleButton(sessionEl, expanded) {
            const btn = sessionEl.querySelector('.session-toggle-btn');
            if (!btn) return;
            btn.textContent = expanded ? '▼ 收起' : '▶ 展开';
            btn.classList.toggle('expanded', expanded);
        }

        // ================== 批量查询会话详情 ==================
        async function fetchSessionDetails(sessionIds) {
            if (!sessionIds || sessionIds.length === 0) {
                return;
            }

            if (!currentQueryMerchantId) {
                console.warn('商户ID不存在，跳过会话详情查询');
                return;
            }

            if (!API.queryBySessionIds) {
                console.warn('会话详情查询接口未配置');
                return;
            }

            try {
                // 将 sessionId 转换为 Long 类型数组
                const sessionIdList = sessionIds.map(id => {
                    const num = parseInt(id);
                    return isNaN(num) ? null : num;
                }).filter(id => id !== null);

                if (sessionIdList.length === 0) {
                    console.warn('没有有效的会话ID');
                    return;
                }

                const requestBody = {
                    merchantId: currentQueryMerchantId,
                    sessionIdList: sessionIdList
                };

                console.log('批量查询会话详情，请求参数:', requestBody);

                const response = await fetch(API.queryBySessionIds, {
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
                console.log('会话详情查询结果:', data);

                const sessionDetails = data.result || data;

                if (Array.isArray(sessionDetails) && sessionDetails.length > 0) {
                    // 缓存会话详情
                    sessionDetails.forEach(detail => {
                        if (detail.sessionId) {
                            sessionDetailsCache.set(String(detail.sessionId), detail);
                        }
                    });

                    // 更新会话头部信息
                    updateSessionHeaders();
                }
            } catch (error) {
                console.error('查询会话详情失败:', error);
            }
        }

        // 更新会话头部显示会话详情
        function updateSessionHeaders() {
            const sessionElements = document.querySelectorAll('.session');

            sessionElements.forEach(sessionEl => {
                const sessionId = sessionEl.getAttribute('data-session-id');
                const detail = sessionDetailsCache.get(sessionId);

                if (detail) {
                    const titleEl = sessionEl.querySelector('.session-title');
                    if (titleEl && !titleEl.dataset.enhanced) {
                        // 标记已增强，避免重复处理
                        titleEl.dataset.enhanced = 'true';

                        // 构建会话信息展示
                        let infoHtml = `
                            <div class="session-detail-info">
                                <div class="session-detail-row">
                                    <span class="session-detail-label">会话状态:</span>
                                    <span class="session-detail-value">${detail.status || 'N/A'}</span>
                                </div>
                                ${detail.tagName ? `
                                <div class="session-detail-row">
                                    <span class="session-detail-label">标签:</span>
                                    <span class="session-detail-value">${detail.tagName}</span>
                                </div>
                                ` : ''}
                                ${detail.scene ? `
                                <div class="session-detail-row">
                                    <span class="session-detail-label">场景:</span>
                                    <span class="session-detail-value">${detail.scene}</span>
                                </div>
                                ` : ''}
                                ${detail.feedbackStatus !== null && detail.feedbackStatus !== undefined ? `
                                <div class="session-detail-row">
                                    <span class="session-detail-label">反馈状态:</span>
                                    <span class="session-detail-value">${detail.feedbackStatus}</span>
                                </div>
                                ` : ''}
                                ${detail.feedbackStatusDesc ? `
                                <div class="session-detail-row">
                                    <span class="session-detail-label">反馈状态:</span>
                                    <span class="session-detail-value">${detail.feedbackStatusDesc}</span>
                                </div>
                                ` : ''}
                                ${detail.isTurnHuman !== null && detail.isTurnHuman !== undefined ? `
                                <div class="session-detail-row">
                                    <span class="session-detail-label">转人工:</span>
                                    <span class="session-detail-value ${detail.isTurnHuman === 1 ? 'turn-human-yes' : 'turn-human-no'}">${detail.isTurnHuman === 1 ? '是' : '否'}</span>
                                </div>
                                ` : ''}
                                ${detail.lastMessage ? `
                                <div class="session-detail-row">
                                    <span class="session-detail-label">最后消息:</span>
                                    <span class="session-detail-value">${detail.lastMessage.substring(0, 100)}${detail.lastMessage.length > 100 ? '...' : ''}</span>
                                </div>
                                ` : ''}
                            </div>
                        `;

                        // 在会话头部后面插入会话详情
                        const headerEl = sessionEl.querySelector('.session-header');
                        if (headerEl) {
                            const detailDiv = document.createElement('div');
                            detailDiv.className = 'session-detail-container';
                            detailDiv.innerHTML = infoHtml;
                            headerEl.insertAdjacentElement('afterend', detailDiv);
                        }
                    }
                }
            });
        }

        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';

            // 更新当前模块的按钮状态
            const buttonMap = {
                'message': document.querySelector('#messageForm button'),
                'persona': document.querySelector('#personaForm button'),
                'merchant': document.querySelector('#merchantInfoForm button')
            };

            const btn = buttonMap[currentModule];
            if (btn) {
                if (show) {
                    btn.classList.add('loading-btn');
                    btn.dataset.originalText = btn.innerText;
                    btn.innerText = '查询中...';
                } else {
                    btn.classList.remove('loading-btn');
                    btn.innerText = btn.dataset.originalText || '查询';
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
            modal.style.display = 'block';
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
                resultsDiv.innerHTML = '<p>没有找到人设数据</p>';
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

            resultsDiv.innerHTML = html;
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
                resultsDiv.innerHTML = '<p>没有找到店铺信息</p>';
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

            let html = `
                <div class="info-card">
                    <div class="info-card-header">店铺数据信息</div>
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

            resultsDiv.innerHTML = html;
        }

        // 商户设置字段中文映射（完整版）
        const SETTING_LABELS = {
            // 基础信息
            merchantId: '商户ID',
            language: '语言设置',
            theme: '主题设置',
            timezone: '时区',
            currency: '货币',
            country: '国家/地区',
            createdAt: '创建时间',
            updatedAt: '更新时间',

            // AI功能开关
            aiReplySwitch: 'AI回复开关',
            aiEnabled: 'AI功能启用',
            faqSwitch: 'FAQ开关',
            autoReplySwitch: '自动回复开关',
            smartReply: '智能回复',
            useGPT: '使用GPT模型',

            // 通知开关
            notificationSwitch: '通知开关',
            emailNotification: '邮件通知',
            smsNotification: '短信通知',
            pushNotification: '推送通知',
            orderNotification: '订单通知',
            messageNotification: '消息通知',

            // 转人工设置
            turnToManualSetting: '转人工设置',
            autoTransfer: '自动转人工',
            transferTimeout: '转人工超时时间',
            manualTriggerKeywords: '转人工触发关键词',
            maxRetryCount: '最大重试次数',

            // 欢迎语配置
            welcomeMessage: '欢迎语配置',
            enabled: '是否启用',
            content: '内容',
            title: '标题',
            type: '类型',
            delay: '延迟时间',

            // 快捷回复配置
            quickReplies: '快捷回复配置',
            replies: '回复列表',
            keyword: '关键词',
            response: '回复内容',
            category: '分类',

            // 工作时间设置
            workingHours: '工作时间设置',
            workStartTime: '工作开始时间',
            workEndTime: '工作结束时间',
            workDays: '工作日',
            nonWorkdayAutoReply: '非工作日自动回复',

            // 机器人形象设置
            botAppearance: '机器人形象设置',
            avatar: '头像',
            name: '名称',
            greeting: '问候语',
            personality: '性格设置',

            // 知识库设置
            knowledgeBase: '知识库设置',
            kbEnabled: '知识库启用',
            kbSources: '知识来源',
            faqCategories: 'FAQ分类',
            autoLearn: '自动学习',

            // 数据分析设置
            analytics: '数据分析设置',
            dataCollection: '数据收集',
            reportFrequency: '报告频率',
            metricsEnabled: '指标监控启用',

            // 安全设置
            security: '安全设置',
            dataEncryption: '数据加密',
            accessControl: '访问控制',
            ipWhitelist: 'IP白名单',
            sessionTimeout: '会话超时时间'
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

            const sectionId = 'setting-section-' + Date.now();

            let html = `
                <div class="info-card">
                    <div class="info-card-header collapsible" onclick="toggleSettingSection('${sectionId}')">
                        <span>⚙️ 商户设置</span>
                        <span class="collapse-icon" id="${sectionId}-icon">▼</span>
                    </div>
                    <div class="info-card-body collapsible-content expanded" id="${sectionId}">
            `;

            // 递归渲染所有配置项
            html += renderSettingTree(settingData, 0);

            html += `
                    </div>
                </div>
            `;

            return html;
        }

        // 递归渲染设置树
        function renderSettingTree(data, depth) {
            if (data === null || data === undefined) {
                return `<span class="setting-null">未设置</span>`;
            }

            if (typeof data === 'boolean') {
                return renderBooleanSwitch(data);
            }

            if (typeof data !== 'object') {
                return `<span class="setting-value">${escapeHtml(String(data))}</span>`;
            }

            if (Array.isArray(data)) {
                if (data.length === 0) {
                    return `<span class="setting-empty">空数组 []</span>`;
                }
                return renderSettingArray(data, depth);
            }

            // 对象类型
            const entries = Object.entries(data);
            if (entries.length === 0) {
                return `<span class="setting-empty">空对象 {}</span>`;
            }

            return renderSettingObject(entries, depth);
        }

        // 渲染 Boolean 滑动开关
        function renderBooleanSwitch(value) {
            return `
                <label class="tree-toggle-switch">
                    <input type="checkbox" ${value ? 'checked' : ''} disabled>
                    <span class="tree-toggle-slider"></span>
                    <span class="tree-toggle-label">${value ? '是' : '否'}</span>
                </label>
            `;
        }

        // 渲染数组
        function renderSettingArray(arr, depth) {
            const isSimpleArray = arr.every(item => typeof item !== 'object');

            if (isSimpleArray && arr.length <= 5) {
                // 简单数组直接展示
                return `<span class="setting-array-simple">[${arr.map(v => escapeHtml(String(v))).join(', ')}]</span>`;
            }

            const listId = 'setting-list-' + Math.random().toString(36).substr(2, 9);
            const indent = depth * 20;

            let html = `<div class="setting-array-container" style="margin-left:${indent}px">`;
            html += `<div class="setting-array-header" onclick="toggleSettingItem('${listId}', event)">`;
            html += `<span class="toggle-btn" id="${listId}-btn">▼</span>`;
            html += `<span class="array-label">数组 [${arr.length}项]</span>`;
            html += `</div>`;
            html += `<div class="setting-array-content expanded" id="${listId}">`;

            arr.forEach((item, index) => {
                html += `<div class="setting-array-item">`;
                html += `<span class="array-index">[${index}]</span>`;
                html += renderSettingTree(item, depth + 1);
                html += `</div>`;
            });

            html += `</div></div>`;
            return html;
        }

        // 渲染对象
        function renderSettingObject(entries, depth) {
            const objId = 'setting-obj-' + Math.random().toString(36).substr(2, 9);
            const indent = depth * 20;
            const isRoot = depth === 0;

            let html = '';

            if (!isRoot) {
                html += `<div class="setting-object-container" style="margin-left:${indent}px">`;
                html += `<div class="setting-object-header" onclick="toggleSettingItem('${objId}', event)">`;
                html += `<span class="toggle-btn" id="${objId}-btn">▼</span>`;
                html += `</div>`;
                html += `<div class="setting-object-content expanded" id="${objId}">`;
            }

            // 先渲染 Boolean 类型的开关（放在前面醒目位置）
            const boolEntries = entries.filter(([_, v]) => typeof v === 'boolean');
            const otherEntries = entries.filter(([_, v]) => typeof v !== 'boolean');

            // 如果有多个布尔值，用网格布局
            if (boolEntries.length > 1) {
                html += `<div class="setting-bool-grid">`;
                boolEntries.forEach(([key, value]) => {
                    const label = getSettingLabel(key);
                    html += `
                        <div class="setting-bool-item">
                            <span class="setting-key" title="${key}">${label}</span>
                            ${renderBooleanSwitch(value)}
                        </div>
                    `;
                });
                html += `</div>`;
            } else if (boolEntries.length === 1) {
                const [key, value] = boolEntries[0];
                const label = getSettingLabel(key);
                html += `
                    <div class="setting-row">
                        <span class="setting-key" title="${key}">${label}</span>
                        ${renderBooleanSwitch(value)}
                    </div>
                `;
            }

            // 渲染其他类型
            otherEntries.forEach(([key, value]) => {
                const label = getSettingLabel(key);

                if (value !== null && typeof value === 'object') {
                    // 嵌套对象/数组
                    const nestedId = 'setting-nested-' + Math.random().toString(36).substr(2, 9);
                    html += `
                        <div class="setting-nested-container">
                            <div class="setting-nested-header" onclick="toggleSettingItem('${nestedId}', event)">
                                <span class="toggle-btn" id="${nestedId}-btn">▼</span>
                                <span class="setting-key" title="${key}">${label}</span>
                                <span class="nested-type">${Array.isArray(value) ? `[${value.length}]` : '{...}'}</span>
                            </div>
                            <div class="setting-nested-content expanded" id="${nestedId}">
                                ${renderSettingTree(value, depth + 1)}
                            </div>
                        </div>
                    `;
                } else {
                    // 基础类型
                    html += `
                        <div class="setting-row">
                            <span class="setting-key" title="${key}">${label}</span>
                            <span class="setting-value-wrapper">${renderSettingTree(value, depth + 1)}</span>
                        </div>
                    `;
                }
            });

            if (!isRoot) {
                html += `</div></div>`;
            }

            return html;
        }

        // 获取中文标签
        function getSettingLabel(key) {
            return SETTING_LABELS[key] || formatFieldName(key);
        }

        // 格式化字段名（驼峰转空格）
        function formatFieldName(key) {
            if (!key) return '';
            // 将驼峰命名转换为带空格的中文风格
            return key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
        }

        // HTML 转义
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // 切换设置区块折叠状态
        window.toggleSettingSection = function(sectionId) {
            const content = document.getElementById(sectionId);
            const icon = document.getElementById(sectionId + '-icon');
            if (content && icon) {
                content.classList.toggle('expanded');
                content.classList.toggle('collapsed');
                icon.textContent = content.classList.contains('expanded') ? '▼' : '▶';
            }
        };

        // 切换设置项折叠状态
        window.toggleSettingItem = function(itemId, event) {
            if (event) {
                event.stopPropagation();
            }
            const content = document.getElementById(itemId);
            const btn = document.getElementById(itemId + '-btn');
            if (content && btn) {
                content.classList.toggle('expanded');
                content.classList.toggle('collapsed');
                btn.textContent = content.classList.contains('expanded') ? '▼' : '▶';
            }
        };

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

        // ================== 会话用户信息查询 ==================
        async function fetchSessionUserInfo(sessionId, event) {
            event.stopPropagation(); // 阻止事件冒泡，避免触发会话展开/收起

            if (!sessionId) {
                alert('会话ID不能为空');
                return;
            }

            if (!currentQueryMerchantId) {
                alert('商户ID不存在，请重新查询消息');
                return;
            }

            // 显示悬浮窗口
            const popover = document.getElementById('userInfoPopover');
            const overlay = document.getElementById('popoverOverlay');
            const content = document.getElementById('popoverContent');

            // 计算悬浮窗口位置（相对于点击按钮）
            const btnRect = event.target.getBoundingClientRect();
            const popoverWidth = 360;
            const popoverHeight = 300;
            let left = btnRect.left;
            let top = btnRect.bottom + 8;

            // 确保不超出视口右边
            if (left + popoverWidth > window.innerWidth) {
                left = window.innerWidth - popoverWidth - 16;
            }
            // 确保不超出视口下边
            if (top + popoverHeight > window.innerHeight) {
                top = btnRect.top - popoverHeight - 8;
            }

            popover.style.left = `${Math.max(8, left)}px`;
            popover.style.top = `${Math.max(8, top)}px`;
            popover.classList.add('active');
            overlay.classList.add('active');

            // 显示加载状态
            content.innerHTML = '<div class="popover-loading">加载中...</div>';

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
                content.innerHTML = `<div class="popover-error">查询失败: ${error.message}</div>`;
            }
        }

        function displayUserInfoInPopover(data) {
            const content = document.getElementById('popoverContent');

            if (!data || Object.keys(data).length === 0) {
                content.innerHTML = '<div class="popover-error">暂无用户信息</div>';
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

            let html = '<div class="user-info-grid">';

            Object.keys(data).forEach(key => {
                const label = userFieldLabels[key] || key;
                let value = data[key];

                if (value === null || value === undefined) {
                    value = 'N/A';
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }

                html += `
                    <div class="user-info-item">
                        <div class="user-info-item-label">${label}</div>
                        <div class="user-info-item-value">${value}</div>
                    </div>
                `;
            });

            html += '</div>';
            content.innerHTML = html;
        }

        function closeUserInfoPopover() {
            const popover = document.getElementById('userInfoPopover');
            const overlay = document.getElementById('popoverOverlay');
            popover.classList.remove('active');
            overlay.classList.remove('active');
        }

        // 点击遮罩层关闭悬浮窗口
        document.getElementById('popoverOverlay').addEventListener('click', closeUserInfoPopover);
