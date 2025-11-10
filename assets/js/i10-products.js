/* =========================================================
   i10 PRODUCTS - PHIÊN BẢN TỔNG HỢP (v12.4 - ĐÃ DỌN DẸP)
   - Đã gộp renderProductGrid và renderProductGridLegacy
   - Đã xóa code thừa trong getProductData
   - Giữ nguyên bố cục cũ (phân trang dưới)
   - Giữ nguyên logic v12.2 (Lọc trùng, lọc giá, sắp xếp, lightbox...)
   ========================================================= */

/* ========== CONFIG ========== */
const SHEET_API = "https://script.google.com/macros/s/AKfycbx2GwR1G8xSY9t8Oq_stEevW5XWp14ASL7SR41J_eT3hU8Eat7vrFsGriT5C7B7-fuE0Q/exec"; // <== Chỉ dùng cho Gửi Form
const SITE_LOGO = "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000"; 
const SITE_LOGO_2 = "https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000";
const THEME = "#76b500";
const CACHE_KEY = "i10_products_cache_v2"; 
const CACHE_KEY_BANNER = "i10_banner_cache_v2";
const CACHE_TTL = 30 * 60 * 1000;
const SITE_TITLE_HOME = "i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN";
const SITE_TITLE_SUFFIX = "- i10 STORE";
const SITE_META_DESC_HOME = "i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.";

/* === HELPERS === */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts));
  if (!res.ok) {
    const txt = await res.text().catch(()=>"");
    throw new Error("Lỗi mạng: " + res.status + " " + txt);
  }
  return res.json();
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

  const searchWrap = document.createElement('div');
  searchWrap.className = "search-price-container";

  const input = document.createElement('input');
  input.type = "search";
  input.placeholder = "Tìm theo tên, GPU, máy trạm, văn phòng,...";
  input.className = "main-search-input";
  searchWrap.appendChild(input);

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
  searchWrap.appendChild(priceWrap);
  ctrl.appendChild(searchWrap);
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = "🧹 Xóa";
  clearBtn.className = "clear-btn";
  clearBtn.style.marginLeft = "6px";
  clearBtn.onclick = ()=>{
    input.value = "";
    sel.value = "default";
    priceInput.value = ""; 
    onChange({ q:"", sort:"default", priceQuery: "" });
  };
  ctrl.appendChild(clearBtn);

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

async function getProductData() {
    if (globalProductData) return globalProductData;
    if (globalProductPromise) return globalProductPromise;

    const fetchData = async () => {
        let data = null;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { timestamp, items } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) data = items;
            }
        } catch (e) { /* ignore */ }

        if (!data) {
            // (*** TỐI ƯU: Đã xóa code chèn HTML thừa ***)
            const cacheBuster = `?cb=${Math.round(Date.now() / CACHE_TTL)}`;
            data = await fetchJSON("/assets/js/products.json" + cacheBuster);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                items: data
            }));
        }

        if (!Array.isArray(data)) throw new Error("Dữ liệu trả về không phải mảng");

        data.forEach((p, i) => {
            const slugText = [
                p["Model"] || p["Name"],
                p["CPU"],
                p["RAM"],
                p["RESOLUTION"],
                p["GPU"]
            ].filter(Boolean).join(' ');
            p.slug = p["Web Link"] || `san-pham/${createSlug(slugText || `product-${i}`)}`;
        });
        
        globalProductData = data;
        return data;
    };

    globalProductPromise = fetchData();
    return globalProductPromise;
}


/**
 * (*** TỐI ƯU: Đã gộp 2 hàm render làm 1 ***)
 * (v12.4)
 */
async function renderProductGrid() {
    const container = document.getElementById("i10-product");
    if (!container) return;

    const ITEMS_PER_PAGE = 30;

    // (*** TỐI ƯU: Tạo HTML bố cục cũ tại đây ***)
    container.innerHTML = `
        <div id="i10-controls"></div>
        <div id="i10-grid"></div>
        <div id="i10-pagination"></div> 
    `;
    const controlsEl = document.getElementById('i10-controls');
    const gridEl = document.getElementById('i10-grid');
    const paginationEl = document.getElementById('i10-pagination');
    
    // Hiển thị loading (thay thế placeholder)
    gridEl.innerHTML = `<div style="padding:20px;text-align:center;"><i class="fa fa-spinner fa-spin fa-3x fa-fw" style="color: ${THEME};"></i><p style="margin-top:15px;font-size:16px;">Đang tải dữ liệu sản phẩm...</p></div>`;

    try {
        const rawData = await getProductData();

        // (LOGIC LỌC TRÙNG LẶP)
        const seenKeys = new Set();
        const data = [];
        const fieldsToCompare = ["Brand", "Model", "CPU", "RAM", "SSD", "GPU", "RESOLUTION"];
        for (const p of rawData) {
            const key = fieldsToCompare
                .map(field => (p[field] || "").toLowerCase().trim())
                .join('|');
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                data.push(p);
            }
        }
        
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
                        return phanLoai.includes("văn phòng") || phanLoai.includes("mỏng nhẹ") || gpu.includes("onboard") || gpu.includes("intel");
                    });
                case "maytram":
                    return fullList.filter(p => {
                        const phanLoai = norm(p["Phân loại"]);
                        const gpu = norm(p["GPU"]);
                        const isWorkstation = phanLoai.includes("máy trạm") || phanLoai.includes("workstation");
                        const isDedicatedGpu = gpu && !gpu.includes("onboard") && !gpu.includes("intel");
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

        const filteredData = applyUrlFilter(data, filter);
        
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
            
            let list = state.items;

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
                const sortedImgs = (p.images || []).slice().sort((a,b) => (a.name||"").localeCompare(b.name||""));
                const mainImg = (sortedImgs[0]?.thumb?.replace("=s220", "=s1000")) || SITE_LOGO_2; 
                
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
                if (p["GPU"] && p["GPU"].toLowerCase() !== "onboard") config.push(p["GPU"]);
                
                const jsonData = encodeURIComponent(JSON.stringify(p));
                return `
                  <div class="col-sm-6 col-md-4 product-item" style="margin-bottom:22px;">
                    <a class="product-card" href="/${p.slug}" data-json="${jsonData}" data-slug="${p.slug}">
                      <div class="thumb">
                        <img src="${mainImg}" alt="${title} - i10 Store" onerror="this.src='${SITE_LOGO_2}' ">
                      </div>
                      <div style="padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;flex:1;">
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

            document.querySelectorAll("#" + gridEl.id + " .product-card").forEach(card => {
                card.addEventListener('click', function(e) {
                    e.preventDefault(); 
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
    img.src = images[currentIndex];
    img.className = "i10-lightbox-img";

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
            img.src = images[currentIndex];
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


/* -----------------------------------------------------
   POPUP SẢN PHẨM (TỐI ƯU UI/UX VÀ SEO)
   (*** ĐÃ CẬP NHẬT (v12.3) ***)
   ----------------------------------------------------- */
function openProductPopup(encoded, slug) {
    document.body.style.overflow = 'hidden';

    if (slug && window.location.pathname !== `/${slug}`) {
        history.pushState({ json: encoded, slug: slug }, "", `/${slug}`); 
    }

    try {
        const product = JSON.parse(decodeURIComponent(encoded));
        const titleText = `${product["Brand"] || ""} ${product["Model"] || ""}`.trim() || (product["Name"] || "Sản phẩm");

        document.title = `${titleText} ${SITE_TITLE_SUFFIX}`; 
        
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            const description = product["Meta Description"] || 
                                `Cấu hình: ${[product["CPU"], product["RAM"], product["SSD"], product["GPU"]].filter(Boolean).join(' • ')}. Liên hệ i10 Store.`;
            metaDesc.setAttribute('content', description.substring(0, 155));
        }

        const sortedImgs = (product.images || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        
        const images = sortedImgs.map(x => (x.thumb || x.url || "").replace("=s220", "=s1600")).filter(Boolean);
        if (!images.length) images.push(SITE_LOGO); 

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
        mainImg.src = images[currentIndex];
        mainImg.style.cssText = `max-width:100%;max-height:400px;object-fit:contain;border-radius:16px;transition:opacity .3s ease, transform .3s ease;cursor: zoom-in;`;
        mainImg.onclick = () => openAdvancedLightbox(images, currentIndex);
        mainImgWrap.appendChild(mainImg);

        const logo = document.createElement("img");
        logo.src = SITE_LOGO;
        logo.style.cssText = `position: absolute;top: 10px;left: 50%;transform: translateX(-50%);width: 60px;height: 60px;object-fit: cover;border-radius: 10px;background: #fff;padding: 2px;opacity: 0.39;box-shadow: 0 0 8px rgba(0,0,0,0.25);z-index: 5;pointer-events: none;`;
        mainImgWrap.appendChild(logo);

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
        images.forEach((src, i) => {
          const t = document.createElement("img");
          t.src = src; 
          t.style.cssText = `width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #ddd;cursor:pointer;opacity:${i === 0 ? 1 : 0.6};flex-shrink:0;`;
          t.onclick = () => {
            currentIndex = i;
            mainImg.src = src;
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
            mainImg.src = images[currentIndex];
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
          ["Giá", `<b style="color:${priceColor};font-size:17px;font-weight:800;">${priceText}</b>`],
          ["Ghi chú", product["NOTE"] || "Không có"]
        ];
        rows.forEach((r, i) => {
          const tr = document.createElement("tr");
          tr.style.background = i % 2 === 0 ? "#fff" : "#f8faf8";
          tr.innerHTML = `<td style="padding:8px;border:1px solid #eee;width:36%;font-weight:600">${r[0]}</td><td style="padding:8px;border:1px solid #eee">${r[1]}</td>`;
          table.appendChild(tr);
        });
        
        const actions = document.createElement("div");
        actions.style.cssText = `display:flex; gap:10px; margin: 20px 0 0 0; align-items:center; justify-content:center; position: sticky; bottom: -15px; background: #fefef5; padding: 12px 0; border-top: 1px solid #eee;`;
        
        actions.innerHTML = `
          <a href="tel:0838288000" class="btn btn-danger" style="background:#e74c3c;color:#fff;font-weight:700;padding:8px 15px;font-size:13px;border-radius:8px;flex:1;"><i class="fa fa-phone"></i> 0838.288.000</a>
          <a href="https://zalo.me/0838288000" target="_blank" class="btn btn-primary" style="background:#0068ff;color:#fff;font-weight:700;padding:8px 15px;font-size:13px;border-radius:8px;flex:1;"><i class="fa fa-comment"></i> Chat Zalo</a>
        `;
        
        const orderBtn = document.createElement("button");
        orderBtn.className = "btn btn-success";
        orderBtn.innerHTML = `<i class="fa fa-shopping-cart"></i> Đặt hàng`;
        orderBtn.style.cssText = `background:${THEME};color:#fff;font-weight:700;padding:8px 15px;font-size:13px;border-radius:8px;flex:1;border:none;min-width:110px;`;
        orderBtn.onclick = () => openOrderForm(product, titleText, overlay);
        actions.appendChild(orderBtn);

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "×";
        closeBtn.style.cssText = `position:absolute;right:15px;top:15px;font-size:32px;background:#fff;color:#ff0000;border:2px solid #ff0000;border-radius:50%;padding:2px;cursor:pointer;z-index:10;height:45px;width:45px;line-height:0.9;`;

        right.appendChild(titleBox);
        right.appendChild(table);
        right.appendChild(actions); 
        
        if (window.innerWidth < 768) {
          card.style.flexDirection = 'column';
          card.style.height = '90vh';
          card.style.maxHeight = '90vh';
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
        }

        card.appendChild(left);
        card.appendChild(right);
        overlay.appendChild(card);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);

        const closePopup = () => {
            stopAutoplay();
            overlay.remove();
            document.body.style.overflow = 'auto'; 
            
            const basePath = window.location.pathname.includes('.html') ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) : '/';
            history.pushState(null, null, basePath);
            
            document.title = SITE_TITLE_HOME;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', SITE_META_DESC_HOME);
            }
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


/* -----------------------------------------------------
   POPUP ĐẶT HÀNG (v12.3)
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
  const submitBtn = modal.querySelector('#order_submit');
  const cancelBtn = modal.querySelector('#order_cancel');
  const msgEl = modal.querySelector('#order_msg');
  
  cancelBtn.onclick = ()=> modal.remove();

  submitBtn.onclick = async ()=>{
    const name = modal.querySelector('#order_name').value.trim();
    const phone = modal.querySelector('#order_phone').value.trim();
    const note = modal.querySelector('#order_note').value.trim();
    
    if (!name || !phone) { 
      msgEl.style.color = 'red'; 
      msgEl.textContent = "Vui lòng nhập Tên và Số điện thoại."; 
      return; 
    }

    msgEl.style.color = 'red'; 
    msgEl.textContent = "Đang gửi, chờ xác nhận... 3";
    submitBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      await fetch(SHEET_API, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: titleText, name, phone, note })
      });
      
      msgEl.style.color = 'blue';
      msgEl.textContent = "Đang gửi, chờ xác nhận... 2";
      
      setTimeout(() => {
        msgEl.textContent = "Đang gửi, chờ xác nhận... 1";
      }, 1000);
      
      setTimeout(() => {
        msgEl.style.color = 'green';
        msgEl.textContent = "✅ Gửi thành công! Cảm ơn bạn.";
        setTimeout(()=> modal.remove(), 1000);
      }, 2000);

    } catch (err) {
      msgEl.style.color = 'red';
      msgEl.textContent = "Lỗi mạng: " + (err.message || "Vui lòng kiểm tra lại kết nối.");
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
      
      const cacheBuster = `?cb=${Math.round(Date.now() / CACHE_TTL)}`;
      banners = await fetchJSON("/assets/js/banners.json" + cacheBuster);
      
      localStorage.setItem(CACHE_KEY_BANNER, JSON.stringify({
        timestamp: Date.now(),
        items: banners
      }));
    }

    if (!Array.isArray(banners) || banners.length === 0)
      throw new Error("Không có dữ liệu banner");

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
      item.innerHTML = `<img src="${banners[i].thumb}" alt="${banners[i].name || 'Banner'} - i10 Store" loading="lazy" />`;
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