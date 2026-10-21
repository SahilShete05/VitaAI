const axios = require("axios");

const OVERPASS_MIRRORS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const REQUEST_TIMEOUT = 20000;

const CATEGORY_FILTERS = {
  hospital: [
    '["amenity"="hospital"]',
    '["healthcare"="hospital"]',
  ],

  clinic: [
    '["amenity"="clinic"]',
    '["healthcare"="clinic"]',
    '["amenity"="doctors"]',
    '["healthcare"="doctor"]',
  ],

  pharmacy: [
    '["amenity"="pharmacy"]',
    '["healthcare"="pharmacy"]',
  ],

  laboratory: [
    '["healthcare"="laboratory"]',
    '["healthcare"="sample_collection"]',
    '["amenity"="laboratory"]',
  ],

  emergency: [
    '["emergency"="yes"]',
    '["healthcare"="emergency"]',
    '["emergency"="ambulance_station"]',
  ],

  specialist: [
    '["healthcare"="specialist"]',
    '["healthcare:speciality"]',
  ],

  all: [
    '["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]',
    '["healthcare"~"^(hospital|clinic|doctor|pharmacy|laboratory|sample_collection|specialist)$"]',
  ],
};

/**
 * Build an Overpass QL query for nearby healthcare facilities.
 */
function buildQuery(latitude, longitude, radius, category) {
  const filters = CATEGORY_FILTERS[category] || CATEGORY_FILTERS.all;

  const queryParts = filters.map((filter) => {
    return `
      node${filter}(around:${radius},${latitude},${longitude});
      way${filter}(around:${radius},${latitude},${longitude});
      relation${filter}(around:${radius},${latitude},${longitude});
    `;
  });

  return `
    [out:json][timeout:15];
    (
      ${queryParts.join("\n")}
    );
    out center tags;
  `;
}

/**
 * Fetch data from Overpass, trying mirrors if one fails.
 */
async function fetchOverpass(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const response = await axios.post(
        endpoint,
        new URLSearchParams({ data: query }).toString(),
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "VitaAI-HealthcareLocator/1.0",
          },
        }
      );

      if (
        !response.data ||
        !Array.isArray(response.data.elements)
      ) {
        throw new Error("Invalid response from healthcare map provider");
      }

      return response.data.elements;
    } catch (error) {
      lastError = error;

      console.warn(
        `[HealthcareLocator] Overpass endpoint failed: ${endpoint}`,
        error.message
      );
    }
  }

  const error = new Error(
    "Healthcare map service is temporarily unavailable"
  );

  error.code = "HEALTHCARE_PROVIDER_UNAVAILABLE";
  error.statusCode = 502;
  error.cause = lastError;

  throw error;
}

/**
 * Calculate distance between two coordinates using the Haversine formula.
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
    Math.atan2(Math.sqrt(boundedA), Math.sqrt(1 - boundedA))
  );
}

/**
 * Determine the most useful category for a healthcare facility.
 */
function getCategory(tags = {}) {
  if (
    tags.amenity === "hospital" ||
    tags.healthcare === "hospital"
  ) {
    return "hospital";
  }

  if (
    tags.amenity === "pharmacy" ||
    tags.healthcare === "pharmacy"
  ) {
    return "pharmacy";
  }

  if (
    tags.healthcare === "laboratory" ||
    tags.healthcare === "sample_collection" ||
    tags.amenity === "laboratory"
  ) {
    return "laboratory";
  }

  if (
    tags.amenity === "clinic" ||
    tags.healthcare === "clinic"
  ) {
    return "clinic";
  }

  if (
    tags.amenity === "doctors" ||
    tags.healthcare === "doctor"
  ) {
    return "clinic";
  }

  if (
    tags.healthcare === "specialist" ||
    tags["healthcare:speciality"]
  ) {
    return "specialist";
  }

  if (
    tags.emergency === "yes" ||
    tags.emergency === "ambulance_station" ||
    tags.healthcare === "emergency"
  ) {
    return "emergency";
  }

  return tags.amenity || tags.healthcare || "healthcare";
}

/**
 * Get usable coordinates for an Overpass node, way, or relation.
 */
function getCoordinates(element) {
  if (
    Number.isFinite(element.lat) &&
    Number.isFinite(element.lon)
  ) {
    return {
      latitude: element.lat,
      longitude: element.lon,
    };
  }

  if (
    Number.isFinite(element.center?.lat) &&
    Number.isFinite(element.center?.lon)
  ) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

/**
 * Find nearby healthcare facilities.
 *
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {string} [options.category="all"]
 * @param {number} [options.radius=5000] Radius in meters
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

  if (!CATEGORY_FILTERS[category]) {
    const error = new Error("Invalid healthcare category");
    error.statusCode = 400;
    throw error;
  }

  const query = buildQuery(latitude, longitude, radius, category);
  const elements = await fetchOverpass(query);

  const seenIds = new Set();
  const seenFacilities = new Set();
  const facilities = [];

  for (const element of elements) {
    const tags = element.tags || {};
    const coordinates = getCoordinates(element);

    if (!coordinates) {
      continue;
    }

    const elementId = `${element.type}/${element.id}`;

    if (seenIds.has(elementId)) {
      continue;
    }

    seenIds.add(elementId);

    const distance = calculateDistance(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude
    );

    if (distance > radius) {
      continue;
    }

    const name =
      tags.name ||
      tags["name:en"] ||
      tags["official_name"] ||
      null;

    // Deduplicate named facilities that share essentially the same
    // location, even if OSM represents them as a node and a building.
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

    const addressParts = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:suburb"],
      tags["addr:city"],
      tags["addr:postcode"],
    ].filter(Boolean);

    const isEmergency =
      tags.emergency === "yes" ||
      tags.emergency === "ambulance_station" ||
      tags.healthcare === "emergency";

    facilities.push({
      id: elementId,
      name: name || "Unnamed healthcare facility",
      category: getCategory(tags),

      latitude: coordinates.latitude,
      longitude: coordinates.longitude,

      location:
        addressParts.join(", ") ||
        tags["addr:full"] ||
        tags["addr:place"] ||
        null,

      address: addressParts.length
        ? addressParts.join(", ")
        : tags["addr:full"] || tags["addr:place"] || null,

      phone:
        tags.phone ||
        tags["contact:phone"] ||
        tags["contact:mobile"] ||
        null,

      website:
        tags.website ||
        tags["contact:website"] ||
        null,

      openingHours:
        tags.opening_hours || null,

      emergency: isEmergency,
      emergencyTag:
        tags.emergency || tags.healthcare || null,

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

