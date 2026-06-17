/* Roam Sweet Roam — demo data. All fictional; locations are real Inner West Sydney. */
window.APP = {
  name: "Roam Sweet Roam",
  short: "Roam",
  password: "gearup",
  buyer: { name: "Dave & Sam", kids: 2 },
};

window.DEMO = {
  map: { center: [-33.908, 151.153], zoom: 14 },

  properties: [
    {
      id: "p1", address: "23 Excelsior Parade", suburb: "Marrickville",
      price: "Guide $1.45M", beds: 3, baths: 1, cars: 1, propertyType: "Victorian terrace",
      agency: "Ray White Inner West", agent: "Daniel Cakovski",
      ofiStart: "9:30", ofiEnd: "10:00",
      blurb: "Renovated double-fronter with a sun-trap courtyard, steps from the Cooks River.",
      lat: -33.9098, lng: 151.1502, hue: 18, icon: "terrace", checkInEnabled: true,
    },
    {
      id: "p2", address: "8 Garners Avenue", suburb: "Marrickville",
      price: "Guide $1.18M", beds: 2, baths: 1, cars: 0, propertyType: "Semi-detached",
      agency: "McGrath Inner West", agent: "Sophie Karagiannis",
      ofiStart: "10:00", ofiEnd: "10:30",
      blurb: "Light-filled brick semi with a north-facing rear deck and lane access.",
      lat: -33.9069, lng: 151.1571, hue: 200, icon: "semi", checkInEnabled: false,
    },
    {
      id: "p3", address: "14 Wardell Road", suburb: "Dulwich Hill",
      price: "Guide $895k", beds: 2, baths: 1, cars: 1, propertyType: "Apartment",
      agency: "Belle Property Annandale", agent: "Tom Fraser",
      ofiStart: "10:45", ofiEnd: "11:15",
      blurb: "Top-floor art-deco apartment with a leafy outlook, a stroll to the light rail.",
      lat: -33.9042, lng: 151.1389, hue: 268, icon: "apartment", checkInEnabled: false,
    },
    {
      id: "p4", address: "37 Crystal Street", suburb: "Petersham",
      price: "Guide $1.62M", beds: 3, baths: 2, cars: 1, propertyType: "Townhouse",
      agency: "Cobden & Hayson Petersham", agent: "Marcus Lo Bartolo",
      ofiStart: "11:30", ofiEnd: "12:00",
      blurb: "Three-level townhouse with a private terrace and double-glazed quiet.",
      lat: -33.8961, lng: 151.1538, hue: 150, icon: "townhouse", checkInEnabled: false,
    },
    {
      id: "p5", address: "52 Frampton Avenue", suburb: "Marrickville",
      price: "Guide $2.15M", beds: 4, baths: 2, cars: 2, propertyType: "Freestanding house",
      agency: "Ray White Inner West", agent: "Hana Nguyen",
      ofiStart: "12:00", ofiEnd: "12:30",
      blurb: "Freestanding Federation home on a deep block with pool and studio.",
      lat: -33.9121, lng: 151.1604, hue: 38, icon: "house", checkInEnabled: true,
    },
  ],

  stops: [
    {
      id: "s1", name: "Double Roasters", type: "cafe", emoji: "☕",
      address: "199 Victoria Road, Marrickville", lat: -33.9075, lng: 151.1627,
      perk: "10% off any coffee for Roam users",
      why: "A proper flat white before the 9:30 open.",
    },
    {
      id: "s2", name: "Steel Park", type: "park", emoji: "🛝",
      address: "Illawarra Road, Marrickville", lat: -33.9210, lng: 151.1451,
      perk: "Free Roam coffee voucher at the kiosk, weekends",
      why: "Riverside playground + water play while the kids burn off energy.",
    },
    {
      id: "s3", name: "The Henson", type: "lunch", emoji: "🍔",
      address: "91 Illawarra Road, Marrickville", lat: -33.9052, lng: 151.1551,
      perk: "Kids eat free with any main for Roam users",
      why: "Beer-garden play area — lunch while the kids actually play.",
    },
  ],

  itinerary: [
    { order: 1, refType: "stop",     refId: "s1", arrive: "9:00",  driveMins: 0, distanceKm: 0.0, parkingNote: "Street parking on Victoria Rd, ~60m" },
    { order: 2, refType: "property", refId: "p1", arrive: "9:35",  driveMins: 5, distanceKm: 1.4, parkingNote: "Street parking on Excelsior Pde, ~120m" },
    { order: 3, refType: "property", refId: "p2", arrive: "10:05", driveMins: 6, distanceKm: 1.1, parkingNote: "Street parking on Garners Ave, ~90m" },
    { order: 4, refType: "property", refId: "p3", arrive: "10:50", driveMins: 8, distanceKm: 2.0, parkingNote: "Wardell Rd is notoriously tight — arrive 5 min early", parkingHard: true },
    { order: 5, refType: "stop",     refId: "s2", arrive: "11:10", driveMins: 5, distanceKm: 1.3, parkingNote: "Free car park off Illawarra Rd, ~80m" },
    { order: 6, refType: "property", refId: "p4", arrive: "11:35", driveMins: 7, distanceKm: 1.9, parkingNote: "Street parking on Crystal St, ~110m" },
    { order: 7, refType: "stop",     refId: "s3", arrive: "12:00", driveMins: 6, distanceKm: 1.6, parkingNote: "Street parking on Centennial St, ~140m" },
    { order: 8, refType: "property", refId: "p5", arrive: "12:15", driveMins: 5, distanceKm: 1.2, parkingNote: "Street parking on Frampton Ave, ~100m" },
  ],

  dashboard: {
    inspectionsToday: 14206,
    agenciesCount: 38,
    suburbsCount: 11,
    avgStopsPerBuyer: 2.4,
    mlFeatures: [
      "open-home attendance velocity",
      "cross-agency consideration breadth",
      "weekend buyer intent v3",
      "dwell-time per inspection",
      "shortlist churn rate",
      "route-completion likelihood",
    ],
    lookalikeCount: 3420,
    lookalikeLine: "3,420 buyers who look like this one — deliverable to Ray White agents",
    punchline: "A market-wide attendance signal no property platform captures today.",
  },

  copy: {
    splashTagline: "Plan your Saturday open-homes. We route the whole market — not just one agency.",
    shortlistHeader: "Your shortlist for Saturday",
    shortlistSub: "5 opens across Marrickville, Dulwich Hill & Petersham.",
    toggles: {
      cafe: "Coffee stop before the first open",
      park: "Playground break for the kids",
      lunch: "Family-friendly lunch en route",
    },
    routeTitle: "Your Saturday run",
    routeSub: "8 stops · 9:00am – 12:30pm · 1 coffee, 1 playground, 1 lunch",
    arriving: [
      "You're 180m from 23 Excelsior Parade…",
      "Ray White open — we'll log your visit automatically.",
    ],
    proofSub: "Show this to the agent",
    agentBlurb: "The Ray White agent sees you arrive before you reach the door — name, shortlist, and how many opens you've hit today. A warm, ready buyer, not a cold sign-in sheet.",
    closing: "One Saturday. Every agency. Every open. Roam sees the whole market move.",
    optimizer: {
      title: "Building your perfect Saturday…",
      steps: [
        { icon: "🔒", name: "Time-Lock Router", detail: "Reading inspection times, ordering stops so you never backtrack or miss a viewing." },
        { icon: "📍", name: "Pit-Stop Planner", detail: "Slotting coffee, a playground and lunch into the gaps between opens." },
        { icon: "🅿️", name: "Parking Advisor", detail: "Checking which streets are a nightmare to park, padding your arrival times." },
      ],
    },
    pipeline: [
      { head: "Input listings", lines: ["Paste links or auto-pull", "Times read automatically"] },
      { head: "Smart optimiser", lines: ["Syncs inspection windows", "Detects parking & traffic"] },
      { head: "Your perfect Saturday", lines: ["Drive + park, step by step", "Coffee & lunch built in"] },
    ],
    bailOut: "Not for us — bail out",
    bailOutToast: "Re-optimising your day…",
  },
};
