document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const encodingType = document.getElementById('encodingType');
    const encodeBtn = document.getElementById('encodeBtn');
    const decodeBtn = document.getElementById('decodeBtn');
    const copyToClipboardBtn = document.getElementById('copyToClipboardBtn');
    const copyMessage = document.getElementById('copyMessage');

    // !!! 请根据您的后端服务实际部署地址进行修改 !!!
    // 如果您的后端运行在本地 5000 端口，或者通过 Nginx 代理在 /api 路径下
    const API_BASE_URL = 'http://127.0.0.1:5000';
    // 例如，如果通过 Nginx 代理到 /api，且前端和后端在同一域名，可以是 '/api'
    // const API_BASE_URL = '/api';

    // 通用的 API 请求函数
    async function callBackendApi(endpoint, text, type) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, type })
            });

            const data = await response.json();

            if (response.ok) {
                return data; // 返回后端响应的数据
            } else {
                // 后端返回的错误信息
                const errorMsg = data.error || '未知错误';
                console.error('后端操作失败:', endpoint, errorMsg);
                throw new Error(errorMsg); // 抛出错误以被 catch 捕获
            }
        } catch (e) {
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
            const data = await callBackendApi('/encode', input, type);
            outputText.value = data.encoded_text;
        } catch (e) {
            outputText.value = `编码失败: ${e.message}`;
        }
    });

    // 解码功能
    decodeBtn.addEventListener('click', async () => {
        const input = inputText.value;
        const type = encodingType.value;
        outputText.value = '正在解码...'; // 提示用户正在处理

        try {
            const data = await callBackendApi('/decode', input, type);
            outputText.value = data.decoded_text;
        } catch (e) {
            // 对特定错误提供更友好的提示
            let errorMessage = e.message;
            if (type === 'base64' && (errorMessage.includes('Incorrect padding') || errorMessage.includes('Non-base64 digit found'))) {
                errorMessage += '\nBase64 解码失败，请检查输入是否是有效的Base64字符串，并确保长度是4的倍数。';
            } else if (type === 'uri' && errorMessage.includes('Invalid URL escape "%"')) {
                errorMessage += '\nURL 解码失败，请检查输入是否是有效的URI编码字符串。';
            } else if (type === 'hex' && (errorMessage.includes('Invalid hexadecimal string') || errorMessage.includes('odd-length string'))) {
                errorMessage += '\nHex 解码失败，请检查输入是否是有效的偶数长度的十六进制字符串。';
            } else if (type === 'gbk' && (errorMessage.includes('Invalid hexadecimal string') || errorMessage.includes('odd-length string') || errorMessage.includes('invalid start byte'))) {
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
        } catch (err) {
            console.error('复制失败:', err);
            copyMessage.textContent = '复制失败，请手动复制。';
            copyMessage.classList.add('show');
            setTimeout(() => {
                copyMessage.classList.remove('show');
            }, 2000);
        }
    });
});