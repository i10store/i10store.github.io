/* =========================================================
   i10 STORE CONFIG - CẤU HÌNH DỰ ÁN
   Chỉnh sửa các biến dưới đây để thay đổi cấu hình
   ========================================================= */
    const API_BASE = "https://script.google.com/macros/s/AKfycbwa4hojdFQGuGAE2CZBPFjJXPon9hUUWM0u-d87PLtfm_9U39BNzdN3MPh2xbdALVnE/exec";

    const i10Config = {
    /* === THÔNG TIN CỬA HÀNG === */
    STORE_NAME: "i10 STORE",
    STORE_TAGLINE: "Chuyên Laptop Thinkpad Mỹ cao cấp",
    STORE_ADDRESS: "07 Đô Đốc Tuyết, Hòa Xuân, Đà Nẵng",
    PHONE: "0838288000",
    FACEBOOK: "https://www.facebook.com/ThinkpadUS",
    
    /* === GOOGLE SHEET / APPS SCRIPT === */
    SHEET_API_CONTACT: API_BASE,
    SHEET_API_HOADON : API_BASE,
    SHEET_API_HOPDONG: API_BASE,
    SHEET_API_BAOGIA : API_BASE,
    
    /* === HÌNH ẢNH === */
    SITE_LOGO: "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000",
    SITE_LOGO_2: "https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000",
    FAVICON: "https://lh3.googleusercontent.com/d/1mCM-6pxo-MDlpuDFitS3OQQBUiL1csia=s256",
    
    /* === GIAO DIỆN === */
    THEME: "#76b500",
    THEME_DARK: "#5a9a00",
    
    /* === CACHE === */
    CACHE_KEY: "i10_products_cache_v2",
    CACHE_KEY_BANNER: "i10_banner_cache_v2",
    CACHE_TTL: 30 * 60 * 1000,
    
    /* === SEO === */
    SITE_TITLE_HOME: "i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN",
    SITE_TITLE_SUFFIX: "- i10 STORE",
    SITE_META_DESC_HOME: "i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.",
    
    PASSWORD_PREFIX: "i10",
    PRINT_PASSWORD_PREFIX: "i10",
    
    /* === THÔNG TIN THANH TOÁN === */
    BANK_NAME: "TECHCOMBANK",
    BANK_ACCOUNT: "9.179.000.000",
    BANK_OWNER: "NGUYEN QUANG HIEU"
};

function getInternalPassword() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    return i10Config.PASSWORD_PREFIX + day;
}

function validateInternalPassword(inputPassword) {
    return inputPassword === getInternalPassword();
}

function getPrintPassword() {
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, '0');
    return i10Config.PRINT_PASSWORD_PREFIX + hour;
}

function validatePrintPassword(inputPassword) {
    return inputPassword === getPrintPassword();
}

function formatPrice(price) {
    if (!price) return "Liên hệ";
    const num = parseFloat(price) * 1000000;
    return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 });
}

window.i10Config = i10Config;
window.getInternalPassword = getInternalPassword;
window.validateInternalPassword = validateInternalPassword;
window.getPrintPassword = getPrintPassword;
window.validatePrintPassword = validatePrintPassword;
window.formatPrice = formatPrice;