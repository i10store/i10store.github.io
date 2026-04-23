# Changelog - i10 Store Hệ thống

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Cải tiến lớn (Apr 2026)

### Added 🆕
- **Unified Web App API** với `?mode=` parameters:
  - `?mode=products` - lấy danh sách sản phẩm từ sheet Web
  - `?mode=banners` - lấy danh sách banner images
  - `?mode=customers` - lấy danh sách khách hàng
- **Telegram Bot riêng biệt** trên sheet độc lập (`1ERkMtS7Yq...`) để tách biệt dữ liệu
- **Centralized config** trong `config.js` với các endpoint rõ ràng
- **Obfuscation script** (`obfuscate.py`) để bảo vệ config
- **CHANGELOG.md** và **DEPLOYMENT.md** tài liệu chi tiết

### Fixed 🔧
- **Cấu trúc Apps Script** tách biệt rõ ràng:
  - Main Web App (xử lý orders, contracts, invoices)
  - Telegram Bot (xử lý upload ảnh)
- **Xử lý lỗi** toàn diện với try-catch và logging
- **Sheet names** thống nhất: `Web`, `Order`, `HoaDon`, `HopDongMuaBan`, `Customer`
- **Drive API** được enable đúng cách
- **Serial matching** không case-sensitive
- **Folder ID extraction** robust với nhiều pattern

### Changed 🔄
- **Moved Telegram bot** từ `apps-script.txt` (chung chung) → `telegram-bot-rewritten.txt` (riêng biệt)
- **API endpoints** chuyển từ nhiều URL khác nhau → 1 unified URL với `mode` parameter
- **JSON export** tự động tạo khi deploy, không cần manual
- **Cache keys** versioned (`v3`) để tránh cache collision
- **Sheet IDs** chính xác theo yêu cầu:
  - Main: `18sGLaK2MblP23WHeGblDhFhg8BcDvoIGSRT-7Upjsog`
  - Telegram: `1ERkMtS7YqNztLaAWfMP2tJ6MCHP-Y0v8U20xbUW45pQ`

### Removed 🗑️
- Code Telegram bot cũ trong `apps-script.txt` (đã tách riêng)
- Duplicate functions và confusion giữa 2 sheets
- Hardcoded URLs (chuyển sang config)

### Security 🔒
- **Client-side passwords** vẫn obfuscated (nhưng không an toàn tuyệt đối)
- **Webhook URL** chỉ expose qua Telegram API
- **Drive permissions**: Files được set `Anyone with link` để hiển thị ảnh
- **Rate limiting**: Chưa có (cần implement sau)

### Known Issues ⚠️
- Client-side passwords không bảo mật thực sự
- Không có queue system cho Telegram bot (có thể bị rate limit nếu nhiều user)
- Chưa có validation input nghiêm ngặt
- Chưa có monitoring dashboard
- Sheet `Store` (backup) chưa đồng bộ real-time với `Web`

---

## [Old] - Code gốc (trước khi rewrite)

### Features gốc
- Apps Script chung cho cả Web và Telegram (confusing)
- Nhiều token Telegram khác nhau trong code
- Sheet IDs hardcoded lỗi thời
- Không có unified API endpoint
- Config diffuse qua nhiều file

### Issues gốc
- `apps-script.txt` dùng token `8746983195:...` (cũ)
- `apps-script2.txt` dùng token `8614022226:...` (mới) → 2 bot khác nhau?
- Sheet ID `906291845` cũ không match với yêu cầu mới
- Telegram bot lưu ảnh vào `Telegram_Images` sheet nhưng không đồng bộ với Web sheet
- `doGet` không hỗ trợ products/banners endpoints đầy đủ
- Missing error handling trong nhiều hàm
- No documentation cho deployment

---

## Migration Guide

### Từ code cũ → code mới

1. **Backup** tất cả Google Sheets (Export to .xlsx)
2. **Deploy Main Web App** vào Sheet Web (18sGLaK2...)
3. **Deploy Telegram Bot** vào Sheet Telegram (1ERkMtS7...)
4. **Cập nhật config.js** với Web App URLs mới
5. **Build** config: `python obfuscate.py`
6. **Test** từng tính năng:
   - Products JSON loads?
   - Contact form works?
   - Telegram bot uploads?
7. **Cutover**Switch traffic sang new deployment

### Sheet structure changes

**Web sheet** - thêm/bớt cột:
- Giữ nguyên: Brand, Model, CPU, RAM, SSD, GPU, Price, T.THÁI
- Đảm bảo có: `Folder Album Image Google Drive`, `Folder ID`, `Web Link`

**Telegram_Images sheet** (tạo mới):
- Thời gian, Serial, Tên file, URL ảnh, Drive Folder ID

**Store sheet** (nếu cần):
- Giữ nguyên để tracking nội bộ

---

## Next Steps (TODO)

- [ ] Add rate limiting to Telegram bot
- [ ] Implement image compression before upload
- [ ] Add batch delete in admin panel
- [ ] Migrate all frontend endpoints to unified `?mode=` API
- [ ] Add unit tests
- [ ] Add Google Auth for internal pages
- [ ] Monitor execution logs và errors
- [ ] Add backup sheet tự động
- [ ] Implement webhook retry logic
- [ ] Add image deduplication (hash check)

---

**Last updated:** 2026-04-23
**Maintained by:** i10 Store Team
