import json

with open('data/stocks.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('آخر تحديث:', data['lastUpdated'])
print('عدد الأسهم:', data['totalStocks'])
print('فشل:', data['failed'])

# أول سهم
if data['stocks']:
    s = data['stocks'][0]
    print('\nأول سهم:', s['name'])
    print('السعر:', s['price'])
    print('PE:', s['pe'])
    print('EPS:', s['eps'])