import http.server
import socketserver
import urllib.parse
import json
import yfinance as yf
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class TadawulHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)

        if parsed_path.path == '/api/quote':
            query = urllib.parse.parse_qs(parsed_path.query)
            symbol = query.get('symbol', [''])[0]

            if not symbol:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Symbol is required"}')
                return

            # yfinance uses .SR for Saudi Arabia
            yf_symbol = f"{symbol}.SR"
            try:
                ticker = yf.Ticker(yf_symbol)
                # We use fast_info or info to get quick price
                info = ticker.fast_info

                # Extract last price and previous close
                last_price = info.get('lastPrice', 0)
                prev_close = info.get('previousClose', 0)

                if last_price == 0 and 'currentPrice' in ticker.info:
                    last_price = ticker.info['currentPrice']
                    prev_close = ticker.info['previousClose']

                response_data = {
                    "symbol": symbol,
                    "price": last_price,
                    "prevClose": prev_close,
                    "change": last_price - prev_close,
                    "changePercent": ((last_price - prev_close) / prev_close * 100) if prev_close else 0
                }

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        if parsed_path.path == '/api/stocks':
            try:
                db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../database/stocks.json')
                with open(db_path, 'r', encoding='utf-8') as f:
                    data = f.read()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data.encode('utf-8'))
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'{"error": "Database not found"}')
            return

        return super().do_GET()

# Change to the directory containing index.html (frontend)
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend')
os.chdir(frontend_dir)

with socketserver.TCPServer(("", PORT), TadawulHandler) as httpd:
    print(f"Serving at port {PORT} from {frontend_dir}")
    httpd.serve_forever()
