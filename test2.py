
import json
with open('data/stocks.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
s = data['stocks'][0]
print('historical count:', len(s.get('historical', [])))
print('first 3:', s.get('historical', [])[:3])
print('last 3:', s.get('historical', [])[-3:])
