# i10 STORE - Hệ thống Quản lý Bán hàng

Hệ thống website bán laptop Thinkpad/US với admin qua Google Sheets, xử lý đơn hàng/hợp đồng/hóa đơn, và Telegram bot để upload ảnh sản phẩm.

## 📋 Mục lục

- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Thành phần hệ thống](#thành-phần-hệ-thống)
- [Setup & Deployment](#setup--deployment)
- [Cấu hình](#cấu-hình)
- [API Endpoints](#api-endpoints)
- [Telegram Bot](#telegram-bot)
- [Quản lý Sheet](#quản-lý-sheet)
- [Bảo trì](#bảo-trì)

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Static Site)                    │
│  index.html | contact.html | customer.html | hoadon.html   │
│  hopdongmuaban.html | baogia.html | internal.html           │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch() POST/GET
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           GOOGLE APPS SCRIPT WEB APP (Sheet Web)            │
│  - Xử lý orders, contacts, contracts, invoices             │
│  - Tạo JSON files (products, banners, customers)           │
│  - Sheet ID: 18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Sheet Web   │  │  Sheet Order  │  │ Sheet Store   │
│  (Sản phẩm)   │  │   (Đơn hàng)  │  │  (Quản lý)    │
└───────────────┘  └───────────────┘  └───────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
┌───────────────┐                  ┌───────────────┐
│ Sheet Hóa đơn │                  │Sheet Hợp đồng │
└───────────────┘                  └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│           TELEGRAM BOT (Sheet riêng)                        │
│  - Upload ảnh → Drive folder SP_<serial>                   │
│  - Lưu metadata → Telegram_Images sheet                     │
│  - Cập nhật Store sheet với link ảnh                         │
│  - Sheet ID: 1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
┌───────────────┐                  ┌───────────────┐
│ Google Drive  │                  │  Store Sheet  │
│  (Ảnh SP)     │                  │  (Link ảnh)   │
└───────────────┘                  └───────────────┘
```

---

## Thành phần hệ thống

### 1. Google Sheets (4 sheets chính)

| Sheet Name | ID | Mục đích |
|------------|-----|----------|
| **Web** | `` | Danh sách sản phẩm (có cột: Brand, Model, CPU, RAM, SSD, GPU, Price, Photos, Folder Album Image Google Drive, ...) |
| **Order** | Cùng sheet trên | Lưu đơn hàng từ form website (Tên, SDT, Sản phẩm, Ghi chú) |
| **HoaDon** | Tự tạo | Lưu hóa đơn bán hàng (có nhiều dòng sản phẩm) |
| **HopDongMuaBan** | Tự tạo | Lưu hợp đồng mua bán laptop |
| **Customer** | Cùng sheet Web hoặc sheet riêng | Khách hàng đã tin dùng (upload ảnh từ customer.html) |
| **Store** | Trong file `18sGLaK2MblP23WHe...xlsx` (backup) | Sheet quản lý nội bộ (có folder links, IDs) |
| **Telegram_Images** | Trong sheet `1ERkMtS7Y...` | Lưu metadata ảnh từ Telegram bot |

### 2. Google Drive

| Folder | ID | Mục đích |
|--------|-----|----------|
| **Root ảnh SP** | `` | Chứa folder `SP_<SERIAL>` của mỗi sản phẩm |
| **Banner** | `1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7` | Ảnh banner carousel trang chủ |
| **JSON files** | `` | Lưu `products.json`, `banners.json`, `customer.json` |
| **SP_\<serial\>** | Tự tạo | Mỗi folder chứa ảnh của 1 sản phẩm |

### 3. Telegram Bot

- **Bot Token**: ``
- **Lệnh**: `/start`, `/new`, `/delete <SERIAL>`, `/list`, `/xoarong`, `/folder`, `/id`

---

## Setup & Deployment

### Bước 1: Deploy Main Web App (Sheet Web)

1. Mở Google Sheet: [Web Sheet](https://docs.google.com/spreadsheets/d/18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog/edit)
2. `Extensions` → `Apps Script`
3. Xóa code cũ, dán nội dung từ `apps-script-rewritten.txt`
4. `Ctrl+S` để lưu
5. Click `Deploy` → `New deployment`
6. Chọn `Web app`:
   - **Execute as**: `Me` (your email)
   - **Who has access**: `Anyone` (hoặc `Anyone with Google account`)
7. Click `Deploy`
8. **COPY Web App URL** (ví dụ: `https://script.google.com/macros/s/AKfycbx.../exec`)
9. Paste URL này vào `config.js` → `SHEET_API`

### Bước 2: Deploy Telegram Bot

1. Mở Google Sheet: [Telegram Sheet](https://docs.google.com/spreadsheets/d/1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ/edit)
2. `Extensions` → `Apps Script`
3. Xóa code cũ, dáng nội dung từ `telegram-bot-rewritten.txt`
4. `Ctrl+S`
5. `Deploy` → `New deployment` → `Web app`
6. Execute as: `Me`, Who has access: `Anyone`
7. `Deploy` và COPY Web App URL
8. Set Webhook:
   - Trong Apps Script editor, chạy function `setWebhook`
   - Hoặc gọi API: `https://api.telegram.org/bot8614022226:AAH2j4bdGHHsjCw8-WdZCcyB5rrTWSdwRec/setWebhook?url=<YOUR_WEBAPP_URL>`
9. Test: gửi `/start` cho bot @i10store (tên bot của bạn)

### Bước 3: Build Frontend

1. Cài Python 3 (nếu chưa có)
2. Chạy `obfuscate.py` để tạo `i10-config.min.js`:
   ```bash
   python obfuscate.py
   ```
3. Push code lên GitHub (nếu dùng GitHub Pages)

---

## Cấu hình

### `config.js` variables

| Variable | Mô tả | Required? |
|----------|-------|-----------|
| `SHEET_API` | Web App URL của Main Sheet (đã deploy) | ✅ |
| `STATIC_JSON_FOLDER_ID` | Drive folder chứa products.json | ✅ |
| `FOLDER_ID_BANNER` | Drive folder chứa banner images | ✅ |
| `DRIVE_ROOT_ID` | Drive root folder chứa ảnh sản phẩm | ✅ |
| `STORE_SHEET_NAME` | Tên sheet "Store" trong file backup | ⚠️ |
| `SHEET_NAME` | Tên sheet "Web" | ✅ |
| `CACHE_TTL` | Cache thời gian (ms) | ⚙️ |

### Mật khẩu (client-side)

Các mật khẩu này được obfuscate trong `i10-config.min.js`:

| Page | Mật khẩu mặc định | Có thể đổi trong config.js |
|------|------------------|---------------------------|
| `internal.html` | `i102026` | `PASSWORD_INTERNAL` |
| `hoadon.html` | `i102026` | `PASSWORD_PRINT` |
| `hopdongmuaban.html` | `i102026` | `PASSWORD_PRINT` |
| `baogia.html` | `i102026` | `PASSWORD_PRINT` |

⚠️ **Lưu ý**: Đây là mật khẩu PHPIN (client-side obfuscation). Để bảo mật thực sự, nên dùng Google Auth hoặc backend validation.

---

## API Endpoints

### GET endpoints (đọc dữ liệu)

| Endpoint | Mô tả | Response |
|----------|-------|----------|
| `?mode=products` | Danh sách sản phẩm | JSON array products |
| `?mode=banners` | Danh sách banner images | JSON array images |
| `?mode=customers` | Danh sách khách hàng | JSON array customers |

Ví dụ: `https://script.google.com/macros/s/AKfycbx.../exec?mode=products`

### POST endpoints (lưu dữ liệu)

Tất cả gửi POST với `Content-Type: application/json`, body là JSON object.

**Order (Đơn hàng cũ):**
```json
{
  "product": "Thinkpad X1 Carbon",
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "note": "Giao chiều"
}
```

**Contact (Liên hệ):**
```json
{
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "email@example.com",
  "message": "Tôi muốn mua laptop..."
}
```

**Contract (Hợp đồng mua bán):**
```json
{
  "soHD": "001/2026",
  "ngay": "22",
  "thang": "04",
  "nam": "2026",
  "noiLap": "07 Đô Đốc Tuyết, Hòa Xuân",
  "tenA": "i10 Store",
  "cccdA": "",
  "ngayCapA": "",
  "diaChiA": "07 Đô Đốc Tuyết",
  "sdtA": "0838288000",
  "tenB": "Nguyễn Văn A",
  "cccdB": "049092009999",
  "ngayCapB": "15/11/2022",
  "diaChiB": "Đà Nẵng",
  "model": "Thinkpad X1 Carbon Gen 11",
  "serial": "PF4RDCFF",
  "cauHinh": "i7/ 16GB / 512GB/ 4K",
  "tinhTrang": "Máy đẹp 95%",
  "giaTien": "8500000",
  "giaTienChu": "Tám triệu năm trăm nghìn đồng",
  "thanhToan": "Chuyển khoản",
  "commitment": "..." // optional
}
```

**Invoice (Hóa đơn bán hàng):**
```json
{
  "soHD": "HD-001/2026",
  "ngayThangNam": "22/04/2026",
  "tenKhachHang": "Nguyễn Văn A",
  "diaChiKhachHang": "Đà Nẵng",
  "sdtKhachHang": "0901234567",
  "ghiChu": "Kèm sạc, túi",
  "thanhToan": "Chuyển khoản",
  "giaTienChu": "Tám triệu năm trăm nghìn đồng",
  "products": [
    {
      "tenSanPham": "Thinkpad X1 Carbon",
      "modelSanPham": "Gen 11",
      "cauHinh": "i7-1365u / 16GB / 512GB",
      "soLuong": "1",
      "donGia": "8500000"
    }
  ]
}
```

---

## Telegram Bot

### Các lệnh

| Lệnh | Mô tả |
|------|-------|
| `/start` | Hiển thị menu hướng dẫn |
| `/new` hoặc `/begin` | Bắt đầu upload ảnh mới |
| `CFF` (gửi trực tiếp Serial) | Nhập Serial sản phẩm |
| Gửi ảnh | Upload ảnh vào folder `SP_<SERIAL>` |
| `/delete CFF` | Xóa tất cả ảnh của serial CFF |
| `/list` | Xem danh sách serial có ảnh |
| `/xoarong` | Xóa tất cả folder rỗng |
| `/folder` | Link vào Drive folder chính |
| `/id` | Xem Chat ID của bạn |

### Quy trình upload

1. Gửi `/new` hoặc gửi trực tiếp Serial (VD: `CFF`)
2. Bot trả lời: "✅ Đã nhận Serial: CFF"
3. Gửi 1 hoặc nhiều ảnh (chụp từ điện thoại)
4. Bot sẽ:
   - Tạo folder `SP_CFF` trong Drive (nếu chưa có)
   - Upload ảnh vào folder
   - Lưu metadata vào sheet `Telegram_Images`
   - Cập nhật cột "Folder Album Image Google Drive" trong sheet `Store` cho serial CFF
   - Trả về link folder và số ảnh đã upload

---

## Quản lý Sheet

### Columns trong Sheet "Web" (products sheet)

| Cột | Mô tả | Required |
|-----|-------|----------|
| `ID` | Mã nội bộ (CFF, DFF, ...) | ✅ |
| `Brand` | Thương hiệu (Thinkpad, Dell, ...) | ✅ |
| `Model` | Model (X1 Carbon, T14, ...) | ✅ |
| `CPU` | CPU (i5-1335u, i7-1365u, ...) | ✅ |
| `RAM` | RAM (8, 16, 32 GB) | ✅ |
| `SSD` | SSD (256, 512, 1TB) | ✅ |
| `SIZE` | Kích thước màn hình (14, 15.6, ...) | ⚠️ |
| `RESOLUTION` | Độ phân giải (FHD, 4K, ...) | ⚠️ |
| `GPU` | GPU (onboard, Iris Xe, RTX...) | ⚠️ |
| `Price` | Giá bán (số, VD: 18 = 18 triệu) | ⚠️ |
| `T.THÁI` | Trạng thái (Còn, Đã bán, Tạm hết) | ✅ |
| `Folder Album Image Google Drive` | Link folder ảnh | ⚠️ |
| `Folder ID` | ID folder (tự sinh) | ⚠️ |
| `Web Link` | SEO slug (san-pham/x1-carbon...) | ⚠️ |
| `Photos` / `Photos2` | Link ảnh Google Photos (optional) | ❌ |

### Columns trong Sheet "Store" (internal)

Sheet này dùng cho quản lý nội bộ, có các cột:
- `Name` - Tên sản phẩm
- `Model` - Model
- `Folder Album Image Google Drive` - Link folder ảnh
- `Folder ID` - ID folder
- Các cột giá, ngày nhập, bán, ...

---

## Bảo trì

### Clear Cache

Chạy trong Apps Script editor:
```javascript
clearCachedJson(); // Xóa cache ScriptCache
```

Hoặc tự động hết hạn sau 6 giờ.

### Sync JSON files

- Tự động tạo khi deploy (chạy `updateProductJson()` 1 lần)
- Hoặc vào sheet > Menu "🧰 I10 Tools" > chọn chức năng cập nhật
- JSON files được lưu vào Drive folder: `STATIC_JSON_FOLDER_ID`

### Kiểm tra folder rỗng

`checkEmptyImageFolders()` → highlight các product chưa có ảnh màu vàng.

### Dọn folder dư thừa

`checkAndCleanExtraFolders()` → chuyển folder không có trong Store sheet vào `_DATA`.

---

## Troubleshooting

### Images không hiển thị trên website
1. Kiểm tra column `Folder Album Image Google Drive` có URL hợp lệ
2. Kiểm tra folder có ảnh (dùng `checkEmptyImageFolders()`)
3. Re-deploy Web App nếu code thay đổi

### Telegram bot không phản hồi
1. Kiểm tra Webhook: chạy `setWebhook()` trong bot editor
2. Check Logs: `View` → `Executions` trong Apps Script
3. Đảm bảo bot đã được `/start` trước khi dùng

### Form đặt hàng không gửi được
- Kiểm tra Network tab (F12) có error CORS không
- Đảm bảo `SHEET_API` trong config.js đúng URL
- Web App phải deploy với access = `Anyone`

### JSON files cũ
- Clear browser cache
- Clear localStorage: `localStorage.removeItem('i10_products_cache_v3')`
- Re-deploy và run `updateProductJson()`

---

## Files structure

```
/ (root)
├── apps-script-rewritten.txt     ← Main Web App code (Sheet Web)
├── telegram-bot-rewritten.txt    ← Telegram Bot code (Sheet Telegram)
├── README.md                      ← Bạn đang đọc
├── DEPLOYMENT.md                  ← Hướng dẫn deploy chi tiết
├── assets/
│   ├── js/
│   │   ├── config.js              ← Config source (edit here)
│   │   ├── config-new.js          ← New config structure
│   │   ├── i10-config.min.js      ← Obfuscated (auto-generated)
│   │   ├── i10-products.js        ← Product loader & UI
│   │   ├── products.json          ← Local backup (có thể lỗi thời)
│   │   └── banners.json           ← Local backup
│   └── css/
│       └── i10.css                ← Styles chính
├── *.html                         ← Các trang web
├── obfuscate.py                   ← Script build config.min.js
└── .gitignore

Google Drive:
├── 1ZO7AcpmyShKm2j0EVNorme7mYKRN2VcQ (Root)
│   ├── SP_CFF/ (ảnh sản phẩm CFF)
│   ├── SP_DFF/ (ảnh sản phẩm DFF)
│   └── ...
├── 1h1qRJQVMTtzTfXxyPPUgrIilyARr37o7 (Banners)
└── 1vlL3LKoixYloAweJie1YbS1Vgro-oR_m (JSON files)

Google Sheets:
├── 18sGLaK2MblP23WHe... (Web - products, orders, customers)
│   ├── Web sheet (sản phẩm)
│   ├── Order sheet
│   ├── HoaDon sheet (auto)
│   ├── HopDongMuaBan sheet (auto)
│   └── Customer sheet (optional)
└── 1ERkMtS7Y... (Telegram - images metadata)
    └── Telegram_Images sheet
```

---

## TODO / Improvements

- [ ] Replace client-side passwords with Google OAuth
- [ ] Add rate limiting for Telegram bot
- [ ] Add image compression before upload
- [ ] Add batch delete in admin panel
- [ ] Migrate all endpoints to unified `?mode=` API
- [ ] Add unit tests for Apps Script functions
- [ ] Add logging to BigQuery or external DB
- [ ] Implement image deduplication (by hash)

---

© 2026 i10 Store - Chuyên Laptop Thinkpad US.
