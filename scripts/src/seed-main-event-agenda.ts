import { randomUUID } from "node:crypto";
import { db, appState, pool } from "@workspace/db";
import { eq } from "drizzle-orm";

interface AgendaRow {
  id: string;
  time: string;
  activity: string;
  location: string;
  responsible: string;
  notes: string;
}

type SeedInput = Omit<AgendaRow, "id" | "responsible">;

const DIA_1: SeedInput[] = [
  {
    time: "12:00\u20136:00 p.m.",
    activity: "Hotel HQ badge pick-up checkpoint",
    location: "Hotel HQ",
    notes:
      "Optional advance badge pick-up. Only for general access attendees. VIPs pickup @ ESEN on Day 1.",
  },
  {
    time: "2:00\u20132:30 p.m.",
    activity: "Pre-registration and arrival",
    location: "ESEN",
    notes: "For attendees joining roundtables or workshops.",
  },
  {
    time: "2:30\u20133:30 p.m.",
    activity: "Pre-event experience roundtables",
    location: "ESEN",
    notes: "Small-group discussions and curated networking.",
  },
  {
    time: "2:30\u20133:30 p.m.",
    activity: "Parallel workshop track",
    location: "ESEN",
    notes:
      "Simultaneous workshop experience for attendees assigned to the workshop track.",
  },
  {
    time: "3:30\u20134:00 p.m.",
    activity: "Working break + light refreshments",
    location: "ESEN",
    notes: "Light food, coffee and hydration.",
  },
  {
    time: "4:00\u20136:00 p.m.",
    activity: "Short-form experiences / workshops",
    location: "ESEN",
    notes: "Workshop-led experiences and applied sessions.",
  },
  {
    time: "6:00\u20137:30 p.m.",
    activity: "Opening reception",
    location: "ESEN",
    notes: "Reception format with drinks and light food.",
  },
];

const DIA_2: SeedInput[] = [
  {
    time: "7:15\u20138:00 a.m.",
    activity: "Late badge pick-up / onsite arrivals",
    location: "ESEN",
    notes: "Operational only; not positioned as breakfast.",
  },
  {
    time: "8:00\u20139:30 a.m.",
    activity: "Content block 1",
    location: "ESEN",
    notes: "Mainstage content.",
  },
  {
    time: "9:30\u201310:00 a.m.",
    activity: "Working break + refreshments",
    location: "ESEN",
    notes: "Refreshments and networking.",
  },
  {
    time: "10:00\u201311:25 a.m.",
    activity: "Content block 2",
    location: "ESEN",
    notes: "Mainstage content.",
  },
  {
    time: "11:25 a.m.\u20131:00 p.m.",
    activity: "Lunch + networking",
    location: "ESEN",
    notes: "Main meal and networking.",
  },
  {
    time: "1:00\u20132:50 p.m.",
    activity: "Content block 3",
    location: "ESEN",
    notes: "Mainstage content.",
  },
  {
    time: "2:50\u20133:15 p.m.",
    activity: "Working break + refreshments",
    location: "ESEN",
    notes: "Refreshments and networking.",
  },
  {
    time: "3:15\u20136:00 p.m.",
    activity: "Content block 4",
    location: "ESEN",
    notes: "Mainstage content and close.",
  },
  {
    time: "6:00\u20137:30 p.m.",
    activity: "Attendee meetup / drinks",
    location: "ESEN cafeteria / living space",
    notes: "Cocktail and networking.",
  },
];

function toRows(seeds: SeedInput[]): AgendaRow[] {
  return seeds.map((s) => ({
    id: randomUUID(),
    time: s.time,
    activity: s.activity,
    location: s.location,
    responsible: "",
    notes: s.notes,
  }));
}

async function seedKey(key: string, seeds: SeedInput[]) {
  const existing = await db
    .select()
    .from(appState)
    .where(eq(appState.key, key))
    .limit(1);

  const current = existing[0]?.value;
  const isEmpty =
    !existing.length || (Array.isArray(current) && current.length === 0);

  if (!isEmpty) {
    console.log(
      `[seed] ${key}: already populated (${
        Array.isArray(current) ? current.length : "non-array"
      } entries), skipping`,
    );
    return;
  }

  const rows = toRows(seeds);
  if (existing.length) {
    await db
      .update(appState)
      .set({ value: rows, updatedAt: new Date() })
      .where(eq(appState.key, key));
  } else {
    await db.insert(appState).values({ key, value: rows });
  }
  console.log(`[seed] ${key}: seeded ${rows.length} rows`);
}

async function main() {
  await seedKey("agenda-evento-dia-1", DIA_1);
  await seedKey("agenda-evento-dia-2", DIA_2);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
