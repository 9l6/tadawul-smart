// ==========================================
// جلب البيانات من stocks.json
// ==========================================
async function loadStocksData() {
  try {
    const response = await fetch('data/stocks.json');
    const json = await response.json();

    if (json.stocks && json.stocks.length > 0) {
      // دمج البيانات الجديدة مع البيانات الثابتة
      json.stocks.forEach(newStock => {
        const idx = stocks.findIndex(s => s.code === newStock.code);
        if (idx !== -1) {
          // تحديث الأسعار والبيانات الحية فقط
          stocks[idx].price = newStock.price || stocks[idx].price;
          stocks[idx].change = newStock.change || stocks[idx].change;
          stocks[idx].changeAbs = newStock.changeAbs || stocks[idx].changeAbs;
          stocks[idx].up = newStock.up ?? stocks[idx].up;
          stocks[idx].prevClose = newStock.prevClose || stocks[idx].prevClose;
          stocks[idx].open = newStock.open || stocks[idx].open;
          stocks[idx].dayHigh = newStock.dayHigh || stocks[idx].dayHigh;
          stocks[idx].dayLow = newStock.dayLow || stocks[idx].dayLow;
          stocks[idx].high52 = newStock.high52 || stocks[idx].high52;
          stocks[idx].low52 = newStock.low52 || stocks[idx].low52;
          stocks[idx].market = newStock.market || stocks[idx].market;
          stocks[idx].pe = newStock.pe || stocks[idx].pe;
          stocks[idx].div = newStock.div || stocks[idx].div;
          stocks[idx].eps = newStock.eps || stocks[idx].eps;
          stocks[idx].pbv = newStock.pbv || stocks[idx].pbv;
          stocks[idx].roe = newStock.roe || stocks[idx].roe;
          stocks[idx].vol = newStock.vol || stocks[idx].vol;

          // تحديث البيانات المالية إذا كانت متاحة
          if (newStock.financials) {
            stocks[idx].financials = newStock.financials;
          }
          if (newStock.announcements && newStock.announcements.length > 0) {
            stocks[idx].announcements = newStock.announcements;
          }
          if (newStock.historical && newStock.historical.length > 0) {
            stocks[idx].historical = newStock.historical;
          }
        }
      });

      console.log(`✅ تم تحديث ${json.stocks.length} سهم — آخر تحديث: ${json.lastUpdated}`);
    }
  } catch (e) {
    console.log('⚠️ لم يتم العثور على stocks.json — يتم استخدام البيانات الافتراضية');
  }
}

// ==========================================
// ثوابت مساعدة (تُستخدم في الدوال أدناه)
// ==========================================
const sectorNames = {
  energy: 'الطاقة', banking: 'البنوك',
  telecom: 'الاتصالات', retail: 'التجزئة', health: 'الصحة',
  insurance: 'التأمين', realestate: 'العقارات',
  industrial: 'الصناعة', financial: 'الخدمات المالية'
};

const annTypeColors = {
  'توزيعات': '#0F6E56', 'نتائج': '#1B4F72',
  'عقد': '#854F0B', 'تحديث': '#6B3FA0', 'أحداث': '#0F6E56'
};

const annTypeBg = {
  'توزيعات': 'var(--up-bg)', 'نتائج': 'var(--blue-bg)',
  'عقد': 'var(--amber-bg)', 'تحديث': 'var(--purple-bg)', 'أحداث': 'var(--up-bg)'
};

// ساعة مباشرة في الشريط العلوي
function updateClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  el.textContent = h + ':' + m + ':' + s;
}
setInterval(updateClock, 1000);
updateClock();

// ===== دوال صفحة المساعدة =====
function switchGuideSection(sec, el) {
  // تحديث الأزرار
  document.querySelectorAll('.guide-nav-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');

  // إظهار/إخفاء الأقسام
  document.querySelectorAll('.guide-section[data-section]').forEach(s => {
    if (sec === 'all' || s.dataset.section === sec) {
      s.style.display = '';
    } else {
      s.style.display = 'none';
    }
  });

  // إعادة تعيين البحث
  const searchEl = document.getElementById('guideSearch');
  if (searchEl) searchEl.value = '';
  document.getElementById('guideNoResults').style.display = 'none';
  document.querySelectorAll('.guide-term-card,.guide-chart-card,.guide-strategy-card,.guide-color-card').forEach(c => c.style.display = '');
}

function searchGuide(q) {
  const query = q.trim().toLowerCase();
  const noResults = document.getElementById('guideNoResults');
  const termEl = document.getElementById('guideSearchTerm');

  // إظهار كل الأقسام عند البحث
  document.querySelectorAll('.guide-section[data-section]').forEach(s => s.style.display = '');

  if (!query) {
    noResults.style.display = 'none';
    document.querySelectorAll('.guide-term-card,.guide-chart-card,.guide-strategy-card,.guide-color-card').forEach(c => c.style.display = '');
    return;
  }

  let anyVisible = false;
  document.querySelectorAll('.guide-term-card,.guide-chart-card,.guide-strategy-card,.guide-color-card').forEach(card => {
    const text = (card.textContent + ' ' + (card.dataset.keywords || '')).toLowerCase();
    if (text.includes(query)) {
      card.style.display = '';
      anyVisible = true;
    } else {
      card.style.display = 'none';
    }
  });

  if (termEl) termEl.textContent = q;
  noResults.style.display = anyVisible ? 'none' : 'block';
}


// ==========================================
// حالة التطبيق
// ==========================================
let selectedStock = stocks[0];
let currentSector = 'all';
let priceChart = null;
let chatHistory = [];

// ==========================================
// عرض الأسهم في القائمة الجانبية
// ==========================================
let currentSort = 'default';

function renderStocks(list) {
  const el = document.getElementById('stocksList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-tertiary);font-size:13px;padding:20px">لا توجد نتائج</div>';
    return;
  }

  let sorted = [...list];
  if (currentSort === 'topGain') sorted.sort((a, b) => b.change - a.change);
  else if (currentSort === 'topLoss') sorted.sort((a, b) => a.change - b.change);
  else if (currentSort === 'topVol') sorted.sort((a, b) => {
    const parseVol = v => parseFloat((v || '0').replace(/[^0-9.]/g, '')) || 0;
    return parseVol(b.vol) - parseVol(a.vol);
  });

  el.innerHTML = sorted.map(s => {
    const isSelected = s.code === selectedStock.code;
    const chgAbs = Math.abs(s.changeAbs).toFixed(2);
    // mini sparkline bars (7 bars)
    const bars = [0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 1.0].map((h, i) => {
      const rnd = 0.4 + Math.random() * 0.6;
      const isLast = i === 6;
      const clr = isLast ? (s.up ? 'var(--up)' : 'var(--down)') : (s.up ? 'rgba(15,110,86,0.45)' : 'rgba(153,60,29,0.45)');
      return `<div style="flex:1;background:${clr};border-radius:1px;height:${Math.round(rnd * 16)}px;align-self:flex-end"></div>`;
    }).join('');

    return `
    <div class="stock-item ${isSelected ? 'selected' : ''} ${s.up ? 'trend-up' : 'trend-down'}" onclick="selectStock('${s.code}')">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:1px">
          <span class="stock-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="stock-code">${s.code}</span>
          <span style="font-size:9px;color:var(--text-tertiary)">·</span>
          <span style="font-size:10px;color:var(--text-tertiary)">${sectorNames[s.sector] || s.sector}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="display:flex;align-items:flex-end;gap:1.5px;height:18px">${bars}</div>
        <div class="stock-price-info">
          <div class="stock-price">${s.price.toFixed(2)}</div>
          <div class="stock-change ${s.up ? 'up' : 'down'}">${s.up ? '+' : '-'}${chgAbs} (${s.up ? '+' : ''}${s.change.toFixed(2)}%)</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function sortStocks(mode, el) {
  currentSort = mode;
  document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterStocks(document.getElementById('searchInput').value);
}

function filterStocks(q) {
  const list = stocks.filter(s =>
    (currentSector === 'all' || s.sector === currentSector) &&
    (s.name.includes(q) || s.code.includes(q))
  );
  renderStocks(list);
}

function filterSector(sector, el) {
  currentSector = sector;
  document.querySelectorAll('.sector-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterStocks(document.getElementById('searchInput').value);
}

function selectStock(code) {
  selectedStock = stocks.find(s => s.code === code) || stocks[0];
  renderStocks(stocks.filter(s => currentSector === 'all' || s.sector === currentSector));
  updateHero();
  if (document.getElementById('analysisView').classList.contains('active')) {
    buildChart('1W');
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.time-btn').classList.add('active');
    renderCompanyProfile();
  }
}

// ==========================================
// تحديث بطاقة السهم الرئيسية
// ==========================================

function updateHero() {
  const s = selectedStock;
  document.getElementById('heroName').textContent = s.name;
  document.getElementById('heroCode').textContent = s.code + ' · قطاع ' + (sectorNames[s.sector] || s.sector);
  document.getElementById('heroPrice').textContent = s.price.toFixed(2) + ' ر.س';
  document.getElementById('heroAvatar').textContent = s.name.substring(0, 2);

  // معلومات السعر التفصيلية
  document.getElementById('heroPrevClose').textContent = s.prevClose.toFixed(2) + ' ر.س';
  document.getElementById('heroOpen').textContent = s.open.toFixed(2) + ' ر.س';
  document.getElementById('heroDayHigh').textContent = s.dayHigh.toFixed(2) + ' ر.س';
  document.getElementById('heroDayLow').textContent = s.dayLow.toFixed(2) + ' ر.س';

  const badge = document.getElementById('heroBadge');
  badge.className = 'hero-change-badge ' + (s.up ? 'badge-up' : 'badge-down');
  const absChg = Math.abs(s.changeAbs).toFixed(2);
  badge.innerHTML = `<i class="ti ti-trending-${s.up ? 'up' : 'down'}"></i> ${s.up ? '+' : '-'}${absChg} ر.س (${s.up ? '+' : ''}${s.change.toFixed(2)}%)`;

  document.getElementById('chartHigh').textContent = s.high52 + ' ر.س';
  document.getElementById('chartLow').textContent = s.low52 + ' ر.س';

  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric-card"><div class="metric-label">القيمة السوقية</div><div class="metric-value">${s.market}</div></div>
    <div class="metric-card"><div class="metric-label">مضاعف الربح (P/E)</div><div class="metric-value">${s.pe}</div></div>
    <div class="metric-card"><div class="metric-label">عائد التوزيعات</div><div class="metric-value">${s.div}</div></div>
    <div class="metric-card"><div class="metric-label">أعلى سعر 52 أسبوع</div><div class="metric-value">${s.high52} ر.س</div></div>
    <div class="metric-card"><div class="metric-label">أدنى سعر 52 أسبوع</div><div class="metric-value">${s.low52} ر.س</div></div>
    <div class="metric-card"><div class="metric-label">متوسط التداول اليومي</div><div class="metric-value">${s.vol}</div></div>
    <div class="metric-card"><div class="metric-label">ربحية السهم (EPS)</div><div class="metric-value">${s.eps} ر.س</div></div>
    <div class="metric-card"><div class="metric-label">مضاعف القيمة الدفترية</div><div class="metric-value">${s.pbv}</div></div>
    <div class="metric-card"><div class="metric-label">العائد على حقوق الملاك</div><div class="metric-value">${s.roe}</div></div>`;

  renderAnnouncements();
  renderCompanyProfile();
  renderDividendHistory();
  renderFinancials();
  renderOwnership();
  renderPeers();
  renderUpcomingEvents();
  renderValuation();
}

// ==========================================
// إعلانات وأحداث الشركة
// ==========================================
function renderAnnouncements() {
  const s = selectedStock;
  const el = document.getElementById('eventsList');
  if (!el) return;
  el.innerHTML = s.announcements.map(a => `
    <div class="event-item">
      <div class="event-dot" style="background:${annTypeColors[a.type] || '#999'}"></div>
      <div class="event-content">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span class="event-date">${a.date}</span>
          <span class="ann-badge" style="background:${annTypeBg[a.type] || 'var(--blue-bg)'};color:${annTypeColors[a.type] || '#333'}">${a.type}</span>
        </div>
        <div class="event-title">${a.title}</div>
        <div class="event-desc">${a.desc}</div>
      </div>
    </div>`).join('');
}

function renderUpcomingEvents() {
  const s = selectedStock;
  const el = document.getElementById('upcomingEventsList');
  if (!el) return;
  el.innerHTML = s.upcomingEvents.map(e => `
    <div class="upcoming-event">
      <div class="upcoming-icon" style="background:${annTypeBg[e.type] || 'var(--blue-bg)'};color:${annTypeColors[e.type] || '#333'}">
        <i class="ti ti-calendar-event"></i>
      </div>
      <div>
        <div class="upcoming-date">${e.date}</div>
        <div class="upcoming-title">${e.title}</div>
      </div>
    </div>`).join('');
}

function renderDividendHistory() {
  const s = selectedStock;
  const el = document.getElementById('dividendHistory');
  if (!el) return;
  el.innerHTML = s.financials.dividendHistory.map(d => `
    <tr>
      <td>${d.period}</td>
      <td class="up fw">${d.amount}</td>
      <td>${d.date}</td>
      <td><span class="yield-badge">${d.yield}</span></td>
    </tr>`).join('');
}

function renderFinancials() {
  const s = selectedStock;
  const el = document.getElementById('financialTable');
  if (!el) return;
  const f = s.financials;
  el.innerHTML = `
    <tr><th>السنة المالية</th>${f.years.map(y => `<th>${y}</th>`).join('')}</tr>
    <tr><td>الإيرادات (مليار ر.س)</td>${f.revenue.map(v => `<td>${v}</td>`).join('')}</tr>
    <tr><td>صافي الدخل (مليار ر.س)</td>${f.netIncome.map(v => `<td class="up">${v}</td>`).join('')}</tr>
    <tr><td>إجمالي الأصول</td><td colspan="${f.years.length}">${f.totalAssets}</td></tr>
    <tr><td>إجمالي الديون</td><td colspan="${f.years.length}">${f.totalDebt || 'لا ينطبق'}</td></tr>
    <tr><td>حقوق الملاك</td><td colspan="${f.years.length}">${f.equity}</td></tr>`;
}

function renderCompanyProfile() {
  const s = selectedStock;
  const el = document.getElementById('companyProfile');
  if (!el) return;
  el.innerHTML = `
    <div class="profile-grid">
      <div class="profile-item"><div class="profile-label">تاريخ التأسيس</div><div class="profile-val">${s.foundDate}</div></div>
      <div class="profile-item"><div class="profile-label">مكان التأسيس</div><div class="profile-val">${s.foundPlace}</div></div>
      <div class="profile-item"><div class="profile-label">تاريخ الإدراج</div><div class="profile-val">${s.listingDate}</div></div>
      <div class="profile-item"><div class="profile-label">نهاية السنة المالية</div><div class="profile-val">${s.fiscalYearEnd}</div></div>
      <div class="profile-item"><div class="profile-label">مراجع الحسابات</div><div class="profile-val">${s.auditor}</div></div>
      <div class="profile-item"><div class="profile-label">الرمز الدولي (ISIN)</div><div class="profile-val ltr">${s.isin}</div></div>
      <div class="profile-item"><div class="profile-label">عدد الموظفين</div><div class="profile-val">${s.employees}</div></div>
      <div class="profile-item"><div class="profile-label">سوق التداول</div><div class="profile-val">${s.exchange}</div></div>
      <div class="profile-item"><div class="profile-label">عدد الأسهم</div><div class="profile-val">${s.shares}</div></div>
      <div class="profile-item"><div class="profile-label">القطاع</div><div class="profile-val">${s.sector_ar || sectorNames[s.sector]}</div></div>
    </div>
    <div class="profile-divider"></div>
    <div class="profile-grid">
      <div class="profile-item"><div class="profile-label">ضابط علاقات المستثمرين</div><div class="profile-val">${s.irOfficer}</div></div>
      <div class="profile-item"><div class="profile-label">البريد الإلكتروني</div><div class="profile-val ltr">${s.irContact}</div></div>
      <div class="profile-item"><div class="profile-label">هاتف الشركة</div><div class="profile-val ltr">${s.irPhone}</div></div>
      <div class="profile-item profile-item-full"><div class="profile-label">عنوان الشركة</div><div class="profile-val">${s.address}</div></div>
      <div class="profile-item profile-item-full"><div class="profile-label">الموقع الإلكتروني</div><div class="profile-val"><a href="${s.website}" target="_blank" class="profile-link">${s.website}</a></div></div>
    </div>
    ${s.subsidiaries && s.subsidiaries.length ? `
    <div class="profile-divider"></div>
    <div class="profile-sub-title">الشركات التابعة</div>
    <table class="sub-table">
      <thead><tr><th>اسم الشركة</th><th>نسبة الملكية</th><th>النشاط الرئيسي</th><th>مكان العمليات</th></tr></thead>
      <tbody>${s.subsidiaries.map(sub => `<tr><td>${sub.name}</td><td class="up fw">${sub.ownership}</td><td>${sub.activity}</td><td>${sub.location}</td></tr>`).join('')}</tbody>
    </table>` : ''}`;
}

function renderOwnership() {
  const s = selectedStock;
  const elBoard = document.getElementById('boardTable');
  const elShareholders = document.getElementById('shareholdersTable');
  if (elBoard) {
    elBoard.innerHTML = s.boardMembers.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.name}</strong></td>
        <td>${m.role}</td>
        <td class="${m.shares > 0 ? 'up' : 'text-secondary'}">${m.shares.toLocaleString('ar-SA')} سهم</td>
        <td>${m.shares > 0 ? m.shares.toLocaleString('ar-SA') : '-'}</td>
        <td>-</td>
      </tr>`).join('');
  }
  if (elShareholders) {
    elShareholders.innerHTML = s.majorShareholders.map(sh => `
      <tr>
        <td><strong>${sh.name}</strong></td>
        <td class="up fw">${sh.pct}</td>
        <td>${sh.shares}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>`).join('');
  }
}

function renderPeers() {
  const s = selectedStock;
  const el = document.getElementById('peersTable');
  if (!el) return;
  const peers = [s, ...s.peers.map(code => stocks.find(st => st.code === code)).filter(Boolean)];
  el.innerHTML = peers.map((p, i) => `
    <tr class="${i === 0 ? 'peer-selected' : ''}">
      <td><strong>${p.name}</strong> <span class="stock-code">${p.code}</span></td>
      <td>${p.price.toFixed(2)} ر.س</td>
      <td class="${p.up ? 'up' : 'down'}">${p.up ? '+' : ''}${p.change.toFixed(2)}%</td>
      <td>${p.market}</td>
      <td>${p.pe}</td>
      <td>${p.div}</td>
      <td>${p.pbv}</td>
    </tr>`).join('');
}

// ==========================================
// دالة توليد بيانات الرسم البياني (تم استخلاصها لحل التداخل)
// ==========================================
// ==========================================
// توليد بيانات الرسم البياني من البيانات الحقيقية
// ==========================================
function genPriceData(period) {
  const s = selectedStock;
  const historical = s.historical || [];

  // تحديد عدد الأيام حسب الفترة
  const periodDays = {
    '1W': 7, '1M': 30, '3M': 90,
    '6M': 180, '1Y': 252, '3Y': 756
  };
  const days = periodDays[period] || 7;

  // فلترة البيانات حسب الفترة
  let filtered = historical.slice(-days);

  // إذا ما في بيانات كافية — نستخدم كل المتاح
  if (filtered.length === 0) {
    return genPriceDataFallback(period);
  }

  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const weekdays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  const labels = filtered.map((d, i) => {
    const date = new Date(d.date);
    const dow = date.getDay();

    if (period === '1W') {
      return weekdays[dow] || d.date;
    } else if (days <= 30) {
      return date.getDate() + ' ' + months[date.getMonth()];
    } else if (days <= 90) {
      return i % 7 === 0 ? date.getDate() + ' ' + months[date.getMonth()] : '';
    } else {
      return i % 30 === 0 ? months[date.getMonth()] + ' ' + date.getFullYear() : '';
    }
  });

  const data = filtered.map(d => d.close);
  const highs = filtered.map(d => d.high);
  const lows = filtered.map(d => d.low);
  const opens = filtered.map(d => d.open);
  const volume = filtered.map(d => Math.round(d.volume / 1_000_000));

  return { labels, data, highs, lows, opens, volume };
}

// Fallback للبيانات العشوائية إذا ما في بيانات حقيقية
function genPriceDataFallback(period) {
  const counts = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 252, '3Y': 756 };
  const n = counts[period] || 7;
  const s = selectedStock;
  const base = parseFloat(s.low52) * 1.05;
  let v = base;
  const labels = [], data = [], volume = [];
  const today = new Date();
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const weekdays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const trendBias = s.up ? 0.0015 : -0.0010;

  for (let i = 0; i < n; i++) {
    const dayOffset = n - 1 - i;
    const d = new Date(today.getTime() - dayOffset * 86400000);
    const dow = d.getDay();
    if (dow === 5 || dow === 6) {
      data.push(data.length > 0 ? data[data.length - 1] : parseFloat(v.toFixed(2)));
      labels.push('');
      volume.push(0);
      continue;
    }
    v += (Math.random() - 0.47 + trendBias) * v * 0.013;
    v = Math.max(v, parseFloat(s.low52) * 0.88);
    v = Math.min(v, parseFloat(s.high52) * 1.05);
    data.push(parseFloat(v.toFixed(2)));
    volume.push(Math.round(Math.random() * 80 + 20));
    if (period === '1W') labels.push(weekdays[dow]);
    else if (n <= 30) labels.push(d.getDate() + ' ' + months[d.getMonth()]);
    else if (n <= 90) labels.push(i % 7 === 0 ? d.getDate() + ' ' + months[d.getMonth()] : '');
    else labels.push(i % 30 === 0 ? months[d.getMonth()] + ' ' + d.getFullYear() : '');
  }
  data[data.length - 1] = s.price;
  return { labels, data, highs: data, lows: data, opens: data, volume };
}

// ==========================================
// رسم المخطط البياني بأسلوب Google Finance
// ==========================================
let currentChartType = 'line';
let rsiChart = null;
let activeOverlays = { ma20: true, ma50: true, ma200: false, bb: false, vol: true };

function buildChart(period) {
  const ctx = document.getElementById('priceChart');
  if (!ctx) return;
  const context = ctx.getContext('2d');
  if (priceChart) priceChart.destroy();

  const { labels, data, volume: volumeData = [] } = genPriceData(period);

  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const isUp = data[data.length - 1] >= data[0];
  const lineColor = isUp ? '#0F6E56' : '#993C1D';
  const gradStart = isUp ? 'rgba(15,110,86,0.22)' : 'rgba(153,60,29,0.22)';
  const gradEnd = isUp ? 'rgba(15,110,86,0.00)' : 'rgba(153,60,29,0.00)';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const tickColor = isDark ? '#5c5f66' : '#9ca3af';

  const gradient = context.createLinearGradient(0, 0, 0, 340);
  gradient.addColorStop(0, gradStart);
  gradient.addColorStop(1, gradEnd);
  const volColor = isUp ? 'rgba(15,110,86,0.25)' : 'rgba(153,60,29,0.25)';

  const calcMA = (arr, n) => arr.map((_, i) => {
    if (i < n - 1) return null;
    return arr.slice(i - n + 1, i + 1).reduce((s, v) => s + v, 0) / n;
  });

  const calcBB = (arr, n = 20, mult = 2) => arr.map((_, i) => {
    if (i < n - 1) return { upper: null, lower: null };
    const slice = arr.slice(i - n + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    return { upper: mean + mult * std, lower: mean - mult * std };
  });

  const ma20 = calcMA(data, Math.min(20, Math.floor(data.length / 2)));
  const ma50 = calcMA(data, Math.min(50, Math.floor(data.length / 2)));
  const ma200 = calcMA(data, Math.min(200, Math.floor(data.length * 0.8)));
  const bb = calcBB(data);

  const datasets = [];

  datasets.push({
    type: currentChartType === 'bar' ? 'bar' : 'line',
    label: 'السعر',
    data,
    borderColor: lineColor,
    borderWidth: 2,
    fill: currentChartType === 'area',
    backgroundColor: currentChartType === 'area' ? gradient : lineColor,
    tension: 0.3,
    pointRadius: 0,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: lineColor,
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2,
    yAxisID: 'yPrice',
    order: 1,
  });

  if (activeOverlays.ma20) {
    datasets.push({
      type: 'line',
      label: 'MA20',
      data: ma20,
      borderColor: 'rgba(15,110,86,0.80)',
      borderWidth: 1.5,
      borderDash: [3, 2],
      fill: false,
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'yPrice',
      order: 2,
    });
  }

  if (activeOverlays.ma50) {
    datasets.push({
      type: 'line',
      label: 'MA50',
      data: ma50,
      borderColor: 'rgba(27,79,114,0.75)',
      borderWidth: 1.5,
      borderDash: [4, 2],
      fill: false,
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'yPrice',
      order: 2,
    });
  }

  if (activeOverlays.ma200) {
    datasets.push({
      type: 'line',
      label: 'MA200',
      data: ma200,
      borderColor: 'rgba(133,79,11,0.75)',
      borderWidth: 1.5,
      borderDash: [6, 3],
      fill: false,
      pointRadius: 0,
      tension: 0.3,
      yAxisID: 'yPrice',
      order: 3,
    });
  }

  if (activeOverlays.bb) {
    datasets.push({
      type: 'line', label: 'BB Upper',
      data: bb.map(b => b.upper),
      borderColor: 'rgba(107,63,160,0.5)',
      borderWidth: 1, borderDash: [3, 3],
      fill: false, pointRadius: 0, yAxisID: 'yPrice', order: 4,
    });
    datasets.push({
      type: 'line', label: 'BB Lower',
      data: bb.map(b => b.lower),
      borderColor: 'rgba(107,63,160,0.5)',
      borderWidth: 1, borderDash: [3, 3],
      fill: false, pointRadius: 0, yAxisID: 'yPrice', order: 4,
    });
  }

  if (activeOverlays.vol) {
    datasets.push({
      type: 'bar',
      label: 'الحجم',
      data: volumeData,
      backgroundColor: volumeData.map(() => volColor),
      borderColor: 'transparent',
      borderRadius: 2,
      yAxisID: 'yVolume',
      order: 10,
    });
  }

  priceChart = new Chart(context, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 350, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#25262b' : '#fff',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          titleColor: isDark ? '#e9ecef' : '#111827',
          bodyColor: isDark ? '#909296' : '#6b7280',
          padding: 12, cornerRadius: 10, rtl: true, textDirection: 'rtl',
          callbacks: {
            title: items => items[0]?.label || '',
            label: item => {
              if (item.dataset.label === 'السعر') return ' السعر: ' + item.parsed.y.toFixed(2) + ' ر.س';
              if (item.dataset.label === 'الحجم') return ' الحجم: ' + item.parsed.y + 'M ر.س';
              if (item.dataset.label === 'MA20') return ' MA20: ' + (item.parsed.y?.toFixed(2) || '-');
              if (item.dataset.label === 'MA50') return ' MA50: ' + (item.parsed.y?.toFixed(2) || '-');
              if (item.dataset.label === 'MA200') return ' MA200: ' + (item.parsed.y?.toFixed(2) || '-');
              return '';
            },
            afterBody: items => {
              const price = items.find(i => i.dataset.label === 'السعر');
              if (price && data[0]) {
                const chg = ((price.parsed.y - data[0]) / data[0] * 100).toFixed(2);
                return [' التغير: ' + (chg >= 0 ? '+' : '') + chg + '%'];
              }
              return [];
            }
          }
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11, family: 'inherit' }, maxTicksLimit: 8, color: tickColor, maxRotation: 0 }
        },
        yPrice: {
          position: 'right',
          grid: { color: gridColor, drawBorder: false },
          border: { display: false, dash: [4, 4] },
          ticks: { font: { size: 11, family: 'inherit' }, callback: v => v.toFixed(1), color: tickColor, maxTicksLimit: 6 }
        },
        yVolume: {
          position: 'left',
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 10, family: 'inherit' }, color: tickColor, maxTicksLimit: 3 },
          max: activeOverlays.vol ? Math.max(...volumeData) * 5 : 100,
          display: activeOverlays.vol,
        }
      }
    }
  });

  buildRSIChart(data, isDark, tickColor, gridColor);
  updateChartQuickStats(data, volumeData, ma20, ma50, ma200);
}

function setChartType(type, el) {
  currentChartType = type;
  document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const period = document.querySelector('.time-btn.active')?.textContent || '1أ';
  const normPeriod = period === '1أ' ? '1W' : period === '1ش' ? '1M' : period === '3ش' ? '3M' : period === '6ش' ? '6M' : period === '1س' ? '1Y' : '3Y';
  buildChart(normPeriod);
}

function toggleOverlay(name, el) {
  activeOverlays[name] = !activeOverlays[name];
  el.classList.toggle('active');
  const period = document.querySelector('.time-btn.active')?.textContent || '1أ';
  const normPeriod = period === '1أ' ? '1W' : period === '1ش' ? '1M' : period === '3ش' ? '3M' : period === '6ش' ? '6M' : period === '1س' ? '1Y' : '3Y';
  buildChart(normPeriod);
}

function setTime(period, el) {
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  buildChart(period);
}

function buildRSIChart(data, isDark, tickColor, gridColor) {
  const canvas = document.getElementById('rsiChart');
  if (!canvas) return;
  if (rsiChart) rsiChart.destroy();

  const rsiData = calcRSI(data, 14);
  const labels = data.map(() => '');

  rsiChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data: rsiData,
          borderColor: 'rgba(107,63,160,0.8)',
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
          tension: 0.3,
        },
        {
          data: data.map(() => 70),
          borderColor: 'rgba(153,60,29,0.4)',
          borderWidth: 1, borderDash: [4, 2],
          fill: false, pointRadius: 0,
        },
        {
          data: data.map(() => 30),
          borderColor: 'rgba(15,110,86,0.4)',
          borderWidth: 1, borderDash: [4, 2],
          fill: false, pointRadius: 0,
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: {
          position: 'right', min: 0, max: 100,
          grid: { color: gridColor },
          border: { display: false },
          ticks: { font: { size: 9 }, color: tickColor, maxTicksLimit: 3 }
        }
      }
    }
  });
}

function calcRSI(data, period = 14) {
  const rsi = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i] - data[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = 0; i < period; i++) rsi.push(50);
  rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));

  for (let i = period + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  return rsi.map(v => parseFloat(v.toFixed(1)));
}

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const result = Array(data.length).fill(null);
  let started = false;
  let ema = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    if (!started) {
      ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
      started = true;
    } else {
      ema = data[i] * k + ema * (1 - k);
    }
    result[i] = parseFloat(ema.toFixed(3));
  }
  return result;
}

function updateChartQuickStats(data, vol, ma20, ma50, ma200) {
  const el = document.getElementById('chartQuickStats');
  if (!el) return;
  const last = data[data.length - 1];
  const first = data[0];
  const chg = ((last - first) / first * 100).toFixed(2);
  const high = Math.max(...data).toFixed(2);
  const low = Math.min(...data).toFixed(2);
  const avgVol = (vol.reduce((s, v) => s + v, 0) / vol.length).toFixed(0);
  const lastMA20 = ma20.filter(v => v !== null).pop()?.toFixed(2) || '-';
  const lastMA50 = ma50.filter(v => v !== null).pop()?.toFixed(2) || '-';
  const rsiVals = calcRSI(data, 14);
  const lastRSI = rsiVals[rsiVals.length - 1];
  const rsiColor = lastRSI > 70 ? 'var(--down)' : lastRSI < 30 ? 'var(--up)' : 'var(--amber)';
  const rsiLabel = lastRSI > 70 ? 'تشبع شرائي' : lastRSI < 30 ? 'تشبع بيعي' : 'محايد';

  // حساب MACD بسيط
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine = ema12.map((v, i) => (v !== null && ema26[i] !== null) ? +(v - ema26[i]).toFixed(3) : null);
  const lastMACD = macdLine.filter(v => v !== null).pop();
  const macdColor = lastMACD >= 0 ? 'var(--up)' : 'var(--down)';
  const macdLabel = lastMACD >= 0 ? 'إيجابي' : 'سلبي';

  el.innerHTML = `
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">السعر الحالي</span>
      <span class="chart-quick-stat-val">${last.toFixed(2)} ر.س</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">التغير (الفترة)</span>
      <span class="chart-quick-stat-val ${parseFloat(chg) >= 0 ? 'up' : 'down'}">${parseFloat(chg) >= 0 ? '+' : ''}${chg}%</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">أعلى الفترة</span>
      <span class="chart-quick-stat-val up">${high} ر.س</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">أدنى الفترة</span>
      <span class="chart-quick-stat-val down">${low} ر.س</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">RSI (14)</span>
      <span class="chart-quick-stat-val" style="color:${rsiColor}" title="${rsiLabel}">${lastRSI} · ${rsiLabel}</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">MA20</span>
      <span class="chart-quick-stat-val" style="color:rgba(15,110,86,0.9)">${lastMA20}</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">MA50</span>
      <span class="chart-quick-stat-val" style="color:rgba(27,79,114,0.9)">${lastMA50}</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">MACD</span>
      <span class="chart-quick-stat-val" style="color:${macdColor}">${lastMACD?.toFixed(3) || '-'} · ${macdLabel}</span>
    </div>
    <div class="chart-quick-stat">
      <span class="chart-quick-stat-label">متوسط الحجم</span>
      <span class="chart-quick-stat-val">${avgVol}M ر.س</span>
    </div>`;
}

// ==========================================
// التنقل بين التبويبات الرئيسية
// ==========================================
let newsLoaded = false;
function switchTab(tab, el) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.home-view, .analysis-view, .chat-view, .news-view, .guide-view').forEach(v => v.classList.remove('active'));
  document.getElementById(tab + 'View').classList.add('active');
  if (tab === 'analysis') {
    updateHero();
    setTimeout(() => buildChart('1W'), 60);
  }
  if (tab === 'news' && !newsLoaded) {
    loadNews();
  }
}

function switchAnalysisTab(tabId, btn) {
  document.querySelectorAll('.analysis-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.analysis-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (tabId === 'tabValuation') renderValuation();
  if (tabId === 'tabStudy') renderStudy();
}

// ==========================================
// الرابحون والخاسرون
// ==========================================
function renderGainersLosers() {
  const sorted = [...stocks].sort((a, b) => b.change - a.change);
  const top3 = sorted.slice(0, 3);
  const bot3 = sorted.slice(-3).reverse();

  document.getElementById('gainers').innerHTML = top3.map(s => `
    <div class="mover-item" onclick="selectStock('${s.code}');switchTab('analysis',document.querySelectorAll('.tab-btn')[1])">
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${s.name}</div>
        <div style="font-size:11px;color:var(--text-secondary)">${s.code}</div>
      </div>
      <div style="text-align:left">
        <div class="up" style="font-size:13px;font-weight:500">+${s.change.toFixed(2)}%</div>
        <div style="font-size:11px;color:var(--text-secondary)">${s.price.toFixed(2)} ر.س</div>
      </div>
    </div>`).join('');

  document.getElementById('losers').innerHTML = bot3.map(s => `
    <div class="mover-item" onclick="selectStock('${s.code}');switchTab('analysis',document.querySelectorAll('.tab-btn')[1])">
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${s.name}</div>
        <div style="font-size:11px;color:var(--text-secondary)">${s.code}</div>
      </div>
      <div style="text-align:left">
        <div class="down" style="font-size:13px;font-weight:500">${s.change.toFixed(2)}%</div>
        <div style="font-size:11px;color:var(--text-secondary)">${s.price.toFixed(2)} ر.س</div>
      </div>
    </div>`).join('');
}

// ==========================================
// نظام الأخبار والـ AI والمساعد المالي
// ==========================================





// يتم استدعاء الدوال الفرعية للتقييم والدراسة هنا بشكل ديناميكي ومؤمن بالـ CSS
function renderGuide(sec) {
  switchGuideSection(sec || 'all', document.querySelector('.guide-nav-btn.active'));
}

function renderValuation() {
  const s = selectedStock;
  const el = document.getElementById('valContent');
  if (!el) return;

  // دمج بيانات valuationData مع بيانات stocks الأساسية
  const base = valuationData[s.code] || {};
  const v = {
    peRatio: base.peRatio || parseFloat(s.pe) || 0,
    sectorAvgPE: base.sectorAvgPE || 15,
    eps: base.eps || s.eps || 0,
    epsGrowth: base.epsGrowth || 0,
    peRisk: base.peRisk || 'متوسط',
    peRiskNote: base.peRiskNote || `P/E عند ${parseFloat(s.pe) || 0}x`,
    buyZoneNote: base.buyZoneNote || '',
    buyZonePE: base.buyZonePE || { conservative: 0, fair: 0, optimistic: 0 },
    bookValuePerShare: base.bookValuePerShare || (s.price / (parseFloat(s.pbv) || 1)),
    pbv: base.pbv || parseFloat(s.pbv) || 0,
    sectorAvgPBV: base.sectorAvgPBV || 2.5,
    totalAssets: base.totalAssets || 0,
    tangibleAssets: base.tangibleAssets || 0,
    totalDebt: base.totalDebt || 0,
    debtNote: base.debtNote || '',
    debtToEquity: base.debtToEquity || 0,
    debtToAssets: base.debtToAssets || 0,
    evEbitda: base.evEbitda || 0,
    operatingCashFlow: base.operatingCashFlow || 0,
    freeCashFlow: base.freeCashFlow || 0,
    netIncome: base.netIncome || 0,
    cashConversionRatio: base.cashConversionRatio || 0,
    cashQualityNote: base.cashQualityNote || 'بيانات قيد الإضافة.',
    divHistory: base.divHistory || [{ d: s.divAmount || 0, y: '2024' }],
    fairValueDCF: base.fairValueDCF || 0,
    fairValuePE: base.fairValuePE || 0,
    fairValuePBV: base.fairValuePBV || 0,
    fairValueAvg: base.fairValueAvg || 0,
    currentPrice: s.price,
    vsUnderOver: base.vsUnderOver || 'غير محسوب',
    marginOfSafety: base.marginOfSafety || 0,
    totalShares: base.totalShares || 0,
    floatShares: base.floatShares || 0,
    floatPct: base.floatPct || 0,
    nonFloatPct: base.nonFloatPct || 0,
    nonFloatHolders: base.nonFloatHolders || [],
  };

  const priceVsFair = v.currentPrice > v.fairValueAvg ? 'down' : 'up';
  const priceVsFairLabel = v.currentPrice > v.fairValueAvg
    ? `غالٍ بنسبة ${Math.abs(v.marginOfSafety).toFixed(1)}%`
    : `رخيص بنسبة ${Math.abs(v.marginOfSafety).toFixed(1)}%`;

  el.innerHTML = `
  <div class="val-grid">

    <!-- بطاقة 1: التقييم والـ PE -->
    <div class="val-card">
      <div class="val-card-header"><span class="val-num">1</span><span class="val-title">مضاعف الأرباح والتقييم</span></div>
      <div class="val-row">
        <div class="val-metric"><div class="val-label">P/E الحالية</div><div class="val-value">${v.peRatio}x</div></div>
        <div class="val-metric"><div class="val-label">متوسط القطاع</div><div class="val-value">${v.sectorAvgPE}x</div></div>
        <div class="val-metric"><div class="val-label">EPS السنوي</div><div class="val-value up">${v.eps} ر.س</div></div>
        <div class="val-metric"><div class="val-label">نمو EPS</div><div class="val-value ${parseFloat(v.epsGrowth) >= 0 ? 'up' : 'down'}">${v.epsGrowth > 0 ? '+' : ''}${v.epsGrowth}%</div></div>
      </div>
      <div class="val-note">${v.peRiskNote}</div>
      <div class="val-zones-title" style="font-size:11px;color:var(--text-tertiary);margin-top:10px;margin-bottom:6px">نطاقات الشراء بحسب P/E:</div>
      <div class="val-row">
        <div class="val-metric"><div class="val-label">محافظ</div><div class="val-value up">${v.buyZonePE.conservative} ر.س</div></div>
        <div class="val-metric"><div class="val-label">عادل</div><div class="val-value" style="color:var(--amber)">${v.buyZonePE.fair} ر.س</div></div>
        <div class="val-metric"><div class="val-label">متفائل</div><div class="val-value" style="color:var(--blue-text)">${v.buyZonePE.optimistic} ر.س</div></div>
      </div>
      <div class="val-note">${v.buyZoneNote}</div>
    </div>

    <!-- بطاقة 2: القيمة الدفترية وhttps الأصول -->
    <div class="val-card">
      <div class="val-card-header"><span class="val-num">2</span><span class="val-title">القيمة الدفترية والأصول</span></div>
      <div class="val-row">
        <div class="val-metric"><div class="val-label">القيمة الدفترية/سهم</div><div class="val-value">${v.bookValuePerShare} ر.س</div></div>
        <div class="val-metric"><div class="val-label">P/BV الحالية</div><div class="val-value">${v.pbv}x</div></div>
        <div class="val-metric"><div class="val-label">متوسط القطاع PBV</div><div class="val-value">${v.sectorAvgPBV}x</div></div>
      </div>
      <div class="val-row" style="margin-top:8px">
        <div class="val-metric"><div class="val-label">إجمالي الأصول</div><div class="val-value">${v.totalAssets}B</div></div>
        <div class="val-metric"><div class="val-label">الأصول الملموسة</div><div class="val-value up">${v.tangibleAssets}B</div></div>
        <div class="val-metric"><div class="val-label">إجمالي الديون</div><div class="val-value down">${v.totalDebt}B</div></div>
      </div>
      <div class="val-note" style="margin-top:8px">${v.debtNote}</div>
      <div class="val-row" style="margin-top:8px">
        <div class="val-metric"><div class="val-label">D/E</div><div class="val-value">${v.debtToEquity}%</div></div>
        <div class="val-metric"><div class="val-label">Debt/Assets</div><div class="val-value">${v.debtToAssets}%</div></div>
        <div class="val-metric"><div class="val-label">EV/EBITDA</div><div class="val-value">${v.evEbitda}x</div></div>
      </div>
    </div>

    <!-- بطاقة 3: التدفقات النقدية -->
    <div class="val-card">
      <div class="val-card-header"><span class="val-num">3</span><span class="val-title">التدفقات النقدية والجودة</span></div>
      <div class="val-row">
        <div class="val-metric"><div class="val-label">تشغيلي</div><div class="val-value up">${v.operatingCashFlow}B</div></div>
        <div class="val-metric"><div class="val-label">حر (FCF)</div><div class="val-value up">${v.freeCashFlow}B</div></div>
        <div class="val-metric"><div class="val-label">صافي الأرباح</div><div class="val-value up">${v.netIncome}B</div></div>
        <div class="val-metric"><div class="val-label">نسبة التحويل</div><div class="val-value ${v.cashConversionRatio >= 90 ? 'up' : 'down'}">${v.cashConversionRatio}%</div></div>
      </div>
      <div class="val-note">${v.cashQualityNote}</div>
    </div>

    <!-- بطاقة 4: القيمة العادلة المجمّعة -->
    <div class="val-card val-card-highlight">
      <div class="val-card-header"><span class="val-num">4</span><span class="val-title">القيمة العادلة الإجمالية</span></div>
      <div class="val-row">
        <div class="val-metric"><div class="val-label">DCF</div><div class="val-value">${v.fairValueDCF} ر.س</div></div>
        <div class="val-metric"><div class="val-label">PE</div><div class="val-value">${v.fairValuePE} ر.س</div></div>
        <div class="val-metric"><div class="val-label">PBV</div><div class="val-value">${v.fairValuePBV} ر.س</div></div>
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:3px">القيمة العادلة المتوسطة</div>
          <div style="font-size:22px;font-weight:700;color:var(--up)">${v.fairValueAvg} ر.س</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:3px">السعر الحالي</div>
          <div style="font-size:22px;font-weight:700;color:var(--text-primary)">${v.currentPrice} ر.س</div>
        </div>
        <div class="val-verdict ${priceVsFair}">
          <div style="font-size:11px;opacity:0.8;margin-bottom:2px">الحكم</div>
          <div style="font-size:14px;font-weight:700">${v.vsUnderOver}</div>
          <div style="font-size:12px">${priceVsFairLabel}</div>
        </div>
      </div>
    </div>

    <!-- بطاقة 5: التوزيعات التاريخية -->
    <div class="val-card">
      <div class="val-card-header"><span class="val-num">5</span><span class="val-title">سجل التوزيعات</span></div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <thead><tr style="color:var(--text-tertiary)"><th style="padding:4px 0;text-align:right">السنة</th><th style="padding:4px 0;text-align:right">التوزيع</th></tr></thead>
        <tbody>${(v.divHistory || []).map(d => `<tr><td style="padding:4px 0;color:var(--text-secondary)">${d.y}</td><td style="padding:4px 0;color:var(--up);font-weight:600">${d.d} ر.س</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <!-- بطاقة 6: هيكل الأسهم -->
    <div class="val-card">
      <div class="val-card-header"><span class="val-num">6</span><span class="val-title">هيكل الملكية والأسهم</span></div>
      <div class="val-row">
        <div class="val-metric"><div class="val-label">إجمالي الأسهم</div><div class="val-value">${(v.totalShares / 1000).toFixed(0)} مليار</div></div>
        <div class="val-metric"><div class="val-label">الأسهم الحرة</div><div class="val-value">${v.floatShares}M (${v.floatPct}%)</div></div>
        <div class="val-metric"><div class="val-label">المحجوزة</div><div class="val-value">${v.nonFloatPct}%</div></div>
      </div>
      ${v.nonFloatHolders ? `<div style="margin-top:8px;font-size:12px">${v.nonFloatHolders.map(h => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span style="color:var(--text-secondary)">${h.name}</span><span style="color:var(--blue-text);font-weight:600">${h.pct}%</span></div>`).join('')}</div>` : ''}
    </div>

  </div>`;
}

function renderStudy() {
  const s = selectedStock;
  const el = document.getElementById('studyContent');
  if (!el) return;

  const swotMap = {
    '2222': {
      strengths: ['احتياطيات نفطية بين الأضخم عالمياً تتجاوز 200 مليار برميل', 'تكلفة استخراج أقل من 3 دولارات للبرميل — الأدنى عالمياً', 'التدفق النقدي الحر تجاوز 98 مليار ريال في 2023', 'ثاني أكبر شركة في العالم من حيث القيمة السوقية'],
      weaknesses: ['الإيرادات مرتبطة ارتباطاً وثيقاً بأسعار النفط العالمية', 'الحوكمة تتأثر بسياسات الحكومة السعودية', 'Float منخفض جداً (5.8%) يحد من السيولة'],
      opportunities: ['التوسع في الغاز والطاقة المتجددة ضمن رؤية 2030', 'رفع طاقة التكرير وزيادة القيمة المضافة', 'توسع في الأسواق الآسيوية خاصة الهند والصين'],
      threats: ['التسارع في التحول للطاقة النظيفة عالمياً', 'قرارات أوبك+ بخفض الإنتاج تؤثر على الإيرادات', 'تقلبات الدولار الأمريكي تؤثر على قيمة الأرباح'],
      verdict: 'شراء', verdictColor: 'up', summary: 'أرامكو شركة محورية بتكاليف استخراج عالمية لا تضاهى وتدفق نقدي ضخم. التقييم الحالي أعلى من المتوسط لكن الجودة تبرر العلاوة.'
    },
    '1120': {
      strengths: ['أكبر بنك إسلامي في العالم من حيث الأصول', 'نمو تمويل مستمر فوق 12% سنوياً', 'حصة سوقية ضخمة في التجزئة المصرفية السعودية', 'عائد قوي على حقوق الملكية يتجاوز 20%'],
      weaknesses: ['مركّز جغرافياً في السوق السعودي بشكل شبه كامل', 'مخاطر ائتمانية مرتبطة ببيئة الفائدة'],
      opportunities: ['التوسع في الخدمات الرقمية والمحافظ الاستثمارية', 'نمو قطاع الرهن العقاري مع رؤية 2030'],
      threats: ['المنافسة المتزايدة من البنوك الرقمية والفنتك', 'تراجع الفوائد قد يضغط على الهوامش'],
      verdict: 'شراء', verdictColor: 'up', summary: 'الراجحي الخيار الأول في القطاع المصرفي السعودي بنمو قوي وعوائد ممتازة. ينبغي الشراء عند مستويات الدعم.'
    }
  };

  const swot = swotMap[s.code] || {
    strengths: ['حضور قوي في السوق السعودي', 'إدارة مالية محافظة', 'قاعدة عملاء مستقرة'],
    weaknesses: ['محدودية التنويع الجغرافي', 'اعتماد على السوق المحلي'],
    opportunities: ['مشاريع رؤية 2030', 'التحول الرقمي', 'نمو الطبقة المتوسطة السعودية'],
    threats: ['المنافسة الإقليمية', 'تقلبات السوق العالمي', 'ضغوط التضخم'],
    verdict: 'محايد', verdictColor: 'amber', summary: `${s.name} شركة بأساسيات متوسطة في قطاع ${s.sector_ar || sectorNames[s.sector]}. مناسبة للمستثمر ذي الأفق المتوسط مع متابعة النتائج الفصلية.`
  };

  const verdictColors = { up: 'var(--up)', down: 'var(--down)', amber: 'var(--amber)' };
  const verdictBg = { up: 'var(--up-bg)', down: 'var(--down-bg)', amber: 'var(--amber-bg)' };

  el.innerHTML = `
  <div class="study-section">
    <div class="study-section-title">📋 ملخص تنفيذي — ${s.name}</div>
    <div class="study-note" style="background:${verdictBg[swot.verdictColor]};border-color:${verdictColors[swot.verdictColor]}20">
      <strong style="color:${verdictColors[swot.verdictColor]}">${swot.verdict}</strong> — ${swot.summary}
    </div>

    <div class="study-section-title" style="margin-top:20px">🔬 تحليل SWOT</div>
    <div class="swot-grid">
      <div class="swot-card s">
        <div class="swot-title"><i class="ti ti-arrow-up-circle"></i> نقاط القوة (Strengths)</div>
        ${swot.strengths.map(i => `<div class="swot-item"><span class="swot-dot" style="background:var(--up)"></span>${i}</div>`).join('')}
      </div>
      <div class="swot-card w">
        <div class="swot-title"><i class="ti ti-alert-triangle"></i> نقاط الضعف (Weaknesses)</div>
        ${swot.weaknesses.map(i => `<div class="swot-item"><span class="swot-dot" style="background:var(--down)"></span>${i}</div>`).join('')}
      </div>
      <div class="swot-card o">
        <div class="swot-title"><i class="ti ti-bulb"></i> الفرص (Opportunities)</div>
        ${swot.opportunities.map(i => `<div class="swot-item"><span class="swot-dot" style="background:var(--blue-text)"></span>${i}</div>`).join('')}
      </div>
      <div class="swot-card t">
        <div class="swot-title"><i class="ti ti-shield-x"></i> التهديدات (Threats)</div>
        ${swot.threats.map(i => `<div class="swot-item"><span class="swot-dot" style="background:var(--amber)"></span>${i}</div>`).join('')}
      </div>
    </div>

    <div class="study-section-title" style="margin-top:20px">📊 ملخص المؤشرات الفنية الحالية</div>
    <div class="study-tech-grid">
      ${buildTechSignals(s)}
    </div>
  </div>`;
}

function buildTechSignals(s) {
  const pe = parseFloat(s.pe) || 0;
  const div = parseFloat(s.div) || 0;
  const roe = parseFloat(s.roe) || 0;

  const signals = [
    { label: 'P/E', val: s.pe, signal: pe < 15 ? 'شراء' : pe < 25 ? 'محايد' : 'مبالغ فيه', color: pe < 15 ? 'up' : pe < 25 ? 'amber' : 'down' },
    { label: 'عائد التوزيع', val: s.div, signal: div > 4 ? 'ممتاز' : div > 2 ? 'جيد' : 'منخفض', color: div > 4 ? 'up' : div > 2 ? 'amber' : 'down' },
    { label: 'ROE', val: s.roe, signal: roe > 15 ? 'ممتاز' : roe > 8 ? 'مقبول' : 'ضعيف', color: roe > 15 ? 'up' : roe > 8 ? 'amber' : 'down' },
    { label: 'PBV', val: s.pbv, signal: parseFloat(s.pbv) < 2 ? 'رخيص' : parseFloat(s.pbv) < 4 ? 'عادل' : 'غالٍ', color: parseFloat(s.pbv) < 2 ? 'up' : parseFloat(s.pbv) < 4 ? 'amber' : 'down' },
  ];

  return signals.map(sig => `
    <div class="study-tech-card">
      <div style="font-size:11px;color:var(--text-tertiary)">${sig.label}</div>
      <div style="font-size:15px;font-weight:600;color:var(--text-primary)">${sig.val}</div>
      <div class="study-tech-signal ${sig.color}">${sig.signal}</div>
    </div>`).join('');
}

// تهيئة التطبيق عند فتح الصفحة

function loadNews() {
  newsLoaded = true;
  renderNewsGrid('all');
}

function filterNews(filter, el) {
  document.querySelectorAll('.news-filter-chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderNewsGrid(filter);
}

function renderNewsGrid(filter) {
  const el = document.getElementById('newsGrid');
  if (!el) return;
  const filtered = filter === 'all' ? newsData : newsData.filter(n => n.category === filter);

  if (!filtered.length) {
    el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary)">لا توجد أخبار في هذه الفئة حالياً</div>`;
    return;
  }

  el.innerHTML = filtered.map((n, i) => {
    const isFeatured = i === 0 && filter === 'all';
    const impactIcon = n.impact === 'pos' ? '↑' : n.impact === 'neg' ? '↓' : '→';
    const impactLabel = n.impact === 'pos' ? 'إيجابي' : n.impact === 'neg' ? 'سلبي' : 'محايد';
    return `
    <a class="news-card${isFeatured ? ' featured' : ''}" href="${n.externalUrl}" target="_blank" rel="noopener noreferrer">
      <div class="news-card-top">
        <div class="news-card-meta">
          <span class="news-source-badge" style="background:${n.sourceBg};color:${n.sourceColor}">${n.source}</span>
          <span class="news-category-badge" style="background:${n.catBg};color:${n.catColor}">${n.catLabel}</span>
          <span class="news-time">${n.time}</span>
        </div>
        <div class="news-card-title">${n.title}</div>
        <div class="news-card-desc">${n.desc}</div>
      </div>
      <div class="news-card-footer">
        <span class="news-card-link"><i class="ti ti-external-link"></i> قراءة المصدر الأصلي</span>
        <span class="news-impact ${n.impact === 'pos' ? 'impact-pos' : n.impact === 'neg' ? 'impact-neg' : 'impact-neu'}">${impactIcon} ${impactLabel}</span>
      </div>
    </a>`;
  }).join('');
}

// ==========================================
// مستشار الـ AI والدعم
// ==========================================
async function callAI(userMsg) {
  chatHistory.push({ role: 'user', content: userMsg });
  if (!API_KEY) return "⚠️ لتفعيل مستشار AI، أضف مفتاح Anthropic API في المتغير <code>API_KEY</code> في بداية ملف app.js.";
  try {
    const s = selectedStock;
    const systemPrompt = `أنت خبير مالي ومحلل أسهم سعودي متخصص. تتحدث باللغة العربية الفصحى السهلة.
السهم المحدد حالياً: ${s.name} (${s.code}) — قطاع ${s.sector_ar || sectorNames[s.sector]}
السعر الحالي: ${s.price} ريال | P/E: ${s.pe} | عائد التوزيعات: ${s.div} | ROE: ${s.roe} | EPS: ${s.eps}
السوق: تداول السعودي (تاسي) | التاريخ: مايو 2026
قواعد الإجابة:
- كن دقيقاً وعملياً مع بيانات السهم المتاحة
- لا تُقدّم توصيات قاطعة بالشراء أو البيع بل تحليلاً متوازناً
- استخدم المصطلحات المالية مع شرحها باللغة العربية
- اذكر عوامل المخاطرة دائماً
- أجوبتك موجزة ومنظمة بنقاط عند الحاجة`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: chatHistory.slice(-12)
      })
    });
    const data = await response.json();
    if (data.error) return `❌ خطأ: ${data.error.message}`;
    const reply = data.content[0].text;
    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (e) {
    return "❌ حدث خطأ في الاتصال بالخادم الذكي. تحقق من اتصالك بالإنترنت.";
  }
}

function addMessage(text, isUser) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (isUser ? 'user' : 'ai');
  div.innerHTML = `<div class="msg-avatar">${isUser ? 'أنت' : '<i class="ti ti-robot"></i>'}</div><div class="msg-bubble">${text}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  const txt = input.value.trim();
  if (!txt) return;
  input.value = '';
  addMessage(txt, true);

  // loading indicator
  const container = document.getElementById('chatMessages');
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'msg ai';
  loadingDiv.id = 'chatLoading';
  loadingDiv.innerHTML = `<div class="msg-avatar"><i class="ti ti-robot"></i></div><div class="msg-bubble"><span class="chat-typing"><span></span><span></span><span></span></span></div>`;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
  if (btn) btn.disabled = true;

  const reply = await callAI(txt);
  const loadEl = document.getElementById('chatLoading');
  if (loadEl) loadEl.remove();
  if (btn) btn.disabled = false;
  addMessage(reply, false);
}

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
function sendQuick(txt) { switchTab('chat', document.querySelectorAll('.tab-btn')[3]); addMessage(txt, true); }

// ==========================================
// بيانات التقييم الشامل ودراسة الـ SWOT (معلومات الأنظمة الاستثمارية)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadStocksData(); // جلب البيانات الحديثة أولاً
  renderStocks(stocks);
  renderGainersLosers();
  updateHero();
});
