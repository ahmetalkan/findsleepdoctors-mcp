# Find Sleep Doctors MCP

MCP server for **[findsleepdoctors.com](https://findsleepdoctors.com)** — search 21,000+ sleep medicine specialists and sleep clinics across the United States, United Kingdom, Canada, Australia, Ireland and New Zealand.

Sleep medicine is one of the hardest specialties to search: listings sit in hospital directories, state licensing boards and clinic pages, with no shared format. This server puts the whole directory behind three tools so an agent can answer "who treats sleep apnea near me" with a name, an address and a phone number instead of a guess.

## Install

Requires Node.js 22 or newer. No API key.

```bash
npx -y github:ahmetalkan/findsleepdoctors-mcp
```

Claude Code:

```bash
claude mcp add findsleepdoctors -- npx -y github:ahmetalkan/findsleepdoctors-mcp
```

Claude Desktop / Cursor:

```json
{
  "mcpServers": {
    "findsleepdoctors": {
      "command": "npx",
      "args": ["-y", "github:ahmetalkan/findsleepdoctors-mcp"]
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `search_sleep_doctors` | Search by name, city, region, country or specialty. Returns address, phone, website and profile link. |
| `find_sleep_doctors_nearby` | Pass a latitude/longitude and a radius; returns the closest clinics with distance in km. |
| `get_sleep_doctor` | Look up one listing by exact name or slug. |

### Example

> Find practices that specialise in insomnia in the US.

The agent calls `search_sleep_doctors` with `{"query": "insomnia", "country": "us"}` and gets back 26 matches:

```json
{
  "total": 26,
  "results": [
    {
      "name": "Atlanta Insomnia and Behavioral Health Services, PC - Decatur",
      "specialty": "Sleep Medicine",
      "address": "755 Commerce Dr Ste 410, Decatur, Georgia, 30030",
      "phone": "+1 404 378 0441",
      "profile_url": "https://findsleepdoctors.com/us/ga/decatur/atlanta-insomnia-and-behavioral-health-services-pc-decatur"
    }
  ]
}
```

A city search is broader: `{"city": "Houston", "country": "us"}` returns 309 listings.

## Browse without an agent

- [Sleep doctors near me](https://findsleepdoctors.com) — location search
- [Browse by country](https://findsleepdoctors.com/sleep-doctor-near-me)
- [United States](https://findsleepdoctors.com/us) · [Australia](https://findsleepdoctors.com/au) · [United Kingdom](https://findsleepdoctors.com/gb) · [Canada](https://findsleepdoctors.com/ca) · [Ireland](https://findsleepdoctors.com/ie) · [New Zealand](https://findsleepdoctors.com/nz)
- [Sleep health guides](https://findsleepdoctors.com/articles) — sleep apnea, insomnia, CPAP and sleep studies

## Data

Listings are compiled from public sources and refreshed continuously. Each profile carries the practice name, clinic affiliation, address, phone, website and listed specialty. Coverage is strongest in the US (18,800+ listings) and thinner in Ireland and New Zealand.

The server calls the public JSON endpoint at `https://findsleepdoctors.com/api/search`; no personal data, no accounts and no tracking.

## Limits

- This is a directory, not a medical service. It does not diagnose, treat or book appointments.
- Listings can lag reality. Confirm the address, phone and accepted insurance with the practice.
- If a search returns nothing, widen the radius or drop the specialty filter before concluding there is no provider.

## License

MIT. Directory content remains the property of findsleepdoctors.com.
