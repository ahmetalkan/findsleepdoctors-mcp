#!/usr/bin/env node
/**
 * findsleepdoctors-mcp
 *
 * MCP server over the public findsleepdoctors.com directory API.
 * Searches 21,000+ sleep medicine specialists and clinics in six countries.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = "https://findsleepdoctors.com";
const API = `${BASE}/api/search`;
const USER_AGENT = "findsleepdoctors-mcp/1.0 (+https://findsleepdoctors.com)";

const COUNTRIES = ["us", "au", "gb", "ca", "ie", "nz"];

function profileUrl(d) {
  return `${BASE}/${d.country_code}/${d.region_slug}/${d.city_slug}/${d.slug}`;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

function slim(d, origin) {
  const out = {
    name: d.name,
    specialty: d.specialty || null,
    clinic: d.clinic || null,
    address: [d.address_line, d.city_name, d.region_name, d.postcode]
      .filter(Boolean)
      .join(", "),
    phone: d.phone || null,
    website: d.website || null,
    country: (d.country_code || "").toUpperCase(),
    profile_url: profileUrl(d),
  };
  if (origin && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
    out.distance_km = haversineKm(origin.lat, origin.lng, d.lat, d.lng);
  }
  return out;
}

async function query(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`findsleepdoctors.com API returned HTTP ${res.status}`);
  }
  return res.json();
}

function text(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

const server = new McpServer({
  name: "findsleepdoctors",
  version: "1.0.0",
  description:
    "Search sleep doctors, sleep medicine specialists and sleep clinics in the US, UK, Canada, Australia, Ireland and New Zealand.",
});

server.registerTool(
  "search_sleep_doctors",
  {
    title: "Search sleep doctors and clinics",
    description:
      "Search the findsleepdoctors.com directory by free-text query, country, specialty, city or region. Returns profiles with address, phone, website and a link to the listing.",
    inputSchema: {
      query: z.string().min(1).optional().describe("Free text: name, clinic, city or specialty"),
      country: z.enum(COUNTRIES).optional().describe("Two-letter country code"),
      specialty: z.string().min(1).optional().describe("e.g. Sleep Medicine, Sleep Psychology"),
      city: z.string().min(1).optional().describe("City name, e.g. Houston"),
      region: z.string().min(1).optional().describe("Region or state code, e.g. tx, nsw"),
      page: z.number().int().min(1).max(200).optional().default(1),
      limit: z.number().int().min(1).max(20).optional().default(5),
    },
  },
  async ({ query: q, country, specialty, city, region, page, limit }) => {
    const data = await query({ q, country, specialty, city, region, page, limit });
    return text({
      total: data.total ?? 0,
      page: data.page ?? 1,
      pages: data.pages ?? 1,
      results: (data.doctors || []).map((d) => slim(d)),
      cities: (data.cities || []).slice(0, 5).map((c) => ({
        city: c.name,
        region: c.region_slug,
        country: (c.country_code || "").toUpperCase(),
        doctors: c.doctor_count,
        page: `${BASE}/${c.country_code}/${c.region_slug}/${c.slug}`,
      })),
      note: "Directory data from public sources. Confirm address, phone and services with the practice before booking. Not medical advice.",
    });
  }
);

server.registerTool(
  "find_sleep_doctors_nearby",
  {
    title: "Find sleep doctors near a location",
    description:
      "Find sleep doctors and sleep clinics within a radius of a latitude/longitude, sorted by distance. Use a geocoded location from the conversation.",
    inputSchema: {
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radius_km: z.number().min(1).max(100).optional().default(25),
      limit: z.number().int().min(1).max(20).optional().default(5),
      specialty: z.string().min(1).optional(),
    },
  },
  async ({ latitude, longitude, radius_km, limit, specialty }) => {
    const data = await query({
      lat: latitude,
      lng: longitude,
      radius: radius_km,
      limit,
      specialty,
      sort: "distance",
    });
    const origin = { lat: latitude, lng: longitude };
    return text({
      total: data.total ?? 0,
      radius_km,
      results: (data.doctors || [])
        .map((d) => slim(d, origin))
        .sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9)),
      note: "Directory data from public sources. Confirm details with the practice before booking. Not medical advice.",
    });
  }
);

server.registerTool(
  "get_sleep_doctor",
  {
    title: "Get one sleep doctor or clinic",
    description:
      "Look up a single listing by its exact name or slug and return the full profile record and listing URL.",
    inputSchema: {
      name_or_slug: z.string().min(1).describe("Exact listing name or slug, e.g. adelaide-insomnia-clinic"),
    },
  },
  async ({ name_or_slug }) => {
    const needle = name_or_slug.trim().toLowerCase();
    const data = await query({ q: name_or_slug, limit: 10 });
    const doctors = data.doctors || [];
    const exact =
      doctors.find((d) => d.slug?.toLowerCase() === needle) ||
      doctors.find((d) => d.name?.toLowerCase() === needle) ||
      doctors[0];
    if (!exact) {
      return text({ found: false, query: name_or_slug, note: "No matching listing." });
    }
    return text({ found: true, result: slim(exact) });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
