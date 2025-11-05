/* =========================================================
   i10 PRODUCTS - PHIÊN BẢN TỔNG HỢP (v4 - SEO & UI/UX)
   Bao gồm:
   1. Tối ưu SEO (Clean URLs /san-pham/...)
   2. Tối ưu UI/UX Popup (Sticky buttons, Mobile 90vh, Scroll-lock)
   3. Tối ưu Cache (localStorage cho Banner & Products)
   4. Logic Routing (Tự mở popup từ URL, xử lý nút Back)
   ========================================================= */

/* ========== CONFIG (CẬP NHẬT LẠI CỦA BẠN) ========== */
// (*** QUAN TRỌNG: Thay link API và Logo của bạn vào đây ***)
const SHEET_API = "https://script.google.com/macros/s/AKfycbzFUG2MRTNqPfQdPEUrzFFYagvLBwz8KHpiY3Hk36Et8Dzzxu_t8v3_L6XagFlcgv1J1Q/exec"; 
const SITE_LOGO = "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000"; 
const SITE_LOGO_2 = "https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000"; //Hiển thị logo ở danh sách sản phẩm, dán ID drive vào trước =s1000 là ok

const THEME = "#76b500"; // Màu chủ đạo
const CACHE_KEY = "i10_products_cache_v2"; // Key cache sản phẩm
const CACHE_KEY_BANNER = "i10_banner_cache_v2"; // Key cache banner
const CACHE_TTL = 30 * 60 * 1000; // 30 phút

/* === TÊN WEBSITE (DÙNG CHO SEO) === */
const SITE_TITLE_HOME = "i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN";
const SITE_TITLE_SUFFIX = "- i10 STORE";
const SITE_META_DESC_HOME = "i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.";


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

/* Helper: Tạo slug (link) */
function createSlug(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Thay thế khoảng trắng bằng -
        .replace(/[^\w\-]+/g, '')       // Xóa ký tự đặc biệt
        .replace(/\-\-+/g, '-')         // Thay thế nhiều - bằng 1 -
        .replace(/^-+/, '')             // Xóa - ở đầu
        .replace(/-+$/, '');            // Xóa - ở cuối
}


/* Render control bar: sort + search */
function renderControls(container, onChange) {
  const ctrl = document.createElement('div');
  ctrl.id = "i10-controls";
  
  const sel = document.createElement('select');
  sel.className = "form-control";
  sel.style.cssText = "padding:6px 8px;"; 
  sel.innerHTML = `
    <option value="default">Sắp xếp: Mặc định</option>
    <option value="price_asc">Giá: Tăng dần</option>
    <option value="price_desc">Giá: Giảm dần</option>
  `;
  ctrl.appendChild(sel);

  const input = document.createElement('input');
  input.type = "search";
  input.placeholder = "Tìm theo tên, GPU, máy trạm, văn phòng,...";
  input.style.cssText = "flex:1;min-width:350px;padding:5px;border-radius:4px;border:1px solid #ccc;";
  ctrl.appendChild(input);

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

  container.prepend(ctrl);

  const trigger = debounce(()=> onChange({ q: input.value.trim(), sort: sel.value }), 180);
  input.addEventListener('input', trigger);
  sel.addEventListener('change', ()=> onChange({ q: input.value.trim(), sort: sel.value }));
  
  return { input, sel };
}

/* Convert price field to number for sorting */
function extractPriceNum(p) {
  if (p == null) return Infinity;
  if (typeof p === 'number') return p;
  const s = String(p).replace(/[^\d.,]/g, '').replace(',', '.');
  const m = parseFloat(s);
  return isNaN(m) ? Infinity : m;
}


/* -----------------------------------------------------
   LOGIC LẤY DATA SẢN PHẨM (TỐI ƯU SEO)
   ----------------------------------------------------- */

// Biến toàn cục để lưu data, tránh fetch nhiều lần
let globalProductData = null;
let globalProductPromise = null;

/**
 * Hàm lấy data sản phẩm (chỉ fetch 1 lần)
 */
async function getProductData() {
    if (globalProductData) {
        return globalProductData;
    }
    if (globalProductPromise) {
        return globalProductPromise;
    }

    // Hàm fetch
    const fetchData = async () => {
        let data = null;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { timestamp, items } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    data = items;
                }
            }
        } catch (e) { /* ignore */ }

        if (!data) {
            // Hiển thị loading tạm thời
            const container = document.getElementById("i10-product");
            if (container) container.innerHTML = `<div style="padding:20px;text-align:center;"><i class="fa fa-spinner fa-spin fa-3x fa-fw" style="color: ${THEME};"></i><p style="margin-top:15px;font-size:16px;">Đang tải dữ liệu sản phẩm...</p></div>`;
            
            data = await fetchJSON(SHEET_API);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                items: data
            }));
        }

        if (!Array.isArray(data)) throw new Error("Dữ liệu trả về không phải mảng");

        // Tạo slug (link sạch) cho mỗi sản phẩm
        data.forEach((p, i) => {
            const slugText = [
                p["Model"] || p["Name"],
                p["CPU"],
                p["RAM"],
                p["RESOLUTION"],
                p["GPU"]
            ].filter(Boolean).join(' ');

            // Dùng link từ Sheet hoặc tạo link fallback (dạng sạch)
            p.slug = p["Web Link"] || `san-pham/${createSlug(slugText || `product-${i}`)}`;
        });
        
        globalProductData = data;
        return data;
    };

    globalProductPromise = fetchData();
    return globalProductPromise;
}

/**
 * Render danh sách sản phẩm (TỐI ƯU SEO)
 */
/* async function renderProductGrid() {
  const container = document.getElementById("i10-product");
  if (!container) return;
    try {
        // Lấy data từ hàm mới
        const data = await getProductData();

        container.innerHTML = `<div id="i10-controls"></div><div id="i10-grid"></div>`;
        const controlsEl = document.getElementById('i10-controls');
        const gridEl = document.getElementById('i10-grid');

        // Logic filter từ URL
        const params = new URLSearchParams(window.location.search);
        const filter = params.get("filter");
        let defaultQuery = "";

        switch (filter) {
          case "available": defaultQuery = "còn"; break;
          case "sold": defaultQuery = "đã bán"; break;
          // Các filter của bạn
          case "maytram": defaultQuery = "máy trạm"; break;
          case "vanphong": defaultQuery = "văn phòng"; break;
          case "thinkpad": defaultQuery = "thinkpad"; break;
          case "dell": defaultQuery = "dell"; break;
          case "blackberry": defaultQuery = "blackberry"; break;
          default: defaultQuery = "";
        }

        let state = { q: defaultQuery, sort: "default", items: data };

        const doRender = ({ q, sort } = {}) => {
          if (q !== undefined) state.q = q;
          if (sort !== undefined) state.sort = sort;

          const qstr = (state.q || "").toLowerCase();
          let list = state.items.filter(p => {
            if (!qstr) return true;
            const fields = [
              p["Brand"] || "", p["Model"] || "", p["Name"] || "",
              p["RAM"] || "", p["Phân loại"] || "", p["T.THÁI"] || "", p["GPU"] || ""
            ].join(' ').toLowerCase();
            return fields.indexOf(qstr) !== -1;
          });

          if (state.sort === "price_asc") {
            list.sort((a,b)=> extractPriceNum(a["Price"]) - extractPriceNum(b["Price"]));
          } else if (state.sort === "price_desc") {
            list.sort((a,b)=> extractPriceNum(b["Price"]) - extractPriceNum(a["Price"]));
          }

          const html = list.map((p) => {
            const title = `${p["Brand"] || ""} ${p["Model"] || ""}`.trim() || (p["Name"] || "Sản phẩm");
            const sortedImgs = (p.images || []).slice().sort((a,b) => (a.name||"").localeCompare(b.name||""));
            const mainImg = (sortedImgs[0]?.thumb?.replace("=s220", "=s1000")) || SITE_LOGO;
            
            // Logic giá
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
            // Logic config
            let config = [];
            if (p["CPU"]) config.push(p["CPU"]);
            if (p["RAM"]) config.push(p["RAM"]);
            if (p["SSD"]) config.push(p["SSD"]);
            if (p["GPU"] && p["GPU"].toLowerCase() !== "onboard") config.push(p["GPU"]);

            const jsonData = encodeURIComponent(JSON.stringify(p));
            
            // (*** THAY ĐỔI SEO ***) Dùng thẻ <a>
            return `
              <div class="col-sm-6 col-md-4 product-item" style="margin-bottom:22px;">
                <a class="product-card" 
                   href="/${p.slug}" 
                   data-json="${jsonData}"
                   data-slug="${p.slug}">

                  <div class="thumb">
                    <img src="${mainImg}" alt="${title} - i10 Store" onerror="this.src='${SITE_LOGO}' ">
                  </div>

                  <div style="padding:12px 14px;display:flex;flex-direction:column;justify:content:space-between;flex:1;">
                    <div>
                      <h4 style="font-size:16px;font-weight:700;margin:0 0 6px 0;color:#2c3e50;min-height:42px;line-height:1.3;overflow:hidden;">${title}</h4>
                      <div style="font-size:13px;color:#666;">${config.join(" • ")}</div>
                    </div>
                    <div style="${priceStyle}margin-top:8px;font-size:16px">${priceText}</div>
                  </div>
                </a>
              </div>`;
          }).join("");


          gridEl.innerHTML = `<div class="row">${html}</div>`;

          // (*** MỚI - LOGIC SEO ***)
          // Bắt các cú click vào thẻ <a> sản phẩm
          document.querySelectorAll("#i10-grid .product-card").forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault(); 
                const jsonData = this.getAttribute('data-json');
                const slug = this.getAttribute('data-slug');
                openProductPopup(jsonData, slug);
            });
          });
          
        }; // Hết hàm doRender
        
        renderControls(controlsEl, ({ q, sort }) => {
          doRender({ q, sort });
        });
        
        // Kích hoạt filter (nếu có)
        if (state.q) {
            doRender({ q: state.q, sort: "default" });
            // Cập nhật ô tìm kiếm (nếu filter từ URL)
            const searchInput = document.querySelector('#i10-controls input[type="search"]');
            if (searchInput) searchInput.value = state.q;
        } else {
            doRender();
        }

      } catch (err) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:red;border:1px solid #f00;border-radius:10px;">
          <i class="fa fa-exclamation-triangle fa-2x"></i>
          <p style="margin-top:10px;">Lỗi tải sản phẩm: ${err.message}</p>
          <button class="btn btn-warning" onclick="localStorage.removeItem('${CACHE_KEY}'); location.reload();" style="margin-top:10px;">Thử lại</button>
        </div>`;
        console.error(err);
      }
} */
/**
 * Render danh sách sản phẩm (ĐÃ NÂNG CẤP LOGIC FILTER V5)
 * Hỗ trợ lọc phức tạp cho "maytram" và "vanphong"
 */
async function renderProductGrid() {
  const container = document.getElementById("i10-product");
  if (!container) return;
    try {
        // 1. Lấy toàn bộ data (như cũ)
        const data = await getProductData();

        container.innerHTML = `<div id="i10-controls"></div><div id="i10-grid"></div>`;
        const controlsEl = document.getElementById('i10-controls');
        const gridEl = document.getElementById('i10-grid');

        const params = new URLSearchParams(window.location.search);
        const filter = params.get("filter");
        
        // (*** MỚI: Hàm lọc logic phức tạp ***)
        function applyUrlFilter(fullList, filterKey) {
            if (!filterKey) {
                return fullList; // Không lọc, trả về tất cả
            }

            const key = filterKey.toLowerCase();
            let simpleQueryString = ""; // Dùng cho các bộ lọc đơn giản

            // Hàm chuẩn hóa text (chuyển sang chữ thường, xử lý null)
            const norm = (s) => (s || "").toLowerCase();

            switch (key) {
                // --- LOGIC MỚI: VĂN PHÒNG ---
                case "vanphong":
                    return fullList.filter(p => {
                        const phanLoai = norm(p["Phân loại"]);
                        const gpu = norm(p["GPU"]);
                        
                        return phanLoai.includes("văn phòng") ||
                               phanLoai.includes("mỏng nhẹ") ||
                               gpu.includes("onboard") ||
                               gpu.includes("intel");
                    });

                // --- LOGIC MỚI: MÁY TRẠM ---
                case "maytram":
                    return fullList.filter(p => {
                        const phanLoai = norm(p["Phân loại"]);
                        const gpu = norm(p["GPU"]);
                        
                        // Điều kiện 1: Phân loại là máy trạm
                        const isWorkstation = phanLoai.includes("máy trạm") ||
                                              phanLoai.includes("workstation");
                                              
                        // Điều kiện 2: GPU KHÔNG phải là onboard/intel (tức là card rời)
                        const isDedicatedGpu = gpu && !gpu.includes("onboard") && !gpu.includes("intel");

                        return isWorkstation || isDedicatedGpu;
                    });
                
                // --- LOGIC CŨ: Bộ lọc đơn giản ---
                case "available": simpleQueryString = "còn"; break;
                case "sold": simpleQueryString = "đã bán"; break;
                case "thinkpad": simpleQueryString = "thinkpad"; break;
                case "dell": simpleQueryString = "dell"; break;
                case "blackberry": simpleQueryString = "blackberry"; break;
                default: 
                    simpleQueryString = key; // Cho phép filter bất kỳ từ nào khác
            }
            
            // Xử lý các bộ lọc đơn giản (như cũ)
            if (simpleQueryString) {
                return fullList.filter(p => {
                    const fields = [
                      p["Brand"] || "", p["Model"] || "", p["Name"] || "",
                      p["RAM"] || "", p["Phân loại"] || "", p["T.THÁI"] || "", p["GPU"] || ""
                    ].join(' ').toLowerCase();
                    return fields.includes(simpleQueryString);
                });
            }
            
            return fullList; // Trả về ds gốc nếu không khớp case nào
        }

        // 2. Lấy danh sách đã được lọc theo URL
        const filteredData = applyUrlFilter(data, filter);
        
        // 3. Thiết lập State (trạng thái) ban đầu
        // `items` giờ là danh sách ĐÃ LỌC. `q` là ô tìm kiếm (trống)
        let state = { q: "", sort: "default", items: filteredData };

        // 4. Hàm doRender (chỉ còn nhiệm vụ Sắp xếp và Lọc (Search))
        const doRender = ({ q, sort } = {}) => {
          if (q !== undefined) state.q = q;
          if (sort !== undefined) state.sort = sort;

          const qstr = (state.q || "").toLowerCase();
          
          // Bắt đầu từ danh sách ĐÃ LỌC
          let list = state.items.filter(p => {
            if (!qstr) return true; // Nếu ô tìm kiếm trống, hiển thị tất cả
            
            // Nếu ô tìm kiếm có chữ, lọc TIẾP TỤC trên ds đã lọc
            const fields = [
              p["Brand"] || "", p["Model"] || "", p["Name"] || "",
              p["RAM"] || "", p["Phân loại"] || "", p["T.THÁI"] || "", p["GPU"] || ""
            ].join(' ').toLowerCase();
            return fields.includes(qstr);
          });

          // Logic sắp xếp (giữ nguyên)
          if (state.sort === "price_asc") {
            list.sort((a,b)=> extractPriceNum(a["Price"]) - extractPriceNum(b["Price"]));
          } else if (state.sort === "price_desc") {
            list.sort((a,b)=> extractPriceNum(b["Price"]) - extractPriceNum(a["Price"]));
          }

          // Logic render HTML (giữ nguyên)
          const html = list.map((p) => {
            const title = `${p["Brand"] || ""} ${p["Model"] || ""}`.trim() || (p["Name"] || "Sản phẩm");
            const sortedImgs = (p.images || []).slice().sort((a,b) => (a.name||"").localeCompare(b.name||""));
            const mainImg = (sortedImgs[0]?.thumb?.replace("=s220", "=s1000")) || SITE_LOGO_2;
            
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
            let config = [];
            if (p["CPU"]) config.push(p["CPU"]);
            if (p["RAM"]) config.push(p["RAM"]);
            if (p["SSD"]) config.push(p["SSD"]);
            if (p["GPU"] && p["GPU"].toLowerCase() !== "onboard") config.push(p["GPU"]);

            const jsonData = encodeURIComponent(JSON.stringify(p));
            
            return `
              <div class="col-sm-6 col-md-4 product-item" style="margin-bottom:22px;">
                <a class="product-card" 
                   href="/${p.slug}" 
                   data-json="${jsonData}"
                   data-slug="${p.slug}">

                  <div class="thumb">
                    <img src="${mainImg}" alt="${title} - i10 Store" onerror="this.src='${SITE_LOGO_2}' "> 
                  </div>

                  <div style="padding:12px 14px;display:flex;flex-direction:column;justify:content:space-between;flex:1;">
                    <div>
                      <h4 style="font-size:16px;font-weight:700;margin:0 0 6px 0;color:#2c3e50;min-height:42px;line-height:1.3;overflow:hidden;">${title}</h4>
                      <div style="font-size:13px;color:#666;">${config.join(" • ")}</div>
                    </div>
                    <div style="${priceStyle}margin-top:8px;font-size:16px">${priceText}</div>
                  </div>
                </a>
              </div>`;
          }).join("");


          gridEl.innerHTML = `<div class="row">${html}</div>`;

          // Gắn sự kiện click (giữ nguyên)
          document.querySelectorAll("#i10-grid .product-card").forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault(); 
                const jsonData = this.getAttribute('data-json');
                const slug = this.getAttribute('data-slug');
                openProductPopup(jsonData, slug);
            });
          });
          
        }; // Hết hàm doRender
        
        // 5. Khởi tạo
        renderControls(controlsEl, ({ q, sort }) => {
          doRender({ q, sort });
        });
        
        // Chạy render lần đầu (danh sách đã được lọc bởi URL)
        doRender();
        
        // (*** MỚI: Tự động điền vào ô tìm kiếm nếu là filter đơn giản ***)
        if (filter && ["available", "sold", "thinkpad", "dell", "blackberry"].includes(filter)) {
             const searchInput = document.querySelector('#i10-controls input[type="search"]');
             let simpleQueryString = filter;
             if (filter === 'available') simpleQueryString = 'sẵn hàng';
             if (filter === 'sold') simpleQueryString = 'tạm hết hàng';
             if (searchInput) searchInput.value = simpleQueryString;
        }

      } catch (err) {
        // Xử lý lỗi (giữ nguyên)
        container.innerHTML = `<div style="padding:40px;text-align:center;color:red;border:1px solid #f00;border-radius:10px;">
          <i class="fa fa-exclamation-triangle fa-2x"></i>
          <p style="margin-top:10px;">Lỗi tải sản phẩm: ${err.message}</p>
          <button class="btn btn-warning" onclick="localStorage.removeItem('${CACHE_KEY}'); location.reload();" style="margin-top:10px;">Thử lại</button>
        </div>`;
        console.error(err);
      }
}
/* -----------------------------------------------------
   POPUP SẢN PHẨM (TỐI ƯU UI/UX VÀ SEO)
   ----------------------------------------------------- */
function openProductPopup(encoded, slug) {
    // (*** MỚI - UI/UX ***) Khóa cuộn trang web
    document.body.style.overflow = 'hidden';

    // (*** MỚI - SEO ***) Cập nhật URL bằng History API
    if (slug && window.location.pathname !== `/${slug}`) {
        history.pushState({ json: encoded, slug: slug }, "", `/${slug}`); 
    }

    try {
        const product = JSON.parse(decodeURIComponent(encoded));
        const titleText = `${product["Brand"] || ""} ${product["Model"] || ""}`.trim() || (product["Name"] || "Sản phẩm");

        // (*** MỚI - SEO ***) Cập nhật Tiêu đề trang
        document.title = `${titleText} ${SITE_TITLE_SUFFIX}`; 
        
        // (*** MỚI - SEO ***) Cập nhật Meta Description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            const description = product["Meta Description"] || 
                                `Cấu hình: ${[product["CPU"], product["RAM"], product["SSD"], product["GPU"]].filter(Boolean).join(' • ')}. Liên hệ i10 Store.`;
            metaDesc.setAttribute('content', description.substring(0, 155)); // Cắt ngắn 155 ký tự
        }

        // === HÌNH ẢNH ===
        const sortedImgs = (product.images || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        const images = sortedImgs.map(x => (x.thumb || x.url || "").replace("=s220", "=s1600")).filter(Boolean);
        if (!images.length) images.push(SITE_LOGO); 

        let currentIndex = 0;
        let autoplayTimer = null;

        // Overlay
        const overlay = document.createElement("div");
        overlay.className = "i10-popup-overlay";
        overlay.style.cssText = `
          position:fixed;inset:0;background:rgba(0,0,0,0.7);
          display:flex;align-items:center;justify-content:center;z-index:9999;
          padding:10px;animation:fadeIn 0.3s ease;
        `;

        // Card container
        const card = document.createElement("div");
        card.style.cssText = `
          width:100%;max-width:1000px;background:#fefef5;border-radius:18px;
          display:flex;gap:20px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.3);
          transform:translateY(30px);opacity:0;animation:slideUpFade .45s ease forwards;
          padding:20px 24px;position:relative;max-height:90vh;
        `;
        const left = document.createElement("div");
        left.style.cssText = `
          flex:1;min-width:420px;display:flex;flex-direction:column;align-items:center;
          justify-content:center;position:relative;margin-left:12px;
        `;

        // Ảnh chính
        const mainImgWrap = document.createElement("div");
        mainImgWrap.style.cssText = `
          height:100%;display:flex;align-items:center;justify-content:center;
          min-height:400px;border-radius:16px;position:relative;overflow:hidden;
        `;
        const mainImg = document.createElement("img");
        mainImg.src = images[currentIndex];
        mainImg.style.cssText = `
          max-width:100%;max-height:400px;object-fit:contain;border-radius:16px;
          transition:opacity .3s ease, transform .3s ease;
        `;
        mainImgWrap.appendChild(mainImg);

        // Logo (Đã cập nhật vị trí Top-Center và Opacity)
        const logo = document.createElement("img");
        logo.src = SITE_LOGO;
        logo.style.cssText = `
          position: absolute;
          top: 10px; /* Vị trí trên */
          left: 50%; /* Căn giữa ngang (bước 1) */
          transform: translateX(-50%); /* Căn giữa ngang (bước 2) */
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 10px;
          background: #fff;
          padding: 2px;
          opacity: 0.39; /* (Yêu cầu 39%) */
          box-shadow: 0 0 8px rgba(0,0,0,0.25);
          z-index: 5; /* Đảm bảo logo nằm trên ảnh */
          pointer-events: none; /* Cho phép click xuyên qua logo */
        `;
        mainImgWrap.appendChild(logo);

        // Nút chuyển ảnh
        const prevBtn = document.createElement("button");
        const nextBtn = document.createElement("button");
        [prevBtn, nextBtn].forEach((b, i) => {
          b.innerHTML = i === 0 ? "❮" : "❯";
          b.style.cssText = `
            position:absolute;${i === 0 ? "left" : "right"}:10px;top:50%;transform:translateY(-50%);
            background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;
            width:40px;height:40px;cursor:pointer;font-size:18px;z-index:5;
          `;
          mainImgWrap.appendChild(b);
        });

        // Thumbnails
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

        let ensureVisible = () => {}; 

        left.appendChild(mainImgWrap);
        left.appendChild(thumbsWrap);

        // Autoplay
        function startAutoplay() {
          stopAutoplay();
          autoplayTimer = setInterval(() => changeImage(1), 3000);
        }
        function stopAutoplay() {
          if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
        }
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


        // === RIGHT: Thông tin sản phẩm (TỐI ƯU UI/UX) ===
        const right = document.createElement("div");
        right.style.cssText = `
          width:380px;padding:10px 10px 14px 0;
          overflow-y:auto; /* Cuộn (Desktop) */
          position:relative; /* Cha cho nút sticky */
        `;

        // Tên sản phẩm
        const titleBox = document.createElement("div");
        titleBox.style.cssText = `
          background:rgba(240,240,240,0.9);padding:10px 14px;border-radius:8px;
          margin-bottom:10px;font-weight:800;font-size:22px;color:#222;
          box-shadow:inset 0 0 6px rgba(0,0,0,0.1);
        `;
        titleBox.textContent = titleText;

        // Xử lý giá
        let priceText = "Liên hệ";
        let priceColor = THEME;
        if (product["T.THÁI"] && product["T.THÁI"].toLowerCase().includes("đã bán")) {
          priceText = "Tạm hết hàng";
          priceColor = "#e74c3c";
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
          ["CPU", product["CPU"] || "N/A"],
          ["RAM", product["RAM"] ? `${product["RAM"]} Gb` : "N/A"],
          ["SSD Nvme", product["SSD"] ? `${product["SSD"]} Gb` : "N/A"],
          ["Màn hình", product["RESOLUTION"] || "N/A"],
          ["Kích thước", product["SIZE"] ? `${product["SIZE"]} inch` : "N/A"],
          ["GPU", product["GPU"] || "Onboard"],
          ["Phân loại", product["Phân loại"] || "Laptop"],
          ["Trạng thái", product["T.THÁI"] || "Đang bán"],
          // (*** MỚI - UI/UX ***) Thêm giá vào bảng
          ["Giá", `<b style="color:${priceColor};font-size:17px;font-weight:800;">${priceText}</b>`],
          ["Ghi chú", product["NOTE"] || "Không có"]
        ];
        rows.forEach((r, i) => {
          const tr = document.createElement("tr");
          tr.style.background = i % 2 === 0 ? "#fff" : "#f8faf8";
          tr.innerHTML = `
            <td style="padding:8px;border:1px solid #eee;width:36%;font-weight:600">${r[0]}</td>
            <td style="padding:8px;border:1px solid #eee">${r[1]}</td>`;
          table.appendChild(tr);
        });
        
        // (*** MỚI - UI/UX ***) Nút hành động (Sticky)
        const actions = document.createElement("div");
        actions.style.cssText = `
          display:flex;gap:10px;margin: 20px 0 0 0;
          align-items:center;justify-content:center;
          position: sticky;
          bottom: -1px; /* Bám sát đáy */
          background: #fefef5; /* Nền che nội dung */
          padding: 12px 0; 
          border-top: 1px solid #eee;
          box-shadow: 0 -5px 12px rgba(0,0,0,0.05);
        `;
        const buyBtn = document.createElement("button");
        buyBtn.textContent = "Mua Ngay";
        buyBtn.className = "btn btn-success";
        buyBtn.style.cssText = `background:${THEME};border:none;font-weight:700;padding:12px 22px;border-radius:6px;color:#fff;flex:1;`;
        const contactBtn = document.createElement("a");
        contactBtn.href = "contact.html"; 
        contactBtn.textContent = "Liên Hệ";
        contactBtn.className = "btn btn-warning";
        contactBtn.style.cssText = "background:#f1c40f;color:#000;padding:12px 22px;border-radius:6px;font-weight:700;text-decoration:none;flex:1;";
        actions.appendChild(buyBtn);
        actions.appendChild(contactBtn);

        // Nút đóng (closeBtn)
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×";
        closeBtn.style.cssText = `
          position:absolute;right:15px;top:15px;font-size:32px;background:#fff;color:#ff0000;border:2px solid #ff0000;
          border-radius:50%;padding:2px;cursor:pointer;z-index:10;height:45px;width:45px;
          line-height:0.9;
        `;

        // Gắn kết cấu trúc
        right.appendChild(titleBox);
        right.appendChild(table);
        right.appendChild(actions); 
        
        // (*** MỚI - UI/UX ***) Media Query cho mobile
        if (window.innerWidth < 768) {
          card.style.flexDirection = 'column';
          card.style.height = '90vh';
          card.style.maxHeight = '90vh';
          card.style.padding = '15px';
          // (*** THAY ĐỔI ***) Toàn bộ card sẽ cuộn
          card.style.overflowY = 'auto'; 
          
          left.style.minWidth = 'auto';
          left.style.flex = '0 0 auto';
          left.style.margin = '0';
          
          mainImgWrap.style.minHeight = '0';
          mainImgWrap.style.height = '250px';
          mainImg.style.maxHeight = '250px'; 

          right.style.width = '100%';
          right.style.padding = '10px 0 0 0';
          right.style.flex = '0 0 auto'; // (*** THAY ĐỔI ***) Bỏ cuộn riêng
          right.style.overflow = 'visible'; // (*** THAY ĐỔI ***) Bỏ cuộn riêng

          closeBtn.style.right = '10px';
          closeBtn.style.top = '10px';
          closeBtn.style.height = '40px';
          closeBtn.style.width = '40px';
        }

        card.appendChild(left);
        card.appendChild(right);
        overlay.appendChild(card);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);

        // Logic đóng popup
        const closePopup = () => {
            stopAutoplay();
            overlay.remove();
            
            document.body.style.overflow = 'auto'; 
            
            // (*** MỚI - SEO ***) Quay lại URL gốc (trang chủ)
            const basePath = window.location.pathname.includes('.html') ? 
                             window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) : 
                             '/';
            history.pushState(null, null, basePath);
            
            // (*** MỚI - SEO ***) Khôi phục Title và Meta gốc
            document.title = SITE_TITLE_HOME;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', SITE_META_DESC_HOME);
            }
        };

        // Hành vi
        closeBtn.onclick = closePopup;
        overlay.addEventListener("click", (e) => { 
            if (e.target === overlay) { 
                closePopup();
            } 
        });
        document.addEventListener("keydown", function escHandler(e) {
          if (e.key === "Escape") { 
            closePopup();
            document.removeEventListener("keydown", escHandler);
          }
        });
        buyBtn.onclick = () => openOrderForm(product, titleText, overlay);
        startAutoplay();

        // Hiệu ứng CSS
        const style = document.createElement("style");
        style.textContent = `
          @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
          @keyframes slideUpFade { from {transform:translateY(30px);opacity:0;} to {transform:translateY(0);opacity:1;} }
          .i10-popup-overlay ::-webkit-scrollbar { width: 6px; }
          .i10-popup-overlay ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
          .i10-popup-overlay ::-webkit-scrollbar-track { background: #f0f0f0; }
        `;
        document.head.appendChild(style);
    } catch (err) {
        console.error("Lỗi mở popup:", err);
        document.body.style.overflow = 'auto'; // Đảm bảo khôi phục cuộn nếu lỗi
        alert("Lỗi hiển thị sản phẩm: " + err.message);
    }
}


/* -----------------------------------------------------
   POPUP ĐẶT HÀNG
   ----------------------------------------------------- */
function openOrderForm(product, titleText, parentOverlay) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10020;background:#fff;padding:20px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.35);width:90%;max-width:380px;";

  modal.innerHTML = `
    <h4 style="margin:0 0 8px 0;font-weight:700;color:${THEME};">Đặt hàng: <span style="color:#2c3e50;font-weight:600">${titleText}</span></h4>
    <p style="font-size:13px;color:#27ae60;margin-bottom:12px;">Cảm ơn bạn đã tin dùng! i10 Store sẽ sớm liên hệ...</p>
    <input id="order_name" placeholder="👤 Họ tên *" class="form-control" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px" />
    <input id="order_phone" placeholder="📞 Số điện thoại *" class="form-control" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px" type="tel" />
    <textarea id="order_note" placeholder="📝 Ghi chú (Địa chỉ, yêu cầu khác...)" class="form-control" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px" rows="3"></textarea>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button id="order_cancel" class="btn btn-default" style="padding:8px 15px;border:1px solid #ccc;border-radius:6px;">Hủy</button>
      <button id="order_submit" class="btn btn-success" style="padding:8px 15px;background:#27ae60;border:none;border-radius:6px;color:#fff;font-weight:700;">Gửi đơn hàng</button>
    </div>
    <div id="order_msg" style="margin-top:10px;font-size:13px;text-align:right;"></div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#order_cancel').onclick = ()=> modal.remove();

  modal.querySelector('#order_submit').onclick = async ()=>{
    const name = modal.querySelector('#order_name').value.trim();
    const phone = modal.querySelector('#order_phone').value.trim();
    const note = modal.querySelector('#order_note').value.trim();
    const msgEl = modal.querySelector('#order_msg');
    
    if (!name || !phone) { 
      msgEl.style.color = 'red'; 
      msgEl.textContent = "Vui lòng nhập Tên và Số điện thoại."; 
      return; 
    }

    msgEl.style.color = 'black'; msgEl.textContent = "Đang gửi...";
    modal.querySelector('#order_submit').disabled = true;

    // ...
    try {
      await fetch(SHEET_API, {
        method: 'POST',
        mode: 'no-cors', // <-- ĐÃ SỬA
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            product: titleText, 
            name, 
            phone, 
            note 
        })
      });
      
      // (*** THÊM VÀO ***)
      // Vì dùng no-cors, ta không thể đọc "response.ok".
      // Chúng ta giả định thành công (giống hệt contact.html)
      msgEl.style.color = 'green';
      msgEl.textContent = "✅ Gửi thành công! Cảm ơn bạn.";
      setTimeout(()=> modal.remove(), 2000);

    } catch (err) {
      // Lỗi này giờ đây chủ yếu là lỗi mạng (ví dụ: rớt mạng)
      msgEl.style.color = 'red';
      msgEl.textContent = "Lỗi gửi: " + (err.message || "Vui lòng kiểm tra lại kết nối.");
    } finally {
      modal.querySelector('#order_submit').disabled = false;
    }
  };
}


/* -----------------------------------------------------
   BANNER (TỐI ƯU CACHE localStorage)
   ----------------------------------------------------- */
async function renderBanner() {
  const bannerContainer = document.getElementById("banner");
  if (!bannerContainer) return;

  const placeholder = bannerContainer.querySelector(".banner-placeholder");
  if (placeholder) placeholder.textContent = "Đang tải banner...";

  let banners = null;

  try {
    // Đọc cache
    try {
      const cached = localStorage.getItem(CACHE_KEY_BANNER);
      if (cached) {
        const { timestamp, items } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) { 
          banners = items;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc cache banner, đang tải lại...");
      localStorage.removeItem(CACHE_KEY_BANNER);
    }

    // Fetch nếu không có cache
    if (!banners) {
      if (placeholder) placeholder.textContent = "Đang tải banner mới...";
      const res = await fetch(`${SHEET_API}?mode=banner`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải banner từ server");
      banners = await res.json();
      
      localStorage.setItem(CACHE_KEY_BANNER, JSON.stringify({
        timestamp: Date.now(),
        items: banners
      }));
    }

    if (!Array.isArray(banners) || banners.length === 0)
      throw new Error("Không có dữ liệu banner");

    // === HTML hiển thị khung ===
    bannerContainer.innerHTML = `
      <div class="banner-row">
        <button class="banner-nav prev">❮</button>
        <div class="banner-track" id="banner-track">
          </div>
        <button class="banner-nav next">❯</button>
      </div>
    `;

    // (*** LOGIC RENDER SLIDE GIỮ NGUYÊN ***)
    const track = document.getElementById("banner-track");
    const prevBtn = bannerContainer.querySelector(".banner-nav.prev");
    const nextBtn = bannerContainer.querySelector(".banner-nav.next");
    const total = banners.length;
    let currentIndex = 0;
    const MAX_STACK = window.innerWidth > 768 ? 3 : 1;
    const STACK_OVERLAP_PX = window.innerWidth > 768 ? 20 : 15;
    const SCALE_STEP = 0.1;
    const ITEM_SIZE = window.innerWidth > 768 ? 220 : 150;
    const BASE_SHIFT = window.innerWidth > 768 ? 130 : 90;
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
      item.innerHTML = `<img src="${banners[i].thumb}" alt="${banners[i].name || 'Banner'} - i10 Store" loading="lazy" />`;
      track.appendChild(item);
      bannerItems.push(item);
    }
    function getIndex(index) {
      return (index % total + total) % total;
    }
    function updateLayout() {
      const currentMaxStack = window.innerWidth > 768 ? 5 : 1;
      const currentItemSize = window.innerWidth > 768 ? 220 : 150;
      const currentBaseShift = window.innerWidth > 768 ? 90 : 90;
      const currentStackOverlap = window.innerWidth > 768 ? 20 : 15;
      bannerItems.forEach((item, index) => {
        let offset = index - currentIndex;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        const absOffset = Math.abs(offset);
        const direction = offset / (absOffset || 1);
        const isVisible = absOffset <= currentMaxStack;
        if (isVisible) {
          let translateX;
          let scale;
          let zIndex;
          if (offset === 0) {
            scale = 1;
            zIndex = 10;
            translateX = '-50%';
          } else {
            const stackLayer = absOffset;
            scale = 1 - stackLayer * SCALE_STEP;
            zIndex = 10 - stackLayer;
            let accumulatedShift = 0;
            for (let i = 1; i <= stackLayer; i++) {
              const currentLayerScale = 1 - (i - 1) * SCALE_STEP;
              const nextLayerScale = 1 - i * SCALE_STEP;
              accumulatedShift += (currentItemSize * currentLayerScale / 2 + currentItemSize * nextLayerScale / 2) - currentStackOverlap;
            }
            translateX = `calc(-50% + ${direction * (currentBaseShift + accumulatedShift)}px)`;
          }
          item.style.cssText += `
                    opacity: 1; 
                    z-index: ${zIndex};
                    left: 50%;
                    width: ${currentItemSize}px; 
                    height: ${currentItemSize}px; 
                    transform: translateX(${translateX}) scale(${scale});
                `;
        } else {
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
      currentIndex = getIndex(currentIndex + 1);
      updateLayout();
    }
    updateLayout();
    nextBtn.onclick = () => { nextSlide(); restartAuto(); };
    prevBtn.onclick = () => { prevSlide(); restartAuto(); };
    let autoTimer = setInterval(nextSlide, 3000);
    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, 3000);
    }
    window.addEventListener('resize', debounce(updateLayout, 100));

  } catch (err) {
    bannerContainer.innerHTML = `<div style="padding:40px;color:red;text-align:center;">❌ Lỗi tải banner: ${err.message}</div>`;
    console.error("Lỗi renderBanner:", err);
  }
}


/* -----------------------------------------------------
   KHỞI TẠO VÀ ROUTING (TỐI ƯU SEO)
   ----------------------------------------------------- */

/**
 * (MỚI - SEO) Hàm đọc URL khi tải trang và mở popup nếu cần
 */
async function handlePageLoadRouting() {
    const path = window.location.pathname; // Ví dụ: /san-pham/thinkpad-x1
    
    // Nếu là trang chủ, hoặc trang con khác (contact.html)
    if (path === '/' || path.endsWith('/') || path.endsWith('.html') || !path.startsWith('/san-pham/')) {
        renderProductGrid(); // Chỉ cần render grid
        return;
    }
    
    // Nếu là link sản phẩm (ví dụ: /san-pham/thinkpad-x1)
    
    // 1. Render grid (để nền không bị trống)
    renderProductGrid();
    
    // 2. Lấy data và tìm sản phẩm
    const slugToFind = path.substring(1); // Bỏ dấu / ở đầu
    const allData = await getProductData();
    const productToOpen = allData.find(p => p.slug === slugToFind);

    if (productToOpen) {
        const jsonData = encodeURIComponent(JSON.stringify(productToOpen));
        // Đợi 1 chút để grid render xong rồi hẵng mở
        setTimeout(() => {
            openProductPopup(jsonData, productToOpen.slug);
        }, 100); 
    } else {
        console.warn(`Không tìm thấy sản phẩm với slug: ${slugToFind}`);
    }
}

/**
 * (MỚI - SEO) Hàm xử lý nút Back/Fwd của trình duyệt
 */
window.addEventListener('popstate', (event) => {
    const overlay = document.querySelector('.i10-popup-overlay');
    
    if (event.state && event.state.slug) {
        // Mở lại popup sản phẩm từ state
        if (!overlay) {
            openProductPopup(event.state.json, event.state.slug);
        }
    } else {
        // Đóng popup (nếu đang mở)
        if (overlay) {
            overlay.remove(); // Xóa thủ công
            document.body.style.overflow = 'auto';
            document.title = SITE_TITLE_HOME;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', SITE_META_DESC_HOME);
            }
        }
    }
});


/**
 * Init - Khởi chạy khi DOM tải xong
 */
document.addEventListener("DOMContentLoaded", () => {
    const siteLogo = document.getElementById("site-logo");
    if (siteLogo) siteLogo.src = SITE_LOGO;
    
    renderBanner();
    
    // (*** THAY ĐỔI ***)
    // renderProductGrid(); // CŨ
    handlePageLoadRouting(); // MỚI
});