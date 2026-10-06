const STORAGE_KEY = 'asset-scan-v1';
const SETTINGS_KEY = 'asset-scan-settings-v1';
const MAX_LOG_ITEMS = 200;
const DEFAULT_SNIPE_BASE_URL = 'http://womit-snipeit.westeurope.azurecontainer.io/';
const DEFAULT_SNIPE_API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMzU0YTE1ZWQ5MDQwZGEwZThhZWQ4ZGY1NzZkZmE5Y2E4MWU2MzhlM2NjNWIzNWQxOTk4YTczMTVlZGNhYzQzYWI3YWU2ZmFkM2E4OWU4ODIiLCJpYXQiOjE3OTEyODU0OTQuNjU3MTI0LCJuYmYiOjE3OTEyODU0OTQuNjU3MTI2LCJleHAiOjI0MjI0Mzc0OTQuNjI0NTkxLCJzdWIiOiIyMDEwIiwic2NvcGVzIjpbXX0.3CLeOMsI-5EUrUDupWNPDmdM-YTDUJOg8yWLy0KFMIJr8b0kkvMsoDIhyvzNFTrv8lIRl5F-I3ZKGJS2xAg9RJ4G7LtETIQrTsDsWv7GU7cTzDjqIi-5AE6iBKiBI9FapZrXRMNXWaPvcNspDeYaGyK8AXJDizImYE3SxcjlutUCQ2-S62QYG8ZiEV3IV06j6mnA1KvsoIMGWWdt626P-Do3sTeO5sXykIHrkIcOoqxwUl9XmiYiCF9FWPUDkHfK4Wd93O7bxppMJhkSFBXBUngibIi3VfRaOL8qbfwteIn70y8ItsRXGhZgJvP4nw0KjffJWLKFqxu0XqOtZ119v-jl-AAw8k0wEuHv5hPh2XTa49TZDIQahyWFsomcujFjDXYPil8C1AyOoWTcaRtZ6pH8tnvJg8-8bVPDtpL1XAgxStUSGcjcALyTComVRUwbGM78AL84tjWccvulDqK0P0oQUGEHKMIHMtRA63c5rYdIAwzXSqMchx0gBVez_l3a0kc2hbBI7sPw5bbKdxM2nsa4vmMtrM5oS-LaOffRaWIKacrxJ-mh8jp8KVed_SRE0-ir_kxKpqDpeQJCWVFI9naZelBFw_tY49Ti_4q1jhAh39CDY_oquVoe1bM2p_Vj4noOn2cuCmA1JNQLy_Fz4cxnKCsDtq8vuQw3geyf-zU';

const toast = document.getElementById('toast');
const snipeBaseUrl = document.getElementById('snipeBaseUrl');
const snipeApiToken = document.getElementById('snipeApiToken');
const snipeUser = document.getElementById('snipeUser');
const snipeLocation = document.getElementById('snipeLocation');
const snipeStatus = document.getElementById('snipeStatus');
const scanInput = document.getElementById('scanInput');
const modelSelect = document.getElementById('modelSelect');
const locationSelect = document.getElementById('locationSelect');
const statusSelect = document.getElementById('statusSelect');
const noteInput = document.getElementById('noteInput');
const addButton = document.getElementById('addButton');
const sendSnipeButton = document.getElementById('sendSnipeButton');
const clearButton = document.getElementById('clearButton');
const exportButton = document.getElementById('exportButton');
const autoSyncToggle = document.getElementById('autoSyncToggle');
const totalEntries = document.getElementById('totalEntries');
const totalUnits = document.getElementById('totalUnits');
const uniqueCodes = document.getElementById('uniqueCodes');
const lastScan = document.getElementById('lastScan');
const entryCountText = document.getElementById('entryCountText');
const scanList = document.getElementById('scanList');
const cameraButton = document.getElementById('cameraButton');
const cameraPreview = document.getElementById('cameraPreview');
const cameraStatus = document.getElementById('cameraStatus');

let scanLog = loadLog();
let cameraStream = null;
let scanningActive = false;
let lastDecodedValue = '';
let lastDecodeAt = 0;

initialize();

function initialize() {
  hydrateSettings();

  addButton.addEventListener('click', handleAddSubmit);
  sendSnipeButton.addEventListener('click', sendCurrentValueToSnipe);
  clearButton.addEventListener('click', clearLog);
  exportButton.addEventListener('click', exportCsv);

  scanInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (autoSyncToggle.checked) {
        sendCurrentValueToSnipe();
      } else {
        handleAddSubmit();
      }
    }
  });

  autoSyncToggle.addEventListener('change', saveSettings);
  modelSelect.addEventListener('change', saveSettings);
  locationSelect.addEventListener('change', saveSettings);
  statusSelect.addEventListener('change', saveSettings);
  cameraButton.addEventListener('click', toggleCameraScanner);

  renderLog();
  refreshSnipeOptions();
  scanInput.focus();
}

function loadLog() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Failed to read local scan log', error);
    return [];
  }
}

function saveLog() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scanLog));
  } catch (error) {
    console.warn('Failed to save scan log', error);
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Failed to read settings', error);
    return {};
  }
}

function saveSettings() {
  const settings = {
    autoSync: autoSyncToggle.checked,
    modelId: modelSelect.value,
    locationId: locationSelect.value,
    statusId: statusSelect.value,
    baseUrl: snipeBaseUrl.value.trim(),
    apiToken: snipeApiToken.value.trim(),
    user: snipeUser.value.trim(),
    locationOverride: snipeLocation.value.trim(),
  };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings', error);
  }
}

function hydrateSettings() {
  const settings = loadSettings();
  autoSyncToggle.checked = settings.autoSync !== false;
  snipeBaseUrl.value = settings.baseUrl || DEFAULT_SNIPE_BASE_URL;
  snipeApiToken.value = settings.apiToken || DEFAULT_SNIPE_API_TOKEN;
  snipeUser.value = settings.user || '';
  snipeLocation.value = settings.locationOverride || '';
  statusSelect.value = settings.statusId || '1';
  snipeBaseUrl.readOnly = true;
  snipeApiToken.readOnly = true;

  modelSelect.innerHTML = '<option value="38">Default model (38)</option>';
  locationSelect.innerHTML = '<option value="1">Default location (1)</option>';
  modelSelect.value = settings.modelId || '38';
  locationSelect.value = settings.locationId || '1';
}

function setSnipeStatus(message, isError = false) {
  if (snipeStatus) {
    snipeStatus.textContent = message;
    snipeStatus.style.color = isError ? '#cc3d57' : '#5d6b78';
  }
  showToast(message, isError);
}

function showToast(message, isError = false) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('show', 'success', 'error');
  toast.classList.add(isError ? 'error' : 'success', 'show');

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

async function refreshSnipeOptions() {
  const baseUrl = snipeBaseUrl.value.trim();
  const token = snipeApiToken.value.trim();

  if (!baseUrl || !token) {
    modelSelect.innerHTML = '<option value="38">Default model (38)</option>';
    locationSelect.innerHTML = '<option value="1">Default location (1)</option>';
    return;
  }

  try {
    const [models, locations] = await Promise.all([
      fetchSnipeCollection(`${baseUrl.replace(/\/$/, '')}/api/v1/models`, token),
      fetchSnipeCollection(`${baseUrl.replace(/\/$/, '')}/api/v1/locations`, token),
    ]);

    const settings = loadSettings();
    const defaultModel = settings.modelId || '38';
    const defaultLocation = settings.locationId || '1';

    modelSelect.innerHTML = models.length
      ? models.map((item) => `<option value="${item.id}">${escapeHtml(item.name || `Model ${item.id}`)}</option>`).join('')
      : '<option value="38">Default model (38)</option>';

    locationSelect.innerHTML = locations.length
      ? locations.map((item) => `<option value="${item.id}">${escapeHtml(item.name || `Location ${item.id}`)}</option>`).join('')
      : '<option value="1">Default location (1)</option>';

    modelSelect.value = modelSelect.querySelector(`option[value="${defaultModel}"]`) ? defaultModel : '38';
    locationSelect.value = locationSelect.querySelector(`option[value="${defaultLocation}"]`) ? defaultLocation : '1';
    saveSettings();
  } catch (error) {
    console.warn('Failed to fetch Snipe-IT metadata', error);
    setSnipeStatus('Unable to load Snipe-IT models and locations. Default values remain in use.', true);
  }
}

async function fetchSnipeCollection(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Invalid JSON from Snipe-IT: ${text.slice(0, 120)}`);
  }

  if (!response.ok) {
    const message = data?.messages || data?.error || data?.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  const rows = Array.isArray(data) ? data : data.rows || data.data || [];
  return Array.isArray(rows) ? rows : [];
}

function parseAssetCode(code) {
  const trimmed = code.trim();
  if (!/^\d{10}$/.test(trimmed)) {
    throw new Error('The asset code must be exactly 10 digits.');
  }

  const locationId = Number(trimmed.slice(0, 2));
  const serial = trimmed.slice(6, 10);
  const modelId = Number(modelSelect.value || 38);
  const statusId = Number(statusSelect.value || 1);
  const chosenLocationId = Number(locationSelect.value || locationId || 1);

  return {
    model_id: modelId,
    asset_tag: trimmed,
    status_id: statusId,
    serial,
    location_id: chosenLocationId,
    name: ` ${serial}`,
  };
}

function handleAddSubmit() {
  const value = scanInput.value.trim();
  const note = noteInput.value.trim();

  if (!value) {
    scanInput.focus();
    return;
  }

  try {
    const parsedAsset = parseAssetCode(value);
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      code: parsedAsset.asset_tag,
      modelId: parsedAsset.model_id,
      locationId: parsedAsset.location_id,
      serial: parsedAsset.serial,
      note: note || '',
      time: new Date().toISOString(),
    };

    scanLog.unshift(entry);
    scanLog = scanLog.slice(0, MAX_LOG_ITEMS);
    saveLog();
    renderLog();

    if (autoSyncToggle.checked) {
      sendAssetToSnipe(parsedAsset, note).catch((error) => {
        setSnipeStatus(error.message || 'Failed to create asset in Snipe-IT.', true);
      });
    }

    scanInput.value = '';
    noteInput.value = '';
    scanInput.focus();
  } catch (error) {
    setSnipeStatus(error.message || 'Invalid asset code.', true);
    scanInput.focus();
  }
}

async function sendCurrentValueToSnipe() {
  const value = scanInput.value.trim();
  if (!value) {
    setSnipeStatus('Enter a 10-digit asset code before sending.', true);
    scanInput.focus();
    return;
  }

  try {
    const payload = parseAssetCode(value);
    await sendAssetToSnipe(payload, noteInput.value.trim());
  } catch (error) {
    setSnipeStatus(error.message || 'Snipe-IT sync failed.', true);
  }
}

async function sendAssetToSnipe(payload, note) {
  const baseUrl = snipeBaseUrl.value.trim() || DEFAULT_SNIPE_BASE_URL;
  const token = snipeApiToken.value.trim() || DEFAULT_SNIPE_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('The Snipe-IT base URL and API token are not configured.');
  }

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const response = await fetch(`${normalizedBase}/api/v1/hardware`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      notes: note || '',
      name: ` ${payload.serial}`,
    }),
  });

  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch (error) {
    result = { raw: text };
  }

  if (!response.ok) {
    const message = result?.messages || result?.error || result?.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  const label = payload.asset_tag || payload.serial || 'asset';
  setSnipeStatus(`Created Snipe-IT asset ${label}.`, false);
  return result;
}

function renderLog() {
  totalEntries.textContent = String(scanLog.length);
  totalUnits.textContent = String(scanLog.length);
  uniqueCodes.textContent = String(new Set(scanLog.map((entry) => entry.code)).size);

  const lastEntry = scanLog[0];
  lastScan.textContent = lastEntry ? formatShortTime(lastEntry.time) : '—';
  entryCountText.textContent = `${scanLog.length} ${scanLog.length === 1 ? 'entry' : 'entries'}`;

  if (!scanLog.length) {
    scanList.innerHTML = '<li class="empty-state">No scans yet. Enter a 10-digit asset code to start.</li>';
    return;
  }

  scanList.innerHTML = scanLog
    .map((entry, index) => {
      const note = entry.note ? `<span class="scan-note">${escapeHtml(entry.note)}</span>` : '';
      return `
        <li class="scan-item" aria-label="Scan item ${escapeHtml(entry.code)}">
          <div class="scan-badge">${index + 1}</div>
          <div class="scan-main">
            <strong>${escapeHtml(entry.code)}</strong>
            ${note}
            <span>${formatDisplayTime(entry.time)}</span>
          </div>
          <div class="scan-qty">x1</div>
          <div class="scan-time">${formatShortTime(entry.time)}</div>
        </li>
      `;
    })
    .join('');
}

function clearLog() {
  scanLog = [];
  saveLog();
  renderLog();
}

function exportCsv() {
  if (!scanLog.length) {
    return;
  }

  const headers = ['code', 'model_id', 'location_id', 'serial', 'status_id', 'note', 'time'];
  const rows = scanLog.map((entry) => [
    escapeCsv(entry.code),
    escapeCsv(entry.modelId || '38'),
    escapeCsv(entry.locationId || '1'),
    escapeCsv(entry.serial || ''),
    escapeCsv('1'),
    escapeCsv(entry.note),
    escapeCsv(entry.time),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `asset-scan-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeCsv(value) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function formatDisplayTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatShortTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function toggleCameraScanner() {
  if (scanningActive) {
    stopCamera();
    return;
  }

  const supportsCameraScanning =
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    'BarcodeDetector' in window;

  if (!supportsCameraScanning) {
    cameraStatus.textContent =
      'Camera scanning requires HTTPS or localhost and a modern Chrome/Edge browser with BarcodeDetector support.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });

    cameraStream = stream;
    cameraPreview.srcObject = stream;
    cameraPreview.hidden = false;
    cameraButton.textContent = 'Stop camera';
    cameraStatus.textContent = 'Camera active. Aim at the barcode.';
    scanningActive = true;

    const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'upc_a', 'code_39'] });

    const scanLoop = async () => {
      if (!scanningActive) return;
      try {
        const barcodes = await detector.detect(cameraPreview);
        if (barcodes.length > 0) {
          const rawValue = String(barcodes[0].rawValue || '').trim();
          const now = Date.now();
          if (rawValue && rawValue !== lastDecodedValue && now - lastDecodeAt > 1200) {
            lastDecodedValue = rawValue;
            lastDecodeAt = now;
            scanInput.value = rawValue;
            noteInput.value = 'Camera scan';
            if (autoSyncToggle.checked) {
              sendCurrentValueToSnipe();
            } else {
              handleAddSubmit();
            }
            cameraStatus.textContent = `Captured: ${rawValue}`;
          }
        }
      } catch (error) {
        console.warn('Camera scan failed:', error);
      }
      requestAnimationFrame(scanLoop);
    };

    scanLoop();
  } catch (error) {
    console.warn('Camera access failed:', error);
    cameraStatus.textContent = 'Camera access was blocked or unavailable.';
  }
}

function stopCamera() {
  scanningActive = false;
  lastDecodedValue = '';

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  cameraPreview.srcObject = null;
  cameraPreview.hidden = true;
  cameraButton.textContent = 'Use camera scanner';
  cameraStatus.textContent = 'Camera scan stopped.';
}
