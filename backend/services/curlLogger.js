const fs = require('fs');
const path = require('path');
const os = require('os');

// Use a temp file for logs (cross-platform)
const LOG_PATH = process.env.CURL_LOG_PATH || path.join(os.tmpdir(), 'egram_curl_logs.txt');

function logCurlCommand(method, url, headers = {}, data = null) {
    let cmd = [`curl -X ${method.toUpperCase()}`, `'${url}'`];
    for (const [k, v] of Object.entries(headers)) {
        cmd.push(`-H '${k}: ${v}'`);
    }
    if (data) {
        let dataStr;
        if (typeof data === 'object') {
            try {
                dataStr = JSON.stringify(data);
            } catch (e) {
                dataStr = String(data);
            }
        } else {
            dataStr = String(data);
        }
        cmd.push(`--data '${dataStr.replace(/'/g, "'\''")}'`);
    }
    const curlCmd = cmd.join(' ');
    const logEntry = `[${new Date().toISOString()}] ${curlCmd}\n`;
    try {
        fs.appendFileSync(LOG_PATH, logEntry, { encoding: 'utf8' });
    } catch (e) {
        // Fallback: print to stderr
        console.error('[curlLogger] Failed to log curl command:', e);
    }
}

module.exports = { logCurlCommand }; 