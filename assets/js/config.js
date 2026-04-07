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

const I10_CONFIG = {
  // ==================== API ====================
  
  // Google Apps Script Web App URL (dùng cho form đặt hàng, liên hệ)
  SHEET_API: "https://script.google.com/macros/s/AKfycby0FA_lpnWN8gG6-jFTokt4DBFQGzw6RZ4ONurLvGsFc1Pb3s-eotFS459_bRFDmJFm/exec",
  
  // ==================== DRIVE ====================
  
  // Folder chứa file JSON (xuất từ Apps Script)
  STATIC_JSON_FOLDER_ID: "1vlL3LKoixYloAweJie1YbS1Vgro-oR_m",
  
  // Folder chứa banner
  FOLDER_ID_BANNER: "1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7",
  
  // Folder gốc lưu ảnh sản phẩm
  DRIVE_ROOT_ID: "1ZO7AcpmyShKm2j0EVNorme7mYKRN2VcQ",
  
  // ==================== SHEET ====================
  
  // Tên sheet
  STORE_SHEET_NAME: "Store",
  SHEET_NAME: "Web",
  
  // ==================== CACHE ====================
  
  // Thời gian cache (ms) - mặc định 30 phút
  CACHE_TTL: 30 * 60 * 1000,
  
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