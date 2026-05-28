import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import time
import re
import os
from datetime import datetime

# ==========================================
# إعداد المتصفح
# ==========================================
def setup_driver():
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

# ==========================================
# قائمة الأسهم المستهدفة
# ==========================================
STOCKS = [
    {'code': '2222', 'name': 'أرامكو السعودية', 'sector': 'energy'},
    {'code': '1120', 'name': 'مصرف الراجحي', 'sector': 'banking'},
    {'code': '1180', 'name': 'البنك الأهلي', 'sector': 'banking'},
    {'code': '7010', 'name': 'stc الاتصالات', 'sector': 'telecom'},
    {'code': '4003', 'name': 'اتحاد الاتصالات', 'sector': 'telecom'},
    {'code': '2010', 'name': 'سابك', 'sector': 'energy'},
    {'code': '4061', 'name': 'العثيم', 'sector': 'retail'},
    {'code': '4240', 'name': 'دله البركة', 'sector': 'health'},
    {'code': '1010', 'name': 'بنك الرياض', 'sector': 'banking'},
    {'code': '4007', 'name': 'نادك', 'sector': 'telecom'},
    {'code': '1090', 'name': 'بنك سامبا', 'sector': 'banking'},
    {'code': '1060', 'name': 'ساب', 'sector': 'banking'},
    {'code': '1140', 'name': 'بنك البلاد', 'sector': 'banking'},
    {'code': '1020', 'name': 'بنك الجزيرة', 'sector': 'banking'},
    {'code': '1150', 'name': 'بنك الإنماء', 'sector': 'banking'},
    {'code': '4190', 'name': 'جرير للتسويق', 'sector': 'retail'},
    {'code': '4161', 'name': 'بن داود التجارية', 'sector': 'retail'},
    {'code': '8010', 'name': 'التعاونية للتأمين', 'sector': 'insurance'},
    {'code': '8150', 'name': 'بوبا العربية للتأمين', 'sector': 'insurance'},
    {'code': '8030', 'name': 'ميلاء للتأمين', 'sector': 'insurance'},
    {'code': '4300', 'name': 'دار الأركان', 'sector': 'realestate'},
    {'code': '4280', 'name': 'المملكة القابضة', 'sector': 'realestate'},
    {'code': '2270', 'name': 'المراعي', 'sector': 'industrial'},
    {'code': '2290', 'name': 'يانساب', 'sector': 'energy'},
    {'code': '9200', 'name': 'تداول السعودية', 'sector': 'financial'},
]

# ==========================================
# سحب بيانات سهم واحد من أرقامي
# ==========================================
def scrape_stock(driver, stock_code):
    url = f"https://www.argaam.com/ar/company/companyoverview/marketid/3/companyid/{stock_code}"
    
    try:
        print(f"  جاري سحب بيانات {stock_code}...")
        driver.get(url)
        
        # انتظر تحميل الصفحة
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(3)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        data = {}

        # ===== السعر الحالي =====
        try:
            price_el = soup.find('span', {'class': re.compile(r'price|last-price|current', re.I)})
            if not price_el:
                price_el = soup.find('td', string=re.compile(r'السعر الحالي|آخر سعر'))
                if price_el:
                    price_el = price_el.find_next_sibling('td')
            data['price'] = float(re.sub(r'[^\d.]', '', price_el.text.strip())) if price_el else 0.0
        except:
            data['price'] = 0.0

        # ===== التغير =====
        try:
            change_el = soup.find('span', {'class': re.compile(r'change|percent', re.I)})
            change_text = change_el.text.strip() if change_el else '0'
            change_val = float(re.sub(r'[^\d.\-]', '', change_text))
            data['change'] = change_val
            data['changeAbs'] = change_val
            data['up'] = change_val >= 0
        except:
            data['change'] = 0.0
            data['changeAbs'] = 0.0
            data['up'] = True

        # ===== البيانات الأساسية =====
        rows = soup.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 2:
                label = cells[0].text.strip()
                value = cells[1].text.strip()

                if 'الإغلاق السابق' in label or 'إغلاق أمس' in label:
                    try:
                        data['prevClose'] = float(re.sub(r'[^\d.]', '', value))
                    except:
                        data['prevClose'] = data.get('price', 0.0)

                elif 'الافتتاح' in label or 'سعر الافتتاح' in label:
                    try:
                        data['open'] = float(re.sub(r'[^\d.]', '', value))
                    except:
                        data['open'] = data.get('price', 0.0)

                elif 'أعلى' in label and ('يوم' in label or 'اليوم' in label):
                    try:
                        data['dayHigh'] = float(re.sub(r'[^\d.]', '', value))
                    except:
                        data['dayHigh'] = data.get('price', 0.0)

                elif 'أدنى' in label and ('يوم' in label or 'اليوم' in label):
                    try:
                        data['dayLow'] = float(re.sub(r'[^\d.]', '', value))
                    except:
                        data['dayLow'] = data.get('price', 0.0)

                elif 'أعلى' in label and '52' in label:
                    try:
                        data['high52'] = float(re.sub(r'[^\d.]', '', value))
                    except:
                        data['high52'] = 0.0

                elif 'أدنى' in label and '52' in label:
                    try:
                        data['low52'] = float(re.sub(r'[^\d.]', '', value))
                    except:
                        data['low52'] = 0.0

                elif 'القيمة السوقية' in label:
                    data['market'] = value

                elif 'مضاعف الربحية' in label or 'P/E' in label:
                    data['pe'] = value

                elif 'عائد التوزيعات' in label or 'توزيعات' in label:
                    data['div'] = value

                elif 'ربحية السهم' in label or 'EPS' in label:
                    try:
                        data['eps'] = float(re.sub(r'[^\d.\-]', '', value))
                    except:
                        data['eps'] = 0.0

                elif 'مضاعف القيمة الدفترية' in label or 'P/BV' in label:
                    data['pbv'] = value

                elif 'العائد على حقوق' in label or 'ROE' in label:
                    data['roe'] = value

                elif 'حجم التداول' in label or 'الحجم' in label:
                    data['vol'] = value

                elif 'عدد الأسهم' in label:
                    data['shares'] = value

        # قيم افتراضية للحقول المفقودة
        defaults = {
            'prevClose': data.get('price', 0.0),
            'open': data.get('price', 0.0),
            'dayHigh': data.get('price', 0.0),
            'dayLow': data.get('price', 0.0),
            'high52': data.get('price', 0.0),
            'low52': data.get('price', 0.0),
            'market': 'غير متاح',
            'pe': 'غير متاح',
            'div': 'غير متاح',
            'eps': 0.0,
            'pbv': 'غير متاح',
            'roe': 'غير متاح',
            'vol': 'غير متاح',
            'shares': 'غير متاح',
        }
        for key, val in defaults.items():
            if key not in data:
                data[key] = val

        print(f"  ✅ {stock_code} — السعر: {data.get('price', 0)}")
        return data

    except Exception as e:
        print(f"  ❌ خطأ في {stock_code}: {e}")
        return None

# ==========================================
# سحب الإعلانات
# ==========================================
def scrape_announcements(driver, stock_code):
    url = f"https://www.argaam.com/ar/company/announcements/marketid/3/companyid/{stock_code}"
    announcements = []
    
    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        items = soup.find_all('div', {'class': re.compile(r'announcement|news-item|item', re.I)})[:5]
        
        ann_types = ['توزيعات', 'نتائج', 'عقد', 'تحديث', 'أحداث']
        
        for i, item in enumerate(items):
            title_el = item.find(['h3', 'h4', 'a', 'span'], {'class': re.compile(r'title|heading', re.I)})
            date_el = item.find(['span', 'div'], {'class': re.compile(r'date|time', re.I)})
            desc_el = item.find(['p', 'div'], {'class': re.compile(r'desc|summary|content', re.I)})
            
            announcements.append({
                'date': date_el.text.strip() if date_el else datetime.now().strftime('%d %B %Y'),
                'type': ann_types[i % len(ann_types)],
                'title': title_el.text.strip() if title_el else 'إعلان شركة',
                'desc': desc_el.text.strip() if desc_el else 'تفاصيل الإعلان متاحة على موقع تداول الرسمي.'
            })
    except Exception as e:
        print(f"  ⚠️ إعلانات {stock_code}: {e}")
    
    return announcements if announcements else [
        {
            'date': datetime.now().strftime('%d %B %Y'),
            'type': 'تحديث',
            'title': 'تحديث بيانات الشركة',
            'desc': 'تم تحديث بيانات الشركة. للمزيد يرجى زيارة موقع تداول الرسمي.'
        }
    ]

# ==========================================
# سحب البيانات المالية
# ==========================================
def scrape_financials(driver, stock_code):
    url = f"https://www.argaam.com/ar/company/financialstatements/marketid/3/companyid/{stock_code}"
    financials = {
        'years': ['2023', '2022', '2021', '2020'],
        'revenue': ['0', '0', '0', '0'],
        'netIncome': ['0', '0', '0', '0'],
        'totalAssets': 'غير متاح',
        'totalDebt': 'غير متاح',
        'equity': 'غير متاح',
        'dividendHistory': []
    }
    
    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    label = cells[0].text.strip()
                    
                    if 'إيرادات' in label or 'مبيعات' in label:
                        financials['revenue'] = [
                            re.sub(r'[^\d.]', '', c.text.strip()) or '0'
                            for c in cells[1:5]
                        ]
                    
                    elif 'صافي' in label and ('دخل' in label or 'ربح' in label):
                        financials['netIncome'] = [
                            re.sub(r'[^\d.]', '', c.text.strip()) or '0'
                            for c in cells[1:5]
                        ]
                    
                    elif 'إجمالي الأصول' in label:
                        financials['totalAssets'] = cells[1].text.strip()
                    
                    elif 'إجمالي الديون' in label or 'الديون' in label:
                        financials['totalDebt'] = cells[1].text.strip()
                    
                    elif 'حقوق' in label and 'ملاك' in label:
                        financials['equity'] = cells[1].text.strip()

    except Exception as e:
        print(f"  ⚠️ بيانات مالية {stock_code}: {e}")
    
    return financials

# ==========================================
# سحب توزيعات الأرباح
# ==========================================
def scrape_dividends(driver, stock_code):
    url = f"https://www.argaam.com/ar/company/dividends/marketid/3/companyid/{stock_code}"
    dividends = []
    
    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        rows = soup.find_all('tr')[1:6]
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 3:
                dividends.append({
                    'period': cells[0].text.strip() if cells[0] else '',
                    'amount': cells[1].text.strip() + ' ر.س' if cells[1] else '0 ر.س',
                    'date': cells[2].text.strip() if cells[2] else '',
                    'yield': cells[3].text.strip() if len(cells) > 3 else '0%'
                })
    except Exception as e:
        print(f"  ⚠️ توزيعات {stock_code}: {e}")
    
    return dividends

# ==========================================
# تجميع بيانات سهم كامل
# ==========================================
def build_stock_data(driver, stock_info):
    code = stock_info['code']
    
    # البيانات الأساسية
    basic = scrape_stock(driver, code)
    if not basic:
        return None
    
    # البيانات المالية
    print(f"  📊 جاري سحب البيانات المالية...")
    financials = scrape_financials(driver, code)
    
    # التوزيعات
    print(f"  💰 جاري سحب التوزيعات...")
    dividends = scrape_dividends(driver, code)
    financials['dividendHistory'] = dividends
    
    # الإعلانات
    print(f"  📣 جاري سحب الإعلانات...")
    announcements = scrape_announcements(driver, code)
    
    # تجميع البيانات الكاملة
    stock_data = {
        **stock_info,
        **basic,
        'financials': financials,
        'announcements': announcements,
        'upcomingEvents': [],
        'boardMembers': [],
        'majorShareholders': [],
        'subsidiaries': [],
        'peers': [],
        # معلومات ثابتة تُحدَّث يدوياً
        'isin': '',
        'exchange': 'تداول',
        'listingDate': '',
        'foundDate': '',
        'foundPlace': '',
        'fiscalYearEnd': '31 ديسمبر',
        'auditor': '',
        'employees': '',
        'irContact': '',
        'irOfficer': '',
        'irPhone': '',
        'address': '',
        'website': '',
        'desc': '',
        'sector_ar': '',
        'divAmount': 0.0,
    }
    
    return stock_data

# ==========================================
# الدالة الرئيسية
# ==========================================
def main():
    print("=" * 50)
    print("🚀 تداول ذكي — سكريبت تحديث البيانات")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    driver = setup_driver()
    all_stocks = []
    failed = []
    
    try:
        for i, stock in enumerate(STOCKS):
            print(f"\n[{i+1}/{len(STOCKS)}] معالجة سهم: {stock['name']} ({stock['code']})")
            
            stock_data = build_stock_data(driver, stock)
            
            if stock_data:
                all_stocks.append(stock_data)
            else:
                failed.append(stock['code'])
            
            # انتظار بين كل سهم لتجنب الحظر
            time.sleep(2)
    
    finally:
        driver.quit()
    
    # حفظ النتائج
    output = {
        'lastUpdated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'totalStocks': len(all_stocks),
        'failed': failed,
        'stocks': all_stocks
    }
    
    # حفظ كـ JSON
    os.makedirs('data', exist_ok=True)
    with open('data/stocks.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 50)
    print(f"✅ تم بنجاح: {len(all_stocks)} سهم")
    if failed:
        print(f"❌ فشل: {failed}")
    print(f"📁 تم الحفظ في: data/stocks.json")
    print("=" * 50)

if __name__ == '__main__':
    main()
