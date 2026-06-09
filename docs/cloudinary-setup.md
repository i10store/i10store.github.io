# Cloudinary setup for i10 Store

## What this backend expects

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `CLOUDINARY_LOGO_PUBLIC_ID`
- `CLOUDINARY_PRESET`

## 1) Create the upload preset

In Cloudinary Console:

1. Go to `Settings` -> `Upload`.
2. Open `Upload presets`.
3. Create a new preset named `i10_preset`.
4. Set it to `Signed`.
5. Keep folder handling aligned with your backend folder strategy.
6. Add eager transformations for the sizes you want cached ahead of time.
7. Save it.

Suggested eager transformations:

- `f_auto,q_auto,w_400,c_limit`
- `f_auto,q_auto,w_800,c_limit`
- `f_auto,q_auto,w_1600,c_limit,l_i10_logo,o_40,g_south_east,x_30,y_30`

The last one is your watermarked delivery variant.

## 2) Add Script Properties in Google Apps Script

Set these properties in the Apps Script project:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_SHEET_ID`
- `WEBHOOK_WEBSITE_URL`
- `ALLOWED_USERS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`
- `CLOUDINARY_LOGO_PUBLIC_ID`
- `CLOUDINARY_PRESET`

Recommended values:

- `CLOUDINARY_FOLDER = i10store`
- `CLOUDINARY_LOGO_PUBLIC_ID = i10_logo`
- `CLOUDINARY_PRESET = i10_preset`

## 3) Deploy the Apps Script

1. Create a new Apps Script project.
2. Paste `apps-script/cloudinary-upload.gs`.
3. Set the Script Properties above.
4. Deploy as a Web App.
5. Use that Web App URL as your Telegram webhook endpoint.

## 4) Frontend repo settings

The repo already reads Cloudinary config from `assets/js/config.js`.
Make sure these values stay aligned with the backend:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_FOLDER`
- `CLOUDINARY_LOGO_PUBLIC_ID`
- `CLOUDINARY_PRESET`

## 5) Notes

- Signed presets are the right choice for backend-controlled uploads.
- Cloudinary eager transformations are generated at upload time, so the page doesn't pay the cost on first view.
- Avoid using the same transformation in both incoming and eager transformations.

