/**
 * ==============================================
 * i10 STORE CONFIG - CẤU HÌNH CHÍNH
 * ==============================================
 * CÁCH SỬ DỤNG:
 *   1. Đặt các Google Sheet ID & Drive IDs chính xác
 *   2. Sau khi deploy Apps Script, cập nhật Web App URLs
 *   3. Build: python obfuscate.py để tạo i10-config.min.js
 * ==============================================
 */

const i10Config = {
  // ==================== GOOGLE SHEET IDs ====================
  // Sheet chính chứa sản phẩm (18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog)
  SHEET_ID_WEB: '18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog',

  // Sheet Telegram Images (1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ)
  SHEET_ID_TELEGRAM: '1DKY1xAsLW_2lBjwg_Z7ykq30cX7yYUC5TFVFwd_7qlE',

  // ==================== WEB APP URLs (ĐẶT SAU KHI DEPLOY) ====================
  // Deploy Apps Script từ sheet WEB → Web App URL
  // Ví dụ: https://script.google.com/macros/s/AKfycbx.../exec
  SHEET_API: 'https://script.google.com/macros/s/AKfycbxJqWw9nuTdrlNIV4z1MfmOo7AsqgzeWiJxuXuaBAo22CIwttHSOo4tXS5fFj5IJfRe/exec', // <-- ĐIỀN URL WEB APP CHÍNH VÀO ĐÂY

  // Endpoint con (dựa trên SHEET_API + ?mode=...)
  SHEET_API_PRODUCTS: '', // Tự động: SHEET_API + ?mode=products
  SHEET_API_BANNERS: '',  // Tự động: SHEET_API + ?mode=banners
  SHEET_API_CUSTOMERS: '', // Tự động: SHEET_API + ?mode=customers
  SHEET_API_ORDER: '',    // Tự động: SHEET_API (POST với order data)
  SHEET_API_CONTACT: '',  // Tự động: SHEET_API (POST với contact data)
  SHEET_API_HOPDONG: '',  // Tự động: SHEET_API (POST với contract data)
  SHEET_API_HOADON: '',   // Tự động: SHEET_API (POST với invoice data)

  // ==================== DRIVE IDs ====================
  // Root folder chứa ảnh sản phẩm
  DRIVE_ROOT_ID: '1ZO7AcpmyShKm2j0EVNorme7mYKRN2VcQ',

  // Folder chứa banner (slide trên trang chủ)
  FOLDER_ID_BANNER: '1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7',

  // Folder chứa file JSON tĩnh (products.json, banners.json, customer.json)
  STATIC_JSON_FOLDER_ID: '1vlL3LKoixYloAweJie1YbS1Vgro-oR_m',

  // ==================== FILE NAMES ====================
  STATIC_JSON_FILE_NAME: 'products.json',
  STATIC_BANNER_FILE_NAME: 'banners.json',
  STATIC_CUSTOMER_FILE_NAME: 'customer.json',

  // ==================== CACHE ====================
  // Thời gian cache client-side (milliseconds) - mặc định 30 phút
  CACHE_TTL: 30 * 60 * 1000,
  CACHE_KEY_PRODUCTS: 'i10_products_cache_v3',
  CACHE_KEY_BANNER: 'i10_banner_cache_v3',
  CACHE_KEY_CUSTOMER: 'i10_customer_cache_v3',

  // ==================== SITE SETTINGS ====================
  SITE_LOGO: 'https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000',
  SITE_LOGO_2: 'https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000',
  THEME: '#76b500',

  SITE_TITLE_HOME: 'i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN',
  SITE_TITLE_SUFFIX: '- i10 STORE',
  SITE_META_DESC_HOME: 'i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.',

  // ==================== CONTACT ====================
  PHONE: '0838288000',
  ZALO: '0838288000',
  ADDRESS: '07 Đô Đốc Tuyết, Hòa Xuân, Đà Nẵng',
  EMAIL: 'quanghieu.utc2@gmail.com',

  // ==================== TELEGRAM BOT ====================
  TELEGRAM_BOT_TOKEN: '8614022226:AAH2j4bdGHHsjCw8-WdZCcyB5rrTWSdwRec',
  TELEGRAM_SHEET_ID: '1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ',

  // ==================== FEATURE FLAGS ====================
  FEATURES: {
    ENABLE_CUSTOMER_GALLERY: true,
    ENABLE_INVOICE_PDF: true,
    ENABLE_CONTRACT_PDF: true,
    ENABLE_QUOTE_PDF: true
  },

  // ==================== PASSWORDS (for internal pages) ====================
  // These are CLIENT-SIDE passwords only (obfuscated in i10-config.min.js)
  // For real security, use Google Auth or server-side validation
  PASSWORD_INTERNAL: 'i102026',      // For internal.html
  PASSWORD_PRINT: 'i102026',         // For hoadon.html, hopdongmuaban.html, baogia.html
  PASSWORD_INVOICE: 'i102026',       // For invoices
  PASSWORD_QUOTE: 'i102026'          // For quotes
};

// ===========================
// HELPER FUNCTIONS (exported globally)
// ============================

function getInternalPassword() { return i10Config.PASSWORD_INTERNAL; }
function validateInternalPassword(p) { return p === i10Config.PASSWORD_INTERNAL; }
function getPrintPassword() { return i10Config.PASSWORD_PRINT; }
function validatePrintPassword(p) { return p === i10Config.PASSWORD_PRINT; }
function formatPrice(num) {
  if (!num && num !== 0) return 'Liên hệ';
  const n = parseFloat(num);
  if (isNaN(n)) return 'Liên hệ';
  return '~' + (n * 1000000).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }) + 'đ';
}

// Make config available globally
window.i10Config = i10Config;
window.getInternalPassword = getInternalPassword;
window.validateInternalPassword = validateInternalPassword;
window.getPrintPassword = getPrintPassword;
window.validatePrintPassword = validatePrintPassword;
window.formatPrice = formatPrice;
