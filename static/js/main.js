// ═══════════════════════════════════════════════════════════════════
// FloodGuard Myanmar — Home Page JavaScript
// Scoring engine, flood prediction, and dynamic content rendering.
// ═══════════════════════════════════════════════════════════════════

// ── Scoring Maps ──────────────────────────────────────────────────
// Each key maps a qualitative input to a numeric score used by the
// flood, cholera, and vaccine priority scoring functions below.
const SM = {
  hist_flood: {"High": 4, "Medium": 2, "Low": 1},
  rain_int:   {"High": 4, "Medium": 3},
  rain_dur:   {"Long": 4, "Moderate": 3},
  s_moist:    {"High": 4, "Medium": 3},
  riv_flow:   {"High": 5, "Medium": 3},
  elev:       {"Low": 5, "High": 1},
  slope:      {"Flat": 5, "Steep": 1},
  drain:      {"Poor": 5, "Moderate": 3},
  urban:      {"High": 4, "Medium": 2},
  veg:        {"High": 2, "Medium": 3},
  chol_hist:  {"High": 4, "Medium": 3, "Low": 1},
  wq:         {"Poor": 4, "Variable": 3, "Good": 2},
  sanit:      {"Poor": 4, "Variable": 3, "Moderate": 3},
  cw:         {"Limited": 4, "Moderate": 3, "Good": 2},
  temp:       {"Tropical": 3, "Temperate": 1},
  pop:        {"High": 4, "Medium": 3, "Low": 2},
  t_out:      {"Recent": 4, "Unknown": 2, "Long ago": 1},
  hcov:       {"Low": 4, "Moderate": 3, "High": 2},
  mob:        {"High": 4, "Medium": 3},
  vup:        {"Low": 4, "Moderate": 3, "High": 2},
  fsev:       {"High": 4, "Medium": 3, "Low": 2},
  cpro:       {"High": 4, "Medium": 3, "Low": 2},
  acc:        {"Low": 1, "Medium": 3, "High": 5},
  vuln:       {"High": 4, "Medium": 3, "Low": 2},
  cold:       {"Poor": 4, "Moderate": 3, "Good": 2},
  disp:       {"High": 4, "Medium": 3, "Low": 2},
  spd:        {"High": 4, "Medium": 3}
};

// Map value helper: looks up v in mapping m, returns default d=3 if not found
const mv = (v, m, d = 3) => m[v] !== undefined ? m[v] : d;

// ── Composite Score Functions ─────────────────────────────────────

// Flood risk score (max ≈ 50): terrain, hydrology, rainfall inputs
function floodScore(r) {
  return mv(r.hist_flood, SM.hist_flood) + mv(r.rain_int, SM.rain_int) +
         mv(r.rain_dur,  SM.rain_dur)   + mv(r.s_moist,  SM.s_moist)  +
         mv(r.riv_flow,  SM.riv_flow)   + mv(r.elev,     SM.elev)     +
         mv(r.slope,     SM.slope)      + mv(r.drain,    SM.drain)    +
         mv(r.urban,     SM.urban)      + mv(r.veg,      SM.veg);
}

// Cholera risk score (max ≈ 45): WASH, population density, outbreak history
function choleraScore(r) {
  return mv(r.chol_hist, SM.chol_hist) + mv(r.wq,    SM.wq)   +
         mv(r.sanit,     SM.sanit)     + mv(r.cw,    SM.cw)   +
         mv(r.temp,      SM.temp)      + mv(r.pop,   SM.pop)  +
         mv(r.t_out,     SM.t_out)     + mv(r.hcov,  SM.hcov) +
         mv(r.mob,       SM.mob);
}

// Vaccine priority score (max ≈ 115): combines flood + cholera + logistics factors
function vaccineScore(r, fs, cs) {
  return fs + cs +
         mv(r.fsev, SM.fsev) + mv(r.cpro, SM.cpro) + mv(r.pop,  SM.pop)  +
         mv(r.acc,  SM.acc)  + mv(r.cold, SM.cold)  + mv(r.vuln, SM.vuln) +
         mv(r.disp, SM.disp) + mv(r.spd,  SM.spd)   + mv(r.vup,  SM.vup);
}

// Classify vaccine priority based on combined score thresholds
function classify(s) { return s >= 77 ? "URGENT" : s >= 54 ? "PREPARE" : "LOW"; }

// ── Flood Prediction (Linear Regression) ─────────────────────────

// Fit a linear trend to a 5-year array and return the next predicted value
function linearTrend(data) {
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  const slope = data.reduce((s, y, i) => s + (i - xMean) * (y - yMean), 0) /
                data.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  return { slope, intercept, next: intercept + slope * n };
}

// Predict 2026 flood probability using historical class, score, and 5-year trend
function predictFloodProb(histFlood, floodSc, fs_norm, flood5yr) {
  const base = histFlood === "High" ? 0.78 : histFlood === "Medium" ? 0.52 : 0.28;
  const trend = linearTrend(flood5yr || []);
  const trendBoost = flood5yr
    ? Math.min(0.15, Math.max(-0.15, (trend.slope / Math.max(trend.next, 1)) * 2))
    : 0;
  const scoreBoost = (fs_norm - 0.5) * 0.3;
  return Math.min(0.98, Math.max(0.05, base + scoreBoost + trendBoost));
}

// ── Region Dataset ────────────────────────────────────────────────
// Raw input data for all 15 Myanmar states/regions.
// Fields: population, cholera cases (5yr), annual flood events (5yr),
// vaccine need factor, current supply, and qualitative risk attributes.
const RAW = [
  {id:"kachin",      name:"Kachin State",
   pop:1689000, chol5yr:3200,  flood5yr:[11,9,14,12,14], vaccine_need_factor:0.14,
   current_supply:9800,  vaccines_allocated:12600,
   hist_flood:"Medium", rain_int:"Medium", rain_dur:"Moderate", s_moist:"Medium", riv_flow:"Medium",
   elev:"High",  slope:"Steep", drain:"Moderate", urban:"Medium", veg:"High",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Temperate",
   pop_d:"Medium", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"Low",  vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"Medium", vup:"Moderate"},

  {id:"sagaing",     name:"Sagaing Region",
   pop:5325000, chol5yr:11400, flood5yr:[28,31,26,35,38], vaccine_need_factor:0.21,
   current_supply:28000, vaccines_allocated:55000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"Medium", veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"High", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"High",  cpro:"Medium", acc:"Low",  vuln:"Medium", cold:"Moderate", disp:"High",   spd:"High",   vup:"Moderate"},

  {id:"chin",        name:"Chin State",
   pop:478000,  chol5yr:420,   flood5yr:[2,4,3,5,5],    vaccine_need_factor:0.08,
   current_supply:4200,  vaccines_allocated:3500,
   hist_flood:"Low",    rain_int:"Medium", rain_dur:"Moderate", s_moist:"Medium", riv_flow:"Medium",
   elev:"High",  slope:"Steep", drain:"Moderate", urban:"Medium", veg:"High",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Temperate",
   pop_d:"Low",  t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"Low", vuln:"Medium", cold:"Moderate", disp:"Low", spd:"Medium", vup:"Moderate"},

  {id:"mandalay",    name:"Mandalay Region",
   pop:6165000, chol5yr:8900,  flood5yr:[18,16,22,19,22], vaccine_need_factor:0.12,
   current_supply:52000, vaccines_allocated:60000,
   hist_flood:"Medium", rain_int:"Medium", rain_dur:"Moderate", s_moist:"Medium", riv_flow:"Medium",
   elev:"Low",   slope:"Flat",  drain:"Moderate", urban:"High",   veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"High", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"High", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"High", vup:"Moderate"},

  {id:"shan",        name:"Shan State",
   pop:5820000, chol5yr:6800,  flood5yr:[20,18,25,23,26], vaccine_need_factor:0.13,
   current_supply:31000, vaccines_allocated:51000,
   hist_flood:"Medium", rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"High",  slope:"Steep", drain:"Moderate", urban:"Medium", veg:"High",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Temperate",
   pop_d:"Medium", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"Low", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"Medium", vup:"Moderate"},

  {id:"kayah",       name:"Kayah State",
   pop:286000,  chol5yr:310,   flood5yr:[3,2,4,3,4],    vaccine_need_factor:0.07,
   current_supply:2800,  vaccines_allocated:2200,
   hist_flood:"Low",    rain_int:"Medium", rain_dur:"Moderate", s_moist:"Medium", riv_flow:"Medium",
   elev:"High",  slope:"Steep", drain:"Moderate", urban:"Medium", veg:"High",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"Low",  t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"Low", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"Medium", vup:"Moderate"},

  {id:"kayin",       name:"Kayin State",
   pop:1574000, chol5yr:5200,  flood5yr:[22,25,20,28,30], vaccine_need_factor:0.18,
   current_supply:12000, vaccines_allocated:25000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"Medium", veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"Medium", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"High",  cpro:"Medium", acc:"Low",  vuln:"Medium", cold:"Moderate", disp:"High", spd:"High", vup:"Moderate"},

  {id:"bago",        name:"Bago Region",
   pop:4867000, chol5yr:9800,  flood5yr:[30,28,36,34,37], vaccine_need_factor:0.19,
   current_supply:38000, vaccines_allocated:58000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"High",   veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"High", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"High",  cpro:"Medium", acc:"High", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"High", vup:"Moderate"},

  {id:"magway",      name:"Magway Region",
   pop:3913000, chol5yr:4400,  flood5yr:[12,11,15,14,15], vaccine_need_factor:0.11,
   current_supply:34000, vaccines_allocated:36000,
   hist_flood:"Medium", rain_int:"Medium", rain_dur:"Moderate", s_moist:"Medium", riv_flow:"Medium",
   elev:"Low",   slope:"Flat",  drain:"Moderate", urban:"Medium", veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"Medium", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"High", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"Medium", vup:"Moderate"},

  {id:"mon",         name:"Mon State",
   pop:2054000, chol5yr:7600,  flood5yr:[32,35,30,38,40], vaccine_need_factor:0.20,
   current_supply:18000, vaccines_allocated:34000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"High",   veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"High", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"High",  cpro:"Medium", acc:"High", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"High", vup:"Moderate"},

  {id:"ayeyarwady",  name:"Ayeyarwady Region",
   pop:6184000, chol5yr:18400, flood5yr:[45,48,44,52,55], vaccine_need_factor:0.25,
   current_supply:41000, vaccines_allocated:92000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"High",   veg:"Medium",
   chol_hist:"High",   wq:"Poor",     sanit:"Poor",    cw:"Limited", temp:"Tropical",
   pop_d:"High", t_out:"Recent",  hcov:"Low",     mob:"High",
   fsev:"High",  cpro:"High",   acc:"Low",  vuln:"High",   cold:"Poor",     disp:"High", spd:"High", vup:"Low"},

  {id:"yangon",      name:"Yangon Region",
   pop:7360000, chol5yr:7200,  flood5yr:[22,20,26,24,27], vaccine_need_factor:0.13,
   current_supply:88000, vaccines_allocated:80000,
   hist_flood:"Medium", rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"High",   veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"High", t_out:"Unknown", hcov:"Moderate", mob:"High",
   fsev:"High",  cpro:"Medium", acc:"High", vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"High", vup:"Moderate"},

  {id:"tanintharyi", name:"Tanintharyi Region",
   pop:1408000, chol5yr:4100,  flood5yr:[24,22,28,30,32], vaccine_need_factor:0.17,
   current_supply:11000, vaccines_allocated:21000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"Medium", veg:"High",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"Medium", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"High",  cpro:"Medium", acc:"Low",  vuln:"Medium", cold:"Moderate", disp:"Medium", spd:"Medium", vup:"Moderate"},

  {id:"naypyitaw",   name:"Nay Pyi Taw",
   pop:1160000, chol5yr:900,   flood5yr:[5,4,6,5,6],    vaccine_need_factor:0.08,
   current_supply:14000, vaccines_allocated:10000,
   hist_flood:"Low",    rain_int:"Medium", rain_dur:"Moderate", s_moist:"Medium", riv_flow:"Medium",
   elev:"Low",   slope:"Flat",  drain:"Moderate", urban:"Medium", veg:"Medium",
   chol_hist:"Medium", wq:"Variable", sanit:"Variable", cw:"Moderate", temp:"Tropical",
   pop_d:"Medium", t_out:"Unknown", hcov:"Moderate", mob:"Medium",
   fsev:"Medium", cpro:"Medium", acc:"High", vuln:"Medium", cold:"Moderate", disp:"Low", spd:"Medium", vup:"Moderate"},

  {id:"rakhine",     name:"Rakhine State",
   pop:2098000, chol5yr:6200,  flood5yr:[35,32,38,42,45], vaccine_need_factor:0.22,
   current_supply:15000, vaccines_allocated:40000,
   hist_flood:"High",   rain_int:"High",   rain_dur:"Long",     s_moist:"High",   riv_flow:"High",
   elev:"Low",   slope:"Flat",  drain:"Poor",    urban:"Medium", veg:"Medium",
   chol_hist:"High",   wq:"Poor",     sanit:"Poor",    cw:"Limited", temp:"Tropical",
   pop_d:"High", t_out:"Recent",  hcov:"Low",     mob:"Medium",
   fsev:"High",  cpro:"High",   acc:"Low",  vuln:"High",   cold:"Poor",     disp:"High", spd:"High", vup:"Low"}
];

// ── Compute All Scores ────────────────────────────────────────────
// Run the scoring engine over RAW and produce the final REGIONS array
const REGIONS = RAW.map(r => {
  const fs = floodScore(r);
  const cs = choleraScore(r);
  const vs = vaccineScore(r, fs, cs);
  const action = classify(vs);
  const fs_norm = fs / 50;
  const floodProb = predictFloodProb(r.hist_flood, fs, fs_norm, r.flood5yr);
  const need = Math.round(r.pop * r.vaccine_need_factor);
  const gap = Math.max(0, need - r.current_supply);
  const coverPct = Math.min(100, Math.round((r.current_supply / need) * 100));
  return { ...r, pop_d: r.pop_d || "Medium", fs, cs, vs, action, floodProb, need, gap, coverPct };
});

// ── Display Helpers ───────────────────────────────────────────────
// Colour per action level
const AC  = a => a === "URGENT" ? "#ff2d2d" : a === "PREPARE" ? "#f59e0b" : "#10b981";
// Human-readable label per action level
const AL  = a => a === "URGENT" ? "☢ URGENT RESPONSE" : a === "PREPARE" ? "⚠️ PREPARE RESPONSE" : "✓ LOW PRIORITY";
// CSS class suffix per action level
const ACL = a => a === "URGENT" ? "urgent" : a === "PREPARE" ? "prepare" : "low";

// ── Scroll Helper ─────────────────────────────────────────────────
// Smoothly scroll to a section by element id (used by nav and hero button)
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ── Flood Canvas Animation ────────────────────────────────────────
// Draws a looping animated flood scene (rain drops + water waves + silhouettes)
// on the hero canvas element.
function initFloodCanvas() {
  const canvas = document.getElementById('flood-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, waves = [];

  // Resize canvas to fill its container
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  // Five layered water wave objects (depth illusion via opacity + amplitude)
  for (let i = 0; i < 5; i++) {
    waves.push({
      y: H * (0.55 + i * 0.08), amp: 12 + i * 6, freq: 0.008 - i * 0.001,
      speed: 0.3 + i * 0.15, phase: i * Math.PI / 3,
      color: `rgba(14,165,233,${0.04 + i * 0.025})`
    });
  }

  // Rain drop particles
  const drops = Array.from({ length: 180 }, () => ({
    x: Math.random() * 2000, y: Math.random() * 1000,
    len: 8 + Math.random() * 14, speed: 6 + Math.random() * 8,
    opacity: 0.03 + Math.random() * 0.08
  }));

  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Dark stormy sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#010408');
    sky.addColorStop(0.4, '#03070f');
    sky.addColorStop(0.7, '#050d18');
    sky.addColorStop(1, '#071525');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Diagonal rain streaks
    ctx.save();
    drops.forEach(d => {
      ctx.strokeStyle = `rgba(100,180,255,${d.opacity})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
      ctx.stroke();
      d.y += d.speed;
      if (d.y > H) { d.y = -20; d.x = Math.random() * W; }
    });
    ctx.restore();

    // Layered sinusoidal water waves
    waves.forEach(w => {
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const y = w.y + Math.sin(x * w.freq + t * w.speed + w.phase) * w.amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    });

    // Submerged silhouettes (huts and trees)
    ctx.fillStyle = 'rgba(2,6,12,0.9)';
    [[60, H - 80, 40, 50], [180, H - 60, 30, 40], [320, H - 70, 50, 60],
     [500, H - 55, 35, 45], [680, H - 75, 45, 55]].forEach(([x, y, w, h]) => {
      if (x < W) {
        ctx.fillRect(x, y, w, h);
        ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + w / 2, y - 18); ctx.lineTo(x + w + 4, y); ctx.fill();
      }
    });
    [[100, H - 50], [260, H - 60], [420, H - 45], [580, H - 55], [740, H - 50]].forEach(([x, y]) => {
      if (x < W) {
        ctx.fillRect(x - 3, y - 20, 6, 30);
        ctx.beginPath(); ctx.arc(x, y - 30, 16, 0, Math.PI * 2); ctx.fill();
      }
    });

    t += 0.015;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Home Page Initialisation ──────────────────────────────────────
// Populates all dynamic sections (stats, ticker, charts, cards, etc.)
function initHome() {
  initFloodCanvas();

  // Hero stat strip
  const urgent  = REGIONS.filter(r => r.action === "URGENT").length;
  const prepare = REGIONS.filter(r => r.action === "PREPARE").length;
  const low     = REGIONS.filter(r => r.action === "LOW").length;
  const totalChol = REGIONS.reduce((s, r) => s + r.chol5yr, 0);
  document.getElementById('hero-stats').innerHTML = [
    {n: urgent,                         l: "Urgent Regions",     c: "var(--urgent)"},
    {n: prepare,                        l: "Prepare Regions",    c: "var(--prepare)"},
    {n: low,                            l: "Safe Regions",       c: "var(--low)"},
    {n: (totalChol / 1000).toFixed(0) + "K", l: "Cholera Cases (5yr)", c: "var(--text-mid)"}
  ].map(s => `<div class="hstat"><div class="hstat-num" style="color:${s.c}">${s.n}</div><div class="hstat-label">${s.l}</div></div>`).join('');

  // Alert ticker (non-LOW regions only, duplicated for infinite scroll)
  const ticks = REGIONS.filter(r => r.action !== "LOW")
    .map(r => `<div class="tick-item"><div class="tick-sep"></div>${r.name.toUpperCase()} — ${AL(r.action)}</div>`)
    .join('');
  document.getElementById('ticker-inner').innerHTML = ticks + ticks;

  // National flood events bar chart (2021–2025, last value is estimated via regression)
  const years = ['2021', '2022', '2023', '2024', '2025'];
  const floodYrData = [168, 158, 192, 211, 229];
  const maxF = Math.max(...floodYrData);

  // Cholera cases bar chart (2021–2025, 2025 value extrapolated)
  const cholYr = [15800, 13200, 18600, 24200, 27800];
  const maxC = Math.max(...cholYr);
 

  // Prediction summary cards (forecast + top risk regions + supply gap)
  const topRisk = [...REGIONS].sort((a, b) => b.floodProb - a.floodProb).slice(0, 3);
  const n = floodYrData.length;
  const xs = floodYrData.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = floodYrData.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s, x, i) => s + (x - xMean) * (floodYrData[i] - yMean), 0) /
                xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  const predicted2026 = Math.round(intercept + slope * n);
  const pctChange = (((predicted2026 - floodYrData[4]) / floodYrData[4]) * 100).toFixed(1);



  // Year-by-year cholera stats strip in the burden banner
  document.getElementById('year-stats').innerHTML = years.map((y, i) => `
    <div class="ystat"><div class="ystat-y">${y}</div><div class="ystat-v">${(cholYr[i] / 1000).toFixed(1)}K</div></div>`).join('');

  // Vaccine supply cards (sorted by largest deficit first)
  const byUrgency = [...REGIONS].sort((a, b) => b.gap - a.gap);
  

  // Latest news / alert items
  const news = [
    {tag:"tag-urgent", tagT:"🔴 URGENT", main:true,  title:"Ayeyarwady Delta: Worst Flooding in 5 Years",
     body:"River monitoring stations at Maubin and Myaungmya recorded levels 2.3m above the danger threshold. Immediate deployment of 92,000 cholera vaccine doses has been ordered. Flood probability for the region is modelled at 96% for the coming fortnight.",
     date:"2 hours ago"},
    {tag:"tag-update", tagT:"⚠ UPDATE",  main:false, title:"Sagaing Vaccine Pre-Positioning Complete",    date:"4 hours ago"},
    {tag:"tag-urgent", tagT:"🔴 ALERT",  main:false, title:"Rakhine Cyclone Warning — Travel Suspended",  date:"3 hours ago"},
    {tag:"tag-update", tagT:"⚠ UPDATE",  main:false, title:"Mon State: 34,000 doses en route",            date:"8 hours ago"},
    {tag:"tag-info",   tagT:"ℹ INFO",    main:false, title:"New cold-chain hub operational in Mandalay",  date:"1 day ago"}
  ];
  const mainN = news.find(n => n.main);
  const sideN = news.filter(n => !n.main);
  document.getElementById('news-layout').innerHTML = `
    <div class="news-main">
      <span class="news-main-tag ${mainN.tag}">${mainN.tagT}</span>
      <div class="news-main-title">${mainN.title}</div>
      <div class="news-main-body">${mainN.body}</div>
      <div class="news-meta">${mainN.date} · Predict and Protect (PaP)</div>
    </div>
    <div class="news-side">${sideN.map(n => `
      <div class="news-mini">
        <span class="news-main-tag ${n.tag}" style="font-size:0.52rem;padding:2px 6px">${n.tagT}</span>
        <div class="news-mini-title">${n.title}</div>
        <div class="news-mini-meta">${n.date}</div>
      </div>`).join('')}
    </div>`;

  // Public safety guidance cards
  const safety = [
    {icon:"🏃", title:"Evacuate Early",       desc:"Leave before water enters. Don't wait for official orders if water is rising."},
    {icon:"🚫", title:"Avoid Floodwater",     desc:"Contaminated water carries cholera, typhoid and leptospirosis. Don't wade through it."},
    {icon:"💧", title:"ORS Packets",          desc:"Severe diarrhoea? Use Oral Rehydration Salts immediately and reach a health facility fast."},
    {icon:"📦", title:"72hr Emergency Kit",   desc:"Food, water, medication, documents, torch in a waterproof bag. Prepare before monsoon."},
    {icon:"📻", title:"Monitor Alerts",       desc:"Keep a battery radio. Mobile networks often fail during severe flooding."},
    {icon:"💉", title:"Get Vaccinated",       desc:"Free oral cholera vaccines at township health departments. Get protected before the season."},
    {icon:"🩺", title:"Report Illness Clusters", desc:"Sudden diarrhoea or fever in the community? Report to health workers immediately."},
    {icon:"🏔", title:"Move to High Ground", desc:"Know your nearest elevated evacuation point before floods start. Plan your route now."}
  ];
  document.getElementById('safety-grid').innerHTML = safety.map(s =>
    `<div class="safety-card"><div class="safety-icon">${s.icon}</div><div class="safety-title">${s.title}</div><div class="safety-desc">${s.desc}</div></div>`
  ).join('');

  // Travel advisory cards
  const travel = [
    {f:"🌊", r:"Ayeyarwady", chip:"chip-critical", ct:"DO NOT TRAVEL",     d:"Severe active flooding. All access roads cut off.",          color:"var(--urgent)"},
    {f:"⛵", r:"Rakhine",    chip:"chip-critical", ct:"DO NOT TRAVEL",     d:"Active cyclone warning + coastal surge risk.",               color:"var(--urgent)"},
    {f:"🌿", r:"Kayin",      chip:"chip-low",      ct:"HIGH CAUTION",      d:"Flash flood risk in river valleys. Monitor daily.",          color:"var(--prepare)"},
    {f:"🏙", r:"Yangon",     chip:"chip-low",      ct:"EXERCISE CAUTION",  d:"Urban flooding possible in low-lying areas.",               color:"var(--prepare)"},
    {f:"🏛", r:"Mandalay",   chip:"chip-ok",       ct:"GENERALLY SAFE",    d:"Monitor conditions. Some routes may be affected.",          color:"var(--low)"},
    {f:"🏔", r:"Chin State", chip:"chip-ok",       ct:"LOW RISK",          d:"Mountainous terrain. Lower flood probability.",             color:"var(--low)"}
  ];
  document.getElementById('travel-grid').innerHTML = travel.map(t =>
    `<div class="travel-card">
      <div class="t-flag">${t.f}</div>
      <div class="t-region">${t.r}</div>
      <span class="t-chip ${t.chip}" style="color:${t.color}">${t.ct}</span>
      <div class="t-desc">${t.d}</div>
    </div>`
  ).join('');

  // Footer timestamp (shows page-load time so users know data is current)
  document.getElementById('last-updated').textContent =
    new Date().toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
}

// ── Entry Point ───────────────────────────────────────────────────
initHome();
