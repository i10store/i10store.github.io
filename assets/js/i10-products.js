/* =========================================================
   i10 PRODUCTS - upgraded (search, sort, popup, order post)
   Replace your existing assets/js/i10-products.js with this
   ========================================================= */

/* ========== CONFIG ========== */
const SHEET_API = "https://script.google.com/macros/s/AKfycbz_VXu0A5pFgx2xjRmbIWrr35PAtD5Um4GAmlBKWgbYw3fuJdi1XArihhAUo211m-ZznA/exec"; // <-- giữ link Web App của bạn
const SITE_LOGO = "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000"; // logo nhỏ sẽ hiển thị trong popup
const THEME = "#76b500"; // Màu chủ đạo i10

/* ============================ */

/* Helper: fetch JSON */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts));
  if (!res.ok) {
    const txt = await res.text().catch(()=>"");
    throw new Error("Lỗi mạng: " + res.status + " " + txt);
  }
  return res.json();
}

/* Utility: debounce */
function debounce(fn, wait=250){
  let t;
  return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); };
}

/* Render control bar: sort + search */
function renderControls(container, onChange) {
  const ctrl = document.createElement('div');
  ctrl.style.cssText = "display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;";

  // sort
  const sel = document.createElement('select');
  sel.className = "form-control";
  sel.style.cssText = "width:220px;padding:6px 8px;";
  sel.innerHTML = `
    <option value="default">Sắp xếp: Mặc định</option>
    <option value="price_asc">Giá: Tăng dần</option>
    <option value="price_desc">Giá: Giảm dần</option>
  `;
  ctrl.appendChild(sel);

  // search
  const input = document.createElement('input');
  input.type = "search";
  input.placeholder = "Tìm theo tên, GPU, máy trạm, văn phòng,...";
  input.style.cssText = "flex:1;min-width:220px;padding:8px;border-radius:4px;border:1px solid #ccc;";
  ctrl.appendChild(input);

  // clear button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = "🧹 Xóa";
  clearBtn.style.cssText = `
    background:#e74c3c;
    color:#fff;
    border:none;
    padding:8px 14px;
    border-radius:6px;
    font-weight:600;
    cursor:pointer;
    transition:background 0.2s;
  `;
  clearBtn.style.marginLeft = "6px";
  clearBtn.onclick = ()=>{
    input.value = "";
    sel.value = "default";
    onChange({ q:"", sort:"default" });
  };
  ctrl.appendChild(clearBtn);
    // refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.className = "btn btn-secondary";
  refreshBtn.textContent = "🔄 Làm mới";
  refreshBtn.style.cssText = `
  background:${THEME};
  color:#fff;
  border:none;
  padding:8px 14px;
  border-radius:6px;
  font-weight:600;
  cursor:pointer;
  transition:background 0.2s;
`;

  refreshBtn.style.marginLeft = "6px";
  refreshBtn.onclick = ()=>{
    localStorage.removeItem("i10_products_cache_v1");
    location.reload();
  };
  ctrl.appendChild(refreshBtn);


    // link danh sách còn hàng (link tĩnh)
    // === Link danh sách lọc tĩnh ===
  const linksWrap = document.createElement('div');
  linksWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:14px;";
  linksWrap.style.display = "none"; // Ẩn toàn bộ link lọc tĩnh, chỉ dùng nội bộ

  const base = window.location.origin + window.location.pathname;
  const filters = [
    { key: "available", label: "📦 Còn hàng", color: "#27ae60" },
    { key: "sold", label: "🟥 Đã bán", color: "#e74c3c" },
    { key: "maytram", label: "💻 Máy trạm", color: "#2980b9" },
    { key: "vanphong", label: "🧾 Văn phòng", color: "#8e44ad" },
    { key: "thinkpad", label: "💼 ThinkPad", color: "#2c3e50" },
    { key: "dell", label: "🖥️ Dell", color: "#16a085" }
  ];

  filters.forEach(f => {
    const a = document.createElement('a');
    a.textContent = f.label;
    a.href = `${base}?filter=${f.key}`;
    a.style.cssText = `
      color:${f.color};font-weight:600;text-decoration:none;
      padding:4px 8px;border:1px solid ${f.color};border-radius:6px;
      transition:all 0.2s;display:inline-block;
    `;
    a.onmouseenter = () => a.style.background = f.color, a.style.color = "#fff";
    a.onmouseleave = () => a.style.background = "transparent", a.style.color = f.color;
    linksWrap.appendChild(a);
  });

  ctrl.appendChild(linksWrap);




  // event handlers
  const trigger = debounce(()=> onChange({ q: input.value.trim(), sort: sel.value }), 180);
  input.addEventListener('input', trigger);
  sel.addEventListener('change', ()=> onChange({ q: input.value.trim(), sort: sel.value }));

  container.prepend(ctrl);
  return { input, sel };
}

/* Convert price field to number for sorting (if possible) */
function extractPriceNum(p) {
  if (p == null) return Infinity;
  if (typeof p === 'number') return p;
  const s = String(p).replace(/[^\d.,]/g, '').replace(',', '.');
  const m = parseFloat(s);
  return isNaN(m) ? Infinity : m;
}

/* Render danh sách sản phẩm (với search/sort) */
async function renderProductGrid() {
  const container = document.getElementById("i10-product");
  if (!container) return;
  container.innerHTML = `<div style="padding:20px;">Đang cập nhật thông tin sản phẩm mới nhất... </br></br> Hãy chờ vài giây nhé...</div>`;

  try {
    // ----- CACHE LOGIC -----
const CACHE_KEY = "i10_products_cache_v1";
const CACHE_TTL = 30 * 60 * 1000; // 30 phút
let data = null;

try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { timestamp, items } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      console.log("✅ Dùng cache sản phẩm");
      data = items;
    }
  }
} catch(e) {
  console.warn("Cache parse error", e);
}

// Nếu không có cache hoặc hết hạn → fetch mới
if (!data) {
  console.log("🌐 Fetch mới sản phẩm từ server...");
  data = await fetchJSON(SHEET_API);
  // Lưu cache
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    timestamp: Date.now(),
    items: data
  }));
}

    if (!Array.isArray(data)) throw new Error("Dữ liệu trả về không phải mảng");

    // place controls
    container.innerHTML = `<div id="i10-controls"></div><div id="i10-grid"></div>`;
    const controlsEl = document.getElementById('i10-controls');
    const gridEl = document.getElementById('i10-grid');

    // initial state + kiểm tra query string - lọc - tìm kiếm
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    let defaultQuery = "";

    switch (filter) {
      case "available": defaultQuery = "còn"; break;
      case "sold": defaultQuery = "đã bán"; break;
      case "maytram": defaultQuery = "máy trạm"; break;
      case "vanphong": defaultQuery = "văn phòng"; break;
      case "thinkpad": defaultQuery = "thinkpad"; break;
      case "dell": defaultQuery = "dell"; break;
      default: defaultQuery = "";
    }

    let state = { q: defaultQuery, sort: "default", items: data };



    // search+sort handler
    const doRender = ({ q, sort } = {}) => {
      if (q !== undefined) state.q = q;
      if (sort !== undefined) state.sort = sort;

      // filter: brand, model, name, RAM (case-insensitive)
      const qstr = (state.q || "").toLowerCase();
      let list = state.items.filter(p => {
        if (!qstr) return true;
        const fields = [
          p["Brand"] || "",
          p["Model"] || "",
          p["Name"] || "",
          p["RAM"] || "",
          p["Phân loại"] || "",
          p["T.THÁI"] || "",
          p["GPU - CARD"] || ""
        ].join(' ').toLowerCase();
        return fields.indexOf(qstr) !== -1;
      });

      // sort
      if (state.sort === "price_asc") {
        list.sort((a,b)=> extractPriceNum(a["Price"]) - extractPriceNum(b["Price"]));
      } else if (state.sort === "price_desc") {
        list.sort((a,b)=> extractPriceNum(b["Price"]) - extractPriceNum(a["Price"]));
      } // default: keep sheet order

      // render cards - 3 per row (Bootstrap classes used)
            // render cards - 3 per row (Bootstrap classes used)
      const html = list.map((p) => {
        const title = `${p["Brand"] || ""} ${p["Model"] || ""}`.trim() || (p["Name"] || "Sản phẩm");

        const sortedImgs = (p.images || []).slice().sort((a,b) => (a.name||"").localeCompare(b.name||""));
        const mainImg = (sortedImgs[0]?.thumb?.replace("=s220", "=s1000")) || SITE_LOGO;

        // ---- Giá / trạng thái ----
        let priceText = "Liên hệ";
        if (p["T.THÁI"] && p["T.THÁI"].toLowerCase().includes("đã bán")) {
          priceText = "Tạm hết hàng";
        } else if (p["Price"]) {
          const num = parseFloat(p["Price"]) * 1000000;
          priceText = `~${num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₫`;
        } else if (p["PRICE SEGMENT"]) {
          priceText = p["PRICE SEGMENT"];
        }

        // ---- Dòng cấu hình ----
        let config = [];
        if (p["CPU"]) config.push(p["CPU"]);
        if (p["RAM"]) config.push(p["RAM"]);
        if (p["SSD"]) config.push(p["SSD"]);
        if (p["GPU - CARD"] && p["GPU - CARD"].toLowerCase() !== "onboard") config.push(p["GPU - CARD"]);

        const jsonData = encodeURIComponent(JSON.stringify(p));
        return `
          <div class="col-sm-6 col-md-4 product-item" style="margin-bottom:22px;">
            <div class="product-card" style="
                border:1px solid #eee;
                border-radius:10px;
                overflow:hidden;
                background:#fff;
                height:380px;
                display:flex;
                flex-direction:column;
                justify-content:space-between;
                box-shadow:0 6px 18px rgba(0,0,0,0.06);
                transition:transform .28s, box-shadow .28s;
                cursor:pointer;"
                onclick="openProductPopup('${jsonData}')">

              <div class="thumb" style="overflow:hidden;height:230px;display:flex;border-radius:6px;align-items:center;justify-content:center;background:#fafafa;">
                <img src="${mainImg}" alt="${title}" onerror="this.src='${SITE_LOGO}'"
                     style="width:86%;height:230px;object-fit:cover;transition:transform .4s ease;">
              </div>

              <div style="padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;flex:1;">
                <div>
                  <h4 style="font-size:16px;font-weight:700;margin:0 0 6px 0;color:#2c3e50;min-height:42px;line-height:1.3;overflow:hidden;">${title}</h4>
                  <div style="font-size:13px;color:#666;">${config.join(" • ")}</div>
                </div>
                <div style="color:${THEME};font-weight:800;margin-top:8px;font-size:16px">${priceText}</div>
              </div>
            </div>
          </div>`;
      }).join("");


      gridEl.innerHTML = `<div class="row">${html}</div>`;

      // hover effect
      document.querySelectorAll("#i10-grid .product-card").forEach(card => {
        card.addEventListener("mouseenter", () => {
          card.style.transform = "translateY(-6px)";
          card.style.boxShadow = "0 18px 40px rgba(0,0,0,0.09)";
          const img = card.querySelector("img");
          if (img) img.style.transform = "scale(1.15)";
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform = "translateY(0)";
          card.style.boxShadow = "0 6px 18px rgba(0,0,0,0.06)";
          const img = card.querySelector("img");
          if (img) img.style.transform = "scale(1)";
        });
      });

    };

    // render controls and attach handler
    renderControls(controlsEl, ({ q, sort }) => {
      doRender({ q, sort });
    });

    // nếu có query filter, tự động render theo
    if (state.q) doRender({ q: state.q, sort: "default" });

    // initial render
    doRender();

  } catch (err) {
    container.innerHTML = `<div style="padding:20px;color:red;">Lỗi tải sản phẩm: ${err.message}</div>`;
    console.error(err);
  }
}


/* -----------------------------
   Popup hiển thị ảnh & chi tiết
   ----------------------------- */
function openProductPopup(encoded) {
  try {
    const product = JSON.parse(decodeURIComponent(encoded));
    const titleText = `${product["Brand"] || ""} ${product["Model"] || ""}`.trim() || (product["Name"] || "Sản phẩm");

    // === HÌNH ẢNH ===
    const sortedImgs = (product.images || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const images = sortedImgs.map(x => (x.thumb || x.url || "").replace("=s220", "=s1600")).filter(Boolean);
    if (!images.length) images.push(SITE_LOGO); // fallback logo

    let currentIndex = 0;
    let autoplayTimer = null;

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "i10-popup-overlay";
    overlay.style.cssText = `
      position:fixed;inset:0;background:translation;
      display:flex;align-items:center;justify-content:center;z-index:9999;
      padding:10px;animation:fadeIn 0.3s ease; margin-top: 30px;
    `;

    // Card container
    const card = document.createElement("div");
    card.style.cssText = `
      width:100%;max-width:1000px;background:#fefef5;border-radius:18px;
      display:flex;gap:20px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.3);
      transform:translateY(30px);opacity:0;animation:slideUpFade .45s ease forwards;
      padding:20px 24px;position:relative;
    `;

    // === LEFT: Ảnh sản phẩm ===
    const left = document.createElement("div");
    left.style.cssText = `
      flex:1;min-width:420px;display:flex;flex-direction:column;align-items:center;
      justify-content:center;position:relative;margin-left:12px;
    `;

    // Ảnh chính
    const mainImgWrap = document.createElement("div");
    mainImgWrap.style.cssText = `
      width:100%;display:flex;align-items:center;justify-content:center;
      min-height:400px;border-radius:16px;position:relative;overflow:hidden;
    `;

    const mainImg = document.createElement("img");
    mainImg.src = images[currentIndex];
    mainImg.style.cssText = `
      max-width:100%;max-height:480px;object-fit:contain;border-radius:16px;
      transition:opacity .3s ease, transform .3s ease;
    `;
    mainImgWrap.appendChild(mainImg);

    // Logo (đè lên góc phải trên ảnh chính)
    const logo = document.createElement("img");
    logo.src = SITE_LOGO;
    logo.style.cssText = `
      position:absolute;top:6px;right:36px;width:60px;height:60px;object-fit:cover;
      border-radius:10px;box-shadow:0 0 8px rgba(0,0,0,0.25);
      background:#fff;padding:2px;
    `;
    mainImgWrap.appendChild(logo);

    // Nút chuyển ảnh
    const prevBtn = document.createElement("button");
    const nextBtn = document.createElement("button");
    [prevBtn, nextBtn].forEach((b, i) => {
      b.innerHTML = i === 0 ? "&#10094;" : "&#10095;";
      b.style.cssText = `
        position:absolute;${i === 0 ? "left" : "right"}:10px;top:50%;transform:translateY(-50%);
        background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;
        width:40px;height:40px;cursor:pointer;font-size:18px;z-index:5;
      `;
      mainImgWrap.appendChild(b);
    });

    const changeImage = (dir) => {
      currentIndex = (currentIndex + dir + images.length) % images.length;
      mainImg.style.opacity = 0;
      setTimeout(() => {
        mainImg.src = images[currentIndex];
        mainImg.style.opacity = 1;
      }, 150);
      thumbElems.forEach((el, idx) => (el.style.opacity = idx === currentIndex ? "1" : "0.6"));
      ensureVisible();
    };

    prevBtn.onclick = () => { changeImage(-1); startAutoplay(); };
    nextBtn.onclick = () => { changeImage(1); startAutoplay(); };

    // === Thumbnails (tối đa 5 ảnh hiển thị, luôn căn giữa) ===
    const thumbsWrap = document.createElement("div");
    thumbsWrap.style.cssText = `
      position:relative;width:100%;overflow:hidden;margin-top:12px;
      padding:6px 0;display:flex;justify-content:center;
    `;
    const thumbsInner = document.createElement("div");
    thumbsInner.style.cssText = `
      display:flex;gap:8px;transition:transform 0.32s ease;align-items:center;justify-content:center;
    `;
    thumbsWrap.appendChild(thumbsInner);

    const thumbElems = [];
    images.forEach((src, i) => {
      const t = document.createElement("img");
      t.src = src;
      t.style.cssText = `
        width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #ddd;
        cursor:pointer;opacity:${i === 0 ? 1 : 0.6};flex-shrink:0;
      `;
      t.onclick = () => {
        currentIndex = i;
        mainImg.src = src;
        thumbElems.forEach((el, idx) => (el.style.opacity = idx === i ? "1" : "0.6"));
        ensureVisible();
        startAutoplay();
      };
      thumbsInner.appendChild(t);
      thumbElems.push(t);
    });

    // Cuộn ảnh phụ (nếu >5)
    let ensureVisible = () => {};
    if (images.length > 5) {
      const leftArrow = document.createElement("button");
      const rightArrow = document.createElement("button");
      leftArrow.innerHTML = "&#10094;";
      rightArrow.innerHTML = "&#10095;";
      [leftArrow, rightArrow].forEach((b, i) => {
        b.style.cssText = `
          position:absolute;top:50%;${i === 0 ? "left" : "right"}:4px;transform:translateY(-50%);
          background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;
          width:30px;height:30px;cursor:pointer;font-size:16px;z-index:6;
        `;
        thumbsWrap.appendChild(b);
      });

      const maxVisible = 5;
      const unit = 72;
      let offset = 0;
      const updateScroll = () => {
        thumbsInner.style.transform = `translateX(-${offset * unit}px)`;
        leftArrow.style.opacity = offset === 0 ? "0.4" : "1";
        rightArrow.style.opacity = offset >= images.length - maxVisible ? "0.4" : "1";
      };
      leftArrow.onclick = () => { offset = Math.max(0, offset - 1); updateScroll(); };
      rightArrow.onclick = () => { offset = Math.min(images.length - maxVisible, offset + 1); updateScroll(); };
      ensureVisible = () => {
        if (currentIndex < offset) offset = currentIndex;
        else if (currentIndex >= offset + maxVisible) offset = currentIndex - maxVisible + 1;
        updateScroll();
      };
      updateScroll();
    }

    left.appendChild(mainImgWrap);
    left.appendChild(thumbsWrap);

    // === Autoplay ===
    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(() => changeImage(1), 4000);
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }

    // === RIGHT: Thông tin sản phẩm ===
    const right = document.createElement("div");
    right.style.cssText = `width:380px;padding:10px 10px 14px 0;overflow:auto;`;

    // Tên sản phẩm trong thẻ chữ nhật nổi
    const titleBox = document.createElement("div");
    titleBox.style.cssText = `
      background:rgba(240,240,240,0.9);padding:10px 14px;border-radius:8px;
      margin-bottom:10px;font-weight:800;font-size:22px;color:#222;
      box-shadow:inset 0 0 6px rgba(0,0,0,0.1);
    `;
    titleBox.textContent = titleText;

    // Xử lý giá
    let priceText = "Liên hệ";
    if (product["T.THÁI"] && product["T.THÁI"].toLowerCase().includes("đã bán")) {
      priceText = "Tạm hết hàng";
    } else if (product["Price"]) {
      const num = parseFloat(product["Price"]) * 1000000;
      priceText = `~${num.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₫`;
    } else if (product["PRICE SEGMENT"]) {
      priceText = product["PRICE SEGMENT"];
    }

    // Bảng thông tin
    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;";
    const rows = [
      ["CPU", product["CPU"] || ""],
      ["RAM", product["RAM"] ? `${product["RAM"]} Gb` : ""],
      ["SSD Nvme", product["SSD"] ? `${product["SSD"]} Gb` : ""],
      ["Màn hình", product["RESOLUTION"] || ""],
      ["Kích thước", product["SIZE"] ? `${product["SIZE"]} inch` : ""],
      ["GPU", product["GPU - CARD"] || ""],
      ["Phân loại", product["Phân loại"] || ""],
      ["Trạng thái", product["T.THÁI"] || ""],
      ["Ghi chú", product["NOTE"] || ""],
      ["Giá bán", priceText]
    ];
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.style.background = i % 2 === 0 ? "#fff" : "#f8faf8";
      tr.innerHTML = `
        <td style="padding:8px;border:1px solid #eee;width:36%;font-weight:600">${r[0]}</td>
        <td style="padding:8px;border:1px solid #eee">${r[1]}</td>`;
      table.appendChild(tr);
    });

    // Nút hành động
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;margin:22px;align-items:center;";
    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Mua Ngay";
    buyBtn.style.cssText = `background:${THEME};border:none;font-weight:700;padding:12px 14px;border-radius:6px;color:#fff;`;
    const contactBtn = document.createElement("a");
    contactBtn.href = "contact.html";
    contactBtn.textContent = "Liên Hệ";
    contactBtn.style.cssText = "background:#f1c40f;color:#000;padding:12px 14px;border-radius:6px;font-weight:700;text-decoration:none;";
    actions.appendChild(buyBtn);
    actions.appendChild(contactBtn);

    // Nút đóng
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      position:absolute;right:82px;top:-12px;font-size:28px;background:#fff;color:#ff0000;border:2px solid #ff0000;
      border-radius:50%;padding:2px;cursor:pointer;z-index:10;height:45px;width:45px;
    `;

    // Gắn kết cấu trúc
    right.appendChild(titleBox);
    right.appendChild(table);
    right.appendChild(actions);
    card.appendChild(left);
    card.appendChild(right);
    overlay.appendChild(card);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    // Hành vi
    closeBtn.onclick = () => { stopAutoplay(); overlay.remove(); };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) { stopAutoplay(); overlay.remove(); } });
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") { stopAutoplay(); overlay.remove(); document.removeEventListener("keydown", escHandler); }
    });
    buyBtn.onclick = () => openOrderForm(product, titleText, overlay);
    startAutoplay();

    // Hiệu ứng CSS
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
      @keyframes slideUpFade { from {transform:translateY(30px);opacity:0;} to {transform:translateY(0);opacity:1;} }
    `;
    document.head.appendChild(style);
  } catch (err) {
    alert("Lỗi hiển thị sản phẩm: " + err.message);
  }
}





/* ===== POPUP ĐẶT HÀNG ===== */
function openOrderForm(product, titleText, parentOverlay) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10020;background:#fff;padding:16px;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.35);width:320px;";

  modal.innerHTML = `
    <h4 style="margin:0 0 6px 0;font-weight:700;">Đặt hàng: <span style="color:#2c3e50">${titleText}</span></h4>
    <p style="font-size:13px;color:#27ae60;margin-bottom:6px;">Cảm ơn bạn đã tin dùng... </br> Hãy gửi thông tin... i10 Store sẽ sớm liên hệ với bạn!</p>
    <input id="order_name" placeholder="Họ tên" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:4px" />
    <input id="order_phone" placeholder="Số điện thoại" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #ccc;border-radius:4px" />
    <textarea id="order_note" placeholder="Ghi chú (tùy chọn)" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;margin-bottom:8px" rows="2"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="order_cancel" style="padding:6px 12px;border:1px solid #ccc;border-radius:6px;">Hủy</button>
      <button id="order_submit" style="padding:6px 12px;background:#27ae60;border:none;border-radius:6px;color:#fff;font-weight:700;">Gửi</button>
    </div>
    <div id="order_msg" style="margin-top:8px;font-size:13px;color:green"></div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#order_cancel').onclick = ()=> modal.remove();

  modal.querySelector('#order_submit').onclick = async ()=>{
    const name = modal.querySelector('#order_name').value.trim();
    const phone = modal.querySelector('#order_phone').value.trim();
    const note = modal.querySelector('#order_note').value.trim();
    const msgEl = modal.querySelector('#order_msg');
    if (!name || !phone) { msgEl.style.color = 'red'; msgEl.textContent = "Vui lòng nhập tên và số điện thoại."; return; }

    msgEl.style.color = 'black'; msgEl.textContent = "Đang gửi...";

    try {
      await fetch(SHEET_API, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, note, product: titleText })
      });
      msgEl.style.color = 'green';
      msgEl.textContent = "✅ Gửi thành công! Cảm ơn bạn.";
      setTimeout(()=> modal.remove(), 1500);
    } catch (err) {
      msgEl.style.color = 'red';
      msgEl.textContent = "Lỗi gửi: " + err.message;
    }
  };
}


/* Init */
document.addEventListener("DOMContentLoaded", renderProductGrid);









/* =====================================================
   HIỂN THỊ BANNER NGANG (5 ẢNH XOAY VÒNG) + CACHE + NÚT < >
   ===================================================== */
async function renderBanner() {
  const bannerContainer = document.getElementById("top-area");
  if (!bannerContainer) return;

  bannerContainer.innerHTML = `
    <div style="text-align:center;padding:40px;color:#666;">.....</div>
  `;

  const CACHE_KEY = "i10_banner_cache_v2";
  const CACHE_TTL = 30 * 60 * 1000; // 30 phút
  let banners = null;

  try {
    // 1️⃣ Dùng cache nếu còn hạn
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, items } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        banners = items;
        console.log("✅ Dùng cache banner");
      }
    }

    // 2️⃣ Nếu không có cache → fetch mới
    if (!banners) {
      console.log("🌐 Fetch banner mới từ server...");
      const res = await fetch(`${SHEET_API}?mode=banner`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải banner từ server");
      banners = await res.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items: banners }));
    }

    if (!Array.isArray(banners) || banners.length === 0)
      throw new Error("Không có dữ liệu banner");

    // 3️⃣ HTML hiển thị
    bannerContainer.innerHTML = `
      <div class="banner-row">
        <button class="banner-nav prev">&#10094;</button>
        <div class="banner-track">
          ${banners
            .map(
              (b) => `
              <div class="banner-item">
                <img src="${b.thumb}" alt="${b.name || "Banner"}" title="${b.name || ""}" />
              </div>
            `
            )
            .join("")}
        </div>
        <button class="banner-nav next">&#10095;</button>
      </div>
    `;

    // 4️⃣ CSS
    const style = document.createElement("style");
    style.textContent = `
      .banner-row {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: 200px;
      }
      .banner-track {
        display: flex;
        gap: 12px;
        transition: transform 0.6s ease;
      }
      .banner-item {
        flex: 0 0 calc((100% - 48px) / 5);
        height: 200px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background: #f5f5f5;
      }
      .banner-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.4s ease;
      }
      .banner-item:hover img {
        transform: scale(1.35);
      }
      .banner-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 38px;
        height: 38px;
        background: rgba(0,0,0,0.5);
        color: #fff;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        line-height: 38px;
        text-align: center;
        z-index: 5;
        transition: background 0.3s;
      }
      .banner-nav:hover {
        background: rgba(0,0,0,0.8);
      }
      .banner-nav.prev { left: 10px; }
      .banner-nav.next { right: 10px; }

      @media (max-width: 768px) {
        .banner-item { flex: 0 0 calc((100% - 24px) / 3); height: 150px; }
      }
    `;
    document.head.appendChild(style);

    // 5️⃣ Xử lý slide logic
    const track = bannerContainer.querySelector(".banner-track");
    const prevBtn = bannerContainer.querySelector(".banner-nav.prev");
    const nextBtn = bannerContainer.querySelector(".banner-nav.next");

    let offset = 0;
    const total = banners.length;
    const visible = 5;
    const maxOffset = Math.max(0, total - visible);

    function updateSlide() {
      track.style.transform = `translateX(-${offset * (100 / visible)}%)`;
    }

    function nextSlide() {
      offset = (offset + 1) % (maxOffset + 1);
      updateSlide();
    }

    function prevSlide() {
      offset = (offset - 1 + maxOffset + 1) % (maxOffset + 1);
      updateSlide();
    }

    // Gán sự kiện cho nút điều hướng
    nextBtn.onclick = () => {
      nextSlide();
      restartAuto();
    };
    prevBtn.onclick = () => {
      prevSlide();
      restartAuto();
    };

    // 6️⃣ Auto slide mỗi 4s
    let autoTimer = setInterval(nextSlide, 4000);
    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, 4000);
    }
  } catch (err) {
    bannerContainer.innerHTML = `<div style="padding:40px;color:red;text-align:center;">❌ Lỗi tải banner: ${err.message}</div>`;
    console.error(err);
  }
}


/* GỌI KHI LOAD TRANG */
document.addEventListener("DOMContentLoaded", () => {
  renderBanner();
  renderProductGrid();
});
