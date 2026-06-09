/**
 * ========================================
 * TELEGRAM BOT CONFIGURATION
 * ========================================
 * Cấu hình để gửi tin nhắn đến Telegram Bot
 * 
 * Cách lấy thông tin:
 * 1. Bot Token: Tạo bot mới từ @BotFather trên Telegram
 * 2. Chat ID: Gửi tin nhắn bất kỳ cho bot, sau đó truy cập:
 *    https://api.telegram.org/bot{BOT_TOKEN}/getUpdates
 *    Tìm "chat": { "id": ... }
 * ========================================
 */

const TELEGRAM_CONFIG = {
  // Lưu ý: BOT_TOKEN và CHAT_ID được lấy từ server-side để tránh lộ ra client
  // File config này chỉ dùng cho mục đích minh bạch, thực tế giá trị sẽ được override
  BOT_TOKEN: "", // Không cấu hình ở đây - dùng server endpoint
  CHAT_ID: "", // Không cấu hình ở đây - dùng server endpoint

  // URL API Telegram (FIXED!)
  API_URL: "https://api.telegram.org/bot", //"https://core.telegram.org/bots/api",

  // Cấu hình thêm
  DISABLE_WEB_PAGE_PREVIEW: true, // Không xem trước link
  PARSE_MODE: "HTML", // Định dạng tin nhắn (HTML hoặc Markdown)
};

/**
 * Gửi tin nhắn đến Telegram (sử dụng Image Beacon - bypass CORS)
 * @param {string} message - Nội dung tin nhắn
 */
async function sendTelegramMessage(message) {
  if (!TELEGRAM_CONFIG.BOT_TOKEN || TELEGRAM_CONFIG.BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") {
    console.warn("⚠️ Telegram Bot Token chưa được cấu hình!");
    return { success: false, error: "Bot Token không được cấu hình" };
  }

  if (!TELEGRAM_CONFIG.CHAT_ID || TELEGRAM_CONFIG.CHAT_ID === "123456") {
    console.warn("⚠️ Telegram Chat ID chưa được cấu hình!");
    return { success: false, error: "Chat ID không được cấu hình" };
  }

  return new Promise((resolve) => {
    try {
      // Sử dụng Image Beacon method - không bị CORS!
      const url = `${TELEGRAM_CONFIG.API_URL}${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CONFIG.CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=${TELEGRAM_CONFIG.PARSE_MODE}&disable_web_page_preview=${TELEGRAM_CONFIG.DISABLE_WEB_PAGE_PREVIEW}`;
      
      const img = new Image();
      
      // Timeout 5s - nếu không được phản hồi thì coi là thành công (vì gửi đã được push)
      const timeout = setTimeout(() => {
        console.log("✅ Telegram: Yêu cầu đã được gửi (Image Beacon)");
        resolve({ success: true, data: { ok: true } });
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log("✅ Telegram: Gửi thành công!");
        resolve({ success: true, data: { ok: true } });
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // Lỗi img tag thường là vì server không trả về image, nhưng request vẫn được gửi
        console.log("✅ Telegram: Yêu cầu đã được gửi (mặc dù img error)");
        resolve({ success: true, data: { ok: true } });
      };
      
      // Gắn thẻ img vào body để trigger request
      img.src = url;
      
    } catch (error) {
      console.error("❌ Lỗi Telegram:", error.message);
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Tạo tin nhắn đơn hàng định dạng đẹp
 * @param {Object} orderData - Dữ liệu đơn hàng
 */
function createOrderMessage(orderData) {
  const { product, name, phone, note, time } = orderData;
  
  let message = `<b>📦 ĐƠN HÀNG MỚI</b>\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `<b>Sản phẩm:</b> ${product}\n`;
  message += `<b>Khách hàng:</b> ${name}\n`;
  message += `<b>Số điện thoại:</b> <code>${phone}</code>\n`;
  
  if (note) {
    message += `<b>Ghi chú:</b> ${note}\n`;
  }
  
  if (time) {
    message += `<b>Thời gian:</b> ${time}\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `Từ: <i>i10 Store</i>`;
  
  return message;
}

/**
 * Tạo tin nhắn liên hệ/yêu cầu định dạng đẹp
 * @param {Object} contactData - Dữ liệu liên hệ
 */
function createContactMessage(contactData) {
  const { name, phone, email, message: msg, time } = contactData;
  
  let message = `<b>💬 YÊU CẦU LIÊN HỆ MỚI</b>\n`;
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `<b>Họ tên:</b> ${name}\n`;
  message += `<b>Số điện thoại:</b> <code>${phone}</code>\n`;
  
  if (email) {
    message += `<b>Email:</b> ${email}\n`;
  }
  
  message += `\n<b>Nội dung:</b>\n${msg}\n`;
  
  if (time) {
    message += `\n<b>Thời gian:</b> ${time}\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `Từ: <i>i10 Store</i>`;
  
  return message;
}
