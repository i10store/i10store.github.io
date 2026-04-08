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
    // API cho gửi form liên hệ và đặt hàng
    SHEET_API_CONTACT: API_BASE,
    // API cho hóa đơn
    SHEET_API_HOADON : API_BASE,
    // API cho hợp đồng mua bán
    SHEET_API_HOPDONG: API_BASE,
    // API cho báo giá
    SHEET_API_BAOGIA : API_BASE,
    // API cho banner (dùng SHEET_API_CONTACT với mode=banner)
    
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
    CACHE_TTL: 30 * 60 * 1000, // 30 phút
    
    /* === SEO === */
    SITE_TITLE_HOME: "i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN",
    SITE_TITLE_SUFFIX: "- i10 STORE",
    SITE_META_DESC_HOME: "i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.",
    
    /* === MẬT KHẨU NỘI BỘ === */
    // Mật khẩu = "i10" + ngày hiện tại (VD: ngày 09 -> i1009)
    PASSWORD_PREFIX: "i10",
    
    /* === MẬT KHẨU IN ẤN (hóa đơn, hợp đồng) === */
    PRINT_PASSWORD: "i10laptop",
    
    /* === THÔNG TIN THANH TOÁN === */
    BANK_NAME: "TECHCOMBANK",
    BANK_ACCOUNT: "9.179.000.000",
    BANK_OWNER: "NGUYEN QUANG HIEU"
};

/* === HÀM TIỆN ÍCH === */

// Lấy mật khẩu nội bộ theo ngày hiện tại (chỉ lấy ngày, không lấy tháng)
function getInternalPassword() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    return i10Config.PASSWORD_PREFIX + day;
}

// Kiểm tra mật khẩu nội bộ
function validateInternalPassword(inputPassword) {
    return inputPassword === getInternalPassword();
}

// Format giá tiền (VNĐ)
function formatPrice(price) {
    if (!price) return "Liên hệ";
    const num = parseFloat(price) * 1000000;
    return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 });
}

/* =========================================================
   HƯỚNG DẪN SỬ DỤNG FILE CẤU HÌNH
   =========================================================
   
   1. MẬT KHẨU NỘI BỘ:
      - Mật khẩu = "i10" + ngày hiện tại (2 chữ số)
      - Hàm getInternalPassword() sẽ tự động lấy ngày hiện tại để tạo mật khẩu đúng
      
   2. CÁC BIẾN CẦN THAY ĐỔI KHI CẦN:
      - SHEET_API_CONTACT: API Google Sheet cho form liên hệ
      - SHEET_API_HOADON: API Google Sheet cho hóa đơn
      - SHEET_API_HOPDONG: API Google Sheet cho hợp đồng
      - SITE_LOGO, SITE_LOGO_2: Link logo website
      - THEME: Màu chủ đạo (mặc định #76b500)
      - PRINT_PASSWORD: Mật khẩu in ấn (hóa đơn, hợp đồng)
      - Thông tin cửa hàng: STORE_NAME, PHONE, ADDRESS, v.v.
   
   3. CÁCH THAY ĐỔI:
      - Mở file assets/js/i10-config.js
      - Chỉnh sửa các giá trị trong đối tượng i10Config
      - Lưu file và refresh trang web
   
   ========================================================= */
