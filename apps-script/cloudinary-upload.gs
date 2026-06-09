// i10 Store - Google Apps Script backend for Telegram photo uploads
// Requires Script Properties:
// TELEGRAM_BOT_TOKEN, TELEGRAM_SHEET_ID, WEBHOOK_WEBSITE_URL
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// CLOUDINARY_FOLDER, CLOUDINARY_LOGO_PUBLIC_ID, CLOUDINARY_PRESET, ALLOWED_USERS

const TOKEN = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
const SHEET_ID = PropertiesService.getScriptProperties().getProperty('TELEGRAM_SHEET_ID');
const WEBHOOK_WEBSITE_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_WEBSITE_URL');

const ALLOWED_USERS = (PropertiesService.getScriptProperties().getProperty('ALLOWED_USERS') || '5857710133')
  .split(',')
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !Number.isNaN(id));

const CLOUD_NAME = PropertiesService.getScriptProperties().getProperty('CLOUDINARY_CLOUD_NAME');
const CLOUD_API_KEY = PropertiesService.getScriptProperties().getProperty('CLOUDINARY_API_KEY');
const CLOUD_API_SECRET = PropertiesService.getScriptProperties().getProperty('CLOUDINARY_API_SECRET');

const CLOUD_FOLDER = PropertiesService.getScriptProperties().getProperty('CLOUDINARY_FOLDER') || 'i10store';
const CLOUD_LOGO_PUBLIC_ID = PropertiesService.getScriptProperties().getProperty('CLOUDINARY_LOGO_PUBLIC_ID') || 'i10_logo';
const CLOUD_PRESET = PropertiesService.getScriptProperties().getProperty('CLOUDINARY_PRESET') || 'i10_preset';

function doPost(e) {
  try {
    if (!e || !e.postData) return;
    const data = JSON.parse(e.postData.contents);
    const msg = data.message || (data.callback_query && data.callback_query.message);
    if (!msg) return;

    const chatId = msg.chat.id;
    const userId = data.callback_query ? data.callback_query.from.id : msg.from.id;

    if (!ALLOWED_USERS.includes(userId)) {
      return sendMessage(chatId, 'Khong co quyen su dung bot nay.');
    }

    if (data.callback_query) return handleCallback(data.callback_query);

    const text = msg.text ? msg.text.trim() : null;
    if (text && text.startsWith('/')) return handleCommand(chatId, text);
    if (text) return handleTextInput(chatId, text);
    if (msg.photo || msg.document) return handleImageUpload(chatId, msg);
  } catch (err) {
    if (TOKEN) sendMessage('5857710133', 'He thong loi: ' + err.message);
  }
}

function handleCommand(chatId, text) {
  if (text === '/start' || text === '/help') {
    return sendMessage(chatId,
      '/new - Tim san pham moi\n' +
      '/clear - Reset trang thai\n' +
      '/check - Kiem tra san pham thieu anh\n' +
      '/view - Xem nhanh bo anh hien tai\n' +
      '/delete [STT] - Xoa anh\n' +
      '/delall - Xoa het anh cua may dang chon'
    );
  }
  if (text === '/new') {
    finalizeCurrentUpload(chatId);
    clearUserSerial(chatId);
    return sendMessage(chatId, 'Moi nhap ID hoac Serial may:');
  }
  if (text === '/clear') {
    finalizeCurrentUpload(chatId);
    clearUserSerial(chatId);
    clearUpload(chatId);
    return sendMessage(chatId, 'Da xoa trang thai hien tai.');
  }
  if (text === '/check') return handleCheck(chatId);
  if (text === '/view') return handleViewImages(chatId);
  if (text.startsWith('/delete')) return handleDelete(chatId, text);
  if (text === '/delall') return handleDeleteAllFolder(chatId);
}

function handleCallback(cb) {
  const chatId = cb.message.chat.id;
  const rowIndex = parseInt(cb.data.replace('SELECT_', ''), 10);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const row = sheet.getRange(rowIndex, 1, 1, 6).getValues()[0];

  setUserSerial(chatId, JSON.stringify({
    rowIndex: rowIndex,
    value: row[4],
    model: row[3]
  }));
  clearUpload(chatId);
  sendMessage(chatId, 'Da chon: ' + row[3] + '\nSN: ' + row[4] + '\nGui anh hoac go /view de xem anh cu.');
}

function handleTextInput(chatId, text) {
  const input = text.toUpperCase();
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

  if (input === 'BANNERS') {
    setUserSerial(chatId, JSON.stringify({ value: 'BANNERS', model: 'BANNERS', rowIndex: 2 }));
    clearUpload(chatId);
    return sendMessage(chatId, 'Da vao che do BANNERS. Hay gui anh banners.');
  }

  const data = sheet.getDataRange().getValues();
  const type = input.length === 3 ? 'ID' : 'SERIAL';
  const matches = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (type === 'ID' && String(row[1]).toUpperCase() === input) matches.push({ row: i + 1, model: row[3], sn: row[4] });
    if (type === 'SERIAL' && String(row[4]).toUpperCase() === input) matches.push({ row: i + 1, model: row[3], sn: row[4] });
  }

  if (!matches.length) return sendMessage(chatId, 'Khong tim thay thong tin cho: ' + input);

  if (matches.length === 1) {
    const item = matches[0];
    setUserSerial(chatId, JSON.stringify({ rowIndex: item.row, value: item.sn, model: item.model }));
    clearUpload(chatId);
    return sendMessage(chatId, 'Da tim thay: ' + item.model + '\nSN: ' + item.sn + '\nGui anh hoac go /view de xem anh san co.');
  }

  const buttons = matches.map((m) => [{ text: `${m.model} (${m.sn})`, callback_data: `SELECT_${m.row}` }]);
  return sendKeyboard(chatId, 'Tim thay nhieu may trung, vui long chon may chinh xac:', buttons);
}

function handleImageUpload(chatId, msg) {
  const userData = JSON.parse(getUserSerial(chatId) || '{}');
  if (!userData.rowIndex) return sendMessage(chatId, 'Hay nhap ID hoac Serial truoc khi gui anh.');

  let upload = JSON.parse(getUpload(chatId) || '{}');
  if (!upload.started) {
    sendMessage(chatId, 'Dang dong bo anh cho may ' + userData.model + '...');
    upload = { started: true, total: 0, model: userData.model, sn: userData.value, rowIndex: userData.rowIndex };
  }

  const fileId = msg.document ? msg.document.file_id : msg.photo[msg.photo.length - 1].file_id;
  const imageObj = uploadTelegramPhotoToCloudinary(fileId, userData.value);

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const current = sheet.getRange(userData.rowIndex, 6).getValue() || '[]';
  const images = JSON.parse(current);
  images.push(imageObj);
  sheet.getRange(userData.rowIndex, 6).setValue(JSON.stringify(images));

  upload.total++;
  upload.last = Date.now();
  setUpload(chatId, JSON.stringify(upload));
  scheduleFinalize(chatId);
}

function assertCloudinaryConfig_() {
  if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_API_SECRET) {
    throw new Error('Thieu CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET trong Script Properties.');
  }
}

function uploadToCloudinary(blob, serial) {
  assertCloudinaryConfig_();

  const timestamp = Math.floor(Date.now() / 1000);
  const safeSerial = String(serial || 'product').replace(/[^\w-]/g, '_');
  const publicId = `${safeSerial}_${timestamp}`;
  const folder = `${CLOUD_FOLDER}/${safeSerial}`;

  const logoOverlay = String(CLOUD_LOGO_PUBLIC_ID).replace(/\//g, ':');
  const watermark = `l_${logoOverlay},o_39,w_0.15,g_south_east,x_29,y_29`;

  const params = {
    folder: folder,
    public_id: publicId,
    timestamp: timestamp,
    upload_preset: CLOUD_PRESET
  };
  const signature = createCloudinarySignature(params);

  const response = UrlFetchApp.fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'post',
    payload: {
      file: blob,
      api_key: CLOUD_API_KEY,
      timestamp: String(timestamp),
      folder: folder,
      public_id: publicId,
      upload_preset: CLOUD_PRESET,
      signature: signature,
      eager: [
        `f_auto,q_auto,w_400,c_limit`,
        `f_auto,q_auto,w_800,c_limit`,
        `f_auto,q_auto,w_1600,c_limit,${watermark}`
      ].join('|')
    },
    muteHttpExceptions: true
  });

  const text = response.getContentText();
  const result = JSON.parse(text);
  if (response.getResponseCode() >= 300 || !result.secure_url) {
    throw new Error('Cloudinary loi: ' + text);
  }
  return result;
}

function createCloudinarySignature(params) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + CLOUD_API_SECRET;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str);
  return digest.map((b) => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}

function buildCloudinaryImageObject(cloud) {
  const eager = Array.isArray(cloud.eager) ? cloud.eager : [];
  const eagerByWidth = (w) => eager.find((item) => String(item.width || '') === String(w));
  return {
    id: cloud.public_id,
    public_id: cloud.public_id,
    name: cloud.original_filename || cloud.public_id,
    url: cloud.secure_url,
    thumb: (eagerByWidth(400) && eagerByWidth(400).secure_url) || `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_400/${cloud.public_id}`,
    cover: (eagerByWidth(1600) && eagerByWidth(1600).secure_url) || `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1600/l_${String(CLOUD_LOGO_PUBLIC_ID).replace(/\//g, ':')},o_40,g_south_east,x_30,y_30/${cloud.public_id}`,
    responsive: {
      small: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_400/${cloud.public_id}`,
      medium: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_800/${cloud.public_id}`,
      large: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1600/${cloud.public_id}`
    },
    width: cloud.width,
    height: cloud.height,
    bytes: cloud.bytes,
    format: cloud.format
  };
}

function uploadTelegramPhotoToCloudinary(fileId, serial) {
  if (!TOKEN) throw new Error('Thieu TELEGRAM_BOT_TOKEN.');
  const fileInfoResponse = UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const fileInfo = JSON.parse(fileInfoResponse.getContentText());
  if (!fileInfo.ok || !fileInfo.result || !fileInfo.result.file_path) {
    throw new Error('Telegram khong the lay file.');
  }

  const blob = UrlFetchApp.fetch(`https://api.telegram.org/file/bot${TOKEN}/${fileInfo.result.file_path}`).getBlob();
  const cloud = uploadToCloudinary(blob, serial);
  return buildCloudinaryImageObject(cloud);
}

function scheduleFinalize(chatId) {
  PropertiesService.getScriptProperties().setProperty('FINALIZE_' + chatId, String(Date.now()));
}

function finalizePendingUploads() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  Object.keys(all).forEach((key) => {
    if (!key.startsWith('FINALIZE_')) return;
    const chatId = key.replace('FINALIZE_', '');
    const last = parseInt(all[key], 10);
    if (Date.now() - last < 15000) return;

    const upload = JSON.parse(getUpload(chatId) || '{}');
    if (upload.total) {
      sendMessage(chatId, `Hoan thanh: da tai len ${upload.total} anh cho may ${upload.model}.`);
      triggerWebsiteWebhook(upload.rowIndex);
    }
    clearUpload(chatId);
    props.deleteProperty(key);
  });
}

function finalizeCurrentUpload(chatId) {
  const upload = JSON.parse(getUpload(chatId) || '{}');
  if (!upload.total) return;
  sendMessage(chatId, `Da chot bo anh cu: co ${upload.total} anh duoc luu cho may ${upload.model}.`);
  triggerWebsiteWebhook(upload.rowIndex);
  clearUpload(chatId);
  PropertiesService.getScriptProperties().deleteProperty('FINALIZE_' + chatId);
}

function triggerWebsiteWebhook(rowIndex) {
  if (!WEBHOOK_WEBSITE_URL) return;
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    const rowData = sheet.getRange(rowIndex, 1, 1, 6).getValues()[0];
    const payload = {
      action: 'UPDATE_IMAGES',
      rowIndex: rowIndex,
      id: rowData[1],
      model: rowData[3],
      serial: rowData[4],
      images: JSON.parse(rowData[5] || '[]')
    };
    UrlFetchApp.fetch(WEBHOOK_WEBSITE_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Webhook loi: ' + e.message);
  }
}

function handleViewImages(chatId) {
  const user = JSON.parse(getUserSerial(chatId) || '{}');
  if (!user.rowIndex) return sendMessage(chatId, 'Chua chon san pham nao.');

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const images = JSON.parse(sheet.getRange(user.rowIndex, 6).getValue() || '[]');
  if (!images.length) return sendMessage(chatId, 'San pham chua co anh nao.');

  images.forEach((img, idx) => {
    const caption = `Anh so [${idx + 1}]\nPublic ID: ${img.public_id}`;
    UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        photo: img.thumb,
        caption: caption
      }),
      muteHttpExceptions: true
    });
  });
}

function deleteFromCloudinary(publicIds) {
  assertCloudinaryConfig_();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { api_key: CLOUD_API_KEY, public_ids: publicIds.join(','), timestamp: timestamp };
  const signature = createCloudinarySignature(params);

  const response = UrlFetchApp.fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload`, {
    method: 'delete',
    payload: {
      api_key: CLOUD_API_KEY,
      public_ids: publicIds.join(','),
      timestamp: String(timestamp),
      signature: signature
    },
    muteHttpExceptions: true
  });
  return JSON.parse(response.getContentText());
}

function handleDelete(chatId, text) {
  const index = parseInt(text.replace('/delete ', ''), 10) - 1;
  const user = JSON.parse(getUserSerial(chatId) || '{}');
  if (!user.rowIndex) return sendMessage(chatId, 'Chua chon san pham nao.');

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const images = JSON.parse(sheet.getRange(user.rowIndex, 6).getValue() || '[]');
  if (isNaN(index) || index < 0 || index >= images.length) return sendMessage(chatId, 'So thu tu anh khong hop le.');

  const deleted = images.splice(index, 1)[0];
  deleteFromCloudinary([deleted.public_id]);
  sheet.getRange(user.rowIndex, 6).setValue(JSON.stringify(images));
  triggerWebsiteWebhook(user.rowIndex);
  sendMessage(chatId, 'Da xoa anh so ' + (index + 1) + ' thanh cong.');
}

function handleDeleteAllFolder(chatId) {
  const user = JSON.parse(getUserSerial(chatId) || '{}');
  if (!user.rowIndex) return sendMessage(chatId, 'Chua chon san pham nao.');

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const images = JSON.parse(sheet.getRange(user.rowIndex, 6).getValue() || '[]');
  if (!images.length) return sendMessage(chatId, 'San pham nay khong co anh.');

  deleteFromCloudinary(images.map((img) => img.public_id));
  sheet.getRange(user.rowIndex, 6).setValue('[]');
  triggerWebsiteWebhook(user.rowIndex);
  sendMessage(chatId, 'Da xoa toan bo anh.');
}

function handleCheck(chatId) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const missing = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][5] || data[i][5] === '[]') missing.push(`ID: ${data[i][1]} | ${data[i][3]}`);
  }
  return sendMessage(chatId, missing.length ? missing.join('\n') : 'Tat ca san pham deu co anh.');
}

function sendMessage(chatId, text) {
  return UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text }),
    muteHttpExceptions: true
  });
}

function sendKeyboard(chatId, text, buttons) {
  return UrlFetchApp.fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: { inline_keyboard: buttons }
    }),
    muteHttpExceptions: true
  });
}

function setUserSerial(chatId, data) {
  PropertiesService.getScriptProperties().setProperty('USER_' + chatId, data);
}

function getUserSerial(chatId) {
  return PropertiesService.getScriptProperties().getProperty('USER_' + chatId);
}

function clearUserSerial(chatId) {
  PropertiesService.getScriptProperties().deleteProperty('USER_' + chatId);
}

function setUpload(chatId, data) {
  PropertiesService.getScriptProperties().setProperty('UPLOAD_' + chatId, data);
}

function getUpload(chatId) {
  return PropertiesService.getScriptProperties().getProperty('UPLOAD_' + chatId);
}

function clearUpload(chatId) {
  PropertiesService.getScriptProperties().deleteProperty('UPLOAD_' + chatId);
}

