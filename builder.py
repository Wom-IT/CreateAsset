import requests
from dotenv import load_dotenv
import os
import logging
from html import unescape

load_dotenv()
API_TOKEN = os.getenv("API_TOKEN")
SNIPE_IT_BASE_URL = "http://womit-snipeit.westeurope.azurecontainer.io/api/v1"

# Configure logging
logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def _get_api_headers():
    """Construct authentication headers for Snipe-IT API requests.

    Returns:
        dict: Dictionary containing Authorization, Accept, and Content-Type headers.
    """
    return {
        "Authorization": f"Bearer {API_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _unescape_names(data: list) -> list:
    """Unescape HTML entities in item names.

    Converts HTML entities like &apos;, &quot;, &amp; to their actual characters.

    Args:
        data: List of dictionaries with 'name' fields containing HTML entities.

    Returns:
        list: The same list with unescaped names.
    """
    for item in data:
        if 'name' in item and isinstance(item['name'], str):
            item['name'] = unescape(item['name'])
    return data


def _fetch_paginated_data(endpoint: str) -> list:
    """Fetch all paginated data from a Snipe-IT API endpoint.

    Automatically handles pagination by fetching 500 items per page until all data is retrieved.

    Args:
        endpoint: API endpoint name (e.g., 'locations', 'categories', 'models').

    Returns:
        list: All items from the endpoint with unescaped names.

    Raises:
        RuntimeError: If API request fails or returns an error status code.
    """
    logger.info(f"Starting to fetch {endpoint}...")
    headers = _get_api_headers()
    all_data = []
    page = 1

    while True:
        url = f"{SNIPE_IT_BASE_URL}/{endpoint}?limit=500&offset={page}"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Snipe-IT API Error {resp.status_code}: {resp.text}")

            data = resp.json()

            # Snipe-IT returns data in 'rows' key
            rows = data.get('rows', [])
            if not rows:
                break

            all_data.extend(rows)
            logger.debug(f"Fetched page {page} with {len(rows)} items")

            # Check if there's more data
            if len(rows) < 500:
                break

            page += 1
        except requests.RequestException as e:
            raise RuntimeError(f"Failed to fetch from {endpoint}: {str(e)}")

    # Unescape HTML entities in names
    all_data = _unescape_names(all_data)
    logger.info(f"Successfully fetched {len(all_data)} items from {endpoint}")
    return all_data


def get_locations() -> dict:
    """Retrieve all asset locations from Snipe-IT.

    Returns:
        dict: Mapping of location IDs to location names {id: name, ...}.

    Raises:
        RuntimeError: If API request fails.
    """
    logger.info("Fetching locations from Snipe-IT API")
    locations_data = _fetch_paginated_data("locations")
    locations_dict = {item['id']: item['name'] for item in locations_data}
    logger.info(f"Locations loaded: {len(locations_dict)} entries")
    return locations_dict



def get_over_locations() -> dict:
    """Retrieve all asset locations from Snipe-IT.

    Returns:
        dict: Mapping of location IDs to location names {id: name, ...}.

    Raises:
        RuntimeError: If API request fails.
    """
    logger.info("Fetching locations from Snipe-IT API")
    locations_data = _fetch_paginated_data("locations")

    locations_dict = {item['id']: item['name'] for item in locations_data if item['parent'] == None}
    logger.info(f"Locations loaded: {len(locations_dict)} entries")
    return locations_dict



def get_categories() -> dict:
    """Retrieve all asset categories from Snipe-IT.

    Returns:
        dict: Mapping of category IDs to category names {id: name, ...}.

    Raises:
        RuntimeError: If API request fails.
    """
    logger.info("Fetching categories from Snipe-IT API")
    categories_data = _fetch_paginated_data("categories")
    categories_dict = {item['id']: item['name'] for item in categories_data}
    logger.info(f"Categories loaded: {len(categories_dict)} entries")
    return categories_dict


def get_models() -> dict:
    """Retrieve all asset models from Snipe-IT.

    Returns:
        dict: Mapping of model IDs to model names {id: name, ...}.

    Raises:
        RuntimeError: If API request fails.
    """
    logger.info("Fetching models from Snipe-IT API")
    models_data = _fetch_paginated_data("models")
    models_dict = {item['id']: item['name'] for item in models_data}
    logger.info(f"Models loaded: {len(models_dict)} entries")
    return models_dict


def get_all_data() -> dict:
    """Fetch all Snipe-IT data in a single call.

    Convenience function that retrieves locations, categories, and models together.

    Returns:
        dict: Dictionary with keys 'locations', 'categories', 'models', each containing
              a mapping of IDs to names {id: name, ...}.

    Raises:
        RuntimeError: If any API request fails.
    """
    return {
        'locations': get_locations(),
        'categories': get_categories(),
        'models': get_models(),
    }


if __name__ == "__main__":
    # Test the functions
    print("Fetching Snipe-IT data...")

    try:
        print("\n=== LOCATIONS ===")
        locations = get_locations()
        print(get_over_locations())
        print(f"Found {len(locations)} locations")
        for loc_id, loc_name in sorted(locations.items())[:5]:
            print(f"  {loc_id}: {loc_name}")
        if len(locations) > 5:
            print(f"  ... and {len(locations) - 5} more")

        print("\n=== CATEGORIES ===")
        categories = get_categories()
        print(f"Found {len(categories)} categories")
        for cat_id, cat_name in sorted(categories.items())[:5]:
            print(f"  {cat_id}: {cat_name}")
        if len(categories) > 5:
            print(f"  ... and {len(categories) - 5} more")

        print("\n=== MODELS ===")
        models = get_models()
        print(f"Found {len(models)} models")
        for model_id, model_name in sorted(models.items())[:5]:
            print(f"  {model_id}: {model_name}")
        if len(models) > 5:
            print(f"  ... and {len(models) - 5} more")

    except Exception as e:
        print(f"Invalid: {e}")
