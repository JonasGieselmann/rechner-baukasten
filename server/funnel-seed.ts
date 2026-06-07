// Canonical config for the BeautyFlow Potenzialanalyse funnel. Single source of
// truth shared by the seed script (scripts/seed-potenzialanalyse.ts) and the
// boot-time sync (db.ts syncPotenzialanalyseFunnel). Bump POTENZIALANALYSE_VERSION
// whenever the structure changes so deployments upgrade the live funnel in place.
export const POTENZIALANALYSE_SLUG = 'potenzialanalyse';
export const POTENZIALANALYSE_VERSION = 2;

type Option = { id: string; label: string; score: number; calcValue?: number };
type QuestionDef = {
  id: string;
  question: string;
  dimension:
    | 'social-media' | 'website' | 'branding' | 'trust'
    | 'auffindbarkeit' | 'umsatzpotenzial' | 'mitarbeiter' | 'regional';
  options: Option[];
  calcVariable?: string;
};

// Short funnel: 3 questions seed the calculator (calcVariable), 2 build the profile.
const QUESTIONS: QuestionDef[] = [
  {
    id: 'q-termine',
    question: 'Wie viele Behandlungstermine haben Sie aktuell pro Woche?',
    dimension: 'umsatzpotenzial',
    calcVariable: 'terminePerWeek',
    options: [
      { id: 'te-u10', label: 'Unter 10', score: 20, calcValue: 6 },
      { id: 'te-20', label: '10 bis 20', score: 45, calcValue: 15 },
      { id: 'te-35', label: '20 bis 35', score: 70, calcValue: 27 },
      { id: 'te-50', label: '35 bis 50', score: 90, calcValue: 42 },
      { id: 'te-plus', label: 'Mehr als 50', score: 100, calcValue: 60 },
    ],
  },
  {
    id: 'q-umsatz',
    question: 'Wie hoch ist Ihr durchschnittlicher Umsatz pro Termin?',
    dimension: 'umsatzpotenzial',
    calcVariable: 'umsatzProTermin',
    options: [
      { id: 'um-50', label: 'Unter 50 €', score: 20, calcValue: 40 },
      { id: 'um-100', label: '50 bis 100 €', score: 45, calcValue: 75 },
      { id: 'um-200', label: '100 bis 200 €', score: 65, calcValue: 150 },
      { id: 'um-400', label: '200 bis 400 €', score: 85, calcValue: 300 },
      { id: 'um-plus', label: 'Mehr als 400 €', score: 100, calcValue: 450 },
    ],
  },
  {
    id: 'q-kapazitaet',
    question: 'Wie viele Termine wären pro Woche möglich, wenn Ihr Kalender voll wäre?',
    dimension: 'mitarbeiter',
    calcVariable: 'kapazitaetPerWeek',
    options: [
      { id: 'ka-30', label: 'Bis 30', score: 40, calcValue: 25 },
      { id: 'ka-60', label: '30 bis 60', score: 60, calcValue: 45 },
      { id: 'ka-100', label: '60 bis 100', score: 80, calcValue: 80 },
      { id: 'ka-plus', label: 'Über 100', score: 100, calcValue: 110 },
    ],
  },
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
];

export function buildPotenzialanalyseConfig() {
  return {
    version: POTENZIALANALYSE_VERSION,
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
      ctaCalendarUrl: 'https://calendly.com/beauty-flow/30min',
    },
    steps: [
      {
        id: 'intro',
        type: 'intro',
        title: 'In 2 Minuten zu Ihrem *Wachstumspotenzial*',
        body: 'Ein paar kurze Fragen, dann sehen Sie sofort Ihren möglichen Mehrumsatz pro Monat und Ihr Profil. Am Ende können Sie mit Ihren Zahlen frei weiterspielen.',
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
        calcVariable: q.calcVariable,
      })),
      {
        id: 'result',
        type: 'result-spider',
        title: 'Ihre Potenzialanalyse',
        body: 'Hier ist Ihre Auswertung. Die vollständige Version erhalten Sie gleich per E-Mail.',
        showKalkuChart: true,
        cliffhanger: 'Ihre schwächste Säule ist der größte Hebel. Im Strategiegespräch zeigen wir Ihnen den Plan dazu.',
        calcInputs: [
          { variableName: 'terminePerWeek', label: 'Termine pro Woche', min: 0, max: 80, step: 1 },
          { variableName: 'umsatzProTermin', label: 'Ø Umsatz pro Termin', min: 0, max: 600, step: 10, suffix: '€' },
          { variableName: 'kapazitaetPerWeek', label: 'Mögliche Termine pro Woche', min: 0, max: 150, step: 1 },
        ],
      },
    ],
  };
}
