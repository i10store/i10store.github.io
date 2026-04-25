import re

with open('apps-script.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Thay doi cache TTL tu 21600 (6h) xuong 300 (5 phut)
content = content.replace('CACHE_TTL_PRODUCTS: 21600,   // 6 hours', 
                          'CACHE_TTL_PRODUCTS: 300,   // 5 phut')
content = content.replace('CACHE_TTL_BANNER: 21600,     // 6 hours', 
                          'CACHE_TTL_BANNER: 300,     // 5 phut')
content = content.replace('CACHE_TTL_CUSTOMER: 21600,   // 6 hours', 
                          'CACHE_TTL_CUSTOMER: 300,   // 5 phut')

with open('apps-script.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print('OK - Da cap nhat cache TTL: 21600s (6h) -> 300s (5 phut)')

# Kiem tra lai
match = re.findall(r'CACHE_TTL_(\w+): (\d+)', content)
for name, val in match:
    print('  %s: %ss' % (name, val))
