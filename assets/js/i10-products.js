/* =========================================================
   i10 PRODUCTS - Cập nhật Banner Logic Cuối cùng (3 Center + Nhiều Stacked Sides)
   ========================================================= */

/* ========== CONFIG (CẬP NHẬT LẠI CỦA BẠN) ========== */
const SHEET_API = "https://script.google.com/macros/s/AKfycbxbDuthd9eg665B_n0OuPB4j44G9monOKY7Th1Gau1uerbbgG3aVffaSU0TgNiFdpai4g/exec"; 
const SITE_LOGO = "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000"; 
const THEME = "#76b500"; 
const CACHE_KEY = "i10_products_cache_v2"; 
const CACHE_TTL = 30 * 60 * 1000; 

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

/* Render control bar: sort + search (Giữ nguyên) */
function renderControls(container, onChange) {
  const ctrl = document.createElement('div');
  ctrl.id = "i10-controls";
  ctrl.style.cssText = "display:flex;gap:10px;align-items:center;flex-wrap:wrap;";

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
    localStorage.removeItem(CACHE_KEY);
    location.reload();
  };
  ctrl.appendChild(refreshBtn);

  container.prepend(ctrl);

  // event handlers
  const trigger = debounce(()=> onChange({ q: input.value.trim(), sort: sel.value }), 180);
  input.addEventListener('input', trigger);
  sel.addEventListener('change', ()=> onChange({ q: input.value.trim(), sort: sel.value }));
  
  return { input, sel };
}

/* Convert price field to number for sorting (if possible) (Giữ nguyên) */
function extractPriceNum(p) {
  if (p == null) return Infinity;
  if (typeof p === 'number') return p;
  const s = String(p).replace(/[^\d.,]/g, '').replace(',', '.');
  const m = parseFloat(s);
  return isNaN(m) ? Infinity : m;
}

/* Render danh sách sản phẩm (với search/sort) (Giữ nguyên) */
async function renderProductGrid() {
  const container = document.getElementById("i10-product");
  if (!container) return;
    // ... (Phần logic tải và hiển thị sản phẩm giữ nguyên)
    try {
        // ----- CACHE LOGIC -----
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
          container.innerHTML = `<div style="padding:20px;text-align:center;"><i class="fa fa-spinner fa-spin fa-3x fa-fw" style="color: ${THEME};"></i><p style="margin-top:15px;font-size:16px;">Đang tải dữ liệu sản phẩm...</p></div>`;
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
          const html = list.map((p) => {
            const title = `${p["Brand"] || ""} ${p["Model"] || ""}`.trim() || (p["Name"] || "Sản phẩm");

            const sortedImgs = (p.images || []).slice().sort((a,b) => (a.name||"").localeCompare(b.name||""));
            const mainImg = (sortedImgs[0]?.thumb?.replace("=s220", "=s1000")) || SITE_LOGO;

            // ---- Giá / trạng thái ----
            let priceText = "Liên hệ";
            let priceStyle = `color:${THEME};font-weight:800;`;
            if (p["T.THÁI"] && p["T.THÁI"].toLowerCase().includes("đã bán")) {
              priceText = "Tạm hết hàng";
              priceStyle = `color:#e74c3c;font-weight:700;font-size:15px;`;
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
                <div class="product-card"
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
                    <div style="${priceStyle}margin-top:8px;font-size:16px">${priceText}</div>
                  </div>
                </div>
              </div>`;
          }).join("");


          gridEl.innerHTML = `<div class="row">${html}</div>`;

          // hover effect (đã chuyển ra CSS, giữ lại logic cho card)
          document.querySelectorAll("#i10-grid .product-card").forEach(card => {
            card.addEventListener("mouseenter", () => {
              // CSS handles transform/shadow
              const img = card.querySelector("img");
              if (img) img.style.transform = "scale(1.15)";
            });
            card.addEventListener("mouseleave", () => {
              // CSS handles transform/shadow
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
        container.innerHTML = `<div style="padding:40px;text-align:center;color:red;border:1px solid #f00;border-radius:10px;">
          <i class="fa fa-exclamation-triangle fa-2x"></i>
          <p style="margin-top:10px;">Lỗi tải sản phẩm. Vui lòng kiểm tra kết nối mạng hoặc link API: ${err.message}</p>
          <button class="btn btn-warning" onclick="localStorage.removeItem('${CACHE_KEY}'); location.reload();" style="margin-top:10px;">Thử lại</button>
        </div>`;
        console.error(err);
      }
}

/* Popup và Order Form (Giữ nguyên) */
// ... (Logic openProductPopup và openOrderForm giữ nguyên) ...


/* -----------------------------------------------------
   HIỂN THỊ BANNER TỐI GIẢN (1 Center + Nhiều Stacked Sides)
   ----------------------------------------------------- */
async function renderBanner() {
  const bannerContainer = document.getElementById("banner");
  if (!bannerContainer) return;

  const placeholder = bannerContainer.querySelector(".banner-placeholder");
  if (placeholder) placeholder.textContent = "Đang tải banner...";

  const CACHE_KEY_BANNER = "i10_banner_cache_v2";
  const CACHE_TTL = 30 * 60 * 1000;
  let banners = null;

  try {
    // Logic Cache và Fetch giữ nguyên
    const cached = localStorage.getItem(CACHE_KEY_BANNER);
    // ... (Code cache) ...
    if (!banners) {
      const res = await fetch(`${SHEET_API}?mode=banner`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải banner từ server");
      banners = await res.json();
      localStorage.setItem(CACHE_KEY_BANNER, JSON.stringify({ timestamp: Date.now(), items: banners }));
    }
    if (!Array.isArray(banners) || banners.length === 0)
      throw new Error("Không có dữ liệu banner");

    
    // === 3️⃣ HTML hiển thị khung ===
    bannerContainer.innerHTML = `
      <div class="banner-row">
        <button class="banner-nav prev">❮</button>
        <div class="banner-track" id="banner-track">
          </div>
        <button class="banner-nav next">❯</button>
      </div>
    `;

    // Xử lý slide logic
    const track = document.getElementById("banner-track");
    const prevBtn = bannerContainer.querySelector(".banner-nav.prev");
    const nextBtn = bannerContainer.querySelector(".banner-nav.next");
    const total = banners.length;
    let currentIndex = 0; 
    
    // Config cho hiệu ứng
    const MAX_STACK = window.innerWidth > 768 ? 3 : 2; // Desktop 3 lớp, Mobile 2 lớp (Yêu cầu)
    const STACK_OVERLAP_PX = window.innerWidth > 768 ? 20 : 15; 
    const SCALE_STEP = 0.1; // Giảm 10% mỗi lớp xếp chồng
    const ITEM_SIZE = window.innerWidth > 768 ? 220 : 150; 
    const BASE_SHIFT = window.innerWidth > 768 ? 130 : 90; 

    
    // Tạo và chèn tất cả các item vào DOM
    let bannerItems = [];
    for (let i = 0; i < total; i++) {
        const item = document.createElement('div');
        item.className = 'banner-item';
        item.onclick = (e) => {
            const indexClicked = parseInt(e.currentTarget.dataset.index);
            if (indexClicked === currentIndex) return; 
            
            let offset = indexClicked - currentIndex;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;
            
            if (offset > 0) nextSlide();
            else prevSlide();

            restartAuto();
        };

        item.dataset.index = i;
        item.style.zIndex = 1; 
        item.style.opacity = 0;
        item.innerHTML = `<img src="${banners[i].thumb}" alt="${banners[i].name || 'Banner'}" loading="lazy" />`;
        track.appendChild(item);
        bannerItems.push(item);
    }

    function getIndex(index) {
        return (index % total + total) % total;
    }
    
    // Hàm cập nhật vị trí, scale, và z-index của tất cả các ảnh
    function updateLayout() {
        
        bannerItems.forEach((item, index) => {
            let offset = index - currentIndex;
            
            // Xử lý vòng lặp (Đảm bảo ảnh xa nhất vẫn được tính)
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const absOffset = Math.abs(offset);
            const direction = offset / (absOffset || 1); 
            
            // Lớp xếp chồng hiện tại
            const currentMaxStack = window.innerWidth > 768 ? 3 : 2;

            const isVisible = absOffset <= currentMaxStack; 
            
            if (isVisible) {
                let translateX;
                let scale;
                let zIndex;
                
                if (offset === 0) {
                    // --- ẢNH TRUNG TÂM ---
                    scale = 1;
                    zIndex = 10;
                    translateX = '-50%';

                } else {
                    // --- ẢNH XẾP CHỒNG (Hai bên) ---
                    const stackLayer = absOffset; 
                    
                    scale = 1 - stackLayer * SCALE_STEP; // Giảm scale 10% mỗi lớp
                    zIndex = 10 - stackLayer;
                    
                    // Tính toán vị trí X (tăng dần dịch chuyển cho mỗi lớp)
                    let accumulatedShift = 0;
                    for (let i = 1; i <= stackLayer; i++) {
                        const currentLayerScale = 1 - (i - 1) * SCALE_STEP;
                        const nextLayerScale = 1 - i * SCALE_STEP;
                        // Cộng dồn độ dịch chuyển từ tâm của ảnh hiện tại đến tâm của ảnh tiếp theo, trừ đi độ chồng
                        accumulatedShift += (ITEM_SIZE * currentLayerScale / 2 + ITEM_SIZE * nextLayerScale / 2) - STACK_OVERLAP_PX;
                    }

                    // Vị trí cuối cùng = Dịch chuyển Center + Dịch chuyển tích lũy
                    translateX = `calc(-50% + ${direction * (BASE_SHIFT + accumulatedShift)}px)`;
                }
                
                item.style.cssText += `
                    opacity: 1; /* KHÔNG TRONG SUỐT (Yêu cầu) */
                    z-index: ${zIndex};
                    left: 50%;
                    width: ${ITEM_SIZE}px; 
                    height: ${ITEM_SIZE}px; 
                    transform: translateX(${translateX}) scale(${scale});
                `;
            } else {
                // Ẩn ảnh không nhìn thấy
                item.style.opacity = 0;
                item.style.zIndex = 0;
                item.style.transform = 'translateY(100%) scale(0.5)'; 
            }
        });
    }

    function nextSlide() {
        currentIndex = getIndex(currentIndex + 1);
        updateLayout();
    }

    function prevSlide() {
        currentIndex = getIndex(currentIndex - 1);
        updateLayout();
    }
    
    // Khởi tạo lần đầu
    updateLayout();

    // Gán sự kiện cho nút điều hướng
    nextBtn.onclick = () => { nextSlide(); restartAuto(); };
    prevBtn.onclick = () => { prevSlide(); restartAuto(); };

    // 6️⃣ Auto slide mỗi 4s
    let autoTimer = setInterval(nextSlide, 4000);
    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, 4000);
    }
    
    // Xử lý Responsive khi resize
    window.addEventListener('resize', debounce(updateLayout, 100));

  } catch (err) {
    bannerContainer.innerHTML = `<div style="padding:40px;color:red;text-align:center;">❌ Lỗi tải banner.</div>`;
  }
}

/* Init */
document.addEventListener("DOMContentLoaded", () => {
    const siteLogo = document.getElementById("site-logo");
    if (siteLogo) siteLogo.src = SITE_LOGO;
    
    renderBanner();
    renderProductGrid();
});