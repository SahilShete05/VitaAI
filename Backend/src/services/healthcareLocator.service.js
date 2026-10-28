
const axios = require("axios");

const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";
const REQUEST_TIMEOUT = 10000;
const MAX_RESULTS = 100;

const CATEGORY_MAP = {
  all: ["healthcare"],
  hospital: ["healthcare.hospital"],
  clinic: ["healthcare.clinic_or_praxis"],
  pharmacy: ["healthcare.pharmacy"],
  specialist: ["healthcare.clinic_or_praxis"],
  laboratory: ["healthcare"],
  emergency: ["healthcare"],
};

/**
 * Calculate the distance between two coordinates.
 * Returns distance in meters.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const boundedA = Math.min(1, Math.max(0, a));

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(
      Math.sqrt(boundedA),
      Math.sqrt(1 - boundedA)
    )
  );
}

/**
 * Get raw source tags when the provider includes them.
 */
function getRawProperties(properties = {}) {
  return properties.datasource?.raw || {};
}

/**
 * Classify a Geoapify healthcare result.
 */
function getCategory(properties = {}) {
  const raw = getRawProperties(properties);
  const categories = properties.categories || [];

  const categoryText = categories.join(" ").toLowerCase();
  const name = (properties.name || "").toLowerCase();

  if (
    raw.emergency === "ambulance_station" ||
    raw.emergency === "yes" ||
    raw.healthcare === "emergency" ||
    categoryText.includes("emergency")
  ) {
    return "emergency";
  }

  if (
    raw.healthcare === "laboratory" ||
    raw.healthcare === "sample_collection" ||
    raw.amenity === "laboratory" ||
    /laboratory|laboratories|diagnostic lab|pathology lab/.test(name)
  ) {
    return "laboratory";
  }

  if (
    categories.some((item) => item.startsWith("healthcare.hospital")) ||
    raw.amenity === "hospital" ||
    raw.healthcare === "hospital"
  ) {
    return "hospital";
  }

  if (
    categories.some((item) => item.startsWith("healthcare.pharmacy")) ||
    raw.amenity === "pharmacy" ||
    raw.healthcare === "pharmacy"
  ) {
    return "pharmacy";
  }

  if (
    categories.some((item) =>
      item.startsWith("healthcare.clinic_or_praxis.")
    ) ||
    raw.amenity === "doctors" ||
    raw.amenity === "clinic" ||
    raw.healthcare === "clinic" ||
    raw.healthcare === "doctor"
  ) {
    if (
      raw["healthcare:speciality"] ||
      raw.healthcare === "specialist" ||
      categories.some((item) =>
        item.includes("clinic_or_praxis.")
      )
    ) {
      return "specialist";
    }

    return "clinic";
  }

  if (categoryText.includes("healthcare")) {
    return "clinic";
  }

  return "healthcare";
}

/**
 * Read coordinates from a Geoapify feature.
 */
function getCoordinates(feature) {
  const properties = feature.properties || {};
  const coordinates = feature.geometry?.coordinates;

  const longitude = Number(
    properties.lon ?? coordinates?.[0]
  );

  const latitude = Number(
    properties.lat ?? coordinates?.[1]
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

/**
 * Fetch healthcare places from Geoapify.
 */
async function fetchHealthcarePlaces({
  latitude,
  longitude,
  radius,
  category,
}) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "Geoapify API key is missing. Configure GEOAPIFY_API_KEY."
    );

    error.code = "HEALTHCARE_PROVIDER_CONFIG";
    error.statusCode = 500;

    throw error;
  }

  try {
    const response = await axios.get(GEOAPIFY_URL, {
      timeout: REQUEST_TIMEOUT,

      params: {
        categories: CATEGORY_MAP[category].join(","),
        filter: `circle:${longitude},${latitude},${radius}`,
        bias: `proximity:${longitude},${latitude}`,
        limit: MAX_RESULTS,
        lang: "en",
        apiKey,
      },
    });

    if (!Array.isArray(response.data?.features)) {
      throw new Error("Invalid response from Geoapify");
    }

    return response.data.features;
  } catch (cause) {
    console.error(
      "[HealthcareLocator] Geoapify request failed:",
      cause.response?.status || cause.code || cause.message
    );

    const error = new Error(
      "Healthcare map service is temporarily unavailable"
    );

    error.code = "HEALTHCARE_PROVIDER_UNAVAILABLE";
    error.statusCode = 503;
    error.cause = cause;

    throw error;
  }
}

/**
 * Find nearby healthcare facilities.
 *
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {string} [options.category="all"]
 * @param {number} [options.radius=5000]
 */
async function findNearbyHealthcare({
  latitude,
  longitude,
  category = "all",
  radius = 5000,
}) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    const error = new Error("Invalid latitude");
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    const error = new Error("Invalid longitude");
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isFinite(radius) ||
    radius < 500 ||
    radius > 20000
  ) {
    const error = new Error(
      "Radius must be between 500 and 20000 meters"
    );

    error.statusCode = 400;
    throw error;
  }

  if (!CATEGORY_MAP[category]) {
    const error = new Error("Invalid healthcare category");
    error.statusCode = 400;
    throw error;
  }

  const features = await fetchHealthcarePlaces({
    latitude,
    longitude,
    radius,
    category,
  });

  const seenIds = new Set();
  const seenFacilities = new Set();
  const facilities = [];

  for (const feature of features) {
    const properties = feature.properties || {};
    const raw = getRawProperties(properties);
    const coordinates = getCoordinates(feature);

    if (!coordinates) {
      continue;
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    if (distance > radius) {
      continue;
    }

    const id =
      properties.place_id ||
      `${coordinates.latitude},${coordinates.longitude}`;

    if (seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);

    const name =
      properties.name ||
      properties.address_line1 ||
      null;

    // Deduplicate named places that have effectively the
    // same name and coordinates.
    if (name) {
      const normalizedName = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

      const facilityKey = [
        normalizedName,
        coordinates.latitude.toFixed(4),
        coordinates.longitude.toFixed(4),
      ].join("|");

      if (seenFacilities.has(facilityKey)) {
        continue;
      }

      seenFacilities.add(facilityKey);
    }

    const facilityCategory = getCategory(properties);

    // Broad provider searches are needed for labs and
    // emergency services. Exclude results we cannot classify
    // as the requested category.
    if (
      category !== "all" &&
      facilityCategory !== category
    ) {
      continue;
    }

    const address =
      properties.formatted ||
      [
        properties.address_line1,
        properties.address_line2,
      ]
        .filter(Boolean)
        .join(", ") ||
      null;

    const phone =
      raw.phone ||
      raw["contact:phone"] ||
      properties.datasource?.raw?.mobile ||
      null;

    const website =
      raw.website ||
      raw["contact:website"] ||
      null;

    const openingHours =
      raw.opening_hours || null;

    const isEmergency = facilityCategory === "emergency";

    facilities.push({
      id,
      name: name || "Unnamed healthcare facility",
      category: facilityCategory,

      latitude: coordinates.latitude,
      longitude: coordinates.longitude,

      location: address,
      address,

      phone,
      website,
      openingHours,

      emergency: isEmergency,
      emergencyTag:
        raw.emergency || raw.healthcare || null,

      distance: Math.round(distance),
      distanceKm: Number((distance / 1000).toFixed(2)),
    });
  }

  facilities.sort((a, b) => a.distance - b.distance);

  return facilities;
}

module.exports = {
  findNearbyHealthcare,
  getCategory,
};
