# DEPLOYMENT GUIDE - i10 STORE

Hướng dẫn chi tiết deploy toàn bộ hệ thống i10 Store.

---

## 📋 Checklist trước khi deploy

- [ ] Google Sheet Web: `18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog`
- [ ] Google Sheet Telegram: `1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ`
- [ ] Google Drive folders đã được share (hoặc bạn là owner)
- [ ] Telegram Bot: đã tạo qua @BotFather, lấy token
- [ ] Python 3 installed (để build config)

---

## 🚀 Phase 1: Deploy Main Web App (Sheet Web)

### 1.1 Mở Apps Script editor

1. Vào [Sheet Web](https://docs.google.com/spreadsheets/d/18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog/edit)
2. `Extensions` → `Apps Script`
3. Đổi tên project: `i10 Store - Main Web App`

### 1.2 Paste code

1. Xóa toàn bộ code mặc định (`function myFunction() {...}`)
2. Mở file `apps-script-rewritten.txt` từ repository
3. Copy **toàn bộ** nội dung
4. Paste vào `Code.gs`
5. `Ctrl+S` (hoặc `File` → `Save`)

### 1.3 Enable Drive API

Vẫn trong Apps Script editor:

1. Click `Services` (icon `+` bên trái)
2. Thêm service: `Drive API` → `v2` → `Add`
   (Cần để `getImagesFromFolder()` hoạt động)

Hoặc:
1. `Resources` → `Advanced Google services...`
2. Bật `Drive API`
3. `Google Cloud Platform Console` → Enable `Drive API`

### 1.4 Deploy as Web App

1. Click `Deploy` → `New deployment`
2. Chọn type: `Web app`
3. Fill form:
   - **Description**: `v1.0 - Main API`
   - **Execute as**: `Me` (chọn email của bạn)
   - **Who has access**: `Anyone` (hoặc `Anyone with Google account`)
4. Click `Deploy`
5. **COPY THE WEB APP URL** (rất quan trọng!)
   - Ví dụ: `https://script.google.com/macros/s/AKfycbx.../exec`
6. Click `Done`

### 1.5 Cấp quyền (nếu cần)

Lần đầu chạy, cần authorize:

1. Click `Run` → chọn function `onOpen` (trên menu)
2. `Review Permissions` → chọn tài khoản Google
3. Cấp các quyền:
   - View and manage your spreadsheets in Google Drive
   - View and manage your Google Drive files
   - Send email as you
   - Connect to external services

---

## 🤖 Phase 2: Deploy Telegram Bot

### 2.1 Mở Apps Script editor (Sheet Telegram)

1. Vào [Sheet Telegram](https://docs.google.com/spreadsheets/d/1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ/edit)
2. `Extensions` → `Apps Script`
3. Đổi tên project: `i10 Store - Telegram Bot`

### 2.2 Paste bot code

1. Xóa code cũ
2. Mở file `telegram-bot-rewritten.txt`
3. Copy toàn bộ
4. Paste vào `Code.gs`
5. `Ctrl+S`

### 2.3 Enable Drive API

- Làm tương tự Phase 1.3

### 2.4 Deploy as Web App

1. `Deploy` → `New deployment`
2. Type: `Web app`
3. Config:
   - **Description**: `v1.0 - Telegram Bot`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. `Deploy`
5. **COPY WEB APP URL**

### 2.5 Set Webhook

**Cách 1: Trong Apps Script editor**

1. Trong function list, chọn `setWebhook`
2. Click `Run`
3. Xem log: `View` → `Logs` để check result

**Cách 2: Gọi API Telegram trực tiếp**

Mở browser, truy cập:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBAPP_URL>
```

Thay thế:
- `<YOUR_BOT_TOKEN>` = `8614022226:AAH2j4bdGHHsjCw8-WdZCcyB5rrTWSdwRec`
- `<YOUR_WEBAPP_URL>` = URL từ bước 2.4

Ví dụ:
```
https://api.telegram.org/bot8614022226:AAH2j4bdGHHsjCw8-WdZCcyB5rrTWSdwRec/setWebhook?url=https://script.google.com/macros/s/AKfycbx.../exec
```

**Check webhook status:**
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### 2.6 Test bot

1. Mở Telegram
2. Tìm bot @BotFather → `/mybots` → chọn bot của bạn
3. Hoặc gửi `/start` trực tiếp cho bot (username của bot)
4. Bot sẽ reply: "👋 Chào bạn!..."

---

## 🎨 Phase 3: Build & Deploy Frontend

### 3.1 Install Python (nếu chưa có)

- Download từ python.org
- Hoặc dùng `python --version` để check

### 3.2 Cập nhật config.js

Mở file `assets/js/config.js`:

```javascript
const i10Config = {
  // ... các cài đặt khác ...

  // ⚠️ THAY BẰNG WEB APP URL TỪ PHASE 1
  SHEET_API: 'https://script.google.com/macros/s/AKfycbx.../exec',

  // (Các endpoint con tự động append ?mode=...)
};
```

**Lưu ý:**
- `SHEET_API_PRODUCTS` = `SHEET_API + '?mode=products'`
- `SHEET_API_ORDERS` = `SHEET_API` (POST)
- Tương tự cho các endpoint khác

### 3.3 Build obfuscated config

Chạy script để tạo `i10-config.min.js`:

```bash
python obfuscate.py
```

Output: `assets/js/i10-config.min.js`

Nếu không có Python, copy `config.js` → `i10-config.min.js` và thêm:
```javascript
window.i10Config = i10Config;
window.getInternalPassword = getInternalPassword;
window.getPrintPassword = getPrintPassword;
window.formatPrice = formatPrice;
```

### 3.4 Deploy Frontend

**Nếu dùng GitHub Pages:**

1. Git push to `main` branch
2. Vào repo Settings → Pages
3. Source: `Deploy from a branch`
4. Branch: `main` / `(root)`
5. Save
6. Website chạy tại: `https://<username>.github.io/<repo-name>/`

**Nếu dùng local server:**

```bash
# Dùng Live Server (VS Code)
# Hoặc Python simple server:
python -m http.server 8000
# Truy cập: http://localhost:8000
```

---

## 🔧 Phase 4: Final Checks

### 4.1 Verify Main Web App

```bash
curl "<SHEET_API>?mode=products"
```

Phải trả về JSON array of products. Nếu lỗi:

- Check Execution logs: `Apps Script` → `Executions`
- Check Sheet ID có đúng không
- Check Drive API đã enabled

### 4.2 Verify Banners

```bash
curl "<SHEET_API>?mode=banners"
```

Phải trả về JSON array of banner objects:
```json
[{"id":"...", "name":"a1.webp", "url":"...", "thumb":"..."}]
```

### 4.3 Test Contact Form

1. Vào `contact.html`
2. Điền form test
3. Submit
4. Check Sheet `Order` có thêm dòng mới không
5. Check email nhận được không

### 4.4 Test Order Form

1. Vào `index.html`
2. Click vào 1 sản phẩm
3. Click "Đặt hàng"
4. Điền thông tin
5. Submit
6. Check Sheet `Order` có dòng mới

### 4.5 Test Telegram Bot

1. Mở Telegram
2. Gửi `/start` cho bot
3. Gửi serial (VD: `TEST123`)
4. Gửi 1 ảnh
5. Bot phải reply: "✅ Upload thành công!"
6. Check Sheet `Telegram_Images` có dòng mới
7. Check Drive folder `SP_TEST123` được tạo
8. Check Sheet `Store` cột "Folder Album Image Google Drive" được update link

---

## 🔄 Phase 5: Sync Products to JSON

**Tự động:** Web App sẽ generate JSON khi `doGet` được gọi lần đầu.

**Thủ công (nếu cần force update):**

1. Mở Sheet Web
2. `Extensions` → `Apps Script`
3. Chạy function `updateProductJson()`
4. Check Drive folder `STATIC_JSON_FOLDER_ID` có file `products.json` mới không

**Manual trigger từ menu:**
- Vào Sheet, click menu `🧰 I10 Tools` → `📦 Cập nhật Sản phẩm JSON`

---

## 🛠️ Troubleshooting

### "Authorization is required" error

- Chạy `onOpen()` trước để menu xuất hiện
- Hoặc vào `Run` → chọn function `onOpen` → `Run`

### Web App URL đổi → config vẫn cũ

- Cập nhật `SHEET_API` trong `config.js`
- Re-build `i10-config.min.js` bằng `obfuscate.py`
- Deploy frontend lại

### Telegram bot không nhận message

- Check Webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Nếu `url` trống → cần set webhook
- Nếu `last_error_message` có lỗi → check logs Apps Script
- Re-deploy bot Web App nếu code thay đổi

### Images not showing

- Check `Folder Album Image Google Drive` column in Web sheet
- Value phải là full URL: `https://drive.google.com/drive/folders/...`
- Folder phải `Anyone with link` (bất kỳ ai có link đều xem được)
- Kiểm tra folder có ảnh không (`checkEmptyImageFolders()`)
- Clear cache: `localStorage.clear()` trong browser console

### "Exception: You do not have permission to call Drive.Files.list"

- Enable **Drive API** trong Apps Script (Phase 1.3)
- Vào `Resources` → `Advanced Google services` → bật `Drive API`
- Và vào Google Cloud Console → APIs & Services → Enable `Drive API`

### Sheet không có quyền

- Trong Apps Script, `Deploy` → `Manage deployments`
- Chọn deployment → `Edit`
- Đảm bảo `Execute as: Me` (chứ không phải `User accessing the web app`)
- Lưu ý: Nếu chọn `User accessing the web app`, sẽ có lỗi permission

### Rate limit từ Telegram

- Telegram giới hạn ~30 messages/second per bot
- Nếu nhiều user cùng lúc, cần queue system
- Hiện tại bot chưa có queue, có thể bị block nếu spam

---

## 📊 Monitoring

### View Logs

**Apps Script:**
- `View` → `Executions` (xem real-time logs)
- `View` → `Logs` (Logger.log)

**Telegram Bot:**
- Chạy function `showLogs()` từ menu
- Hoặc `View` → `Executions`

### Check Webhook

```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

Response:
```json
{
  "url": "https://script.google.com/...",
  "has_custom_certificate": false,
  "pending_update_count": 0,
  "last_error_date": 0,
  "last_error_message": ""
}
```

---

## 🔄 Update & Redeploy

### Update code

1. Sửa code trong `apps-script-rewritten.txt` hoặc `telegram-bot-rewritten.txt`
2. Copy → Paste vào Apps Script editor
3. `Ctrl+S`
4. `Deploy` → `Manage deployments`
5. Chọn deployment cũ → `Edit` → `Deploy` (tạo version mới)
6. **HOẶC** tạo deployment mới với version mới

### Update frontend

1. Sửa code JS/CSS/HTML
2. Commit & push lên GitHub
3. GitHub Pages tự động update (nếu enabled)

### Update config

1. Sửa `assets/js/config.js`
2. Chạy `python obfuscate.py`
3. Commit cả `i10-config.min.js`
4. Push lên GitHub

---

## 📁 File mô tả

| File | Mục đích |
|------|----------|
| `apps-script-rewritten.txt` | Main Web App code (Sheet Web) - **DEPLOY ĐẾN SHEET WEB** |
| `telegram-bot-rewritten.txt` | Telegram Bot code - **DEPLOY ĐẾN SHEET TELEGRAM** |
| `assets/js/config.js` | Config source (source of truth) |
| `assets/js/i10-config.min.js` | Config obfuscated (dùng trong HTML) |
| `assets/js/i10-products.js` | Product loader & display logic |
| `obfuscate.py` | Build script tạo minified config |
| `README.md` | Tài liệu này |

⚠️ **QUAN TRỌNG:**
- `apps-script-rewritten.txt` → Sheet Web (18sGLaK2...)
- `telegram-bot-rewritten.txt` → Sheet Telegram (1ERkMtS7...)
- Đừng deploy nhầm!

---

## 🎯 Quick Reference - URLs cần biết

| Tên | URL |
|-----|-----|
| Sheet Web | https://docs.google.com/spreadsheets/d/18sGLaK2MblP23WHe.../edit |
| Sheet Telegram | https://docs.google.com/spreadsheets/d/1ERkMtS7Y.../edit |
| Drive Root ảnh | https://drive.google.com/drive/folders/1ZO7AcpmyShKm2j0EVNorme7mYKRN2VcQ |
| Drive Banners | https://drive.google.com/drive/folders/1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7 |
| Drive JSON | https://drive.google.com/drive/folders/1vlL3LKoixYloAweJie1YbS1Vgro-oR_m |
| Telegram Bot | @<your-bot-username> |
| Set Webhook API | `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>` |

---

© 2026 i10 Store - Chuyên Laptop Thinkpad US.
