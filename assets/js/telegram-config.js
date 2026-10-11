/**
 * Telegram notifications are relayed through Google Apps Script.
 * The bot token and chat ID are stored only in Apps Script Script Properties.
 */
const TELEGRAM_CONFIG = {
  WEB_APP_URL: typeof I10_CONFIG !== 'undefined' ? I10_CONFIG.SHEET_API : ''
};

/**
 * Sends a notification to the Google Apps Script relay.
 * `no-cors` is intentional: Apps Script web apps redirect requests and do not
 * expose a readable cross-origin response to browsers.
 */
async function sendTelegramMessage(message) {
  if (!TELEGRAM_CONFIG.WEB_APP_URL) {
    return { success: false, error: 'Chưa cấu hình Google Apps Script URL' };
  }

  try {
    await fetch(TELEGRAM_CONFIG.WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'telegram', message })
    });
    return { success: true };
  } catch (error) {
    console.error('Telegram relay error:', error);
    return { success: false, error: 'Không thể gửi yêu cầu. Vui lòng thử lại.' };
  }
}

function escapeTelegramHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createOrderMessage(orderData) {
  const { product, name, phone, note, time } = orderData;
  let message = '<b>📦 ĐƠN HÀNG MỚI</b>\n━━━━━━━━━━━━━━━━\n';
  message += `<b>Sản phẩm:</b> ${escapeTelegramHtml(product)}\n`;
  message += `<b>Khách hàng:</b> ${escapeTelegramHtml(name)}\n`;
  message += `<b>Số điện thoại:</b> <code>${escapeTelegramHtml(phone)}</code>\n`;
  if (note) message += `<b>Ghi chú:</b> ${escapeTelegramHtml(note)}\n`;
  if (time) message += `<b>Thời gian:</b> ${escapeTelegramHtml(time)}\n`;
  return message + '━━━━━━━━━━━━━━━━\nTừ: <i>i10 Store</i>';
}

function createContactMessage(contactData) {
  const { name, phone, email, message: contactMessage, time } = contactData;
  let message = '<b>💬 YÊU CẦU LIÊN HỆ MỚI</b>\n━━━━━━━━━━━━━━━━\n';
  message += `<b>Họ tên:</b> ${escapeTelegramHtml(name)}\n`;
  message += `<b>Số điện thoại:</b> <code>${escapeTelegramHtml(phone)}</code>\n`;
  if (email) message += `<b>Email:</b> ${escapeTelegramHtml(email)}\n`;
  message += `\n<b>Nội dung:</b>\n${escapeTelegramHtml(contactMessage)}\n`;
  if (time) message += `\n<b>Thời gian:</b> ${escapeTelegramHtml(time)}\n`;
  return message + '━━━━━━━━━━━━━━━━\nTừ: <i>i10 Store</i>';
}
