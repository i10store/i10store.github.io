/* ========== CONFIG ========== */
// Ưu tiên đọc từ I10_CONFIG (config.js), nếu không có dùng i10Config (i10-config.min.js)
const SITE_CONFIG = (typeof I10_CONFIG !== 'undefined') ? I10_CONFIG : (typeof i10Config !== 'undefined') ? i10Config : {};
const SHEET_API = SITE_CONFIG.SHEET_API || "";
const PRODUCTS_JSON_URL = SITE_CONFIG.STATIC_JSON_FILE ? SITE_CONFIG.STATIC_JSON_FILE : "/assets/js/products.json";

// URL nguồn dữ liệu chính: Luôn lấy trực tiếp từ Google Sheet Web
const DATA_SOURCE_URL = (() => {
  if (SITE_CONFIG.SHEET_WEB_JSON_URL) {
    return SITE_CONFIG.SHEET_WEB_JSON_URL;
  }
  if (SITE_CONFIG.SHEET_WEB_ID) {
    return `https://docs.google.com/spreadsheets/d/${SITE_CONFIG.SHEET_WEB_ID}/gviz/tq?sheet=${SITE_CONFIG.SHEET_WEB_SHEET_NAME || 'Web'}&tqx=out:json`;
  }
  return PRODUCTS_JSON_URL;
})();
const SITE_LOGO = SITE_CONFIG.SITE_LOGO || "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000";
const SITE_LOGO_2 = SITE_CONFIG.SITE_LOGO_2 || "https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000";
const THEME = SITE_CONFIG.THEME || "#76b500";
const CACHE_KEY = "i10_products_cache_v6";
const CACHE_KEY_BANNER = "i10_banner_cache_v6";
const CACHE_TTL = SITE_CONFIG.CACHE_TTL || 5 * 60 * 1000; // 5 phút
const SITE_TITLE_HOME = SITE_CONFIG.SITE_TITLE_HOME || "i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN";
const SITE_TITLE_SUFFIX = SITE_CONFIG.SITE_TITLE_SUFFIX || "- i10 STORE";
const SITE_META_DESC_HOME = SITE_CONFIG.SITE_META_DESC_HOME || "i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.";
const CLOUDINARY_CLOUD_NAME = SITE_CONFIG.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_LOGO_PUBLIC_ID = SITE_CONFIG.CLOUDINARY_LOGO_PUBLIC_ID || "i10_logo";

/* === HELPERS === */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts));
  if (!res.ok) {
    const txt = await res.text().catch(()=>"");
    throw new Error("Lỗi mạng: " + res.status + " " + txt);
  }
  const text = await res.text();
  
  // Xử lý Google Visualization API wrapper: /*O_o*/google.visualization.Query.setResponse({...})
  let jsonStr = text.trim();
  if (jsonStr.startsWith('/*O_o*/')) {
    // Loại bỏ phần comment /*O_o*/ và tìm object JSON
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = text.substring(jsonStart, jsonEnd + 1);
    } else {
      throw new Error("Không thể parse Google Sheet response wrapper");
    }
  }
  
  return JSON.parse(jsonStr);
}
function debounce(fn, wait=250){
  let t;
  return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); };
}
function createSlug(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

function shuffleArray(items) {
  const arr = Array.isArray(items) ? items.slice() : [];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getCacheBustedUrl(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cb=${Math.round(Date.now() / CACHE_TTL)}`;
}

function escapeAttr(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function isDepositedProduct(product) {
  const status = String(product && product["T.THÁI"] ? product["T.THÁI"] : "").trim().toLowerCase();
  return status === "đã nhận cọc";
}

function getProductComparablePriceValue(product) {
  if (!product || typeof product !== "object") return null;
  const exactPrice = parseFloat(product["Price"]);
  if (!Number.isNaN(exactPrice) && exactPrice > 0) return exactPrice;
  const segmentStr = String(product["PRICE SEGMENT"] || "");
  const match = segmentStr.match(/(\d+[\.,]?\d*)/);
  if (!match) return null;
  const parsed = parseFloat(match[1].replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function getProductBasicSpecs(product) {
  if (!product || typeof product !== "object") return [];
  const specs = [
    product["CPU_Detail"] || product["CPU"],
    product["RAM_Detail"] || product["RAM"],
    product["SSD_Detail"] || product["SSD"],
    product["RESOLUTION"],
    product["GPU_Detail"] || product["GPU"]
  ].filter(Boolean);
  return specs;
}

function getRandomRelatedProducts(sourceProduct, allProducts, limit = 4) {
  const sourcePrice = getProductComparablePriceValue(sourceProduct);
  if (!Array.isArray(allProducts) || !allProducts.length || sourcePrice == null) return [];

  const samePriceBand = allProducts
    .filter((product) => product && product !== sourceProduct)
    .map((product) => {
      const price = getProductComparablePriceValue(product);
      return { product, price };
    })
    .filter(({ price }) => price != null)
    .map(({ product, price }) => ({
      product,
      price,
      diff: Math.abs(price - sourcePrice)
    }))
    .filter(({ diff }) => diff <= Math.max(sourcePrice * 0.25, 2));

  const exactRange = samePriceBand.filter(({ diff }) => diff <= Math.max(sourcePrice * 0.12, 1));
  const pool = exactRange.length >= limit ? exactRange : samePriceBand;
  if (!pool.length) return [];

  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, limit).map(({ product }) => product);
}

function renderRelatedProductItem(product) {
  const title = `${product["Brand"] || ""} ${product["Model"] || ""}`.trim() || (product["Name"] || "Sản phẩm");
  const image = getProductImages(product)[0];
  const cpu = product["CPU"] || product["CPU_Detail"] || "N/A";
  const ram = product["RAM"] || product["RAM_Detail"] || "N/A";
  const display = product["RESOLUTION"] || "N/A";
  const gpu = product["GPU"] || product["GPU_Detail"] || "N/A";
  const specs = [cpu, ram, display, gpu].filter(Boolean).join(" • ");
  let priceText = "Liên hệ";
  if (product["T.THÁI"] && String(product["T.THÁI"]).toLowerCase().includes("đã bán")) {
    priceText = "Tạm hết hàng";
  } else if (product["Price"]) {
    const num = parseFloat(product["Price"]) * 1000000;
    priceText = `~${num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
  } else if (product["PRICE SEGMENT"]) {
    priceText = product["PRICE SEGMENT"];
  }
  return `
    <button type="button" class="related-product-item" data-json="${escapeAttr(encodeURIComponent(JSON.stringify(product)))}" data-slug="${escapeAttr(product.slug || "")}" style="display:block;padding:8px;border:1px solid #eee;border-radius:10px;background:#fff;cursor:pointer;text-align:left;width:100%;transition:background-color .18s ease,color .18s ease,border-color .18s ease;">
      <div style="display:flex;gap:8px;align-items:flex-start;">
      <div style="width:48px;height:48px;flex:0 0 48px;border-radius:7px;overflow:hidden;background:#f5f5f5;border:1px solid #eee;">
        ${renderResponsiveImage(image, title, "48px", "style=\"width:100%;height:100%;object-fit:cover;\"")}
      </div>
      <div style="min-width:0;flex:1;">
        <div style="font-size:12px;font-weight:700;color:#222;line-height:1.3;max-height:31px;overflow:hidden;">${escapeAttr(title)}</div>
      </div>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#666;line-height:1.35;max-height:34px;overflow:hidden;">${escapeAttr(specs)}</div>
      <div style="margin-top:4px;font-size:12px;font-weight:800;color:${THEME};line-height:1.3;">${escapeAttr(priceText)}</div>
    </button>
  `;
}

function closeAllProductPopups() {
  document.querySelectorAll('.i10-popup-overlay').forEach((node) => node.remove());
  document.body.style.overflow = 'auto';
  const basePath = window.location.pathname.includes('.html')
    ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)
    : '/';
  history.pushState(null, null, basePath);
  document.title = SITE_TITLE_HOME;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', SITE_META_DESC_HOME);
  }
}

function normalizeDriveImageUrl(url, size = 1000) {
  if (!url) return "";
  const str = String(url);
  if (str.includes("drive.google.com")) {
    const fileId = str.match(/[-\w]{25,}/);
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId[0]}&sz=w${size}`;
  }
  return str.replace(/=s\d+/, `=s${size}`).replace(/([?&]sz=)[sw]?\d+/, `$1w${size}`);
}

function encodeCloudinaryPublicId(publicId) {
  return String(publicId || "").split("/").map(encodeURIComponent).join("/");
}

function getCloudinaryPublicId(item) {
  if (!item || typeof item !== "object") return "";
  if (item.public_id) return String(item.public_id);
  if (item.publicId) return String(item.publicId);
  const id = item.id ? String(item.id) : "";
  const url = String(item.secure_url || item.url || item.thumb || item.cover || "");
  if (id && (id.includes("/") || url.includes("cloudinary.com"))) return id;
  return "";
}

function buildCloudinaryUrl(publicId, transform) {
  if (!CLOUDINARY_CLOUD_NAME || !publicId) return "";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${encodeCloudinaryPublicId(publicId)}`;
}

function buildCloudinaryCoverUrl(publicId) {
  const logoOverlay = String(CLOUDINARY_LOGO_PUBLIC_ID || "i10_logo").replace(/\//g, ":");
  return buildCloudinaryUrl(publicId, `f_auto,q_auto,w_1600/l_${logoOverlay},o_40,g_south_east,x_30,y_30`);
}

function parseImageList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return [value];

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
  } catch (e) {
    // Fall back to legacy newline/comma separated URLs.
  }

  return text.split(/[\n,]+/).map((url) => url.trim()).filter(Boolean);
}

function hasImageSource(image) {
  if (!image) return false;
  if (typeof image === "string") return !!image;
  const responsive = image.responsive || {};
  return !!(image.url || image.secure_url || image.thumb || image.cover || responsive.small || responsive.medium || responsive.large || (CLOUDINARY_CLOUD_NAME && getCloudinaryPublicId(image)));
}

function normalizeImageItem(item) {
  if (!item) return {};
  if (typeof item === "string") {
    return {
      id: "",
      name: "",
      url: normalizeDriveImageUrl(item, 1600),
      thumb: normalizeDriveImageUrl(item, 600),
      cover: normalizeDriveImageUrl(item, 1600),
      responsive: {
        small: normalizeDriveImageUrl(item, 400),
        medium: normalizeDriveImageUrl(item, 800),
        large: normalizeDriveImageUrl(item, 1600)
      }
    };
  }

  const publicId = getCloudinaryPublicId(item);
  const originalUrl = item.secure_url || item.url || buildCloudinaryUrl(publicId, "f_auto,q_auto,w_1600");
  const thumbUrl = item.thumb || item.thumbnail_url || buildCloudinaryUrl(publicId, "f_auto,q_auto,w_600") || originalUrl;
  const coverUrl = item.cover || buildCloudinaryCoverUrl(publicId) || originalUrl;
  const responsive = item.responsive || {};

  return Object.assign({}, item, {
    id: item.id || publicId,
    public_id: item.public_id || publicId,
    url: normalizeDriveImageUrl(originalUrl, 1600),
    thumb: normalizeDriveImageUrl(thumbUrl, 600),
    cover: normalizeDriveImageUrl(coverUrl, 1600),
    responsive: {
      small: normalizeDriveImageUrl(responsive.small || buildCloudinaryUrl(publicId, "f_auto,q_auto,w_400") || thumbUrl || originalUrl, 400),
      medium: normalizeDriveImageUrl(responsive.medium || buildCloudinaryUrl(publicId, "f_auto,q_auto,w_800") || thumbUrl || originalUrl, 800),
      large: normalizeDriveImageUrl(responsive.large || buildCloudinaryUrl(publicId, "f_auto,q_auto,w_1600") || coverUrl || originalUrl, 1600)
    }
  });
}

function getImageScore(img) {
  let score = 0;
  const width = Number(img.width || 0);
  const height = Number(img.height || 0);
  const name = img.name || img.original_filename || "";

  if (width > height) score += 10;
  if (width >= 1200) score += 5;
  if (/front|cover|main/i.test(name)) score += 20;
  return score;
}

function autoPickCover(images) {
  return (Array.isArray(images) ? images : [])
    .slice()
    .sort((a, b) => getImageScore(b) - getImageScore(a));
}

function getProductImages(product) {
  if (!product) return [];
  let images = parseImageList(product["Photos2"])
    .map(normalizeImageItem)
    .filter(hasImageSource);

  if (!images.length) {
    images = parseImageList(product.images)
      .map(normalizeImageItem)
      .filter(hasImageSource);
  }

  return autoPickCover(images);
}

function getImageUrl(image, intent = "medium") {
  const img = typeof image === "string" ? normalizeImageItem(image) : (image || {});
  const responsive = img.responsive || {};
  if (intent === "small") return responsive.small || img.thumb || img.url || img.cover || "";
  if (intent === "large") return responsive.large || img.cover || img.url || img.thumb || "";
  if (intent === "cover") return img.cover || responsive.large || img.url || img.thumb || "";
  if (intent === "thumb") return img.thumb || responsive.small || img.url || "";
  return responsive.medium || img.thumb || img.url || img.cover || "";
}

function getImageSrcset(image) {
  const img = typeof image === "string" ? normalizeImageItem(image) : (image || {});
  const responsive = img.responsive || {};
  return [
    responsive.small ? `${responsive.small} 400w` : "",
    responsive.medium ? `${responsive.medium} 800w` : "",
    responsive.large ? `${responsive.large} 1600w` : ""
  ].filter(Boolean).join(", ");
}

function renderResponsiveImage(image, alt, sizes = "(max-width:768px) 100vw, 50vw", extraAttrs = "") {
  const src = getImageUrl(image, "medium") || SITE_LOGO_2;
  const srcset = getImageSrcset(image);
  const responsiveAttrs = srcset ? ` srcset="${escapeAttr(srcset)}" sizes="${escapeAttr(sizes)}"` : "";
  const extra = extraAttrs ? ` ${extraAttrs}` : "";
  return `<img loading="lazy" decoding="async" src="${escapeAttr(src)}"${responsiveAttrs} alt="${escapeAttr(alt)}"${extra} onerror="this.onerror=null;this.src='${escapeAttr(SITE_LOGO_2)}';">`;
}

function setResponsiveImageElement(imgEl, image, intent = "medium", sizes = "(max-width:768px) 100vw, 50vw") {
  const src = getImageUrl(image, intent) || SITE_LOGO_2;
  const srcset = getImageSrcset(image);
  imgEl.src = src;
  imgEl.loading = "lazy";
  imgEl.decoding = "async";
  imgEl.alt = imgEl.alt || "i10 Store";
  if (srcset) {
    imgEl.srcset = srcset;
    imgEl.sizes = sizes;
  } else {
    imgEl.removeAttribute("srcset");
    imgEl.removeAttribute("sizes");
  }
}

/* === GOOGLE SHEET PARSER === */
function parseSheetData(response) {
  // Nếu đã là array, trả về luôn
  if (Array.isArray(response)) return response;
  
  // Nếu là object có table (từ Google Visualization API)
  if (response.table && response.table.rows) {
    const cols = response.table.cols || [];
    const rows = response.table.rows || [];
    
    // Lấy headers từ ROW ĐẦU TIÊN (row 0) vì cols.label thường null
    const headerRow = rows[0];
    if (!headerRow || !headerRow.c) return [];
    
    const headers = headerRow.c.map((cell, idx) => {
      // Thử lấy từ col label trước, nếu không có thì từ cell value
      const colLabel = cols[idx] && cols[idx].label ? cols[idx].label : "";
      if (colLabel && colLabel.trim()) return colLabel.trim();
      return (cell && cell.v !== undefined) ? String(cell.v).trim() : `col${idx}`;
    });
    
    // Lấy data từ row 2 trở đi (bỏ header row + 1 dòng phụ/chú thích)
    return rows.slice(2)
      .filter(row => row.c) // Bỏ hàng trống
      .map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
          if (cell) {
            // Lấy giá trị: ưu tiên v (formatted value), fallback f (formula)
            obj[headers[i]] = cell.v !== undefined ? cell.v : (cell.f || "");
          } else {
            obj[headers[i] || `col${i}`] = "";
          }
        });
        return obj;
      });
  }
  
  return [];
}

function getSheetHeaderCellValue(response, columnName, rowIndex = 1, fallbackColumnIndex = null) {
  if (!response || Array.isArray(response) || !response.table || !response.table.rows) return "";

  const cols = response.table.cols || [];
  const rows = response.table.rows || [];
  const headerRow = rows[0];
  const targetRow = rows[rowIndex];
  if (!headerRow || !headerRow.c || !targetRow || !targetRow.c) return "";

  const headers = headerRow.c.map((cell, idx) => {
    const colLabel = cols[idx] && cols[idx].label ? cols[idx].label : "";
    if (colLabel && colLabel.trim()) return colLabel.trim();
    return (cell && cell.v !== undefined) ? String(cell.v).trim() : `col${idx}`;
  });

  let columnIndex = headers.findIndex(header => header === columnName);
  if (columnIndex < 0 && fallbackColumnIndex !== null) columnIndex = fallbackColumnIndex;
  if (columnIndex < 0) return "";

  const cell = targetRow.c[columnIndex];
  if (!cell) return "";
  return cell.v !== undefined ? String(cell.v) : (cell.f || "");
}

/* === CONTROLS RENDERER === */
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

  const priceWrap = document.createElement('div');
  priceWrap.className = 'price-filter-wrap';
  const priceLabel = document.createElement('span');
  priceLabel.textContent = 'Giá khoảng (tr):';
  priceWrap.appendChild(priceLabel);
  const priceInput = document.createElement('input');
  priceInput.type = "number";
  priceInput.id = "price_query_input";
  priceInput.className = "form-control price-search-input";
  priceInput.placeholder = "Vd: 8";
  priceInput.min = "0";
  priceWrap.appendChild(priceInput);
  ctrl.appendChild(priceWrap);

  const searchWrap = document.createElement('div');
  searchWrap.className = "search-price-container";
  const input = document.createElement('input');
  input.type = "search";
  input.placeholder = "Tìm theo tên, GPU, máy trạm, văn phòng,...";
  input.className = "main-search-input";
  searchWrap.appendChild(input);
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = "🧹 Xóa";
  clearBtn.className = "clear-btn";
  clearBtn.style.marginLeft = "6px";
searchWrap.appendChild(clearBtn);
  ctrl.appendChild(searchWrap);

  clearBtn.onclick = ()=>{
    input.value = "";
    sel.value = "default";
    priceInput.value = ""; 
    onChange({ q:"", sort:"default", priceQuery: "" });
  };

  container.prepend(ctrl);

  const trigger = debounce(()=> onChange({ 
      q: input.value.trim(), 
      sort: sel.value,
      priceQuery: priceInput.value.trim()
  }), 180);
  
  input.addEventListener('input', trigger);
  sel.addEventListener('change', trigger);
  priceInput.addEventListener('input', trigger);
  
  return { input, sel, priceInput };
}

/* === DATA LOADER === */
let globalProductData = null;
let globalProductPromise = null;

function prepareProductData(data) {
  if (!Array.isArray(data)) return [];
  data.forEach((p, i) => {
    const slugText = [
      p["Model"] || p["Name"],
      p["CPU"],
      p["RAM"],
      p["SSD"],
      p["RESOLUTION"],
      p["GPU"],
      p["ID"]
    ].filter(Boolean).join(' ');
    p.slug = p["Web Link"] || `san-pham/${createSlug(slugText || `product-${i}`)}`;
  });
  return data;
}

async function getProductData(forceRefresh = false) {
  if (globalProductData && !forceRefresh) return globalProductData;
  if (globalProductPromise && !forceRefresh) return globalProductPromise;

  const fetchData = async () => {
    let data = null;
    
    // Đọc cache nếu không force refresh
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, items } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) data = items;
        }
      } catch (e) { /* ignore */ }
    }

    if (!data) {
      let raw = await fetchJSON(getCacheBustedUrl(DATA_SOURCE_URL));
      
      // Parse nếu là Google Sheet format
      data = parseSheetData(raw);
      
      // Nếu không phải array, throw error
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu sheet không đúng định dạng");
      }

      // Lưu cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        items: data
      }));
    }

    // Xử lý slug
    data = prepareProductData(data);
    
    globalProductData = data;
    return data;
  };

  globalProductPromise = fetchData();
  return globalProductPromise;
}

async function getStartupProductData() {
  try {
    const raw = await fetchJSON(getCacheBustedUrl(PRODUCTS_JSON_URL));
    const data = prepareProductData(parseSheetData(raw));
    if (Array.isArray(data) && data.length) {
      return { items: data, isStatic: true };
    }
  } catch (err) {
    console.warn("Khong the doc file products.json, chuyen sang Google Sheet:", err.message);
  }

  return { items: await getProductData(true), isStatic: false };
}


async function renderProductGrid() {
    const container = document.getElementById("i10-product");
    if (!container) return;

    const ITEMS_PER_PAGE = 30;

    // (*** TỐI ƯU: Tạo HTML bố cục cũ tại đây ***)
    container.innerHTML = `
        <div id="i10-controls"></div>
        <div id="i10-data-status"></div>
        <div id="i10-grid"></div>
        <div id="i10-pagination"></div> 
    `;
    const controlsEl = document.getElementById('i10-controls');
    const dataStatusEl = document.getElementById('i10-data-status');
    const gridEl = document.getElementById('i10-grid');
    const paginationEl = document.getElementById('i10-pagination');
    
    // Hiển thị loading (thay thế placeholder)
    gridEl.innerHTML = `<div style="padding:20px;text-align:center;"><i class="fa fa-spinner fa-spin fa-3x fa-fw" style="color: ${THEME};"></i><p style="margin-top:15px;font-size:16px;">Đang tải dữ liệu sản phẩm...</p></div>`;

    try {
        const startupData = await getStartupProductData();
        if (startupData.isStatic && dataStatusEl) {
            dataStatusEl.innerHTML = `<div style="margin:0 10px 12px;padding:8px 12px;border:1px solid #d7e8b8;border-radius:6px;background:#f8fff0;color:#5b7f00;font-size:13px;text-align:center;">Sản phẩm đang cập nhật dữ liệu gần nhất.</div>`;
        }
        const rawData = startupData.items;

        // Lấy toàn bộ danh sách sản phẩm (không lọc trùng)
        const data = rawData;
        
        const params = new URLSearchParams(window.location.search);
        const filter = params.get("filter");
        
        // (Hàm lọc applyUrlFilter)
        function applyUrlFilter(fullList, filterKey) {
            if (!filterKey) return fullList;
            const key = filterKey.toLowerCase();
            let simpleQueryString = "";
            const norm = (s) => (s || "").toLowerCase();
            switch (key) {
                case "vanphong":
                    return fullList.filter(p => {
                        const phanLoai = norm(p["Phân loại"]);
                        const gpu = norm(p["GPU"]);
                        return phanLoai.includes("văn phòng") || phanLoai.includes("mỏng nhẹ") || gpu.includes("onboard") || gpu.includes("intel uhd") || gpu.includes("intel hd") || (gpu.includes("intel") && !gpu.includes("nvidia") && !gpu.includes("amd") && !gpu.includes("radeon"));
                    });
                case "maytram":
                    return fullList.filter(p => {
                        const phanLoai = norm(p["Phân loại"]);
                        const gpu = norm(p["GPU"]);
                        const isWorkstation = phanLoai.includes("máy trạm") || phanLoai.includes("workstation");
                        const isDedicatedGpu = gpu && !gpu.includes("onboard") && !gpu.includes("intel uhd") && !gpu.includes("intel hd") && !gpu.includes("iris");
                        return isWorkstation || isDedicatedGpu;
                    });
                case "available": simpleQueryString = "còn"; break;
                case "sold": simpleQueryString = "đã bán"; break;
                case "thinkpad": simpleQueryString = "thinkpad"; break;
                case "dell": simpleQueryString = "dell"; break;
                case "x1 carbon": simpleQueryString = "x1 carbon"; break;
                case "x1 yoga": simpleQueryString = "x1 yoga"; break;
                default: simpleQueryString = key;
            }
            if (simpleQueryString) {
                return fullList.filter(p => {
                    const fields = [p["Brand"] || "", p["Model"] || "", p["Name"] || "", p["RAM"] || "", p["Phân loại"] || "", p["T.THÁI"] || "", p["GPU"] || ""].join(' ').toLowerCase();
                    return fields.includes(simpleQueryString);
                });
            }
            return fullList;
        }

        const filteredData = shuffleArray(applyUrlFilter(data, filter));
        
        let state = { q: "", sort: "default", items: filteredData, currentPage: 1, priceQuery: "" };

        // (Hàm renderPaginationHTML)
        function renderPaginationHTML(totalPages, currentPage) {
            if (totalPages <= 1) return "";
            let html = `<ul class="pagination">`;
            html += `<li class="${(currentPage === 1) ? 'disabled' : ''}"><a href="#" data-page="${currentPage - 1}" aria-label="Previous"><span aria-hidden="true">«</span></a></li>`;
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);
            if (startPage > 1) {
                html += `<li><a href="#" data-page="1">1</a></li>`;
                if (startPage > 2) html += `<li class="disabled"><span>...</span></li>`;
            }
            for (let i = startPage; i <= endPage; i++) {
                html += `<li class="${(i === currentPage) ? 'active' : ''}"><a href="#" data-page="${i}">${i}</a></li>`;
            }
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += `<li class="disabled"><span>...</span></li>`;
                html += `<li><a href="#" data-page="${totalPages}">${totalPages}</a></li>`;
            }
            html += `<li class="${(currentPage === totalPages) ? 'disabled' : ''}"><a href="#" data-page="${currentPage + 1}" aria-label="Next"><span aria-hidden="true">»</span></a></li>`;
            html += `</ul>`;
            return html;
        }
        
        // (Hàm isSold)
        const isSold = (product) => {
            const status = (product["T.THÁI"] || "").toLowerCase();
            if (status.includes("đã bán") || status.includes("tạm hết")) return true;
            const priceVal = product["Price"];
            const segmentVal = product["PRICE SEGMENT"];
            if ((priceVal == null || priceVal === "") && (segmentVal == null || segmentVal === "")) return true;
            return false;
        };

        const orderByStockStatus = (items) => {
            const availableItems = [];
            const unavailableItems = [];
            items.forEach(product => {
                if (isSold(product)) unavailableItems.push(product);
                else availableItems.push(product);
            });
            return availableItems.concat(unavailableItems);
        };
        
        // (Hàm getComparablePrice)
        const getComparablePrice = (product) => {
            let priceVal = product["Price"];
            if (priceVal != null && !isNaN(parseFloat(priceVal))) return parseFloat(priceVal);
            let segmentStr = product["PRICE SEGMENT"] || "";
            const match = segmentStr.match(/(\d+[\.,]?\d*)/); 
            if (match) return parseFloat(match[1].replace(',', '.'));
            return Infinity;
        };

        // (Helper getProductPriceNum)
        const getProductPriceNum = (product) => {
            let priceVal = product["Price"];
            if (priceVal != null && !isNaN(parseFloat(priceVal))) return parseFloat(priceVal);
            return null;
        };
        
        // (Helper getProductSegmentRange)
        const getProductSegmentRange = (product) => {
            let segmentStr = product["PRICE SEGMENT"] || "";
            const numbers = segmentStr.match(/(\d+[\.,]?\d*)/g);
            if (!numbers) return null;
            const nums = numbers.map(n => parseFloat(n.replace(',', '.')));
            if (nums.length === 1) return [nums[0], nums[0]];
            if (nums.length > 1) return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
            return null;
        };
        
        // 4. Hàm doRender
        const doRender = ({ q, sort, priceQuery } = {}) => {
            if (q !== undefined) state.q = q;
            if (sort !== undefined) state.sort = sort;
            if (priceQuery !== undefined) state.priceQuery = priceQuery; 

            const qstr = (state.q || "").toLowerCase();
            const priceNum = parseFloat(state.priceQuery); 
            
            let list = state.items.slice();

            if (qstr) {
                list = list.filter(p => {
                    const fields = [p["Brand"] || "", p["Model"] || "", p["Name"] || "", p["RAM"] || "", p["Phân loại"] || "", p["T.THÁI"] || "", p["GPU"] || ""].join(' ').toLowerCase();
                    return fields.includes(qstr);
                });
            }

            if (!isNaN(priceNum) && priceNum > 0) {
                const minSearch = priceNum - 2;
                const maxSearch = priceNum + 2;
                list = list.filter(p => {
                    const exactPrice = getProductPriceNum(p);
                    const segmentRange = getProductSegmentRange(p);
                    if (exactPrice !== null && exactPrice >= minSearch && exactPrice <= maxSearch) return true;
                    if (segmentRange !== null) {
                        const [segMin, segMax] = segmentRange;
                        if (segMax >= minSearch && segMin <= maxSearch) return true;
                    }
                    return false;
                });
            }

            if (state.sort === "price_asc" || state.sort === "price_desc") {
                list.sort((a, b) => {
                    const soldA = isSold(a);
                    const soldB = isSold(b);
                    if (soldA && !soldB) return 1;
                    if (!soldA && soldB) return -1;
                    const priceA = getComparablePrice(a);
                    const priceB = getComparablePrice(b);
                    if (state.sort === "price_asc") return priceA - priceB;
                    else return priceB - priceA;
                });
            } else {
                list = orderByStockStatus(list);
            }

            const totalItems = list.length;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (state.currentPage > totalPages && totalPages > 0) state.currentPage = totalPages;
            if (state.currentPage < 1) state.currentPage = 1;
            const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedList = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            // Logic render HTML
            const html = paginatedList.map((p) => {
                const title = `${p["Brand"] || ""} ${p["Model"] || ""}`.trim() || (p["Name"] || "Sản phẩm");
                
                const displayImages = getProductImages(p);
                const mainImage = displayImages[0];
                
                let priceText = "Liên hệ";
                let priceStyle = `color:${THEME};font-weight:800;`;
                
                if (p["T.THÁI"] && p["T.THÁI"].toLowerCase().includes("đã bán")) {
                  priceText = "Tạm hết hàng";
                  priceStyle = `color:#e74c3c;font-weight:700;font-size:15px;`;
                } else if (p["Price"]) {
                  const num = parseFloat(p["Price"]) * 1000000;
                  priceText = `~${num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
                } else if (p["PRICE SEGMENT"]) {
                  const segmentStr = p["PRICE SEGMENT"] || "";
                  const numbers = segmentStr.match(/(\d+[\.,]?\d*)/g);
                  if (numbers) {
                      const nums = numbers.map(n => parseFloat(n.replace(',', '.')) * 1000000);
                      if (nums.length === 1) {
                          priceText = `~${nums[0].toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
                      } else if (nums.length > 1) {
                          const min = Math.min(nums[0], nums[1]);
                          const max = Math.max(nums[0], nums[1]);
                          priceText = `${min.toLocaleString('vi-VN', { minimumFractionDigits: 0 })} - ${max.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
                      }
                  } else {
                      priceText = p["PRICE SEGMENT"];
                  }
                }
                
                let config = [];
                if (p["CPU"]) config.push(p["CPU"]);
                if (p["RAM"]) config.push(p["RAM"]);
                if (p["SSD"]) config.push(p["SSD"]);
                if (p["RESOLUTION"]) config.push(p["RESOLUTION"]);
                if (p["GPU"] && p["GPU"].toLowerCase() !== "onboard") config.push(p["GPU"]);
                
                const jsonData = encodeURIComponent(JSON.stringify(p));
                const cardCtaText = isDepositedProduct(p) ? "Đã nhận cọc" : "Mua ngay";
                return `
                  <div class="col-xs-6 col-sm-6 col-md-4 product-item" style="margin-bottom:22px;">
                    <div class="product-card" data-json="${jsonData}" data-slug="${p.slug}">
                      <div class="thumb">
                        ${renderResponsiveImage(mainImage, `${title} - i10 Store`, "(max-width:768px) 50vw, 280px")}
                      </div>
                      <div style="padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;flex:1;">
                        <div>
                          <h4 style="font-size:16px;font-weight:700;margin:0 0 6px 0;color:#2c3e50;min-height:42px;line-height:1.3;overflow:hidden;">${title}</h4>
                          <div style="font-size:13px;color:#666;">${config.join(" • ")}</div>
                        </div>
                         <div class="price-container" style="${priceStyle}margin-top:8px;font-size:16px">${priceText}</div>
                         <button class="buy-now-btn" data-json="${jsonData}" data-title="${escapeAttr(title)}" style="width:100%;margin-top:10px;padding:3px 12px;background:${THEME};color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;" onmouseover="this.style.backgroundColor='#096B00';" onmouseout="this.style.backgroundColor='${THEME}'">${cardCtaText}</button>
                      </div>
                    </div>
                  </div>`;
            }).join("");

gridEl.innerHTML = `<div class="row">${html}</div>`; 
             
             document.querySelectorAll("#" + gridEl.id + " .product-card").forEach(card => {
                 card.addEventListener('click', function(e) {
                     const buyBtn = e.target.closest('.buy-now-btn');
                     if (buyBtn) {
                         e.stopPropagation();
                         const jsonData = buyBtn.getAttribute('data-json');
                         const titleText = buyBtn.getAttribute('data-title');
                         try {
                             const product = JSON.parse(decodeURIComponent(jsonData));
                             // Create title with ID like in the popup for consistency
                             const titleWithId = `${product["Brand"] || ""} ${product["Model"] || ""} \u00A0  [${product["ID"] || ""}]`.trim() || (product["Name"] || "Sản phẩm");
                             openOrderForm(product, titleWithId);
                         } catch (err) {
                             console.error('Lỗi mở form đặt hàng:', err);
                         }
                         return;
                     }
                     const jsonData = this.getAttribute('data-json');
                     const slug = this.getAttribute('data-slug');
                     openProductPopup(jsonData, slug);
                 });
             });
            
            paginationEl.innerHTML = renderPaginationHTML(totalPages, state.currentPage);
              
        }; // Hết hàm doRender
            
        // 5. Khởi tạo
        controlsEl.innerHTML = ''; 
        renderControls(controlsEl, ({ q, sort, priceQuery }) => {
            state.currentPage = 1;
            doRender({ q, sort, priceQuery });
        });
        
        paginationEl.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('[data-page]');
            if (!target) return;
            const newPage = parseInt(target.dataset.page, 10);
            
            const qstr = (state.q || "").toLowerCase();
            const priceNum = parseFloat(state.priceQuery);
            let list = state.items.filter(p => {
                 if (!qstr) return true;
                 const fields = [p["Brand"] || "", p["Model"] || "", p["Name"] || "", p["RAM"] || "", p["Phân loại"] || "", p["T.THÁI"] || "", p["GPU"] || ""].join(' ').toLowerCase();
                 return fields.includes(qstr);
            });
            if (!isNaN(priceNum) && priceNum > 0) {
                const minSearch = priceNum - 2;
                const maxSearch = priceNum + 2;
                list = list.filter(p => {
                    const exactPrice = getProductPriceNum(p);
                    const segmentRange = getProductSegmentRange(p);
                    if (exactPrice !== null && exactPrice >= minSearch && exactPrice <= maxSearch) return true;
                    if (segmentRange !== null) {
                        const [segMin, segMax] = segmentRange;
                        if (segMax >= minSearch && segMin <= maxSearch) return true;
                    }
                    return false;
                });
            }

            const totalItems = list.length;
            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
            if (newPage === state.currentPage || newPage < 1 || newPage > totalPages) return;
            state.currentPage = newPage;
            doRender({});
            
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
            
        doRender();

        if (startupData.isStatic) {
          getProductData(true).then((freshData) => {
            state.items = shuffleArray(applyUrlFilter(freshData, filter));
            state.currentPage = 1;
            if (dataStatusEl) dataStatusEl.innerHTML = "";
            doRender({});
          }).catch(err => {
            console.warn("Loi cap nhat du lieu tu Google Sheet:", err.message);
          });
        }
        
        // === AUTO-REFRESH: Tải lại dữ liệu mỗi 5 phút ===
        setTimeout(() => {
          getProductData(true).then((freshData) => {
            console.log("🔄 Tự động cập nhật dữ liệu sau 5 phút");
            state.items = shuffleArray(applyUrlFilter(freshData, filter));
            doRender();
          }).catch(err => {
            console.warn("Lỗi auto-refresh:", err.message);
          });
        }, 5 * 60 * 1000); // 5 phút
        
        // Lắng nghe sự kiện storage để sync giữa các tab
        window.addEventListener('storage', (e) => {
          if (e.key === CACHE_KEY && e.newValue) {
            try {
              const { timestamp, items } = JSON.parse(e.newValue);
              // Nếu cache mới hơn 30s, tải lại
              if (Date.now() - timestamp < 30000) {
                console.log("📡 Phát hiện thay đổi từ tab khác, đang tải lại...");
                getProductData(true).then((freshData) => {
                  state.items = shuffleArray(applyUrlFilter(freshData, filter));
                  doRender();
                });
              }
            } catch (e) { /* ignore */ }
          }
        });
        
        // (*** SỬA: Đã thêm lại filter X1 của bạn ***)
        if (filter && ["available", "sold", "thinkpad", "dell", "blackberry", "x1 carbon", "x1 yoga"].includes(filter)) {
             const searchInput = document.querySelector('#' + controlsEl.id + ' input[type="search"]');
             let simpleQueryString = filter;
             if (filter === 'available') simpleQueryString = 'còn';
             if (filter === 'sold') simpleQueryString = 'đã bán';
             if (searchInput) searchInput.value = simpleQueryString;
        }

    } catch (err) {
        const errorHtml = `<div style="padding:40px;text-align:center;color:red;border:1px solid #f00;border-radius:10px;">
          <i class="fa fa-exclamation-triangle fa-2x"></i>
          <p style="margin-top:10px;">Lỗi tải sản phẩm: ${err.message}</p>
          <button class="btn btn-warning" onclick="localStorage.removeItem('${CACHE_KEY}'); location.reload();" style="margin-top:10px;">Thử lại</button>
        </div>`;
        if (gridEl) { gridEl.innerHTML = errorHtml; } 
        else if (container) { container.innerHTML = errorHtml; }
        console.error(err);
    }
}


/* (*** LIGHTBOX NÂNG CAO v12.2 ***) */
function openAdvancedLightbox(images, startIndex) {
    const oldLightbox = document.querySelector(".i10-lightbox-overlay");
    if (oldLightbox) oldLightbox.remove();

    let currentIndex = startIndex;
    const totalImages = images.length;

    const lightbox = document.createElement("div");
    lightbox.className = "i10-lightbox-overlay";
    
    const closeBtn = document.createElement("div");
    closeBtn.className = "i10-lightbox-close";
    closeBtn.innerHTML = "×";
    
    const img = document.createElement("img");
    img.className = "i10-lightbox-img";
    img.alt = "i10 Store";
    setResponsiveImageElement(img, images[currentIndex], "large", "100vw");

    const prevBtn = document.createElement("button");
    prevBtn.className = "i10-lightbox-nav prev";
    prevBtn.innerHTML = "❮";
    
    const nextBtn = document.createElement("button");
    nextBtn.className = "i10-lightbox-nav next";
    nextBtn.innerHTML = "❯";

    function updateImage(newIndex) {
        currentIndex = (newIndex + totalImages) % totalImages;
        img.style.opacity = 0;
        setTimeout(() => {
            setResponsiveImageElement(img, images[currentIndex], "large", "100vw");
            img.style.opacity = 1;
        }, 150);
    }

    prevBtn.onclick = (e) => { e.stopPropagation(); updateImage(currentIndex - 1); };
    nextBtn.onclick = (e) => { e.stopPropagation(); updateImage(currentIndex + 1); };
    
    const closeLightbox = () => {
        lightbox.remove();
        document.removeEventListener("keydown", handleKeydown);
    };

    closeBtn.onclick = closeLightbox;
    lightbox.onclick = (e) => { if (e.target === lightbox) closeLightbox(); };

    const handleKeydown = (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); updateImage(currentIndex + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); updateImage(currentIndex - 1); }
        else if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
    };
    document.addEventListener("keydown", handleKeydown);

    lightbox.appendChild(img);
    lightbox.appendChild(closeBtn);
    if (totalImages > 1) {
        lightbox.appendChild(prevBtn);
        lightbox.appendChild(nextBtn);
    }
    document.body.appendChild(lightbox);
}



function updateMetaTags(product) {
    const titleText = `${product["Brand"] || ""} ${product["Model"] || ""}`.trim() || (product["Name"] || "Sản phẩm");
    const firstImg = getImageUrl(getProductImages(product)[0], "cover") || SITE_LOGO;

    // 1. Cập nhật Meta Title cho mạng xã hội
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", titleText + " " + SITE_TITLE_SUFFIX);

    // 2. Cập nhật Meta Image - Đây là phần quan trọng nhất để hiện ảnh khi gửi link
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute("content", firstImg);

    // 3. Cập nhật Meta URL
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", window.location.href);
}
/* -----------------------------------------------------
   TOOL: CONVERT DRIVE LINKS TO PHOTOS2 JSON
   ----------------------------------------------------- */
/* (*** BẢN ĐÃ CHUYỂN SANG HÀM folder-aware Ở DƯỚI ***) ĐÃ BỎ ĐỂ TRÁNH TRÙNG LẶP - SỬ DỤNG HÀM folder-aware Ở DƯỚI 
function convertDriveLinksToPhotos2JSON(linksInput) {
  // Input: string (newline/ comma separated) hoặc array
  let links = Array.isArray(linksInput) 
    ? linksInput 
    : String(linksInput).split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
  
  return JSON.stringify(links.map(link => {
    // Extract file ID từ link Drive
    const idMatch = link.match(/[-\w]{25,}/);
    const id = idMatch ? idMatch[0] : '';
    // Extract name từ link
    const nameMatch = link.match(/[^/]+$/);
    const name = nameMatch ? decodeURIComponent(nameMatch[0]) : `image_${id.substring(0,8)}.jpg`;
    
    return {
      id: id,
      name: name,
      url: `https://drive.google.com/uc?export=view&id=${id}`,
      thumb: `https://drive.google.com/thumbnail?id=${id}&sz=s1000`
    };
  }), null, 2);
} */

// Hàm này dùng để import từ change.xlsx (chạy trong Console sau khi copy link)
function importPhotos2FromExcelLegacy() {
  alert(`Copy toàn bộ link Drive từ Excel (cột chứa link ảnh), sau đó nhấn OK.`);
  navigator.clipboard.readText().then(text => {
    const json = convertDriveLinksToPhotos2JSON(text);
    console.log('📋 PHOTOS2 JSON (copy và dán vào cột AH của sheet Web):\n\n', json);
    alert('✅ JSON đã log ra Console! Mở Console (F12) và copy chuỗi JSON để dán vào sheet.');
  }).catch(err => {
    alert('Lỗi đọc clipboard: ' + err.message);
  });
}

/* =====================================================
    END OF TOOLS
    ===================================================== */

// Image protection - prevent saving/downloading images via right-click or drag
document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        // Optional: Uncomment to show a warning (may annoy users)
        // alert('Images are protected. Please contact us for image usage.');
    }
}, false);

document.addEventListener('dragstart', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
    }
}, false);

function openProductPopup(encoded, slug) {
    document.body.style.overflow = 'hidden';

    if (slug && window.location.pathname !== `/${slug}`) {
        history.pushState({ json: encoded, slug: slug }, "", `/${slug}`); 
    }

    document.querySelectorAll('.i10-popup-overlay').forEach((node) => node.remove());

    try {
        const product = JSON.parse(decodeURIComponent(encoded));
        updateMetaTags(product);
        const titleText = `${product["Brand"] || ""} ${product["Model"] || ""} \u00A0  [${product["ID"] || ""}]`.trim() || (product["Name"] || "Sản phẩm");

        document.title = `${titleText} ${SITE_TITLE_SUFFIX}`; 
        
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            const description = product["Meta Description"] || 
                                `Cấu hình: ${[product["CPU"], product["RAM"], product["SSD"], product["GPU"]].filter(Boolean).join(' • ')}. Liên hệ i10 Store.`;
            metaDesc.setAttribute('content', description.substring(0, 155));
        }

            let images = getProductImages(product);
            if (!images.length) images.push(normalizeImageItem(SITE_LOGO));

        let currentIndex = 0;
        let autoplayTimer = null;

        const overlay = document.createElement("div");
        overlay.className = "i10-popup-overlay";
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:10px;animation:fadeIn 0.3s ease;`;

        const card = document.createElement("div");
        card.style.cssText = `width:100%;max-width:1000px;background:#fefef5;border-radius:18px;display:flex;gap:20px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.3);transform:translateY(30px);opacity:0;animation:slideUpFade .45s ease forwards;padding:20px 24px;position:relative;max-height:90vh;`;
        
        const left = document.createElement("div");
        left.style.cssText = `flex: 0 1 68%; min-width: 360px; display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;margin-left:12px;`;

        const mainImgWrap = document.createElement("div");
        mainImgWrap.style.cssText = `height:100%;display:flex;align-items:center;justify-content:center;min-height:400px;border-radius:16px;position:relative;overflow:hidden;`;
        
        const mainImg = document.createElement("img");
        mainImg.alt = titleText;
        setResponsiveImageElement(mainImg, images[currentIndex], "large", "(max-width:768px) 100vw, 60vw");
        mainImg.style.cssText = `max-width:100%;max-height:400px;object-fit:contain;border-radius:16px;transition:opacity .3s ease, transform .3s ease;cursor: zoom-in;`;
        mainImg.onclick = () => openAdvancedLightbox(images, currentIndex);
        mainImgWrap.appendChild(mainImg);


        const prevBtn = document.createElement("button");
        const nextBtn = document.createElement("button");
        [prevBtn, nextBtn].forEach((b, i) => {
          b.innerHTML = i === 0 ? "❮" : "❯";
          b.style.cssText = `position:absolute;${i === 0 ? "left" : "right"}:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:18px;z-index:5;`;
          mainImgWrap.appendChild(b);
        });

        const thumbsWrap = document.createElement("div");
        thumbsWrap.style.cssText = `position:relative;width:100%;overflow:hidden;margin-top:12px;padding:6px 0;display:flex;justify-content:center;`;
        const thumbsInner = document.createElement("div");
        thumbsInner.style.cssText = `display:flex;gap:8px;transition:transform 0.32s ease;align-items:center;justify-content:center;`;
        thumbsWrap.appendChild(thumbsInner);

        const thumbElems = [];
        images.forEach((imageItem, i) => {
          const t = document.createElement("img");
          t.alt = `${titleText} ${i + 1}`;
          setResponsiveImageElement(t, imageItem, "small", "64px");
          t.style.cssText = `width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #ddd;cursor:pointer;opacity:${i === 0 ? 1 : 0.6};flex-shrink:0;`;
          t.onclick = () => {
            currentIndex = i;
            setResponsiveImageElement(mainImg, imageItem, "large", "(max-width:768px) 100vw, 60vw");
            mainImg.onclick = () => openAdvancedLightbox(images, i);
            thumbElems.forEach((el, idx) => (el.style.opacity = idx === i ? "1" : "0.6"));
            startAutoplay();
          };
          thumbsInner.appendChild(t);
          thumbElems.push(t);
        });
        
        left.appendChild(mainImgWrap);
        left.appendChild(thumbsWrap);

        function startAutoplay() { stopAutoplay(); autoplayTimer = setInterval(() => changeImage(1), 3000); }
        function stopAutoplay() { if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; } }
        const changeImage = (dir) => {
          currentIndex = (currentIndex + dir + images.length) % images.length;
          mainImg.style.opacity = 0;
          setTimeout(() => {
            setResponsiveImageElement(mainImg, images[currentIndex], "large", "(max-width:768px) 100vw, 60vw");
            mainImg.onclick = () => openAdvancedLightbox(images, currentIndex);
            mainImg.style.opacity = 1;
          }, 150);
          thumbElems.forEach((el, idx) => (el.style.opacity = idx === currentIndex ? "1" : "0.6"));
        };
        prevBtn.onclick = () => { changeImage(-1); startAutoplay(); };
        nextBtn.onclick = () => { changeImage(1); startAutoplay(); };

        const right = document.createElement("div");
        right.style.cssText = `flex: 0 1 60%; width: 60%; padding:10px 10px 14px 0;overflow-y:auto;position:relative;`;

        const titleBox = document.createElement("div");
        titleBox.style.cssText = `background:rgba(240,240,240,0.9);padding:10px 14px;border-radius:8px;margin-bottom:10px;font-weight:800;font-size:22px;color:#222;box-shadow:inset 0 0 6px rgba(0,0,0,0.1);`;
        titleBox.textContent = titleText;

        let priceText = "Liên hệ";
        let priceColor = THEME;
        if (product["T.THÁI"] && product["T.THÁI"].toLowerCase().includes("đã bán")) {
          priceText = "Tạm hết hàng";
          priceColor = "#e74c3c";
        } else if (product["Price"]) {
          const num = parseFloat(product["Price"]) * 1000000;
          priceText = `~${num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
        } else if (product["PRICE SEGMENT"]) {
          const segmentStr = product["PRICE SEGMENT"] || "";
          const numbers = segmentStr.match(/(\d+[\.,]?\d*)/g);
          if (numbers) {
              const nums = numbers.map(n => parseFloat(n.replace(',', '.')) * 1000000);
              if (nums.length === 1) {
                  priceText = `~${nums[0].toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
              } else if (nums.length > 1) {
                  const min = Math.min(nums[0], nums[1]);
                  const max = Math.max(nums[0], nums[1]);
                  priceText = `${min.toLocaleString('vi-VN', { minimumFractionDigits: 0 })} - ${max.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 })}`;
              }
          } else {
              priceText = product["PRICE SEGMENT"];
          }
        }

        const googlePhotoLink = product["Photos"] || product["google photo"] || product["Google Photos"] || "";
        const hasNoImage = !product.images || product.images.length === 0;
        
        let photoRow = "";
        if (googlePhotoLink) {
            photoRow = `<tr><td style="padding:8px;border:1px solid #eee;width:36%;font-weight:600">Ghi chú 2</td><td style="padding:8px;border:1px solid #eee">${googlePhotoLink}</td></tr>`;
        } else if (hasNoImage) {
            photoRow = `<tr><td style="padding:8px;border:1px solid #eee;width:36%;font-weight:600">Chi tiết</td><td style="padding:8px;border:1px solid #eee"><a href="/contact.html" style="color:#e74c3c;font-weight:600;">Liên hệ để nhận tư vấn chi tiết hơn</a></td></tr>`;
        }

        const table = document.createElement("table");
        table.style.cssText = "width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;";
const rows = [
  ["CPU", product["CPU_Detail"] || product["CPU"] || "N/A"],
  ["RAM", product["RAM_Detail"] ? `${product["RAM_Detail"]}` : (product["RAM"] ? `${product["RAM"]}` : "N/A")],
  ["SSD", product["SSD_Detail"] ? `${product["SSD_Detail"]}` : (product["SSD"] ? `${product["SSD"]}` : "N/A")],
  ["Màn hình", product["RESOLUTION"] || "N/A"],
  ["Kích thước", product["SIZE"] ? `${product["SIZE"]} inch` : "N/A"],
  ["GPU", product["GPU_Detail"] || product["GPU"] || "Onboard"],
  ["Phân loại", product["Phân loại"] || "Laptop"],
  ["Trạng thái", product["T.THÁI"] || "Đang bán"],
  ["Giá bán", `<b style="color:${priceColor};font-size:17px;font-weight:800;">${priceText}</b>`],
  ["Ghi chú", product["NOTE"] || "Không có"]
];
        rows.forEach((r, i) => {
          const tr = document.createElement("tr");
          tr.style.background = i % 2 === 0 ? "#fff" : "#f8faf8";
          tr.innerHTML = `<td style="padding:8px;border:1px solid #eee;width:36%;font-weight:600">${r[0]}</td><td style="padding:8px;border:1px solid #eee">${r[1]}</td>`;
          table.appendChild(tr);
        });
        
        if (photoRow) {
          const tr = document.createElement("tr");
          tr.style.background = rows.length % 2 === 0 ? "#fff" : "#f8faf8";
          tr.innerHTML = photoRow;
          table.appendChild(tr);
        }

        const isMobile = window.innerWidth < 768;
        const relatedProducts = getRandomRelatedProducts(product, globalProductData || [], isMobile ? 5 : 5);
        const relatedWrap = document.createElement("div");
        relatedWrap.style.cssText = "width:203px;flex:0 0 203px;display:flex;flex-direction:column;align-self:flex-start;background:#fefef5;border-radius:18px;box-shadow:0 16px 40px rgba(0,0,0,0.18);overflow:hidden;";
        relatedWrap.innerHTML = `
          <div class="related-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px 6px 12px;border-bottom:1px solid #eee;background:#faf7ea;">
            <div style="font-weight:800;font-size:14px;color:#222;line-height:1;">Sản phẩm khác:</div>
            <button type="button" class="related-toggle-btn" style="padding:6px 10px;border:none;border-radius:8px;background:#222;color:#fff;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;">
              <i class="fa fa-eye-slash"></i> Ẩn
            </button>
          </div>
          <div class="related-body" style="display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto;max-height:83vh;">
            <div class="related-product-list" style="display:flex;flex-direction:column;gap:10px;">
              ${relatedProducts.length ? relatedProducts.map(renderRelatedProductItem).join("") : '<div style="padding:10px;color:#666;font-size:13px;border:1px dashed #ddd;border-radius:10px;background:#fff;">Chưa có gợi ý phù hợp</div>'}
            </div>
          </div>
        `;

        const actions = document.createElement("div");
        actions.style.cssText = `display:flex; gap:10px; margin: 20px 0 0 0; align-items:center; justify-content:center; position: sticky; bottom: -15px; background: #fefef5; padding: 6px 0; border-top: 1px solid #eee;`;
        
        actions.innerHTML = `
          <a href="tel:0838288000" class="btn btn-danger" style="background:#e74c3c;color:#fff;font-weight:700;padding:8px 15px;font-size:13px;border-radius:8px;flex:1;"><i class="fa fa-phone"></i> 0838.288.000</a>
          <a href="https://zalo.me/0838288000" target="_blank" class="btn btn-primary" style="background:#0068ff;color:#fff;font-weight:700;padding:8px 15px;font-size:13px;border-radius:8px;flex:1;"><i class="fa fa-comment"></i> Chat Zalo</a>
        `;
        
        const orderBtn = document.createElement("button");
        orderBtn.className = "btn btn-success";
        orderBtn.innerHTML = isDepositedProduct(product)
          ? `<i class="fa fa-comments"></i> Nhận tư vấn`
          : `<i class="fa fa-shopping-cart"></i> Đặt hàng`;
        orderBtn.style.cssText = `background:${THEME};color:#fff;font-weight:700;padding:8px 15px;font-size:13px;border-radius:8px;flex:1;border:none;min-width:110px;`;
        orderBtn.onclick = () => openOrderForm(product, titleText, overlay);
        actions.appendChild(orderBtn);

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×";
        closeBtn.style.cssText = `position:absolute;right:15px;top:15px;font-size:32px;background:#fff;color:#ff0000;border:2px solid #ff0000;border-radius:50%;padding:2px;cursor:pointer;z-index:10;height:45px;width:45px;line-height:0.9;`;

        const relatedHeader = relatedWrap.querySelector('.related-header');
        const relatedBody = relatedWrap.querySelector('.related-body');
        const relatedToggleBtn = relatedWrap.querySelector('.related-toggle-btn');
        const relatedTitleEl = relatedHeader.querySelector('div');
        let relatedVisible = true;
        const setRelatedVisibility = (visible) => {
          relatedVisible = visible;
          relatedBody.style.display = visible ? "flex" : "none";
          relatedTitleEl.style.display = visible ? "block" : "none";
          relatedWrap.style.width = visible ? "203px" : "fit-content";
          relatedWrap.style.flex = visible ? "0 0 203px" : "0 0 auto";
          relatedWrap.style.maxWidth = visible ? "203px" : "unset";
          relatedWrap.style.overflow = "hidden";
          relatedToggleBtn.innerHTML = visible
            ? '<i class="fa fa-eye-slash"></i> Ẩn'
            : '<i class="fa fa-eye"></i> Hiện sản phẩm gợi ý';
          relatedHeader.style.justifyContent = visible ? "space-between" : "center";
          relatedHeader.style.borderBottom = visible ? "1px solid #eee" : "none";
          relatedHeader.style.padding = visible ? "6px 10px 6px 12px" : "8px 10px";
          relatedWrap.style.boxShadow = visible ? "0 16px 40px rgba(0,0,0,0.18)" : "0 8px 20px rgba(0,0,0,0.12)";
          relatedWrap.style.paddingBottom = visible ? "0" : "0";
          card.style.flex = visible ? "0 1 auto" : "1 1 100%";
          shell.style.maxWidth = visible ? "1300px" : "100%";
          shell.style.gap = visible ? "16px" : "0";
          if (window.innerWidth < 768) {
            relatedWrap.style.width = visible ? "100%" : "fit-content";
            relatedWrap.style.maxWidth = visible ? "100%" : "unset";
          }
        };
        relatedToggleBtn.onclick = () => setRelatedVisibility(!relatedVisible);

        right.appendChild(titleBox);
        right.appendChild(table);
        if (relatedWrap) right.appendChild(relatedWrap);
        right.appendChild(actions); 
        
        if (window.innerWidth < 768) {
          card.style.flexDirection = 'column';
          card.style.height = '100vh';
          card.style.maxHeight = '100vh';
          card.style.padding = '15px';
          card.style.overflowY = 'auto'; 
          left.style.minWidth = 'auto';
          left.style.flex = '0 0 auto';
          left.style.margin = '0';
          mainImgWrap.style.minHeight = '0';
          mainImgWrap.style.height = '250px';
          mainImg.style.maxHeight = '250px'; 
          right.style.width = '100%';
          right.style.padding = '10px 0 0 0';
          right.style.flex = '0 0 auto';
          right.style.overflow = 'visible';
          closeBtn.style.right = '10px';
          closeBtn.style.top = '10px';
          closeBtn.style.height = '40px';
          closeBtn.style.width = '40px';
          actions.style.position = 'sticky';
          actions.style.bottom = '-15px';
          actions.style.marginLeft = '-15px';
          actions.style.marginRight = '-15px';
          actions.style.paddingLeft = '10px';
          actions.style.paddingRight = '10px';
          actions.style.flexWrap = 'wrap';

          relatedWrap.style.order = '5';
          relatedWrap.style.width = '100%';
          relatedWrap.style.maxWidth = '100%';
          relatedWrap.style.flex = '0 0 auto';
          relatedWrap.style.maxHeight = '22vh';
          relatedWrap.style.alignSelf = 'stretch';
          relatedWrap.querySelector('.related-product-list').style.cssText = 'display:flex;flex-direction:row;gap:8px;padding:5px;overflow-x:auto;overflow-y:hidden;max-height:calc(22vh - 8px);white-space:nowrap;';
          relatedWrap.querySelectorAll('.related-product-item').forEach((item) => {
            item.style.minWidth = '180px';
            item.style.flex = '0 0 180px';
          });
        }

        const shell = document.createElement("div");
        shell.style.cssText = "display:flex;gap:16px;align-items:flex-start;max-width:1300px;width:100%;";
        if (window.innerWidth < 768) shell.style.flexDirection = 'column';
        card.appendChild(left);
        card.appendChild(right);
        shell.appendChild(card);
        shell.appendChild(relatedWrap);
        overlay.appendChild(shell);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);

        setRelatedVisibility(true);

        const closePopup = () => {
            stopAutoplay();
            closeAllProductPopups();
        };

        closeBtn.onclick = closePopup;
        overlay.addEventListener("click", (e) => { 
            if (e.target === overlay) closePopup();
        });
        document.addEventListener("keydown", function escHandler(e) {
          if (e.key === "Escape") { 
            closePopup();
            document.removeEventListener("keydown", escHandler);
          }
        });

        relatedWrap.querySelectorAll(".related-product-item").forEach((item) => {
          item.addEventListener("mouseenter", () => {
            item.style.backgroundColor = "var(--i10-highlight, #bfbfbf)";
            item.style.borderColor = "var(--i10, #76b500)";
          });
          item.addEventListener("mouseleave", () => {
            item.style.backgroundColor = "#fff";
            item.style.borderColor = "#eee";
          });
          item.addEventListener("click", () => {
            const jsonData = item.getAttribute("data-json");
            const slug = item.getAttribute("data-slug");
            openProductPopup(jsonData, slug);
          });
        });
        
        startAutoplay();

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
      document.body.style.overflow = 'auto';
      alert("Lỗi hiển thị sản phẩm: " + err.message);
    }
}

/* =====================================================
   TOOL: CONVERT DRIVE LINKS TO PHOTOS2 JSON (with Folder support)
   ===================================================== */
function extractDriveId(link) {
  const match = link.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function isFolderLink(link) {
  return link.includes('/folders/') || link.includes('/d/f/') || link.includes('folders=') || link.includes('/drive/folders/');
}

async function fetchFolderFiles(folderId) {
  const gasUrl = SITE_CONFIG.GAS_FOLDER_TO_JSON_URL;
  if (!gasUrl) {
    throw new Error("Chưa cấu hình GAS_FOLDER_TO_JSON_URL. Cần deploy Google Apps Script (xem apps-script.txt)");
  }
  const url = `${gasUrl}?folderId=${encodeURIComponent(folderId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Lỗi fetch folder: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Dữ liệu folder không phải array");
  }
  return data;
}

async function convertDriveLinksToPhotos2JSON(linksInput) {
  let links = Array.isArray(linksInput)
    ? linksInput
    : String(linksInput).split(/[\n,]+/).map(l => l.trim()).filter(Boolean);

  const results = [];

  for (const link of links) {
    const id = extractDriveId(link);
    if (!id) {
      console.warn('Không lấy được ID từ link:', link);
      continue;
    }

    if (isFolderLink(link)) {
      try {
        const files = await fetchFolderFiles(id);
        results.push(...files);
      } catch (err) {
        console.error('Lỗi lấy folder', link, err.message);
      }
    } else {
      const nameMatch = link.match(/[^/]+$/);
      const name = nameMatch ? decodeURIComponent(nameMatch[0]) : `image_${id.substring(0,8)}.jpg`;
      results.push({
        id: id,
        name: name,
        url: `https://drive.google.com/uc?export=view&id=${id}`,
        thumb: `https://drive.google.com/thumbnail?id=${id}&sz=s1000`
      });
    }
  }

  return JSON.stringify(results);
}

async function importPhotos2FromExcel() {
  alert(`📋 Bước 1: Copy toàn bộ link Drive từ Excel (link ảnh hoặc link folder)\nBước 2: Nhấn OK ở đây`);
  try {
    const text = await navigator.clipboard.readText();
    const json = await convertDriveLinksToPhotos2JSON(text);
    console.log('\n========== PHOTOS2 JSON (copy & dán vào cột AH) ==========\n\n', json);
    alert('✅ Xong! Mở Console (F12) để copy JSON và dán vào sheet Web cột AH (Photos2)');
  } catch (err) {
    alert('❌ Lỗi: ' + err.message);
  }
}

/* =====================================================
   END OF TOOLS - GỌI TRONG CONSOLE:
     importPhotos2FromExcel()
   ===================================================== */
// Dùng để chuyển danh sách link Google Drive thành JSON Photos2
// Ví dụ: paste list link từ Excel vào Console, chạy convertLinksToJSON()
/* (*** ĐÃ BỎ ĐỂ TRÁNH TRÙNG LẶP - SỬ DỤNG HÀM folder-aware Ở DƯỚI) 
function convertDriveLinksToPhotos2JSON(linksInput) {
  let links = Array.isArray(linksInput) 
    ? linksInput 
    : String(linksInput).split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
  
  return JSON.stringify(links.map(link => {
    const idMatch = link.match(/[-\w]{25,}/);
    const id = idMatch ? idMatch[0] : '';
    const nameMatch = link.match(/[^/]+$/);
    const name = nameMatch ? decodeURIComponent(nameMatch[0]) : `image_${id.substring(0,8)}.jpg`;
    return { id, name, url: `https://drive.google.com/uc?export=view&id=${id}`, thumb: `https://drive.google.com/thumbnail?id=${id}&sz=s1000` };
  }), null, 2);
} */

// Hàm import từ clipboard (dùng cho change.xlsx)
function importPhotos2FromExcelLegacySimple() {
  alert(`📋 Bước 1: Copy toàn bộ link Drive từ Excel (cột chứa link ảnh)\nBước 2: Nhấn OK ở đây`);
  navigator.clipboard.readText().then(text => {
    const json = convertDriveLinksToPhotos2JSON(text);
    console.log('\n========== PHOTOS2 JSON (copy và dán vào cột AH) ==========\n\n', json);
    alert('✅ Xong! Mở Console (F12) để copy JSON và dán vào sheet Web cột AH (Photos2)');
  }).catch(err => {
    alert('❌ Lỗi đọc clipboard: ' + err.message);
  });
}

/* =====================================================
   END OF TOOLS - GỌI HÀM TRONG CONSOLE:
     importPhotos2FromExcel()
   ===================================================== */


/* -----------------------------------------------------
   POPUP ĐẶT HÀNG (v12.3) - GỬI TELEGRAM
   ----------------------------------------------------- */
function openOrderForm(product, titleText, parentOverlay) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10020;background: #096B00;padding:20px;border:3px solid #cdcdcd;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.35);width:90%;max-width:380px;";

  modal.innerHTML = `
     <h4 style="margin:0 0 8px 0;font-weight:700;color:${THEME};">Đặt hàng: <span style="color: #ffe100;font-weight:600">${titleText}</span></h4>
     <p style="font-size:13px;color:#000000; font-weight:500;margin-bottom:12px;">Cảm ơn bạn đã tin dùng! i10 Store sẽ sớm liên hệ, hãy điền thông tin liên lạc giúp mình nhé...</p>
     <input id="order_name" placeholder="👤 Họ tên *" class="form-control" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px" />
     <input id="order_phone" placeholder="📞 Số điện thoại *" class="form-control" style="width:100%;padding:10px;margin-bottom:8px;border:1px solid #ccc;border-radius:6px" type="tel" />
     <textarea id="order_note" placeholder="📝 Ghi chú (Đã đặt chuyển khoản cọc (nếu có)/ hình thức liên lạc/ yêu cầu khác...)" class="form-control" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px" rows="3"></textarea>
     
     <div style="border:1px solid #003b00;border-radius:8px;padding:0px;margin:15px 0;background: #799579;">
       <div id="banking_toggle_btn" style="font-weight:600;color:#333;cursor:pointer;user-select:none;display:flex;justify-content:space-between;align-items:center;">
         <span>💰Click để xem tài khoản (nếu đặt cọc)</span>
         <span id="banking_arrow" style="font-size:10px;margin-left:5px;color:#888;">▼</span>
       </div>
       
       <div id="banking_details" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed #eee;">
         <div style="display:flex;align-items:center;gap:12px;">
           <img id="banking_img_thumb" src="/assets/images/banking.png" alt="QR Code Thanh Toán" style="width:80px;height:80px;border:1px solid #eee;border-radius:4px;display:block;cursor:pointer;" onerror="this.style.display='none';">
           <div style="flex:1;">
             <div style="font-size:14px;margin-bottom:4px;font-weight:600;color:#000;">Số tài khoản: 9.179.000.000 (Techcombank)</div>
             <div style="font-size:12px;color:#666;">Chủ tài khoản: NGUYEN QUANG HIEU</div>
           </div>
         </div>
       </div>
     </div>
     
     <div style="display:flex;gap:10px;justify-content:flex-end;">
       <button id="order_cancel" class="btn btn-default" style="padding:8px 15px;border:1px solid #ccc;border-radius:6px;">Hủy</button>
       <button id="order_submit" class="btn btn-success" style="padding:8px 15px;background:#27ae60;border:none;border-radius:6px;color:#fff;font-weight:700;">Gửi đơn hàng</button>
     </div>
     <div id="order_msg" style="margin-top:10px;font-size:13px;text-align:right;"></div>
  `;

  document.body.appendChild(modal);
  
  const submitBtn = modal.querySelector('#order_submit');
  const cancelBtn = modal.querySelector('#order_cancel');
  const msgEl = modal.querySelector('#order_msg');
  
  // Lấy các phần tử phục vụ logic đóng mở thông tin tài khoản
  const bankingToggleBtn = modal.querySelector('#banking_toggle_btn');
  const bankingDetails = modal.querySelector('#banking_details');
  const bankingArrow = modal.querySelector('#banking_arrow');
  const bankingImgThumb = modal.querySelector('#banking_img_thumb');

  // Gán sự kiện click đóng mở (Toggle) thông tin tài khoản
  bankingToggleBtn.onclick = () => {
    if (bankingDetails.style.display === "none" || bankingDetails.style.display === "") {
      bankingDetails.style.display = "block";
      bankingArrow.textContent = "▲";
    } else {
      bankingDetails.style.display = "none";
      bankingArrow.textContent = "▼";
    }
  };

  // Logic click vào ảnh thu nhỏ để tạo hiệu ứng phóng to toàn màn hình (Lightbox)
  bankingImgThumb.onclick = () => {
    const zoomOverlay = document.createElement("div");
    // Đặt z-index: 10030 cao hơn hẳn modal đặt hàng để đè lên trên
    zoomOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10030;display:flex;justify-content:center;align-items:center;cursor:zoom-out;transition:opacity 0.2s ease-in-out;";
    
    const zoomImg = document.createElement("img");
    zoomImg.src = bankingImgThumb.src;
    zoomImg.style.cssText = "max-width:320px;width:85%;height:auto;border-radius:12px;border:4px solid #fff;box-shadow:0 5px 25px rgba(0,0,0,0.5);cursor:default;";
    
    // Chặn sự kiện click vào chính cái ảnh phóng to (tránh click vào ảnh lại bị ẩn đi đột ngột)
    zoomImg.onclick = (e) => e.stopPropagation();
    
    zoomOverlay.appendChild(zoomImg);
    document.body.appendChild(zoomOverlay);
    
    // Click ra vùng nền đen bên ngoài để đóng ảnh thu nhỏ lại
    zoomOverlay.onclick = () => zoomOverlay.remove();
  };
  
  cancelBtn.onclick = () => modal.remove();

  submitBtn.onclick = async () => {
    const name = modal.querySelector('#order_name').value.trim();
    const phone = modal.querySelector('#order_phone').value.trim();
    const note = modal.querySelector('#order_note').value.trim();
    
    if (!name || !phone) { 
      msgEl.style.color = 'red'; 
      msgEl.textContent = "Vui lòng nhập Tên và Số điện thoại."; 
      return; 
    }

    msgEl.style.color = '#FF6B6B';
    msgEl.textContent = "Đang gửi đơn hàng...";
    submitBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      // Kiểm tra Telegram config tồn tại
      if (typeof sendTelegramMessage === 'undefined' || typeof createOrderMessage === 'undefined') {
        throw new Error("Telegram config chưa được tải. Vui lòng F5 và thử lại.");
      }

      // Tạo tin nhắn Telegram
      const telegramMessage = createOrderMessage({
        product: titleText,
        name: name,
        phone: phone,
        note: note,
        time: new Date().toLocaleString('vi-VN')
      });

      // Gửi đến Telegram (Image Beacon - không CORS)
      const result = await sendTelegramMessage(telegramMessage);
      
      if (result.success) {
        msgEl.style.color = '#27ae60';
        msgEl.textContent = "✅ Gửi thành công! Cảm ơn bạn.";
        setTimeout(() => modal.remove(), 1500);
      } else {
        msgEl.style.color = '#e74c3c';
        msgEl.textContent = "❌ Lỗi gửi: " + result.error;
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
      }

    } catch (err) {
      msgEl.style.color = '#e74c3c';
      msgEl.textContent = "❌ Lỗi: " + (err.message || "Vui lòng kiểm tra lại kết nối.");
      submitBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  };
}
/* -----------------------------------------------------
   BANNER (TỐI ƯU CACHE localStorage)
   (*** ĐÃ SỬA: TẢI FILE banners.json TĨNH ***)
   ----------------------------------------------------- */
async function renderBanner() {
  const bannerContainer = document.getElementById("banner");
  if (!bannerContainer) return;

  const placeholder = bannerContainer.querySelector(".banner-placeholder");
  if (placeholder) placeholder.textContent = "Đang tải banner...";

  let banners = null;

  try {
    try {
      const cached = localStorage.getItem(CACHE_KEY_BANNER);
      if (cached) {
        const { timestamp, items } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) banners = items;
      }
    } catch (e) {
      console.warn("Lỗi đọc cache banner, đang tải lại...");
      localStorage.removeItem(CACHE_KEY_BANNER);
    }

    if (!banners) {
      if (placeholder) placeholder.textContent = "Đang tải banner mới...";
      
      // Lấy dữ liệu từ Google Sheet Web - cột Photos2 (AH)
      let raw = await fetchJSON(getCacheBustedUrl(DATA_SOURCE_URL));

      // Lấy JSON banner từ ô AH2, dưới cột Photos2 của hàng tiêu đề.
      const photos2Str = getSheetHeaderCellValue(raw, "Photos2", 1, 33);
      if (!photos2Str) {
        throw new Error("Không tìm thấy dữ liệu banner trong sheet Web (cột Photos2)");
      }

      let bannerArray = [];

      if (photos2Str && photos2Str.trim()) {
        try {
          // Parse JSON array từ Photos2
          bannerArray = JSON.parse(photos2Str);
          if (!Array.isArray(bannerArray)) bannerArray = [];
        } catch (e) {
          console.warn("Không parse được Photos2 JSON, thử kiểm tra lại:", e);
          throw new Error("Dữ liệu Photos2 không đúng định dạng JSON");
        }
      }

      // Normalize both Cloudinary and legacy Drive banner objects.
      banners = bannerArray.map(normalizeImageItem).filter(hasImageSource);
      
      localStorage.setItem(CACHE_KEY_BANNER, JSON.stringify({
        timestamp: Date.now(),
        items: banners
      }));
    }

    if (!Array.isArray(banners) || banners.length === 0)
      throw new Error("Không có dữ liệu banner");

    // *** Xáo trộn banner ngẫu nhiên mỗi khi tải trang ***
    banners = shuffleArray(banners);

    bannerContainer.innerHTML = `
      <div class="banner-row">
        <button class="banner-nav prev">❮</button>
        <div class="banner-track" id="banner-track"></div>
        <button class="banner-nav next">❯</button>
      </div>
    `;

    // (*** LOGIC RENDER SLIDE (v12) ***)
    const track = document.getElementById("banner-track");
    const prevBtn = bannerContainer.querySelector(".banner-nav.prev");
    const nextBtn = bannerContainer.querySelector(".banner-nav.next");
    const total = banners.length;
    let currentIndex = 0;
    
    // (Lấy logic style từ i10.css của bạn)
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
      item.innerHTML = renderResponsiveImage(banners[i], `${banners[i].name || 'Banner'} - i10 Store`, "(max-width:768px) 120px, 220px");
      track.appendChild(item);
      bannerItems.push(item);
    }
    function getIndex(index) { return (index % total + total) % total; }
    
    function updateLayout() {
      // Cập nhật lại các biến khi resize
      const currentMaxStack = window.innerWidth > 768 ? 3 : 1; 
      const currentItemSize = window.innerWidth > 768 ? (window.innerWidth > 992 ? 220 : 180) : 120; // Thu nhỏ 1 chút
      const currentBaseShift = window.innerWidth > 768 ? (window.innerWidth > 992 ? 130 : 110) : 80; 
      const currentStackOverlap = window.innerWidth > 768 ? 20 : 15;
      
      bannerItems.forEach((item, index) => {
        let offset = index - currentIndex;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;
        const absOffset = Math.abs(offset);
        const direction = offset / (absOffset || 1);
        const isVisible = absOffset <= currentMaxStack;
        if (isVisible) {
          let translateX; let scale; let zIndex;
          if (offset === 0) {
            scale = 1; zIndex = 10; translateX = '-50%';
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
            opacity: 1; z-index: ${zIndex}; left: 50%;
            width: ${currentItemSize}px; height: ${currentItemSize}px; 
            transform: translateX(${translateX}) scale(${scale});
          `;
        } else {
          item.style.opacity = 0; item.style.zIndex = 0;
          item.style.transform = 'translateY(100%) scale(0.5)';
        }
      });
    }
    
    function nextSlide() { currentIndex = getIndex(currentIndex + 1); updateLayout(); }
    function prevSlide() { currentIndex = getIndex(currentIndex - 1); updateLayout(); }
    
    updateLayout();
    nextBtn.onclick = () => { nextSlide(); restartAuto(); };
    prevBtn.onclick = () => { prevSlide(); restartAuto(); };
    
    let autoTimer = setInterval(nextSlide, 4000);
    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, 4000);
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

async function handlePageLoadRouting() {
    const path = window.location.pathname; 
    
    if (path === '/' || path === '' || path === '/index.html' || path.endsWith('/') || path.endsWith('.html') || !path.startsWith('/san-pham/')) {
        renderProductGrid(); 
        return;
    }
    
    renderProductGrid();
    
    const allData = await getProductData();
    if (!allData) return; 
    
    const slugToFind = path.substring(1); 
    const productToOpen = allData.find(p => p.slug === slugToFind);

    if (productToOpen) {
        const jsonData = encodeURIComponent(JSON.stringify(productToOpen));
        setTimeout(() => {
            openProductPopup(jsonData, productToOpen.slug);
        }, 100); 
    } else {
        console.warn(`Không tìm thấy sản phẩm với slug: ${slugToFind}`);
    }
}

window.addEventListener('popstate', (event) => {
    const overlay = document.querySelector('.i10-lightbox-overlay, .i10-popup-overlay'); 
    
    if (event.state && event.state.slug) {
        if (!overlay) {
            openProductPopup(event.state.json, event.state.slug);
        }
    } else {
        if (overlay) {
            overlay.remove(); 
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
    handlePageLoadRouting();
});
window.renderBanner = renderBanner;
