with open('apps-script.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the functions to replace
import re

# Pattern to find 3 download functions and the createDownloadUrl after them
pattern = r'(function downloadProducts\(\) \{[^}]+\})\s*(function downloadBanners\(\) \{[^}]+\})\s*(function downloadCustomers\(\) \{[^}]+\})'

new_funcs = '''function downloadProducts() {
  const ss = SpreadsheetApp.openById(CONFIG.WEB_SHEET_ID);
  const products = getProductsFromSheet(ss);
  const jsonString = JSON.stringify(products, null, 2);
  const blob = Utilities.newBlob(jsonString, 'application/json', CONFIG.STATIC_JSON_FILE_NAME);
  const file = DriveApp.createFile(blob);
  const url = file.getDownloadUrl().replace('?download=true', '?alt=media');
  DriveApp.getFileById(file.getId()).setTrashed(true);
  return url;
}
function downloadBanners() {
  const banners = getImagesFromFolder(CONFIG.FOLDER_ID_BANNER);
  const jsonString = JSON.stringify(banners, null, 2);
  const blob = Utilities.newBlob(jsonString, 'application/json', CONFIG.STATIC_BANNER_FILE_NAME);
  const file = DriveApp.createFile(blob);
  const url = file.getDownloadUrl().replace('?download=true', '?alt=media');
  DriveApp.getFileById(file.getId()).setTrashed(true);
  return url;
}
function downloadCustomers() {
  const ss = SpreadsheetApp.openById(CONFIG.WEB_SHEET_ID);
  const customers = getCustomersFromSheet(ss);
  const jsonString = JSON.stringify(customers, null, 2);
  const blob = Utilities.newBlob(jsonString, 'application/json', CONFIG.STATIC_CUSTOMER_FILE_NAME);
  const file = DriveApp.createFile(blob);
  const url = file.getDownloadUrl().replace('?download=true', '?alt=media');
  DriveApp.getFileById(file.getId()).setTrashed(true);
  return url;
}'''

new_content = re.sub(pattern, new_funcs, content, flags=re.DOTALL)

with open('apps-script.txt', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'Old len: {len(content)}, New len: {len(new_content)}')
print('Done!' if new_content != content else 'No change')