const AppConfig = {
    // 后端服务的根地址
    // 在开发环境中，这通常是 'http://127.0.0.1:5000'
    // 在生产环境中，如果前端和后端部署在同一个域名下，这可能是一个相对路径，例如 '/api'
    backendUrl: 'http://127.0.0.1:5000',

    // API 端点列表
    // 将所有接口路径集中管理，方便修改和扩展
    apiEndpoints: {
        // 编码/解码工具的端点
        encode: '/encode',
        decode: '/decode',

        // 以后可以在这里为新工具添加更多端点
        // 例如: getChartData: '/charts/data'
    }
};
