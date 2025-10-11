from flask import Blueprint, request, jsonify
import base64
import urllib.parse
import html

encoder_decoder_bp = Blueprint('encoder_decoder_bp', __name__)


@encoder_decoder_bp.route('/encode', methods=['POST'])
def encode_string():
    """
    编码字符串的API端点。
    支持 Base64, URL encoding, Hex, HTML Entity, GBK。
    """
    data = request.get_json()
    if not data or 'text' not in data or 'type' not in data:
        return jsonify({"error": "Missing 'text' or 'type' in request body"}), 400

    text = data['text']
    encode_type = data['type']
    result = ""

    try:
        if encode_type == 'base64':
            result = base64.b64encode(text.encode('utf-8')).decode('utf-8')
        elif encode_type == 'uri':
            result = urllib.parse.quote(text, safe='')
        elif encode_type == 'hex':
            # Hex 编码直接是 UTF-8 字节的十六进制表示
            result = text.encode('utf-8').hex()
        elif encode_type == 'html':
            result = html.escape(text)
        elif encode_type == 'gbk':  # 新增 GBK 编码逻辑
            # GBK 编码，然后转换为十六进制字符串表示，以便前端显示
            result = text.encode('gbk').hex()
        else:
            return jsonify({"error": "Unsupported encoding type"}), 400

        return jsonify({"encoded_text": result}), 200
    except (UnicodeEncodeError, ValueError) as e:
        return jsonify({"error": f"Encoding failed for '{encode_type}': {str(e)}. "
                                 "Check if characters can be encoded in the selected format."}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred during encoding: {str(e)}"}), 500


@encoder_decoder_bp.route('/decode', methods=['POST'])
def decode_string():
    """
    解码字符串的API端点。
    支持 Base64, URL decoding, Hex, HTML Entity, GBK。
    """
    data = request.get_json()
    if not data or 'text' not in data or 'type' not in data:
        return jsonify({"error": "Missing 'text' or 'type' in request body"}), 400

    text = data['text']
    decode_type = data['type']
    result = ""

    try:
        if decode_type == 'base64':
            result = base64.b64decode(text).decode('utf-8')
        elif decode_type == 'uri':
            result = urllib.parse.unquote(text)
        elif decode_type == 'hex':
            if not all(c in '0123456789abcdefABCDEF' for c in text) or len(text) % 2 != 0:
                raise ValueError("Invalid hexadecimal string format for decoding.")
            result = bytes.fromhex(text).decode('utf-8')
        elif decode_type == 'html':
            result = html.unescape(text)
        elif decode_type == 'gbk':  # 新增 GBK 解码逻辑
            # GBK 解码，输入预期为十六进制字符串，先转为 bytes
            if not all(c in '0123456789abcdefABCDEF' for c in text) or len(text) % 2 != 0:
                raise ValueError("Invalid hexadecimal string format for GBK decoding.")
            result = bytes.fromhex(text).decode('gbk')
        else:
            return jsonify({"error": "Unsupported decoding type"}), 400

        return jsonify({"decoded_text": result}), 200
    except (ValueError, UnicodeDecodeError, base64.binascii.Error) as e:
        # 捕获特定于解码的错误，包括针对GBK的错误
        return jsonify({"error": f"Decoding failed for '{decode_type}': {str(e)}. "
                                 "Please check input format and type."}), 400
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred during decoding: {str(e)}"}), 500
