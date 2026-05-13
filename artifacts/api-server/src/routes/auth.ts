import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, withRetry } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SEED_USERS = [
  { email: "camila@c2labs.ai", name: "Camila Cruz", role: "Organizer", organization: "C2 LABS", password: "EmTech2026!C2" },
  { email: "kevin@c2labs.ai", name: "Kevin Centeno", role: "Organizer", organization: "C2 LABS", password: "EmTech2026!C2" },
  { email: "manuel@c2labs.ai", name: "Manuel", role: "Organizer", organization: "C2 LABS", password: "EmTech2026!C2" },
  { email: "mercedes.bouzas@opinno.com", name: "Mercedes Bouza", role: "Organizer", organization: "OPINNO", password: "EmTech2026!OP" },
  { email: "beatriz.ferreira@opinno.com", name: "Beatriz Ferreira", role: "Organizer", organization: "OPINNO", password: "EmTech2026!OP" },
  { email: "flor@aurora360.xyz", name: "Flor Ventura", role: "Production Agency Lead", organization: "AURORA360", password: "EmTech2026!AU" },
  { email: "claude-cowork", name: "claude-cowork", role: "Agent", organization: "AURORA360", password: "EmTech2026!AG" },
];

async function seedUsers() {
  for (const u of SEED_USERS) {
    const existing = await withRetry(() =>
      db.select().from(users).where(eq(users.email, u.email)).limit(1),
    );
    if (existing.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      await withRetry(() =>
        db.insert(users).values({
          email: u.email,
          name: u.name,
          role: u.role,
          organization: u.organization,
          passwordHash: hash,
        }),
      );
      console.log(`Seeded user: ${u.email}`);
    }
  }
}

function runSeedWithRetry(attempt = 0) {
  seedUsers().catch((err) => {
    console.error("Failed to seed users:", err);
    if (attempt < 5) {
      const wait = 2000 * Math.pow(2, attempt);
      console.warn(`Retrying seed in ${wait}ms...`);
      setTimeout(() => runSeedWithRetry(attempt + 1), wait);
    }
  });
}

runSeedWithRetry();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = rows[0];
    if (!user.active) {
      res.status(401).json({ error: "Account is deactivated" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    (req.session as any).userId = user.id;
    (req.session as any).userEmail = user.email;
    (req.session as any).userName = user.name;
    (req.session as any).userRole = user.role;
    (req.session as any).userOrg = user.organization;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie("emtech.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res) => {
  const session = req.session as any;
  if (!session.userId) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({
    user: {
      id: session.userId,
      email: session.userEmail,
      name: session.userName,
      role: session.userRole,
      organization: session.userOrg,
    },
  });
});

export default router;
