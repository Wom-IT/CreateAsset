import json
import requests
from dotenv import load_dotenv
# --- CAPSLOCK INVERT (Windows) ---
import ctypes
import os
from builder import get_models, SNIPE_IT_BASE_URL


def ensure_capslock_off():
    """
    Stellt sicher, dass Caps Lock AUS ist.
    Wenn Caps Lock AN ist -> ausschalten
    Wenn Caps Lock AUS ist -> nichts tun
    """
    VK_CAPITAL = 0x14

    is_on = (ctypes.windll.user32.GetKeyState(VK_CAPITAL) & 1) == 1

    if is_on:
        ctypes.windll.user32.keybd_event(VK_CAPITAL, 0, 0, 0)  # key down
        ctypes.windll.user32.keybd_event(VK_CAPITAL, 0, 2, 0)  # key up
        print("[CapsLock] war AN → jetzt AUS")
    else:
        print("[CapsLock] war bereits AUS")


SNIPE_IT_URL = f"{SNIPE_IT_BASE_URL}/hardware"
load_dotenv()
API_TOKEN = os.getenv("API_TOKEN")

asset_type = get_models()




#Status ID in snipe it is the status of the object.
STATUS_ID_READY = 1  


def parse_asset_code(code: str) -> dict:
    """
    10-stelliger Zahlencode:
      MM LL CC SSSS
      0-1  model_id (2)
      2-3  location_id (2)
      4-5  category_id (2)
      6-9  serial (4)
    """
    if not code.isdigit() or len(code) != 10:
        raise ValueError("Code muss exakt 10 Ziffern haben")

    location_id = int(code[0:2])

    serial = code[6:10]

  




    asset_json = {
        "model_id": 38,
        "asset_tag": code,
        "status_id": STATUS_ID_READY,
        "serial": serial,
        "location_id": location_id,    
        "name": f" {serial}",
    }





    return asset_json


def send_to_snipe_it(asset_json: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    resp = requests.post(SNIPE_IT_URL, headers=headers, json=asset_json, timeout=10)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Snipe-IT Fehler {resp.status_code}: {resp.text}")
    return resp.json()


if __name__ == "__main__":

    #ensures that capslock is on while scanning and turned off when done scanning.
    ensure_capslock_off()
    scan_codes = []
    while True:
        scan_code = input("Bitte Barcode scannen zum Abbrechen leer lassen:\n")
        if scan_code == "":
            break

        if len(scan_code) == 10:
            try:
                int(scan_code)
            except:
                print("Da ist etwas schiefgelaufen, bitte nochmal scannen!")
                continue

            scan_codes.append(scan_code)
            print(f"Erfolgreich gescannt, die Seriennummer ist: {scan_code[5:]}")
            break
        else:
            print("Barcode muss 10 Ziffern lange sein.")


    for code in scan_codes:
        payload = parse_asset_code(code)
        print("Payload:")
        print(json.dumps(payload, indent=2))

        response = send_to_snipe_it(payload)
        print("Response:")
        print(json.dumps(response, indent=2))



