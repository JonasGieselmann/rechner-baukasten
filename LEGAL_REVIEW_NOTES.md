# Rechtstexte - offene Punkte vor Livegang (Jonas + Anwalt)

Die Texte unter `/impressum`, `/datenschutz`, `/agb` (Quelle: `src/lib/legalContent.ts`)
wurden aus dem verifizierten beauty-flow.de-Impressum/Datenschutz abgeleitet und an die
tatsaechliche Verarbeitung des Portals angepasst. Vor dem oeffentlichen Livegang bitte
anwaltlich pruefen und die folgenden Punkte bestaetigen/ergaenzen.

## Hoch (vor Livegang klaeren)

1. **Firma AKSME vs. Alen Media Solutions GmbH**
   Footer von beauty-flow.de nennt teils "AKSME GmbH" als Marke; im Handelsregister
   eingetragen ist "Alen Media Solutions GmbH" (HRB 226207, AG Hannover). Texte nutzen
   durchgaengig die Alen Media Solutions GmbH als Verantwortliche. Falls AKSME eine eigene
   juristische Person ist, Verantwortlichkeit/Art. 26 DSGVO klaeren.

2. **Verbraucher vs. Unternehmer (AGB § 12 Gerichtsstand)**
   Portal richtet sich primaer an Gewerbetreibende (B2B). Fester Gerichtsstand Hannover gilt
   nur gegenueber Unternehmern (so bereits formuliert). Falls auch Verbraucher Zugang haben,
   anwaltlich bestaetigen lassen.

3. **Kostenpflichtige Leistungen (AGB § 7)**
   Vor Aktivierung von Plaenen/Upsell ergaenzen: konkrete Preise, Abrechnung, Laufzeiten,
   Kuendigungsfristen, Widerrufsbelehrung nach § 355 BGB (14 Tage, falls Verbraucher),
   Zahlungsmodalitaeten/SEPA. Aktuell bewusst Platzhalter.

## Mittel (Datenschutzerklaerung praezisieren)

4. **Aufsichtsbehoerde (Datenschutz Abschnitt 13)**
   Eingetragen: LfD Niedersachsen, Prinzenstraße 5, 30159 Hannover, poststelle@lfd.niedersachsen.de.
   Zustaendigkeit + Adresse bitte bestaetigen.

5. **Speicherfristen konkretisieren (Datenschutz Abschnitt 11)**
   Konkrete Fristen fuer Server-Logs (z. B. 7/14/30 Tage) und Lead-Daten festlegen und eintragen.

6. **Auftragsverarbeiter benennen (Datenschutz Abschnitt 9)**
   Konkreten IaaS-/Rechenzentrumsanbieter des Server-Clusters und den SMTP-Dienst hinter
   nodemailer pruefen und ggf. als Auftragsverarbeiter (AVV Art. 28 DSGVO) benennen.

7. **Datenschutzbeauftragter / Verarbeitungsverzeichnis**
   Pruefen, ob nach Art. 37 DSGVO ein DSB noetig ist; Verzeichnis der Verarbeitungstaetigkeiten
   (Art. 30) fuehren.

## Hinweise

- EU-OS-Plattform: am 20.07.2025 eingestellt (VO EU 2024/3228). Kein OS-Link mehr - im
  Impressum und in den AGB bereits korrekt entfernt.
- Versionierung: Bei Aenderung der Texte `LEGAL_VERSIONS` in `server/legal.ts` hochzaehlen,
  damit der Consent-Log nachvollziehbar bleibt.
