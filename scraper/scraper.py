import yfinance as yf
import json
import os
import time
from datetime import datetime

# ==========================================
# قائمة الأسهم السعودية
# ==========================================
STOCKS = [
    {'code': '2222', 'ticker': '2222.SR', 'name': 'أرامكو السعودية',    'sector': 'energy',      'sector_ar': 'الطاقة'},
    {'code': '1120', 'ticker': '1120.SR', 'name': 'مصرف الراجحي',       'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '1180', 'ticker': '1180.SR', 'name': 'البنك الأهلي',        'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '7010', 'ticker': '7010.SR', 'name': 'stc الاتصالات',       'sector': 'telecom',     'sector_ar': 'الاتصالات'},
    {'code': '4003', 'ticker': '4003.SR', 'name': 'اتحاد الاتصالات', 'sector': 'telecom', 'sector_ar': 'الاتصالات'},
    {'code': '2010', 'ticker': '2010.SR', 'name': 'سابك',                'sector': 'energy',      'sector_ar': 'الطاقة'},
    {'code': '4061', 'ticker': '4061.SR', 'name': 'العثيم', 'sector': 'retail', 'sector_ar': 'التجزئة'},
    {'code': '4240', 'ticker': '4240.SR', 'name': 'دله البركة', 'sector': 'health', 'sector_ar': 'الصحة'},
    {'code': '1010', 'ticker': '1010.SR', 'name': 'بنك الرياض',          'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '4007', 'ticker': '4007.SR', 'name': 'نادك', 'sector': 'telecom', 'sector_ar': 'الاتصالات'},
    {'code': '1060', 'ticker': '1060.SR', 'name': 'ساب',                 'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '1140', 'ticker': '1140.SR', 'name': 'بنك البلاد',          'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '1020', 'ticker': '1020.SR', 'name': 'بنك الجزيرة',         'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '1150', 'ticker': '1150.SR', 'name': 'بنك الإنماء',         'sector': 'banking',     'sector_ar': 'البنوك'},
    {'code': '4190', 'ticker': '4190.SR', 'name': 'جرير للتسويق',        'sector': 'retail',      'sector_ar': 'التجزئة'},
    {'code': '4161', 'ticker': '4161.SR', 'name': 'بن داود التجارية',    'sector': 'retail',      'sector_ar': 'التجزئة'},
    {'code': '8010', 'ticker': '8010.SR', 'name': 'التعاونية للتأمين',   'sector': 'insurance',   'sector_ar': 'التأمين'},
    {'code': '8150', 'ticker': '8150.SR', 'name': 'بوبا العربية للتأمين', 'sector': 'insurance', 'sector_ar': 'التأمين'},
    {'code': '8030', 'ticker': '8030.SR', 'name': 'ميلاء للتأمين',       'sector': 'insurance',   'sector_ar': 'التأمين'},
    {'code': '4300', 'ticker': '4300.SR', 'name': 'دار الأركان',         'sector': 'realestate',  'sector_ar': 'العقارات'},
    {'code': '4280', 'ticker': '4280.SR', 'name': 'المملكة القابضة',     'sector': 'realestate',  'sector_ar': 'العقارات'},
    {'code': '2270', 'ticker': '2270.SR', 'name': 'المراعي', 'sector': 'industrial', 'sector_ar': 'الصناعة'},
    {'code': '2290', 'ticker': '2290.SR', 'name': 'يانساب',              'sector': 'energy',      'sector_ar': 'الطاقة'},
    {'code': '9200', 'ticker': '9200.SR', 'name': 'تداول السعودية', 'sector': 'financial', 'sector_ar': 'الخدمات المالية'},
]

# ==========================================
# تنسيق الأرقام الكبيرة
# ==========================================
def format_large_number(val):
    if val is None or val == 0:
        return 'غير متاح'
    try:
        val = float(val)
        if val >= 1_000_000_000_000:
            return f'{val/1_000_000_000_000:.2f} تريليون'
        elif val >= 1_000_000_000:
            return f'{val/1_000_000_000:.2f}B'
        elif val >= 1_000_000:
            return f'{val/1_000_000:.2f}M'
        else:
            return f'{val:,.0f}'
    except:
        return 'غير متاح'

def safe_float(val, default=0.0):
    try:
        if val is None:
            return default
        return round(float(val), 2)
    except:
        return default

def safe_str(val, default='غير متاح'):
    try:
        if val is None or val == 0 or val == '':
            return default
        return str(val)
    except:
        return default

# ==========================================
# سحب بيانات سهم واحد
# ==========================================
def fetch_stock(stock_info):
    ticker_symbol = stock_info['ticker']
    code = stock_info['code']
    
    try:
        print(f"  📡 جاري جلب {code} ({ticker_symbol})...")
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        
        if not info or info.get('regularMarketPrice') is None:
            print(f"  ⚠️ لا توجد بيانات لـ {code}")
            return None

        # ===== أسعار اليوم =====
        price       = safe_float(info.get('regularMarketPrice') or info.get('currentPrice'))
        prev_close  = safe_float(info.get('regularMarketPreviousClose') or info.get('previousClose'))
        open_price  = safe_float(info.get('regularMarketOpen') or info.get('open'))
        day_high    = safe_float(info.get('regularMarketDayHigh') or info.get('dayHigh'))
        day_low     = safe_float(info.get('regularMarketDayLow') or info.get('dayLow'))
        
        # حساب التغير
        change_abs  = round(price - prev_close, 2) if prev_close else 0.0
        change_pct  = round((change_abs / prev_close * 100), 2) if prev_close else 0.0
        is_up       = change_abs >= 0

        # ===== 52 أسبوع =====
        high_52     = safe_float(info.get('fiftyTwoWeekHigh'))
        low_52      = safe_float(info.get('fiftyTwoWeekLow'))

        # ===== مضاعفات التقييم =====
        pe          = safe_float(info.get('trailingPE') or info.get('forwardPE'))
        eps         = safe_float(info.get('trailingEps'))
        pbv         = safe_float(info.get('priceToBook'))
        div_yield = safe_float(info.get('dividendYield', 0) * 100 if info.get('dividendYield') and info.get('dividendYield') < 1 else info.get('dividendYield', 0) if info.get('dividendYield') else 0)
        div_amount  = safe_float(info.get('lastDividendValue') or info.get('dividendRate', 0))
        roe         = safe_float((info.get('returnOnEquity') or 0) * 100)

        # ===== بيانات الشركة =====
        market_cap  = format_large_number(info.get('marketCap'))
        volume      = format_large_number(info.get('regularMarketVolume') or info.get('volume'))
        shares      = format_large_number(info.get('sharesOutstanding'))
        employees   = safe_str(info.get('fullTimeEmployees'))
        website     = safe_str(info.get('website'), '')
        description = safe_str(info.get('longBusinessSummary'), '')
        address_parts = [
            info.get('address1', ''),
            info.get('city', ''),
            info.get('country', '')
        ]
        address     = '، '.join([p for p in address_parts if p]) or 'المملكة العربية السعودية'

        # ===== البيانات المالية =====
        total_assets   = format_large_number(info.get('totalAssets'))
        total_debt     = format_large_number(info.get('totalDebt'))
        equity         = format_large_number(info.get('bookValue', 0) * info.get('sharesOutstanding', 0) if info.get('bookValue') and info.get('sharesOutstanding') else None)
        op_cashflow    = safe_float(info.get('operatingCashflow', 0) / 1_000_000_000 if info.get('operatingCashflow') else 0)
        free_cashflow  = safe_float(info.get('freeCashflow', 0) / 1_000_000_000 if info.get('freeCashflow') else 0)
        revenue        = safe_float(info.get('totalRevenue', 0) / 1_000_000_000 if info.get('totalRevenue') else 0)
        net_income     = safe_float(info.get('netIncomeToCommon', 0) / 1_000_000_000 if info.get('netIncomeToCommon') else 0)
        debt_to_equity = safe_float(info.get('debtToEquity'))
        ev_ebitda      = safe_float(info.get('enterpriseToEbitda'))

        # ===== التوزيعات التاريخية =====
        div_history = []
        try:
            divs = ticker.dividends
            if not divs.empty:
                for date, amount in divs.tail(6).items():
                    div_history.append({
                        'period': str(date.year),
                        'amount': f'{round(amount, 2)} ر.س',
                        'date': date.strftime('%d %B %Y'),
                        'yield': f'{round(amount/price*100, 1)}%' if price else '0%'
                    })
                div_history = list(reversed(div_history))
        except:
            pass

        # ===== الإعلانات =====
        announcements = []
        try:
            news = ticker.news
            if news:
                for item in news[:4]:
                    announcements.append({
                        'date': datetime.fromtimestamp(item.get('providerPublishTime', 0)).strftime('%d %B %Y') if item.get('providerPublishTime') else datetime.now().strftime('%d %B %Y'),
                        'type': 'أحداث',
                        'title': item.get('title', 'خبر الشركة'),
                        'desc': item.get('summary', item.get('title', 'تفاصيل متاحة على موقع تداول الرسمي.'))
                    })
        except:
            pass

        if not announcements:
            announcements = [{
                'date': datetime.now().strftime('%d %B %Y'),
                'type': 'تحديث',
                'title': 'تحديث بيانات الشركة',
                'desc': 'تم تحديث بيانات الشركة تلقائياً. للمزيد يرجى زيارة موقع تداول الرسمي.'
            }]

        # ===== تاريخ مالي سنوي =====
        rev_history    = ['0', '0', '0', '0']
        income_history = ['0', '0', '0', '0']
        years          = ['2023', '2022', '2021', '2020']
        try:
            financials_annual = ticker.financials
            if financials_annual is not None and not financials_annual.empty:
                cols = financials_annual.columns[:4]
                years = [str(c.year) for c in cols]
                
                if 'Total Revenue' in financials_annual.index:
                    rev_history = [
                        str(round(financials_annual.loc['Total Revenue', c] / 1_000_000_000, 2))
                        for c in cols
                    ]
                if 'Net Income' in financials_annual.index:
                    income_history = [
                        str(round(financials_annual.loc['Net Income', c] / 1_000_000_000, 2))
                        for c in cols
                    ]
        except:
            pass

        # ===== المساهمون الرئيسيون =====
        major_shareholders = []
        try:
            holders = ticker.major_holders
            inst_holders = ticker.institutional_holders
            if inst_holders is not None and not inst_holders.empty:
                for _, row in inst_holders.head(5).iterrows():
                    major_shareholders.append({
                        'name': str(row.get('Holder', 'مساهم مؤسسي')),
                        'pct': f"{round(row.get('% Out', 0) * 100, 2)}%",
                        'shares': format_large_number(row.get('Shares'))
                    })
        except:
            pass

        if not major_shareholders:
            major_shareholders = [
                {'name': 'مساهمون مؤسسيون', 'pct': 'غير متاح', 'shares': 'غير متاح'},
                {'name': 'مساهمون عامون',    'pct': 'غير متاح', 'shares': 'غير متاح'},
            ]

        # ===== تجميع كل البيانات =====
        stock_data = {
            # معلومات أساسية
            'code':       code,
            'name':       stock_info['name'],
            'sector':     stock_info['sector'],
            'sector_ar':  stock_info['sector_ar'],

            # أسعار اليوم
            'price':      price,
            'change':     change_pct,
            'changeAbs':  change_abs,
            'up':         is_up,
            'prevClose':  prev_close,
            'open':       open_price,
            'dayHigh':    day_high,
            'dayLow':     day_low,
            'high52':     high_52,
            'low52':      low_52,

            # مضاعفات التقييم
            'market':     market_cap,
            'pe':         f'{pe}x' if pe else 'غير متاح',
            'div':        f'{div_yield}%' if div_yield else 'غير متاح',
            'divAmount':  div_amount,
            'eps':        eps,
            'pbv':        f'{pbv}x' if pbv else 'غير متاح',
            'roe':        f'{roe}%' if roe else 'غير متاح',
            'vol':        volume,
            'shares':     shares,

            # معلومات الشركة
            'employees':  safe_str(employees),
            'website':    website,
            'address':    address,
            'desc':       description[:200] if description else '',
            'exchange':   'تداول',
            'fiscalYearEnd': '31 ديسمبر',

            # حقول ثابتة
            'isin':         '',
            'listingDate':  '',
            'foundDate':    '',
            'foundPlace':   '',
            'auditor':      '',
            'irContact':    '',
            'irOfficer':    '',
            'irPhone':      '',

            # البيانات المالية
            'financials': {
                'years':       years,
                'revenue':     rev_history,
                'netIncome':   income_history,
                'totalAssets': total_assets,
                'totalDebt':   total_debt,
                'equity':      equity,
                'dividendHistory': div_history,
            },

            # التقييم الجوهري
            'operatingCashFlow':   op_cashflow,
            'freeCashFlow':        free_cashflow,
            'netIncomeB':          net_income,
            'debtToEquity':        debt_to_equity,
            'evEbitda':            ev_ebitda,

            # الإعلانات والأحداث
            'announcements':    announcements,
            'upcomingEvents':   [],
            'boardMembers':     [],
            'majorShareholders': major_shareholders,
            'subsidiaries':     [],
            'peers':            [],
        }

        print(f"  ✅ {code} — السعر: {price} ر.س | التغير: {change_pct}%")
        return stock_data

    except Exception as e:
        print(f"  ❌ خطأ في {code}: {e}")
        return None

# ==========================================
# الدالة الرئيسية
# ==========================================
def main():
    print("=" * 55)
    print("🚀 تداول ذكي — تحديث البيانات عبر Yahoo Finance")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 55)

    all_stocks = []
    failed = []

    for i, stock in enumerate(STOCKS):
        print(f"\n[{i+1}/{len(STOCKS)}] {stock['name']} ({stock['code']})")
        data = fetch_stock(stock)

        if data:
            all_stocks.append(data)
        else:
            failed.append(stock['code'])

        # انتظار بين كل طلب لتجنب الحظر
        time.sleep(1.5)

    # حفظ النتائج
    output = {
        'lastUpdated':  datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'totalStocks':  len(all_stocks),
        'failed':       failed,
        'stocks':       all_stocks
    }

    os.makedirs('data', exist_ok=True)
    with open('data/stocks.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 55)
    print(f"✅ نجح: {len(all_stocks)} سهم")
    if failed:
        print(f"❌ فشل: {failed}")
    print(f"📁 تم الحفظ في: data/stocks.json")
    print("=" * 55)

if __name__ == '__main__':
    main()