/**
 * ==============================================
 * i10 STORE CONFIG - CẤU HÌNH API & THÔNG SỐ
 * ==============================================
 * Chỉ cần sửa các biến dưới đây để cập nhật toàn bộ hệ thống
 * 
 * CÁCH SỬ DỤNG:
 *   1. Copy file này vào thư mục assets/js/
 *   2. Thêm vào HTML: <script src="/assets/js/config.js"></script>
 *   3. Các file JS khác sẽ tự động sử dụng các biến trong đây
 * ==============================================
 */

/**
 * IMAGE PROTECTION - Ngăn người dùng tải hình ảnh về máy
 * Vẫn cho phép hiển thị ảnh nhưng chặn right-click và drag-to-save
 */
(function() {
    // Ngăn chuột phải trên hình ảnh
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            // Tùy chọn: Bỏ comment đểแสดง cảnh báo (có thể làm phiền người dùng)
            // alert('Hình ảnh được bảo vệ. Vui lòng liên hệ chúng tôi để sử dụng.');
        }
    }, false);
    
    // Ngăn kéo thả hình ảnh để lưu
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    }, false);
})();

// Always show price (removed hover-only effect)
(function() {
    if (document.getElementById('i10-price-hover-style')) return;
    var style = document.createElement('style');
    style.id = 'i10-price-hover-style';
    style.innerHTML = `
        .price-container {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
})();

const I10_CONFIG = {
   // ==================== API ====================
   
   // Google Apps Script Web App URL (dùng cho form đặt hàng, liên hệ)
   SHEET_API: "https://script.google.com/macros/s/AKfycbzVNKDHc2VUmPdiqKTz-ZCCV6I2cPw9hkseq56pyB5b1RwPUP6t0XvwTh-YR17y8Bhw/exec",
   
   // URL file products.json (có thể là link Local /assets/js/products.json hoặc drive - dạng https://drive.google.com/uc?export=download&id=...)
   STATIC_JSON_FILE: "/assets/js/products.json",
   
   // ==================== DRIVE ====================
   
   // Folder chứa file JSON (xuất từ Apps Script)
   STATIC_JSON_FOLDER_ID: "1vlL3LKoixYloAweJie1YbS1Vgro-oR_m",
   
   // Folder chứa banner
   FOLDER_ID_BANNER: "1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7",
   
   // Folder gốc lưu ảnh sản phẩm
   DRIVE_ROOT_ID: "1ZO7AcpmyShKm2j0EVNorme7mYKRN2VcQ",
   
   // ==================== CLOUDINARY ====================
   
   // Chi dung cho render anh public tren website. API key/secret phai nam trong Apps Script Properties.
   CLOUDINARY_CLOUD_NAME: "diyvjay4f",
   CLOUDINARY_FOLDER: "i10store",
   CLOUDINARY_LOGO_PUBLIC_ID: "i10_logo5",
   // Upload preset dung cho signed upload tren backend Apps Script
   CLOUDINARY_PRESET: "i10_preset",
   
   // ==================== SHEET ====================
   
   // Tên sheet
   STORE_SHEET_NAME: "Store",
   SHEET_NAME: "Web",
   
   // Google Sheet ID cho sheet "Web" (lấy từ URL: /d/{SHEET_ID}/edit)
   // Để trống nếu không dùng Google Sheet, sẽ fallback về products.json
   SHEET_WEB_ID: "18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog",
   
   // Tên sheet trong Google Sheet (mặc định: "Web")
   SHEET_WEB_SHEET_NAME: "Web",
   
   // Hoặc dùng URL Google Apps Script (nếu có) - ưu tiên này nếu có giá trị
   SHEET_WEB_JSON_URL: "",
   
   // Google Apps Script URL để convert folder Drive → JSON Photos2
   // Deploy GAS với code lấy danh sách file từ folder (xem apps-script.txt)
   // Để trống nếu không dùng tính năng import từ folder
   GAS_FOLDER_TO_JSON_URL: "",
   
   // ==================== CACHE ====================
   
   // Thời gian cache (ms) - 5 phút cho sản phẩm/banner
   CACHE_TTL: 5 * 60 * 1000,        // 5 minutes
   CACHE_TTL_SHORT: 5 * 60 * 1000,  // 5 minutes
   
   // ==================== SITE ====================
   
   // Logo
   SITE_LOGO: "https://lh3.googleusercontent.com/d/1kICZAlJ_eXq4ZfD5QeN0xXGf9lx7v1Vi=s1000",
   SITE_LOGO_2: "https://lh3.googleusercontent.com/d/1L6aVgYahuAz1SyzFlifSUTNvmgFIZeft=s1000",
   
   // Màu theme
   THEME: "#76b500",
   
   // Title & Meta
   SITE_TITLE_HOME: "i10 STORE - LAPTOP THINKPAD US - ĐẲNG CẤP CÙNG THỜI GIAN",
   SITE_TITLE_SUFFIX: "- i10 STORE",
   SITE_META_DESC_HOME: "i10 STORE - Chuyên Laptop Thinkpad Mỹ cao cấp. Hiệu năng vượt trội, thiết kế bền bỉ. Máy trạm, văn phòng, Dell, Thinkpad.",
   
   // Điện thoại liên hệ
   PHONE: "0838288000",
   ZALO: "0838288000"
};
