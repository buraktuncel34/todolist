"""Current weather for the sidebar (Open-Meteo: free, no API key). Cached 20 minutes per city."""
import json
import logging
import time
import urllib.parse
import urllib.request

from .db import uget, uset

log = logging.getLogger("gunluk.weather")
DEFAULT_CITY = {"name": "İstanbul", "lat": 41.01, "lon": 28.98}
CACHE_SECONDS = 20 * 60
_cache = {}

# WMO weather codes → (Turkish text, icon)
WMO = {
    0: ("Açık", "☀️"), 1: ("Az bulutlu", "🌤️"), 2: ("Parçalı bulutlu", "⛅"), 3: ("Kapalı", "☁️"),
    45: ("Sisli", "🌫️"), 48: ("Kırağılı sis", "🌫️"),
    51: ("Hafif çisenti", "🌦️"), 53: ("Çisenti", "🌦️"), 55: ("Yoğun çisenti", "🌧️"),
    56: ("Donan çisenti", "🌧️"), 57: ("Donan çisenti", "🌧️"),
    61: ("Hafif yağmur", "🌦️"), 63: ("Yağmurlu", "🌧️"), 65: ("Kuvvetli yağmur", "🌧️"),
    66: ("Donan yağmur", "🌧️"), 67: ("Donan yağmur", "🌧️"),
    71: ("Hafif kar", "🌨️"), 73: ("Karlı", "🌨️"), 75: ("Yoğun kar", "❄️"), 77: ("Kar taneleri", "🌨️"),
    80: ("Hafif sağanak", "🌦️"), 81: ("Sağanak", "🌧️"), 82: ("Şiddetli sağanak", "⛈️"),
    85: ("Kar sağanağı", "🌨️"), 86: ("Yoğun kar sağanağı", "❄️"),
    95: ("Gök gürültülü", "⛈️"), 96: ("Dolu ile fırtına", "⛈️"), 99: ("Dolu ile fırtına", "⛈️"),
}


def _get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "gunluk/1.0"}), timeout=10) as r:
        return json.loads(r.read())


def city():
    try:
        return json.loads(uget("weather_city") or "") or DEFAULT_CITY
    except ValueError:
        return DEFAULT_CITY


def set_city(name):
    """Look the city up (Open-Meteo geocoding, Turkish names) and store it; returns the stored city or None."""
    q = urllib.parse.urlencode({"name": name, "count": 1, "language": "tr", "format": "json"})
    res = (_get(f"https://geocoding-api.open-meteo.com/v1/search?{q}").get("results") or [None])[0]
    if not res:
        return None
    c = {"name": res["name"], "lat": round(res["latitude"], 3), "lon": round(res["longitude"], 3),
         "region": res.get("admin1") or res.get("country") or ""}
    uset("weather_city", json.dumps(c, ensure_ascii=False))
    return c


def current():
    c = city()
    key = (c["lat"], c["lon"])
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    q = urllib.parse.urlencode({"latitude": c["lat"], "longitude": c["lon"], "timezone": "auto", "forecast_days": 1,
                                "current": "temperature_2m,weather_code,is_day",
                                "daily": "temperature_2m_max,temperature_2m_min"})
    try:
        d = _get(f"https://api.open-meteo.com/v1/forecast?{q}")
    except Exception as e:  # noqa: BLE001 - keep the last value if the service is down
        log.warning("weather fetch failed: %s", e)
        return hit[1] if hit else None
    code = int(d["current"]["weather_code"])
    text, icon = WMO.get(code, ("", "🌡️"))
    if not d["current"].get("is_day", 1) and code in (0, 1):
        icon = "🌙"
    out = {"city": c["name"], "temp": round(d["current"]["temperature_2m"]), "code": code, "text": text, "icon": icon,
           "max": round(d["daily"]["temperature_2m_max"][0]), "min": round(d["daily"]["temperature_2m_min"][0])}
    _cache[key] = (time.time(), out)
    return out
