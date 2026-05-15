import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

// ============================================
// Brand tokens (hex values from branding/tokens.ts)
// ============================================

const COLORS = {
  porzellan: '#F7FAFF',
  navy: '#0F2F5B',
  lightBlue: '#7EC8F3',
  mist: '#E0E7F2',
  white: '#FFFFFF',
  slate: '#5A7090',
} as const;

// ============================================
// Types
// ============================================

export interface LeadRow {
  id: string;
  name?: string | null;
  email?: string | null;
  businessName?: string | null;
  scores?: Record<string, number> | null;
  recommendation?: string | null;
  kalkuPotential?: {
    current?: number;
    withCapacity?: number;
    delta?: number;
  } | null;
  createdAt?: Date | string | null;
}

// Keep the SPIDER_DIMENSIONS in the documented display order
const SPIDER_DIMENSIONS: Array<{ key: string; label: string }> = [
  { key: 'social-media', label: 'Social Media' },
  { key: 'website', label: 'Website' },
  { key: 'branding', label: 'Branding' },
  { key: 'trust', label: 'Trust' },
  { key: 'auffindbarkeit', label: 'Auffindbarkeit' },
  { key: 'umsatzpotenzial', label: 'Umsatzpotenzial' },
  { key: 'mitarbeiter', label: 'Mitarbeiter' },
  { key: 'regional', label: 'Regionales Potenzial' },
];

const NEXT_STEPS = [
  'Kostenloses Erstgespraech vereinbaren und individuelle Potenziale besprechen.',
  'Maßnahmenplan für die drei wichtigsten Optimierungsfelder erstellen.',
  'Erste Quick-Wins umsetzen und Fortschritt nach 30 Tagen messen.',
];

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.white,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.slate,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.mist,
    marginVertical: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: COLORS.slate,
    width: 100,
  },
  value: {
    fontSize: 10,
    color: COLORS.navy,
    flex: 1,
  },
  // Dimension bar rows
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  dimLabel: {
    fontSize: 9,
    color: COLORS.navy,
    width: 100,
  },
  trackOuter: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.mist,
    borderRadius: 4,
  },
  trackInner: {
    height: 8,
    backgroundColor: COLORS.lightBlue,
    borderRadius: 4,
  },
  dimScore: {
    fontSize: 9,
    color: COLORS.slate,
    marginLeft: 6,
    width: 28,
    textAlign: 'right',
  },
  // Kalku 2-column
  kalkuRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kalkuCell: {
    flex: 1,
    backgroundColor: COLORS.porzellan,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  kalkuCellLabel: {
    fontSize: 9,
    color: COLORS.slate,
    marginBottom: 4,
  },
  kalkuCellValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
  },
  kalkuDeltaBox: {
    marginTop: 8,
    backgroundColor: COLORS.mist,
    borderRadius: 6,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  kalkuDeltaLabel: {
    fontSize: 9,
    color: COLORS.slate,
  },
  kalkuDeltaValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
  },
  // Recommendation box
  recBox: {
    backgroundColor: COLORS.porzellan,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.lightBlue,
    borderRadius: 4,
    padding: 12,
  },
  recText: {
    fontSize: 10,
    color: COLORS.navy,
    lineHeight: 1.5,
  },
  // Next steps list
  stepRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  stepNumber: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.lightBlue,
    width: 18,
  },
  stepText: {
    fontSize: 10,
    color: COLORS.navy,
    flex: 1,
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.slate,
  },
});

// ============================================
// Sub-components
// ============================================

function CustomerBlock({ lead }: { lead: LeadRow }) {
  const dateStr = lead.createdAt
    ? new Date(lead.createdAt).toLocaleDateString('de-DE')
    : new Date().toLocaleDateString('de-DE');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ihre Angaben</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{lead.name ?? '-'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>E-Mail</Text>
        <Text style={styles.value}>{lead.email ?? '-'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Praxis</Text>
        <Text style={styles.value}>{lead.businessName ?? '-'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Datum</Text>
        <Text style={styles.value}>{dateStr}</Text>
      </View>
    </View>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <View style={styles.trackOuter}>
      <View style={[styles.trackInner, { width: `${pct}%` }]} />
    </View>
  );
}

function SpiderBlock({ scores }: { scores: Record<string, number> }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ihr SPIDER-Score</Text>
      {SPIDER_DIMENSIONS.map((dim) => {
        const score = scores[dim.key] ?? 0;
        return (
          <View key={dim.key} style={styles.dimRow}>
            <Text style={styles.dimLabel}>{dim.label}</Text>
            <ScoreBar score={score} />
            <Text style={styles.dimScore}>{Math.round(score)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function formatEur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function KalkuBlock({ potential }: { potential: NonNullable<LeadRow['kalkuPotential']> }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ihr Umsatzpotenzial</Text>
      <View style={styles.kalkuRow}>
        <View style={styles.kalkuCell}>
          <Text style={styles.kalkuCellLabel}>Aktuell</Text>
          <Text style={styles.kalkuCellValue}>{formatEur(potential.current ?? 0)}</Text>
        </View>
        <View style={styles.kalkuCell}>
          <Text style={styles.kalkuCellLabel}>Mit Kapazitaet</Text>
          <Text style={styles.kalkuCellValue}>{formatEur(potential.withCapacity ?? 0)}</Text>
        </View>
      </View>
      {potential.delta != null && (
        <View style={styles.kalkuDeltaBox}>
          <Text style={styles.kalkuDeltaLabel}>Zusatzpotenzial:</Text>
          <Text style={styles.kalkuDeltaValue}>{formatEur(potential.delta)}</Text>
        </View>
      )}
    </View>
  );
}

function RecommendationBlock({ text }: { text: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ihre Empfehlung</Text>
      <View style={styles.recBox}>
        <Text style={styles.recText}>{text}</Text>
      </View>
    </View>
  );
}

function NextStepsBlock() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Naechste Schritte</Text>
      {NEXT_STEPS.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepNumber}>{i + 1}.</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================
// Main Document
// ============================================

function LeadReportDocument({ funnelName, lead }: { funnelName: string; lead: LeadRow }) {
  const scores: Record<string, number> =
    lead.scores && typeof lead.scores === 'object' ? (lead.scores as Record<string, number>) : {};

  const dateStr = new Date().toLocaleDateString('de-DE');

  return (
    <Document title="BeautyFlow Potenzialanalyse" author="BeautyFlow">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BeautyFlow Potenzialanalyse</Text>
          <Text style={styles.subtitle}>{funnelName} - Persoenliche Auswertung</Text>
        </View>

        <View style={styles.divider} />

        <CustomerBlock lead={lead} />
        <View style={styles.divider} />

        <SpiderBlock scores={scores} />
        <View style={styles.divider} />

        {lead.kalkuPotential && (
          <>
            <KalkuBlock potential={lead.kalkuPotential} />
            <View style={styles.divider} />
          </>
        )}

        {lead.recommendation && (
          <>
            <RecommendationBlock text={lead.recommendation} />
            <View style={styles.divider} />
          </>
        )}

        <NextStepsBlock />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>BeautyFlow - strukturiert, mit System, transparent</Text>
          <Text style={styles.footerText}>{dateStr}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ============================================
// Public API
// ============================================

export async function renderLeadReportPdf(args: { funnelName: string; lead: LeadRow }): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(LeadReportDocument, args) as any;
  const buf = await renderToBuffer(element);
  return Buffer.from(buf);
}
