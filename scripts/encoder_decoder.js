document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const encodingType = document.getElementById('encodingType');
    const encodeBtn = document.getElementById('encodeBtn');
    const decodeBtn = document.getElementById('decodeBtn');
    const copyToClipboardBtn = document.getElementById('copyToClipboardBtn');
    const copyMessage = document.getElementById('copyMessage');

    // 检查 AppConfig 是否已定义
    if (typeof AppConfig === 'undefined') {
        console.error('配置文件 config.js 未加载或加载失败!');
        // 可以在页面上显示错误提示
        outputText.value = '错误：应用配置加载失败，请检查控制台。';
        return; // 终止执行
    }

    // 通用的 API 请求函数
    async function callBackendApi(endpoint, text, type) {
        try {
            const response = await fetch(`${AppConfig.backendUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, type })
            });

            const data = await response.json();

            if (response.ok) {
                return data; // 返回后端响应的数据
            }
            else {
                // 后端返回的错误信息
                const errorMsg = data.error || '未知错误';
                console.error('后端操作失败:', endpoint, errorMsg);
                throw new Error(errorMsg); // 抛出错误以被 catch 捕获
            }
        }
        catch (e) {
            console.error('发送请求到后端时发生错误:', e);
            throw new Error(`无法连接到后端服务或请求失败: ${e.message}`);
        }
    }

    // 编码功能
    encodeBtn.addEventListener('click', async () => {
        const input = inputText.value;
        const type = encodingType.value;
        outputText.value = '正在编码...'; // 提示用户正在处理

        try {
            const data = await callBackendApi(AppConfig.apiEndpoints.encode, input, type);
            outputText.value = data.encoded_text;
        }
        catch (e) {
            outputText.value = `编码失败: ${e.message}`;
        }
    });

    // 解码功能
    decodeBtn.addEventListener('click', async () => {
        const input = inputText.value;
        const type = encodingType.value;
        outputText.value = '正在解码...'; // 提示用户正在处理

        try {
            const data = await callBackendApi(AppConfig.apiEndpoints.decode, input, type);
            outputText.value = data.decoded_text;
        }
        catch (e) {
            // 对特定错误提供更友好的提示
            let errorMessage = e.message;
            if (type === 'base64' && (errorMessage.includes('Incorrect padding') || errorMessage.includes('Non-base64 digit found'))) {
                errorMessage += '\nBase64 解码失败，请检查输入是否是有效的Base64字符串，并确保长度是4的倍数。';
            }
            else if (type === 'uri' && errorMessage.includes('Invalid URL escape "%"')) {
                errorMessage += '\nURL 解码失败，请检查输入是否是有效的URI编码字符串。';
            }
            else if (type === 'hex' && (errorMessage.includes('Invalid hexadecimal string') || errorMessage.includes('odd-length string'))) {
                errorMessage += '\nHex 解码失败，请检查输入是否是有效的偶数长度的十六进制字符串。';
            }
            else if (type === 'gbk' && (errorMessage.includes('Invalid hexadecimal string') || errorMessage.includes('odd-length string') || errorMessage.includes('invalid start byte'))) {
                errorMessage += '\nGBK 解码失败，请检查输入是否是有效的GBK十六进制字节序列。';
            }
            outputText.value = `解码失败: ${errorMessage}`;
        }
    });

    // 复制到剪贴板功能
    copyToClipboardBtn.addEventListener('click', () => {
        outputText.select();
        outputText.setSelectionRange(0, 99999);

        try {
            document.execCommand('copy');
            copyMessage.textContent = '已复制！';
            copyMessage.classList.add('show');
            setTimeout(() => {
                copyMessage.classList.remove('show');
            }, 1500);
        }
        catch (err) {
            console.error('复制失败:', err);
            copyMessage.textContent = '复制失败，请手动复制。';
            copyMessage.classList.add('show');
            setTimeout(() => {
                copyMessage.classList.remove('show');
            }, 2000);
        }
    });
});
