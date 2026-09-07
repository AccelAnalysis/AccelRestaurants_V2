from pathlib import Path

path = Path('src/pages/PlayerScreen.tsx')
text = path.read_text()
old = "import { Clock } from 'lucide-react';\nimport { QRCodeSVG } from 'qrcode.react';\n"
new = "import { QrCode, Clock } from 'lucide-react';\nimport { QRCodeSVG } from 'qrcode.react';\n"
if text.count(old) != 1:
    raise SystemExit(f'Expected one generated PlayerScreen icon import, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('PR completion build follow-up applied.')
