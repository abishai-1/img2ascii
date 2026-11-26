# ascii

Turn images into ASCII art: a command-line tool and an animated website.

```
ascii/
├── cli/    Python command-line converter (Pillow)
└── web/    Next.js + TypeScript + Tailwind website (static, for Cloudflare Pages)
```

## cli

```
pip install pillow
python cli/img2ascii.py photo.jpg -w 120 --color
python cli/img2ascii.py photo.jpg --mode halfblock
python cli/img2ascii.py photo.jpg -c detailed -o art.txt
```

Run `python cli/img2ascii.py -h` for all options.

## web

```
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # static site -> web/out/
```

Everything runs in the browser: images are never uploaded.
cally.
The Nde version for the build is pinned in `web/.node-version`.
