from pathlib import Path
import base64, hashlib, lzma, os, subprocess
branch = 'feat/cinematic-productization'
assert os.environ.get('GITHUB_REF') == 'refs/heads/' + branch, 'Wrong branch'
parts = sorted(Path('.github').glob('cinematic-part-*.txt'))
assert len(parts) == 6, 'Incomplete transport'
patch = lzma.decompress(base64.b64decode(''.join(p.read_text().strip() for p in parts)))
assert hashlib.sha256(patch).hexdigest() == 'ff735dbbda5e27b2eb9763b999a6d75634689b9a2a9bf8f4943988d4fa0be28e', 'Patch checksum mismatch'
subprocess.run(['git','apply','--check','-'], input=patch, check=True)
subprocess.run(['git','apply','-'], input=patch, check=True)
for p in parts: p.unlink()
Path(__file__).unlink()
