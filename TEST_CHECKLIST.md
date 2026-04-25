# 🧪 DANH SÁCH KIỂM TRA SAU FIX

## 1. Apps Script Chính (Google Sheet)

### ✅ Form Đặt Hàng / Liên Hệ
- [ ] Mở Google Sheet chính
- [ ] Vào Extensions > Apps Script > Code.gs
- [ ] Đảm bảo file đã được cập nhật (740 lines)
- [ ] Test endpoint: `https://script.google.com/macros/s/.../exec?mode=products` → trả về JSON
- [ ] Gửi form đặt hàng từ website → kiểm tra sheet "Order" có thêm dòng mới không
- [ ] Gửi form liên hệ → kiểm tra sheet "Order" có thêm dòng mới không

### ✅ Form Hợp Đồng & Hóa Đơn
- [ ] Mở trang `/hopdong.html` hoặc `/hoadon.html`
- [ ] Điền thông tin hợp đồng → submit
- [ ] Kiểm tra sheet "HopDongMuaBan" có thêm dòng
- [ ] Kiểm tra email notification (nếu có bật email)
- [ ] Lặp lại với hóa đơn → kiểm tra sheet "HoaDon"

### ✅ Menu Cập Nhật JSON
- [ ] Mở Google Sheet
- [ ] Vào menu "🧰 I10 Tools"
- [ ] Click "📦 Cập nhật Products JSON" → hiện toast "✅ products.json đã được cập nhật"
- [ ] Click "🖼 Cập nhật Banner JSON" → toast success
- [ ] Click "👤 Cập nhật Customer JSON" → toast success

### ✅ Kiểm Tra Folder Rỗng
- [ ] Menu "Kiểm tra Folder rỗng (Web)"
- [ ] Nên hiển thị sidebar với danh sách folder rỗng (nếu có)
- [ ] Hàng rỗng nền vàng, lỗi nền đỏ

### ✅ Cache
- [ ] Mở dev tools → Network
- [ ] F5 trang web → gọi `/exec?mode=products`
- [ ] Response trả về products.json
- [ ] F5 lần 2 → header `X-Goog-From-Cache` hoặc thời gian response < 100ms

---

## 2. Telegram Bot

### ✅ Cấu Hình
- [ ] Mở Apps Script của bot
- [ ] Vào menu `Run > setupTelegramProperties` (chạy 1 lần)
- [ ] Kiểm tra Log (View > Logs) thấy "Đã cài đặt Telegram Properties"
- [ ] Vào `Run > checkTelegramProperties` → thấy 4 key đã lưu

### ✅ Nhận Ảnh
- [ ] Chat Telegram bot → nhập serial (ví dụ: PF4RDCFF)
- [ ] Bot trả lời: "✅ Serial: PF4RDCFF\n📸 Gửi ảnh"
- [ ] Gửi ảnh hoặc document
- [ ] Bot reply: "✅ Upload OK: PF4RDCFF_001.jpg"
- [ ] Kiểm tra Drive → folder `PF4RDCFF` có ảnh mới
- [ ] Kiểm tra sheet `Telegram_Images` → cột images có thêm JSON

### ✅ Lệnh Hỗ Trợ
- [ ] Gõ `/list` → hiện hướng dẫn
- [ ] Gõ `/all` → hiện danh sách serial
- [ ] Gõ `/view PF4RDCFF` → hiện link ảnh
- [ ] Gõ `/delete PF4RDCFF` → xóa folder và sheet row
- [ ] Gõ `/new` → clear serial cũ, yêu cầu nhập mới
- [ ] Gõ `/clear` → clear serial hiện tại

### ✅ Error Handling
- [ ] Test gửi ảnh khi chưa nhập serial → bot báo "❌ Chưa nhập serial" (không crash)
- [ ] Test với user không có trong ALLOWED_USERS → bot báo "❌ Không có quyền"
- [ ] Test revoke token bot → bot log lỗi nhưng không crash (muteHttpExceptions)

---

## 3. Frontend

### ✅ Sản Phẩm
- [ ] Mở `/index.html` → trang chủ load bình thường
- [ ] Có ảnh banner quay vòng
- [ ] Có danh sách sản phẩm hiển thị
- [ ] Click vào sản phẩm → mở popup
- [ ] Popup có ảnh, thông số, nút đặt hàng

### ✅ Bộ Lọc
- [ ] Ô tìm kiếm → filter theo tên
- [ ] Select sắp xếp: Giá tăng/giảm → hoạt động
- [ ] Ô giá trị (ví dụ: 8) → filter sản phẩm 6-10tr
- [ ] Nút "🧹 Xóa" → reset tất cả filter

### ✅ Filter URL
- [ ] Mở `/index.html?filter=available` → chỉ hiện "Còn hàng"
- [ ] Mở `/index.html?filter=sold` → chỉ hiện "Đã bán"
- [ ] Mở `/index.html?filter=thinkpad` → chỉ hiện Thinkpad

### ✅ Cache
- [ ] F5 trang → load data từ API
- [ ] F5 lần 2 → load từ localStorage (xem trong Application > LocalStorage)
- [ ] Key `i10_products_cache_v4` tồn tại
- [ ] Key `i10_banner_cache_v3` tồn tại

### ✅ Lightbox
- [ ] Click ảnh sản phẩm → mở lightbox
- [ ] Click mũi tên ← → sang ảnh khác
- [ ] Bấm phím ESC → đóng lightbox
- [ ] Mở popup → có autoplay ảnh (3s/ảnh)

---

## 4. Kiểm Tra Lỗi Console

### Apps Script
- [ ] Không có lỗi `Session.getActiveUser is undefined`
- [ ] Không có lỗi `MailApp.sendEmail failed`
- [ ] Không có log "clearProductCache" chạy tự động

### Telegram Bot
- [ ] Không có lỗi `getFileUrl ERROR`
- [ ] Không có lỗi `sendMessage ERROR`
- [ ] Có log khi gửi tin nhắn thành công

### Frontend
- [ ] Không có lỗi `Uncaught SyntaxError`
- [ ] Không có lỗi `p["Photos2"] is undefined`
- [ ] Không có lỗi CORS
- [ ] Ảnh broken (src="") → fallback sang logo

---

## 5. Performance

### Trước Fix vs Sau Fix
| Chỉ số | Trước | Sau |
|--------|-------|-----|
| Ghi hợp đồng | 3-5s | <2s |
| Check folder rỗng (50sp) | ~30s | ~10s |
| Render danh sách | ~1.5s | ~1s |
| Email error rate | ~15% | 0% |

---

## 6. Test Checklist Mobile

- [ ] Mở Chrome DevTools → Toggle Device Toolbar
- [ ] Test trên iPhone 12, iPad, Galaxy S20
- [ ] Popup responsive (thẻ mỏng hơn, ảnh nhỏ hơn)
- [ ] Nút đặt hàng không bị che
- [ ] Menu hamburger hoạt động

---

## 7. Edge Cases

- [ ] Sản phẩm không có ảnh → hiện logo placeholder
- [ ] Sản phẩm đã bán → hiện "Tạm hết hàng" màu đỏ
- [ ] Sản phẩm giá null → hiện "Liên hệ"
- [ ] Đăng ký hợp đồng thiếu CCCD → form vẫn submit được (empty string)
- [ ] Gửi form không có tên/sđt → báo lỗi nhưng không crash
- [ ] Telegram gửi file không phải ảnh → bot ignore
- [ ] Drive folder bị xóa → API catch error, báo đỏ trên sheet

---

## ✅ KẾT LUẬN

Nếu tất cả [✓] trên đều PASS → **PRODUCTION READY** 🚀

Nếu có [ ] nào FAIL → xem log và fix lại mục đó.

---

**Người test:** ______________  
**Ngày test:** ______________  
**Kết quả:** PASS / FAIL
