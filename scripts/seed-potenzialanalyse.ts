import 'dotenv/config';
import postgres from 'postgres';
import { nanoid } from 'nanoid';

const SLUG = 'potenzialanalyse';

type Option = { id: string; label: string; score: number };
type QuestionDef = {
  id: string;
  question: string;
  dimension:
    | 'social-media'
    | 'website'
    | 'branding'
    | 'trust'
    | 'auffindbarkeit'
    | 'umsatzpotenzial'
    | 'mitarbeiter'
    | 'regional';
  options: Option[];
};

const QUESTIONS: QuestionDef[] = [
  {
    id: 'q-social',
    question: 'Auf welchen Plattformen posten Sie regelmäßig?',
    dimension: 'social-media',
    options: [
      { id: 'social-0', label: 'Auf keiner', score: 0 },
      { id: 'social-1u', label: '1 Plattform, unregelmäßig', score: 25 },
      { id: 'social-1r', label: '1 Plattform, regelmäßig', score: 50 },
      { id: 'social-2r', label: '2 Plattformen, regelmäßig', score: 75 },
      { id: 'social-3r', label: '3+ Plattformen, regelmäßig', score: 100 },
    ],
  },
  {
    id: 'q-website',
    question: 'Wie würden Sie Ihre Website beschreiben?',
    dimension: 'website',
    options: [
      { id: 'web-none', label: 'Habe keine Website', score: 0 },
      { id: 'web-old', label: 'Veraltet', score: 30 },
      { id: 'web-okay', label: 'Okay, ohne Buchungsmöglichkeit', score: 50 },
      { id: 'web-okay-book', label: 'Okay, mit Buchung', score: 75 },
      { id: 'web-modern', label: 'Modern, mobil, mit Buchung', score: 100 },
    ],
  },
  {
    id: 'q-branding',
    question: 'Haben Sie ein einheitliches visuelles Auftreten (Logo, Farben, Style)?',
    dimension: 'branding',
    options: [
      { id: 'br-no', label: 'Nein, gar nichts', score: 0 },
      { id: 'br-logo', label: 'Nur Logo', score: 30 },
      { id: 'br-logo-colors', label: 'Logo + Farben', score: 60 },
      { id: 'br-consistent', label: 'Komplett konsistent on/offline', score: 100 },
    ],
  },
  {
    id: 'q-trust',
    question: 'Wie viele Google- oder Jameda-Bewertungen haben Sie (Schnitt ab 4,5)?',
    dimension: 'trust',
    options: [
      { id: 'tr-0', label: 'Keine', score: 0 },
      { id: 'tr-10', label: '1 bis 10', score: 25 },
      { id: 'tr-50', label: '11 bis 50', score: 55 },
      { id: 'tr-150', label: '51 bis 150', score: 80 },
      { id: 'tr-plus', label: 'Mehr als 150', score: 100 },
    ],
  },
  {
    id: 'q-auffindbarkeit',
    question: 'Werden Sie bei Google für Ihre Hauptbehandlung in Ihrer Stadt gefunden?',
    dimension: 'auffindbarkeit',
    options: [
      { id: 'au-none', label: 'Gar nicht', score: 0 },
      { id: 'au-p2', label: 'Seite 2 oder schlechter', score: 30 },
      { id: 'au-top10', label: 'Top 10', score: 55 },
      { id: 'au-top5', label: 'Top 5', score: 80 },
      { id: 'au-top3', label: 'Top 3', score: 100 },
    ],
  },
  {
    id: 'q-umsatz',
    question: 'Wie hoch ist Ihr durchschnittlicher Umsatz pro Termin?',
    dimension: 'umsatzpotenzial',
    options: [
      { id: 'um-50', label: 'Unter 50 €', score: 20 },
      { id: 'um-100', label: '50 bis 100 €', score: 45 },
      { id: 'um-200', label: '100 bis 200 €', score: 65 },
      { id: 'um-400', label: '200 bis 400 €', score: 85 },
      { id: 'um-plus', label: 'Mehr als 400 €', score: 100 },
    ],
  },
  {
    id: 'q-mitarbeiter',
    question: 'Wie viele Behandler:innen sind aktiv?',
    dimension: 'mitarbeiter',
    options: [
      { id: 'mi-1', label: 'Nur ich', score: 40 },
      { id: 'mi-2', label: '2', score: 60 },
      { id: 'mi-4', label: '3 bis 4', score: 80 },
      { id: 'mi-plus', label: '5 oder mehr', score: 100 },
    ],
  },
  {
    id: 'q-regional',
    question: 'Wie groß ist Ihr Einzugsgebiet?',
    dimension: 'regional',
    options: [
      { id: 'rg-dorf', label: 'Dorf unter 10k Einwohner', score: 40 },
      { id: 'rg-klein', label: 'Kleinstadt 10k bis 50k', score: 60 },
      { id: 'rg-stadt', label: 'Stadt 50k bis 250k', score: 80 },
      { id: 'rg-gross', label: 'Großstadt über 250k', score: 100 },
    ],
  },
];

function buildConfig() {
  return {
    theme: {
      mode: 'light' as const,
      primaryColor: '#0F2F5B',
      accentColor: '#7EC8F3',
      backgroundColor: '#F7FAFF',
      cardColor: '#FFFFFF',
      textColor: '#0F2F5B',
      borderColor: '#E0E7F2',
    },
    settings: {
      progressBar: true,
      // Single source of truth for the booking CTA (result step + cta-booking step).
      // BeautyFlow's live Calendly link (from beauty-flow.de).
      ctaCalendarUrl: 'https://calendly.com/beauty-flow/30min',
    },
    steps: [
      {
        id: 'intro',
        type: 'intro',
        title: 'Sehen Sie Ihr Profil in 8 *Dimensionen*',
        body: 'Wir messen acht Bereiche, die zusammen darüber entscheiden, wie planbar Ihre Praxis wächst. Sie sehen Ihr Profil sofort als Spinnennetz, verständlich und ohne Fachjargon. So wissen Sie, wo Ihr nächster Hebel liegt.',
        ctaLabel: 'Jetzt Potenzial erkunden',
      },
      {
        id: 'lead',
        type: 'lead-capture',
        title: 'Damit wir parallel Ihre Sichtbarkeit prüfen können',
        body: 'Wir analysieren Ihre Website live im Hintergrund, das spart Ihnen Tipparbeit.',
        fields: [
          { key: 'name', label: 'Ihr Name', required: true },
          { key: 'email', label: 'E-Mail', required: true },
          { key: 'phone', label: 'Telefon', required: false },
          { key: 'businessName', label: 'Praxisname', required: true },
          { key: 'websiteUrl', label: 'Website-URL', required: true },
          { key: 'instagramHandle', label: 'Instagram-Handle (optional)', required: false },
          { key: 'gmbUrl', label: 'Google-My-Business oder Praxis + Stadt', required: false },
        ],
        ctaLabel: 'Weiter',
      },
      ...QUESTIONS.map((q) => ({
        id: q.id,
        type: 'question',
        question: q.question,
        dimension: q.dimension,
        options: q.options,
        allowMultiple: false,
        required: true,
      })),
      {
        id: 'calc-termine',
        type: 'calc-input',
        title: 'Wie viele Termine pro Woche behandeln Sie aktuell?',
        label: 'Termine pro Woche',
        variableName: 'terminePerWeek',
        inputType: 'slider',
        defaultValue: 30,
        min: 0,
        max: 100,
        step: 1,
      },
      {
        id: 'calc-umsatz',
        type: 'calc-input',
        title: 'Ihr durchschnittlicher Umsatz pro Termin',
        label: 'Umsatz pro Termin',
        variableName: 'umsatzProTermin',
        inputType: 'number',
        defaultValue: 120,
        min: 0,
        max: 1000,
        suffix: '€',
      },
      {
        id: 'calc-kapazitaet',
        type: 'calc-input',
        title: 'Wie viele Termine wären pro Woche möglich, wenn alles voll wäre?',
        label: 'Kapazität pro Woche',
        variableName: 'kapazitaetPerWeek',
        inputType: 'slider',
        defaultValue: 50,
        min: 0,
        max: 150,
        step: 1,
      },
      {
        // Terminal step: the result IS the end of the funnel. It shows the growth
        // chart + spider + recommendation and, because no step follows and
        // settings.ctaCalendarUrl is set, its own "Strategiegespräch buchen" CTA
        // (-> Calendly). No separate dead-end booking step.
        id: 'result',
        type: 'result-spider',
        title: 'Ihre Potenzialanalyse',
        body: 'Hier ist Ihre Auswertung. Die vollständige Version erhalten Sie gleich per E-Mail.',
        showKalkuChart: true,
        cliffhanger: 'Ihre schwächste Säule ist der größte Hebel. Im Strategiegespräch zeigen wir Ihnen den Plan dazu.',
      },
    ],
  };
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const sql = postgres(DATABASE_URL);
  try {
    const existing = await sql`SELECT id FROM funnel WHERE slug = ${SLUG} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`Funnel "${SLUG}" exists (id=${existing[0].id}). Updating config + steps in place.`);
      await sql`
        UPDATE funnel
        SET config = ${sql.json(buildConfig())}, updated_at = NOW()
        WHERE slug = ${SLUG}
      `;
      console.log('Updated.');
      return;
    }

    const owner = await sql`SELECT id FROM "user" WHERE role = 'super_admin' AND approved = true ORDER BY created_at ASC LIMIT 1`;
    if (owner.length === 0) {
      console.error('No super_admin user found. Create and approve one first, then re-run.');
      process.exit(1);
    }
    const ownerId = owner[0].id;
    const id = nanoid();
    await sql`
      INSERT INTO funnel (id, owner_id, name, slug, description, status, config)
      VALUES (${id}, ${ownerId}, ${'BeautyFlow Potenzialanalyse'}, ${SLUG}, ${'8-Dim Spider-Web + Umsatz-Mehrwert'}, ${'published'}, ${sql.json(buildConfig())})
    `;
    console.log(`Seeded funnel id=${id} slug=${SLUG} owner=${ownerId}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
