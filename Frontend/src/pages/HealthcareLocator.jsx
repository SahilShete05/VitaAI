import { useState } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Phone,
  ExternalLink,
  LoaderCircle,
  Hospital,
  AlertCircle,
} from "lucide-react";

const categories = [
  { label: "All facilities", value: "all" },
  { label: "Hospitals", value: "hospital" },
  { label: "Clinics", value: "clinic" },
  { label: "Pharmacies", value: "pharmacy" },
  { label: "Specialists", value: "specialist" },
  { label: "Laboratories", value: "laboratory" },
  { label: "Emergency care", value: "emergency" },
];

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

function getToken() {
  // Supports common token storage names if your auth flow uses localStorage.
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token")
  );
}

function getCoordinates(place) {
  const lat = Number(place.latitude ?? place.lat);
  const lng = Number(
    place.longitude ?? place.lng ?? place.lon
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function formatDistance(distance) {
  if (!Number.isFinite(Number(distance))) return null;

  const value = Number(distance);

  // The service may return metres or kilometres depending on its implementation.
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} km`
    : `${Math.round(value)} m`;
}

export default function HealthcareLocator() {
  const [category, setCategory] = useState("all");
  const [radius, setRadius] = useState("5000");
  const [location, setLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);

  function requestLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location access.");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoadingLocation(false);
      },
      (geoError) => {
        setLoadingLocation(false);

        if (geoError.code === 1) {
          setError(
            "Location permission was denied. Allow location access in your browser and try again."
          );
        } else if (geoError.code === 2) {
          setError("Your location could not be determined. Please try again.");
        } else {
          setError(
            "Location request timed out. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }

  async function searchNearby(event) {
    event.preventDefault();
    setError("");
    setFacilities([]);
    setSelectedFacility(null);
    setSearched(false);

    if (!location) {
      setError("Please select your current location before searching.");
      return;
    }

    setSearching(true);

    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        category,
        radius,
      });

      const token = getToken();
      const headers = { Accept: "application/json" };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE}/healthcare-locator/nearby?${params.toString()}`,
        {
          method: "GET",
          headers,
          credentials: "include",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Your session may have expired. Please sign in again."
          );
        }

        throw new Error(
          result.message || "Unable to load nearby healthcare facilities."
        );
      }

      const items = Array.isArray(result.data) ? result.data : [];

      setFacilities(items);
      setSearched(true);

      if (items.length > 0) {
        setSelectedFacility(items[0]);
      }
    } catch (err) {
      console.error("Healthcare locator search failed:", err);
      setError(
        err.message ||
          "Healthcare search failed. Please check your backend connection."
      );
    } finally {
      setSearching(false);
    }
  }

  const mapCenter = selectedFacility
    ? getCoordinates(selectedFacility)
    : location
      ? {
          lat: location.latitude,
          lng: location.longitude,
        }
      : null;

  const mapUrl = mapCenter
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.025}%2C${mapCenter.lat - 0.015}%2C${mapCenter.lng + 0.025}%2C${mapCenter.lat + 0.015}&layer=mapnik&marker=${mapCenter.lat}%2C${mapCenter.lng}`
    : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-[#0d0c19] dark:text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold text-purple-600">
            VITAAI HEALTH SERVICES
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Healthcare Locator
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Discover nearby hospitals, clinics, pharmacies, specialists and
            laboratories.
          </p>
        </header>

        <form
          onSubmit={searchNearby}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
        >
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Find nearby care</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Set your location and search preferences.
              </p>
              {location && (
                <p className="mt-2 text-xs text-emerald-600">
                  <MapPin className="mr-1 inline" size={14} />
                  Location ready
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={requestLocation}
              disabled={loadingLocation}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60 dark:border-purple-400/30 dark:text-purple-300 dark:hover:bg-purple-400/10"
            >
              {loadingLocation ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <Navigation size={18} />
              )}
              {loadingLocation ? "Getting location..." : "Use my current location"}
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="facility-category"
                className="mb-2 block text-sm font-medium"
              >
                Facility type
              </label>
              <select
                id="facility-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500 dark:border-white/10 dark:bg-[#171526]"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="search-radius"
                className="mb-2 block text-sm font-medium"
              >
                Search radius
              </label>
              <select
                id="search-radius"
                value={radius}
                onChange={(event) => setRadius(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500 dark:border-white/10 dark:bg-[#171526]"
              >
                <option value="1000">1 km</option>
                <option value="3000">3 km</option>
                <option value="5000">5 km</option>
                <option value="10000">10 km</option>
                <option value="20000">20 km</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={searching || !location}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {searching ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <Search size={18} />
            )}
            {searching ? "Searching nearby..." : "Search nearby"}
          </button>

          {!location && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              First click “Use my current location” to enable the search.
            </p>
          )}
        </form>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <div>
              <p className="font-semibold">Healthcare search problem</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:min-h-[480px]">
            {mapUrl ? (
              <iframe
                title="Healthcare locator map"
                src={mapUrl}
                className="h-[400px] w-full border-0 sm:h-[480px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center p-8 text-center sm:min-h-[480px]">
                <div className="max-w-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                    <MapPin size={30} />
                  </div>
                  <h2 className="text-xl font-semibold">Your healthcare map</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Allow location access to display a map of your area.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Nearby facilities</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {searching
                  ? "Looking for nearby healthcare facilities..."
                  : searched
                    ? `${facilities.length} result${facilities.length === 1 ? "" : "s"} found`
                    : "Choose your location and search to see results."}
              </p>
            </div>

            {searching ? (
              <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
                <LoaderCircle className="animate-spin" size={20} />
                Searching nearby facilities...
              </div>
            ) : searched && facilities.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-5 text-center dark:bg-white/[0.04]">
                <Hospital className="mx-auto mb-3 text-slate-400" size={28} />
                <p className="font-medium">No facilities found</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Try another category or increase your search radius.
                </p>
              </div>
            ) : facilities.length > 0 ? (
              <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
                {facilities.map((facility, index) => {
                  const name =
                    facility.name || facility.facilityName || "Healthcare facility";
                  const coordinates = getCoordinates(facility);
                  const distance = formatDistance(
                    facility.distance ?? facility.distanceMeters
                  );

                  const directionsUrl = coordinates
                    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

                  return (
                    <article
                      key={
                        facility.id ||
                        facility.osmId ||
                        `${name}-${index}`
                      }
                      className={`rounded-xl border p-4 transition ${
                        selectedFacility === facility
                          ? "border-purple-400 bg-purple-50/60 dark:bg-purple-400/10"
                          : "border-slate-200 dark:border-white/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFacility(facility)}
                        className="w-full text-left"
                      >
                        <h3 className="font-semibold">{name}</h3>
                        <p className="mt-1 text-xs capitalize text-purple-600 dark:text-purple-300">
                          {(facility.category || facility.type || "healthcare")
                            .toString()
                            .replaceAll("_", " ")}
                        </p>
                      </button>

                      {(facility.address || facility.location) && (
                        <p className="mt-3 text-sm leading-5 text-slate-500 dark:text-slate-400">
                          <MapPin className="mr-1 inline" size={14} />
                          {facility.address || facility.location}
                        </p>
                      )}

                      {distance && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Distance: {distance}
                        </p>
                      )}

                      {facility.phone && (
                        <a
                          href={`tel:${facility.phone}`}
                          className="mt-3 inline-flex items-center gap-2 text-sm text-purple-700 hover:underline dark:text-purple-300"
                        >
                          <Phone size={15} />
                          {facility.phone}
                        </a>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                        >
                          <Navigation size={14} />
                          Directions
                          <ExternalLink size={12} />
                        </a>

                        {facility.website && (
                          <a
                            href={facility.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                          >
                            Website
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-5 text-center dark:bg-white/[0.04]">
                <Search className="mx-auto mb-3 text-slate-400" size={28} />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your search results will appear here.
                </p>
              </div>
            )}
          </aside>
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Facility information may be incomplete or out of date. Confirm details
          directly with the provider. VitaAI is not an emergency dispatch service.
          If someone is in immediate danger, contact local emergency services.
        </p>
      </div>
    </main>
  );
}