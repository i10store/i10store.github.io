/**
 * i10 STORE - Config Template
 * ==============================
 * BIBLIOTECAS: Copy file này thành config.js và điền thông tin thực tế
 *
 * CÁCH LẤY IDs:
 * 1. Google Sheet ID: Từ URL sheet
 *    VD: https://docs.google.com/spreadsheets/d/ABC123/edit → ID = ABC123
 * 2. Google Drive Folder ID: Từ URL folder
 *    VD: https://drive.google.com/drive/folders/XYZ789 → ID = XYZ789
 * 3. Web App URL: Sau khi deploy Apps Script
 */

const i10Config = {
  // ==========================================
  // 1. GOOGLE SHEET IDs (BẮT BUỘC)
  // ==========================================

  // Sheet chính chứa sản phẩm (Web)
  // Lấy từ URL: https://docs.google.com/spreadsheets/d/THIS_IS_ID/edit
  SHEET_ID_WEB: '18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog',

  // Sheet Telegram Images (nơi lưu metadata ảnh từ bot)
  SHEET_ID_TELEGRAM: '1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ',

  // ==========================================
  // 2. WEB APP URLs (ĐIỀN SAU KHI DEPLOY)
  // ==========================================
  // IMPORTANT: Deploy Apps Script trước, rồi lấy URL từng web app

  // Main Web App (Sheet Web) - URL sau khi deploy
  // Ví dụ: https://script.google.com/macros/s/AKfycbx.../exec
  SHEET_API: 'https://script.google.com/macros/s/AKfycbxJqWw9nuTdrlNIV4z1MfmOo7AsqgzeWiJxuXuaBAo22CIwttHSOo4tXS5fFj5IJfRe/exec', // <--- ĐIỀN URL ĐÂY SAU KHI DEPLOY

  // Các endpoint con sẽ tự động derived từ SHEET_API:
  // - Products: SHEET_API + '?mode=products'
  // - Banners: SHEET_API + '?mode=banners'
  // - Customers: SHEET_API + '?mode=customers'
  // - Orders: SHEET_API (POST)
  // - Contact: SHEET_API (POST)
  // - Contracts: SHEET_API (POST)
  // - Invoices: SHEET_API (POST)

  // ==========================================
  // 3. GOOGLE DRIVE IDs (BẮT BUỘC)
  // ==========================================

  // Root folder chứa tất cả ảnh sản phẩm (SP_<serial>)
  // Lấy từ URL folder Drive
  // VD: https://drive.google.com/drive/folders/12345 → ID = 12345
  DRIVE_ROOT_ID: '1ZO7AcpmyShKm2j0EVNorme7mYKRN2VcQ',

  // Folder chứa banner images (slide carousel)
  FOLDER_ID_BANNER: '1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7',

  // Folder chứa file JSON (products.json, banners.json, customer.json)
  // Đây là folder nơi Apps Script sẽ lưu JSON files
  STATIC_JSON_FOLDER_ID: '1vlL3LKoixYloAweJie1YbS1Vgro-oR_m',

  // ==========================================
  // 4. TELEGRAM BOT (BẮT BUỘC NẾU DÙNG BOT)
  // ==========================================

  TELEGRAM_BOT_TOKEN: '8614022226:AAH2j4bdGHHsjCw8-WdZCcyB5rrTWSdwRec',

  // Sheet riêng để lưu metadata ảnh từ Telegram bot
  TELEGRAM_SHEET_ID: '1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ',

  // ==========================================
  // 5. CACHE (TÙY CHỈNH)
  // ==========================================

  // Cache TTL trong milliseconds (30 phút = 30 * 60 * 1000)
  CACHE_TTL: 30 * 60 * 1000,

  // Cache keys (dùng cho localStorage)
  CACHE_KEY_PRODUCTS: 'i10_products_cache_v3',
  CACHE_KEY_BANNER: 'i10_banner_cache_v3',
  CACHE_KEY_CUSTOMER: 'i10_customer_cache_v3',

  // ==========================================
  // 6. SITE SETTINGS (TÙY CHỈNH)
  // ==========================================

  SITE_LOGO: 'https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000',
  SITE_LOGO_2: 'https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000',

  THEME: '#76b500', // Màu chủ đạo (xanh lá)

  SITE_TITLE_HOME: 'i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN',
  SITE_TITLE_SUFFIX: '- i10 STORE',
  SITE_META_DESC_HOME: 'i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp.',

  // ==========================================
  // 7. CONTACT INFO (TÙY CHỈNH)
  // ==========================================

  PHONE: '0838288000',
  ZALO: '0838288000',
  ADDRESS: '07 Đô Đốc Tuyết, Hòa Xuân, Đà Nẵng',
  EMAIL: 'quanghieu.utc2@gmail.com',

  // ==========================================
  // 8. PASSWORDS (CLIENT-SIDE ONLY - CẢNH BÁO!)
  // ==========================================
  // Lưu ý: Đây là mật khẩu obfuscated phía client.
  // KHÔNG dùng cho bảo mật thực sự.
  // Nếu cần bảo mật cao, dùng Google Auth hoặc server-side validation.

  PASSWORD_INTERNAL: 'i102026',   // internal.html
  PASSWORD_PRINT: 'i102026',      // hoadon.html, hopdongmuaban.html, baogia.html
  PASSWORD_INVOICE: 'i102026',    // hoadon.html
  PASSWORD_QUOTE: 'i102026',      // baogia.html

  // ==========================================
  // 9. FEATURE FLAGS (TÙY CHỌN)
  // ==========================================

  FEATURES: {
    ENABLE_CUSTOMER_GALLERY: true,
    ENABLE_INVOICE_PDF: true,
    ENABLE_CONTRACT_PDF: true,
    ENABLE_QUOTE_PDF: true
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getInternalPassword() { return i10Config.PASSWORD_INTERNAL; }
function validateInternalPassword(p) { return p === i10Config.PASSWORD_INTERNAL; }
function getPrintPassword() { return i10Config.PASSWORD_PRINT; }
function validatePrintPassword(p) { return p === i10Config.PASSWORD_PRINT; }

function formatPrice(num) {
  if (!num && num !== 0) return 'Liên hệ';
  const n = parseFloat(num);
  if (isNaN(n)) return 'Liên hệ';
  const million = n * 1000000;
  return '~' + million.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }) + 'đ';
}

// Export globally
window.i10Config = i10Config;
window.getInternalPassword = getInternalPassword;
window.validateInternalPassword = validateInternalPassword;
window.getPrintPassword = getPrintPassword;
window.validatePrintPassword = validatePrintPassword;
window.formatPrice = formatPrice;
