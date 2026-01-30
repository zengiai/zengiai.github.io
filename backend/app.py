from flask import Flask
from flask_cors import CORS

# 从api模块导入蓝图
from api.encoder_decoder import encoder_decoder_bp

app = Flask(__name__)
CORS(app)

# 注册蓝图
app.register_blueprint(encoder_decoder_bp)


@app.route('/')
def index():
    return "Welcome to the modular backend!"


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
