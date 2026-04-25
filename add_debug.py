with open('apps-script.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Thêm debug sau lấy serial
old_code = '''    const serial = (obj['ID'] || obj['S/N'] || '').toString().trim();

    const folderId = extractFolderId(obj['Folder Album Image Google Drive']);'''

new_code = '''    const serial = (obj['ID'] || obj['S/N'] || '').toString().trim();
    
    // Debug: log serials that have no bot images
    if (serial && !telegramMap[serial]) {
      Logger.log('⚠️ No bot images for serial: ' + serial + ' | Brand: ' + (obj['Brand']||'') + ' | Model: ' + (obj['Model']||''));
    }

    const folderId = extractFolderId(obj['Folder Album Image Google Drive']);'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('apps-script.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print('✅ Added debug logging for serial matching')
else:
    print('Pattern not found - checking...')
    # Tìm vị trí serial line
    idx = content.find("const serial = (obj['ID']")
    if idx != -1:
        print('Found at:', idx)
        print('Context:', content[idx:idx+200])
    else:
        print('Serial line not found')
