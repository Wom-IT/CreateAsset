# Asset Scan for Snipe-IT

This static web app is based on the original Python scanner logic: it expects a 10-digit numeric asset code, derives the serial and location from it, and creates a Snipe-IT hardware record using the browser.

The original Python code indicated this flow:

- 10-digit code format: `MM LL CC SSSS`
- `location_id` from the first 2 digits
- `serial` from the last 4 digits
- `status_id` defaults to `1` (Ready)
- `model_id` defaults to `38`
- asset payload is sent to the Snipe-IT `hardware` endpoint

## Files

- `index.html` – app form and settings UI
- `style.css` – minimal responsive styling
- `script.js` – code parsing, local logging, Snipe-IT creation, and camera support

## Run locally

From this folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Snipe-IT setup

1. Enter your Snipe-IT base URL, e.g. `https://snipeit.example.com`.
2. Paste your API token.
3. Load or choose the model and location values.
4. Scan or type a 10-digit code.
5. Click `Send to Snipe-IT` or let auto-sync handle it.

The app sends a payload like:

```json
{
  "model_id": 38,
  "asset_tag": "3112301001",
  "status_id": 1,
  "serial": "1001",
  "location_id": 31,
  "name": " 1001"
}
```

This mirrors the Python logic from the original project. If the Snipe-IT instance blocks browser CORS requests, a tiny proxy/back-end layer is still required.

## Features

- 10-digit asset-code scanner
- Local, offline-safe scan log
- Snipe-IT asset creation from the browser
- Optional camera barcode input
- CSV export for the current scan log
