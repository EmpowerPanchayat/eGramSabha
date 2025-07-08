import os
import shlex
from datetime import datetime

# Use a temp file for logs (adjust path for Windows if needed)
LOG_PATH = os.environ.get('CURL_LOG_PATH', '/tmp/llm_curl_logs.txt')

def log_curl_command(method, url, headers=None, data=None):
    """
    Logs a curl command equivalent to the HTTP request.
    """
    cmd = ["curl", "-X", method.upper(), shlex.quote(url)]
    if headers:
        for k, v in headers.items():
            cmd.extend(["-H", shlex.quote(f"{k}: {v}")])
    if data:
        if isinstance(data, (dict, list)):
            import json
            data_str = json.dumps(data, ensure_ascii=False)
        else:
            data_str = str(data)
        cmd.extend(["--data", shlex.quote(data_str)])
    # Compose the command string
    curl_cmd = ' '.join(cmd)
    # Add timestamp
    log_entry = f"[{datetime.now().isoformat()}] {curl_cmd}\n"
    # Write to log file
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(log_entry)
    except Exception as e:
        # Fallback: print to stderr
        print(f"[curl_logger] Failed to log curl command: {e}") 