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

### Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**, pick the repo.
3. Build settings:
   - **Framework preset:** Next.js (Static HTML Export)
   - **Root directory:** `web`
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
4. Deploy. Every push to `main` redeploys automatically.

The Node version for the build is pinned in `web/.node-version`.
