// Single source of truth for the portal's legal pages (Impressum, Datenschutz, AGB).
// Texts adapted from the verified beauty-flow.de Impressum/Datenschutz to the
// portal's ACTUAL processing (self-hosted PostgreSQL, better-auth, nodemailer/SMTP,
// no third-party tracking). Open review items live in LEGAL_REVIEW_NOTES.md.
// Bump server/legal.ts LEGAL_VERSIONS when the privacy/terms wording changes.

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  key: 'impressum' | 'datenschutz' | 'agb';
  path: string;
  title: string;
  intro?: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const IMPRESSUM: LegalDoc = {
  key: 'impressum',
  path: '/impressum',
  title: 'Impressum',
  intro:
    'Impressum des BeautyFlow Customer Portals (kalku.layer-one.io) gemäß § 5 DDG und § 18 MStV.',
  lastUpdated: 'Stand: Juni 2026',
  sections: [
    {
      heading: 'Diensteanbieter',
      body: [
        'Alen Media Solutions GmbH',
        'Elly-Beinhorn-Straße 75\n30559 Hannover\nDeutschland',
        'Das BeautyFlow Customer Portal (kalku.layer-one.io) ist ein Angebot der Alen Media Solutions GmbH.',
      ],
    },
    {
      heading: 'Vertretung',
      body: ['Die Gesellschaft wird vertreten durch den Geschäftsführer: Alen Kocak.'],
    },
    {
      heading: 'Kontakt',
      body: ['E-Mail: kocak@aksme.de', 'Telefon: +49 171 4783402'],
    },
    {
      heading: 'Handelsregister',
      body: [
        'Eingetragen im Handelsregister des Amtsgerichts Hannover unter der Registernummer HRB 226207.',
      ],
    },
    {
      heading: 'Umsatzsteuer-Identifikationsnummer',
      body: [
        'Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: DE364512982.',
      ],
    },
    {
      heading: 'Verantwortlicher im Sinne des § 18 Abs. 2 MStV',
      body: ['Alen Kocak, Elly-Beinhorn-Straße 75, 30559 Hannover.'],
    },
    {
      heading: 'EU-Streitschlichtung und Verbraucherstreitbeilegung',
      body: [
        'Die Europäische Kommission hatte eine Plattform zur Online-Streitbeilegung (OS-Plattform) betrieben. Diese Plattform wurde am 20. Juli 2025 aufgrund der Verordnung (EU) Nr. 2024/3228 endgültig eingestellt. Ein Hinweis hierauf oder ein Link zur Plattform ist daher nicht mehr erforderlich.',
        'Die Alen Media Solutions GmbH ist nicht bereit und nicht verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle im Sinne des § 36 Verbraucherstreitbeilegungsgesetz (VSBG) teilzunehmen.',
      ],
    },
    {
      heading: 'Haftung für Inhalte',
      body: [
        'Die Inhalte dieses Portals wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann die Alen Media Solutions GmbH jedoch keine Gewähr übernehmen. Als Diensteanbieter ist sie gemäß § 7 Abs. 1 DDG für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Nach den §§ 8 bis 10 DDG besteht keine Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden die betreffenden Inhalte umgehend entfernt.',
      ],
    },
    {
      heading: 'Haftung für Links',
      body: [
        'Dieses Portal kann Links zu externen Webseiten Dritter enthalten, auf deren Inhalte die Alen Media Solutions GmbH keinen Einfluss hat. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seite verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße geprüft; rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung jedoch nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden betroffene Links umgehend entfernt.',
      ],
    },
    {
      heading: 'Urheberrecht',
      body: [
        'Die durch die Alen Media Solutions GmbH erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors oder Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden betroffene Inhalte umgehend entfernt.',
      ],
    },
  ],
};

export const DATENSCHUTZ: LegalDoc = {
  key: 'datenschutz',
  path: '/datenschutz',
  title: 'Datenschutzerklärung',
  intro:
    'Diese Datenschutzerklärung gilt ausschließlich für das Kundenportal unter kalku.layer-one.io (im Folgenden "Portal"). Für die Marketing-Website beauty-flow.de gilt eine gesonderte Datenschutzerklärung; die dort eingesetzten Dienste (z. B. Analyse- und Tracking-Tools) gelten für das Portal nicht.',
  lastUpdated: 'Stand: Juni 2026',
  sections: [
    {
      heading: '1. Verantwortlicher',
      body: [
        'Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist die Alen Media Solutions GmbH, Elly-Beinhorn-Straße 75, 30559 Hannover, Deutschland. Das Portal kalku.layer-one.io sowie das Produkt BeautyFlow sind Angebote der Alen Media Solutions GmbH; der Name AKSME wird im Markenauftritt geführt, ändert jedoch nichts an der juristischen Person als Verantwortliche.',
        'Handelsregistereintrag: Amtsgericht Hannover, HRB 226207. Umsatzsteuer-Identifikationsnummer: DE364512982. Gesetzlicher Vertreter und Geschäftsführer: Alen Kocak.',
        'Sie erreichen uns unter: E-Mail: kocak@aksme.de, Telefon: +49 171 4783402.',
      ],
    },
    {
      heading: '2. Geltungsbereich',
      body: [
        'Diese Erklärung beschreibt die Datenverarbeitung, die beim Betrieb des Portals unter kalku.layer-one.io stattfindet. Sie gilt nicht für die Marketing-Website beauty-flow.de. Im Portal werden keine Tracking-Cookies, kein Google Analytics, kein Meta Pixel und keine sonstigen Werbe- oder Drittanbieter-Analysedienste eingesetzt.',
      ],
    },
    {
      heading: '3. Hosting und Server-Protokolldateien',
      body: [
        'Das Portal wird auf einem eigenen Server-Cluster betrieben, der als Docker-Swarm-Umgebung über die Infrastruktur-Plattform Dokploy gesteuert wird. Dabei handelt es sich um eine selbst verwaltete Serverinfrastruktur; es wird kein externer Hosting-Dienstleister wie Vercel, Netlify oder vergleichbare Anbieter eingesetzt.',
        'Bei jedem Aufruf des Portals erzeugt der Webserver automatisch Protokolldateien. Diese enthalten in der Regel: IP-Adresse des anfragenden Geräts, Datum und Uhrzeit des Zugriffs, aufgerufene URL und Ressource, HTTP-Statuscode, übertragene Datenmenge sowie den übermittelten Browser-User-Agent.',
        'Die Verarbeitung dieser Daten dient der technisch einwandfreien Auslieferung des Portals sowie der Erkennung und Abwehr von Missbrauch und Angriffen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Unser berechtigtes Interesse besteht in der Sicherstellung des stabilen und sicheren Betriebs des Portals. Die Protokolldaten werden nur so lange aufbewahrt, wie es für den jeweiligen Sicherheitszweck erforderlich ist.',
      ],
    },
    {
      heading: '4. Cookies und lokale Speicherung',
      body: [
        'Das Portal setzt ausschließlich technisch notwendige Session-Cookies ein. Diese Cookies werden von der Authentifizierungslösung (better-auth) erzeugt und dienen einzig dazu, Ihre Anmeldung über die Dauer einer Sitzung aufrechtzuerhalten. Die Cookies sind mit den Flags httpOnly und sameSite=lax konfiguriert; in der Produktionsumgebung ist zusätzlich das Secure-Flag gesetzt, sodass die Übertragung ausschließlich über verschlüsselte HTTPS-Verbindungen erfolgt.',
        'Tracking-Cookies, Analyse-Cookies, Werbe-Cookies oder Cookies von Drittanbietern werden im Portal nicht gesetzt. Eine Einwilligung für Cookies ist daher nicht erforderlich, da ausschließlich für den Betrieb des Portals unbedingt notwendige Cookies verwendet werden.',
        'Rechtsgrundlage für den Einsatz dieser Session-Cookies ist Art. 6 Abs. 1 lit. b DSGVO (Erforderlichkeit zur Vertragserfüllung), soweit die Cookies den Zugang zu Ihrem Konto und den von Ihnen genutzten Diensten ermöglichen.',
      ],
    },
    {
      heading: '5. Registrierung und Kontoverwaltung',
      body: [
        'Um das Portal nutzen zu können, können Sie ein Benutzerkonto anlegen. Bei der Registrierung erheben wir folgende Daten: Ihren Namen, Ihre E-Mail-Adresse, ein selbst gewähltes Passwort sowie optionale Angaben zu Ihrer Praxis (z. B. Praxisname, Website). Ihr Passwort wird niemals im Klartext gespeichert, sondern mittels des kryptographischen Verfahrens scrypt gehasht.',
        'Die Verarbeitung dieser Daten ist erforderlich, um Ihnen Zugang zum Portal zu ermöglichen und den Nutzungsvertrag mit Ihnen zu erfüllen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.',
        'Ihre Kontodaten werden für die Dauer Ihres Accounts gespeichert. Sie können Ihr Konto jederzeit selbst über die entsprechende Funktion im Portal löschen; mit der Löschung des Kontos werden Ihre personenbezogenen Daten gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
      ],
    },
    {
      heading: '6. Potenzialanalyse und Lead-Daten',
      body: [
        'Das Portal enthält einen Rechner bzw. Funnel zur Potenzialanalyse für Beauty- und Ästhetikpraxen. Im Rahmen dieser Analyse erheben wir folgende Daten: Ihren Namen, Ihre E-Mail-Adresse, Ihre Telefonnummer, den Namen Ihrer Praxis, Ihre Website-URL, Ihren Instagram-Handle, Angaben zu Ihrem Google-My-Business-Profil sowie Ihre Antworten auf die Analysefragen. Auf Basis dieser Eingaben berechnet das System Scores und ein individuelles Umsatzpotenzial.',
        'Sofern Sie eine Website-URL oder einen Instagram-Handle angeben, ruft das Portal diese öffentlich zugänglichen Seiten automatisiert ab und wertet sie aus, um objektive Branding- und Sichtbarkeitssignale (z. B. einen Website-Branding-Score oder die öffentliche Follower-Zahl) als Teil der von Ihnen angeforderten Analyse zu ermitteln. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung der auf Ihre Anfrage hin angeforderten Analyse). Die dabei gewonnenen Informationen werden ausschließlich für Ihre Auswertung verwendet und nicht an Dritte weitergegeben.',
        'Die Verarbeitung dieser Daten dient der Erstellung der von Ihnen angeforderten Analyse und der Zusendung des personalisierten PDF-Reports. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des auf Ihre Anfrage hin begründeten vorvertraglichen Verhältnisses).',
        'Die berechneten Scores und das Umsatzpotenzial dienen ausschließlich der Ergebnisdarstellung innerhalb des Portals und sind auf Ihre ausdrückliche Anfrage hin individuell berechnet. Es werden keine rechtlich erheblichen oder ähnlich bedeutsamen automatisierten Entscheidungen im Sinne von Art. 22 DSGVO getroffen.',
        'Die Lead-Daten werden nur so lange gespeichert, wie es zur Bereitstellung der Analyse und des Reports erforderlich ist oder bis Sie einen Widerruf bzw. eine Löschung beantragen.',
      ],
    },
    {
      heading: '7. E-Mail-Versand',
      body: [
        'Das Portal versendet E-Mails über die Node.js-Bibliothek nodemailer per SMTP. Es werden zwei Kategorien von E-Mails unterschieden.',
        'Transaktionale E-Mails: Nach Abschluss der Potenzialanalyse senden wir Ihnen auf Ihre Anfrage hin den personalisierten PDF-Report per E-Mail zu. Dieser Versand ist technisch zur Erfüllung der von Ihnen angeforderten Leistung erforderlich. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.',
        'Marketing-E-Mails: Für etwaige weitere E-Mails, die nicht unmittelbar der Vertragserfüllung dienen (z. B. Newsletter, Angebote, Produktinformationen), holen wir Ihre ausdrückliche Einwilligung im Double-Opt-in-Verfahren ein. Sie erhalten zunächst eine Bestätigungsmail; erst nach Bestätigung des enthaltenen Links wird Ihre Einwilligung wirksam. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Jede nicht rein transaktionale E-Mail enthält einen gut sichtbaren Abmeldelink. Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, ohne dass die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung berührt wird.',
      ],
    },
    {
      heading: '8. Datensicherheit',
      body: [
        'Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten vor unbefugtem Zugriff, Verlust oder Missbrauch zu schützen. Die Kommunikation zwischen Ihrem Browser und dem Portal erfolgt ausschließlich über eine verschlüsselte HTTPS-Verbindung. Passwörter werden ausschließlich in gehashter Form (scrypt) in der Datenbank gespeichert. Session-Cookies sind gegen Zugriff durch clientseitige Skripte geschützt (httpOnly) und werden in der Produktionsumgebung nur über verschlüsselte Verbindungen übertragen (Secure-Flag).',
        'Die zugrunde liegende Datenbank ist ein selbst gehostetes PostgreSQL-System, das sich auf dem eigenen Server-Cluster befindet und nicht öffentlich zugänglich ist.',
      ],
    },
    {
      heading: '9. Empfänger und Auftragsverarbeiter',
      body: [
        'Wir verarbeiten Ihre Daten grundsätzlich auf eigenen Servern. Eine Übermittlung an Dritte zu Marketingzwecken findet nicht statt.',
        'Soweit wir für den technischen Betrieb der Server-Infrastruktur oder den E-Mail-Versand externe Dienstleister einsetzen, werden diese als Auftragsverarbeiter gemäß Art. 28 DSGVO vertraglich gebunden. Diese Dienstleister verarbeiten Ihre Daten ausschließlich nach unserer Weisung und für die beschriebenen Zwecke.',
        'Eine Übermittlung von Daten in Drittländer außerhalb des Europäischen Wirtschaftsraums (EWR) findet nicht statt, sofern nicht im Einzelfall ausdrücklich darauf hingewiesen wird.',
      ],
    },
    {
      heading: '10. Rechtsgrundlagen im Überblick',
      body: [
        'Die Datenverarbeitung im Portal stützt sich auf folgende Rechtsgrundlagen der DSGVO: Art. 6 Abs. 1 lit. a (Einwilligung) für Marketing-E-Mails sowie den Double-Opt-in-Prozess. Art. 6 Abs. 1 lit. b (Vertragserfüllung oder vorvertragliche Maßnahmen) für die Registrierung und Kontoverwaltung, die Erstellung der Potenzialanalyse und den Versand des angeforderten PDF-Reports. Art. 6 Abs. 1 lit. f (berechtigtes Interesse) für Server-Protokolldateien zur Gewährleistung der Betriebssicherheit und zur Abwehr von Angriffen.',
      ],
    },
    {
      heading: '11. Speicherdauer',
      body: [
        'Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die jeweiligen Verarbeitungszwecke erforderlich ist oder wie es gesetzliche Aufbewahrungspflichten vorschreiben.',
        'Kontodaten werden für die Dauer des bestehenden Nutzerkontos gespeichert. Nach Löschung des Kontos werden die zugehörigen personenbezogenen Daten gelöscht, sofern keine handels- oder steuerrechtlichen Aufbewahrungsfristen (in der Regel 6 oder 10 Jahre nach HGB und AO) entgegenstehen.',
        'Lead- und Analysedaten werden gespeichert, bis der Zweck der Analyse erfüllt ist, das Konto gelöscht wird oder Sie eine Löschung verlangen.',
        'Server-Protokolldateien werden für einen begrenzten, sicherheitsrelevanten Zeitraum aufbewahrt und danach gelöscht.',
        'Ihre Einwilligung für Marketing-E-Mails und die damit verbundenen Kontaktdaten werden bis zum Widerruf der Einwilligung gespeichert.',
      ],
    },
    {
      heading: '12. Ihre Rechte als betroffene Person',
      body: [
        'Sie haben nach der DSGVO folgende Rechte gegenüber uns als Verantwortlichem:',
        'Auskunftsrecht (Art. 15 DSGVO): Sie können Auskunft darüber verlangen, ob und welche personenbezogenen Daten wir von Ihnen verarbeiten.',
        'Recht auf Berichtigung (Art. 16 DSGVO): Sie können die Berichtigung unrichtiger oder die Vervollständigung unvollständiger Daten verlangen.',
        'Recht auf Löschung (Art. 17 DSGVO): Sie können unter den gesetzlichen Voraussetzungen die Löschung Ihrer Daten verlangen. Im Portal steht Ihnen hierfür eine Self-Service-Funktion zur Kontoschließung und -löschung zur Verfügung.',
        'Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO): Unter bestimmten Voraussetzungen können Sie verlangen, dass wir die Verarbeitung Ihrer Daten einschränken.',
        'Recht auf Datenübertragbarkeit (Art. 20 DSGVO): Für Daten, die Sie uns bereitgestellt haben und die auf Basis Ihrer Einwilligung oder eines Vertrags verarbeitet werden, können Sie eine maschinenlesbare Kopie in einem gängigen Format anfordern. Im Portal steht Ihnen dafür eine Self-Service-Exportfunktion (JSON-Format) zur Verfügung.',
        'Widerspruchsrecht (Art. 21 DSGVO): Sie können der Verarbeitung Ihrer Daten, die auf Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) gestützt wird, aus Gründen widersprechen, die sich aus Ihrer besonderen Situation ergeben.',
        'Recht auf Widerruf einer Einwilligung (Art. 7 Abs. 3 DSGVO): Wenn die Verarbeitung auf Ihrer Einwilligung beruht (z. B. Marketing-E-Mails), können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen. Der Widerruf berührt nicht die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung. Im Portal steht Ihnen hierfür eine Self-Service-Funktion zur Verfügung; alternativ können Sie sich per E-Mail an uns wenden.',
        'Zur Ausübung Ihrer Rechte wenden Sie sich bitte per E-Mail an kocak@aksme.de oder schriftlich an die oben genannte Anschrift.',
      ],
    },
    {
      heading: '13. Beschwerderecht bei einer Aufsichtsbehörde',
      body: [
        'Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren (Art. 77 DSGVO). Für die Alen Media Solutions GmbH mit Sitz in Hannover ist grundsätzlich die für Niedersachsen zuständige Aufsichtsbehörde zuständig: Die Landesbeauftragte für den Datenschutz Niedersachsen, Prinzenstraße 5, 30159 Hannover, poststelle@lfd.niedersachsen.de.',
      ],
    },
    {
      heading: '14. Änderungen dieser Datenschutzerklärung',
      body: [
        'Wir behalten uns vor, diese Datenschutzerklärung anzupassen, soweit sich die rechtlichen oder technischen Rahmenbedingungen ändern. Die jeweils aktuelle Fassung ist im Portal abrufbar. Wir empfehlen Ihnen, diese Erklärung regelmäßig zu prüfen.',
      ],
    },
  ],
};

export const AGB: LegalDoc = {
  key: 'agb',
  path: '/agb',
  title: 'Allgemeine Geschäftsbedingungen',
  intro:
    'Allgemeine Geschäftsbedingungen der Alen Media Solutions GmbH für die Nutzung des BeautyFlow Customer Portals (kalku.layer-one.io).',
  lastUpdated: 'Stand: Juni 2026',
  sections: [
    {
      heading: '§ 1 Anbieter und Geltungsbereich',
      body: [
        'Anbieter des BeautyFlow Customer Portals unter der Adresse kalku.layer-one.io (nachfolgend "Portal") ist die Alen Media Solutions GmbH, Elly-Beinhorn-Straße 75, 30559 Hannover, Deutschland, vertreten durch den Geschäftsführer Alen Kocak, eingetragen im Handelsregister des Amtsgerichts Hannover unter HRB 226207, Umsatzsteuer-Identifikationsnummer DE364512982 (nachfolgend "Anbieter"). Das Portal wird unter der Marke BeautyFlow betrieben.',
        'Diese Allgemeinen Geschäftsbedingungen (AGB) regeln das Vertragsverhältnis zwischen dem Anbieter und natürlichen oder juristischen Personen, die das Portal nutzen (nachfolgend "Nutzer"). Das Portal richtet sich in erster Linie an Inhaber und Betreiber von Beauty- und Ästhetikpraxen sowie vergleichbaren Gewerbetreibenden, die das Tool im Rahmen ihrer unternehmerischen Tätigkeit einsetzen.',
        'Abweichende, entgegenstehende oder ergänzende Bedingungen des Nutzers werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt deren Geltung ausdrücklich und schriftlich zu.',
      ],
    },
    {
      heading: '§ 2 Vertragsgegenstand und Leistungsbeschreibung',
      body: [
        'Der Anbieter stellt Nutzern über das Portal ein Kundenportal und ein Analyse-Tool (nachfolgend "Potenzialanalyse") für Beauty- und Ästhetikpraxen bereit. Der kostenfreie Zugang (Freemium-Stufe) umfasst insbesondere: die Durchführung einer interaktiven Potenzialanalyse zur Einschätzung von Geschäftsmöglichkeiten, die Erstellung und Bereitstellung eines individuellen PDF-Reports mit den Analyseergebnissen, den Zugang zu einem persönlichen Dashboard und zu praxisbezogenen Leitfäden sowie die Verwaltung des eigenen Nutzerkontos.',
        'Die im Rahmen der Potenzialanalyse ermittelten Werte, Scores und Umsatzpotenziale sind unverbindliche Schätzungen und stellen keine Garantie, Prognose oder Zusicherung tatsächlich erzielbarer Ergebnisse dar. Der Anbieter übernimmt keine Gewähr für die wirtschaftliche Richtigkeit oder die Vollständigkeit der berechneten Werte. Die Ergebnisse basieren auf den vom Nutzer eingegebenen Daten und heuristischen Berechnungsmodellen; sie ersetzen keine individuelle Unternehmensberatung.',
        'Der Anbieter ist berechtigt, den Funktionsumfang des Portals weiterzuentwickeln, anzupassen und zu erweitern, sofern dies die vertraglich vereinbarten Kernleistungen nicht wesentlich beeinträchtigt. Für etwaige kostenpflichtige Leistungsstufen gelten ergänzend die Regelungen in § 7 dieser AGB.',
      ],
    },
    {
      heading: '§ 3 Registrierung und Konto',
      body: [
        'Die Nutzung des Portals setzt eine Registrierung voraus. Zur Registrierung sind mindestens folgende Angaben erforderlich: Name, E-Mail-Adresse und ein selbst gewähltes Passwort. Ergänzend können Angaben zur Praxis (Praxisname, Website-URL, Social-Media-Handles u. ä.) gemacht werden. Der Nutzer ist für die Richtigkeit und Aktualität seiner Angaben verantwortlich.',
        'Mit dem Abschluss der Registrierung kommt ein Nutzungsvertrag zwischen dem Anbieter und dem Nutzer zu den Bedingungen dieser AGB zustande. Ein Anspruch auf Registrierung oder Zugang besteht nicht; der Anbieter kann die Annahme einer Registrierung ohne Angabe von Gründen ablehnen.',
        'Der Nutzer ist verpflichtet, seine Zugangsdaten (insbesondere das Passwort) vertraulich zu behandeln und vor dem Zugriff Dritter zu schützen. Bei Verdacht auf unbefugte Nutzung des Kontos ist der Anbieter unverzüglich unter kocak@aksme.de zu informieren. Für Schäden, die aus einer schuldhaften Verletzung der Geheimhaltungspflicht entstehen, haftet der Nutzer.',
        'Jede natürliche oder juristische Person darf nur ein Konto einrichten. Die Übertragung des Kontos auf Dritte ist nicht gestattet.',
      ],
    },
    {
      heading: '§ 4 Pflichten des Nutzers',
      body: [
        'Der Nutzer verpflichtet sich, das Portal ausschließlich im Rahmen der geltenden Rechtsordnung und dieser AGB zu nutzen. Es ist insbesondere untersagt, das Portal oder seine Inhalte für rechtswidrige Zwecke einzusetzen, in die Systeme des Anbieters einzugreifen oder diese zu beschädigen, automatisierte Zugriffe (Scraping, Bots, Crawler) ohne ausdrückliche Genehmigung des Anbieters durchzuführen, Schadcode (Viren, Trojaner u. ä.) zu verbreiten sowie falsche Identitäten oder unrichtige Angaben bei der Registrierung oder der Potenzialanalyse zu verwenden.',
        'Der Nutzer stellt sicher, dass die von ihm im Rahmen der Potenzialanalyse eingegebenen Daten (einschließlich etwaiger personenbezogener Daten Dritter) rechtmäßig erhoben wurden und er zur Verarbeitung im Rahmen des Portals berechtigt ist. Der Anbieter ist in diesem Zusammenhang nicht für die inhaltliche Richtigkeit der Nutzereingaben verantwortlich.',
        'Kommt der Nutzer seinen Pflichten aus diesen AGB nicht nach, ist der Anbieter berechtigt, den Zugang zum Portal vorübergehend zu sperren oder das Konto dauerhaft zu löschen.',
      ],
    },
    {
      heading: '§ 5 Verfügbarkeit des Portals',
      body: [
        'Der Anbieter bemüht sich, das Portal mit möglichst hoher Verfügbarkeit bereitzustellen. Ein Anspruch auf ununterbrochene, fehlerfreie oder uneingeschränkte Verfügbarkeit besteht nicht, insbesondere da das Portal in der Freemium-Stufe unentgeltlich angeboten wird.',
        'Der Anbieter ist berechtigt, das Portal für Wartungsarbeiten, Updates oder aus sicherheitsrelevanten Gründen vorübergehend ganz oder teilweise nicht zugänglich zu machen. Soweit möglich, wird der Anbieter geplante Wartungsunterbrechungen im Voraus ankündigen.',
        'Ausfälle infolge höherer Gewalt, Störungen im Internet, Handlungen Dritter oder sonstiger Umstände, die außerhalb des Einflussbereichs des Anbieters liegen, begründen keine Haftung des Anbieters.',
      ],
    },
    {
      heading: '§ 6 Nutzungsrechte',
      body: [
        'Der Anbieter räumt dem Nutzer ein nicht ausschließliches, nicht übertragbares und widerrufliches Recht ein, das Portal und seine Inhalte im Rahmen dieser AGB für eigene, nicht-kommerzielle oder berufliche Zwecke im Zusammenhang mit der eigenen Praxistätigkeit zu nutzen.',
        'Alle Rechte an der Software, den Inhalten, Designs, Marken und sonstigen Schutzgegenständen des Portals verbleiben beim Anbieter oder seinen Lizenzgebern. Der Nutzer erwirbt durch die Nutzung des Portals keinerlei Eigentumsrechte an diesen Schutzgegenständen.',
        'Der vom System generierte PDF-Report der Potenzialanalyse darf vom Nutzer für eigene betriebliche Zwecke verwendet, ausgedruckt und intern weitergegeben werden. Eine Vervielfältigung, Verbreitung oder öffentliche Zugänglichmachung des Reports oder sonstiger Portal-Inhalte zu kommerziellen Zwecken ist ohne vorherige schriftliche Zustimmung des Anbieters nicht gestattet.',
      ],
    },
    {
      heading: '§ 7 Kostenpflichtige Leistungen',
      body: [
        'Das Portal bietet derzeit eine kostenfreie Grundnutzung (Freemium). Der Anbieter behält sich vor, zukünftig kostenpflichtige Leistungsstufen oder Zusatzleistungen (z. B. erweiterte Analysefunktionen, Premium-Dashboard, individuelle Beratungsleistungen) einzuführen.',
        'Vor der Aktivierung kostenpflichtiger Leistungen wird der Anbieter den Nutzer klar und unmissverständlich über den Preis, den Abrechnungszeitraum, die Vertragslaufzeit und gegebenenfalls bestehende Widerrufsrechte informieren. Eine Berechnung kostenpflichtiger Leistungen erfolgt erst nach ausdrücklicher Zustimmung des Nutzers.',
        'Die konkrete Ausgestaltung kostenpflichtiger Leistungen, einschließlich Preisen, Zahlungsbedingungen, Laufzeiten und etwaigen Widerrufsbelehrungen gemäß §§ 312 ff. BGB, wird in separaten Leistungsbeschreibungen oder ergänzenden Vertragsbedingungen zum Zeitpunkt der Buchung geregelt.',
      ],
    },
    {
      heading: '§ 8 Haftungsbeschränkung',
      body: [
        'Der Anbieter haftet unbeschränkt für Schäden, die auf Vorsatz oder grober Fahrlässigkeit des Anbieters oder seiner Erfüllungsgehilfen beruhen, für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie in den Fällen zwingender gesetzlicher Haftung, insbesondere nach dem Produkthaftungsgesetz.',
        'Bei der Verletzung wesentlicher Vertragspflichten (Kardinalpflichten), also solcher Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Nutzer regelmäßig vertrauen darf, haftet der Anbieter bei leichter Fahrlässigkeit dem Grunde nach, jedoch der Höhe nach begrenzt auf den vorhersehbaren, vertragstypischen Schaden.',
        'Im Übrigen ist die Haftung des Anbieters für leicht fahrlässig verursachte Schäden ausgeschlossen. Da das Portal in der Freemium-Stufe unentgeltlich erbracht wird, ist der Haftungsausschluss für leichte Fahrlässigkeit außerhalb der vorstehend genannten Fälle angemessen und zumutbar.',
        'Der Anbieter übernimmt insbesondere keine Haftung für die inhaltliche Richtigkeit der Potenzialanalyse-Ergebnisse, für wirtschaftliche Entscheidungen, die der Nutzer auf Grundlage der Analyseergebnisse trifft, für den vorübergehenden Ausfall des Portals sowie für Schäden, die durch Eingaben des Nutzers oder durch Dritte verursacht werden.',
        'Soweit die Haftung des Anbieters ausgeschlossen oder beschränkt ist, gilt dies auch für die persönliche Haftung der Angestellten, Vertreter und Erfüllungsgehilfen des Anbieters.',
      ],
    },
    {
      heading: '§ 9 Datenschutz',
      body: [
        'Die Verarbeitung personenbezogener Daten der Nutzer erfolgt in Übereinstimmung mit der Datenschutz-Grundverordnung (DSGVO) und den einschlägigen nationalen Datenschutzgesetzen. Einzelheiten zu Art, Umfang und Zweck der Datenverarbeitung, zu den Rechtsgrundlagen, zu den Betroffenenrechten (insbesondere Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch) sowie zu den technischen Maßnahmen des Portals entnehmen Sie bitte der gesonderten Datenschutzerklärung des Anbieters.',
        'Der Anbieter weist darauf hin, dass das Portal Self-Service-Funktionen für den Datenexport (JSON), den Widerruf erteilter Einwilligungen und die Kontolöschung unmittelbar im Nutzerkonto bereitstellt. Für weitere datenschutzbezogene Anliegen steht der Anbieter unter kocak@aksme.de zur Verfügung.',
      ],
    },
    {
      heading: '§ 10 Laufzeit, Kündigung und Kontolöschung',
      body: [
        'Der Nutzungsvertrag wird auf unbestimmte Zeit geschlossen. Der Nutzer kann seinen Account und damit den Nutzungsvertrag jederzeit und ohne Einhaltung einer Frist kündigen, indem er die Kontolöschungsfunktion im Portal nutzt oder eine entsprechende Mitteilung an kocak@aksme.de sendet. Mit der Kontolöschung werden die personenbezogenen Daten des Nutzers nach Maßgabe der Datenschutzerklärung und der gesetzlichen Aufbewahrungspflichten gelöscht oder gesperrt.',
        'Der Anbieter kann den Nutzungsvertrag jederzeit mit einer Frist von 30 Tagen ordentlich kündigen, sofern nicht ein wichtiger Grund zur fristlosen Kündigung vorliegt. Ein wichtiger Grund liegt insbesondere vor, wenn der Nutzer gegen wesentliche Pflichten dieser AGB verstößt, das Portal für rechtswidrige Zwecke einsetzt oder falsche Angaben bei der Registrierung gemacht hat.',
        'Im Fall der Kündigung durch den Anbieter wird der Nutzer vorab per E-Mail informiert, soweit dies möglich und zumutbar ist. Die kostenfreie Nutzung begründet keinen Anspruch auf dauerhafte Bereitstellung des Portals oder einzelner Funktionen.',
      ],
    },
    {
      heading: '§ 11 Änderungen dieser AGB',
      body: [
        'Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft zu ändern, insbesondere bei Änderungen der angebotenen Leistungen, bei rechtlichen Anforderungen oder aus sonstigen sachlichen Gründen.',
        'Über Änderungen wird der Nutzer per E-Mail an die im Konto hinterlegte Adresse informiert, und zwar mindestens 30 Tage vor Inkrafttreten der geänderten AGB. Widerspricht der Nutzer den Änderungen nicht innerhalb dieser Frist, gelten die geänderten AGB als angenommen. Auf dieses Widerspruchsrecht und die Folgen des Ausbleibens eines Widerspruchs wird der Anbieter in der Ankündigungs-E-Mail gesondert hinweisen.',
        'Widerspricht der Nutzer fristgerecht, ist der Anbieter berechtigt, das Nutzungsverhältnis zum Zeitpunkt des Inkrafttretens der geänderten AGB zu beenden.',
      ],
    },
    {
      heading: '§ 12 Schlussbestimmungen',
      body: [
        'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).',
        'Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist, soweit der Nutzer Unternehmer, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist, Hannover. Gegenüber Verbrauchern gilt der gesetzliche Gerichtsstand.',
        'Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle ist der Anbieter weder verpflichtet noch bereit.',
        'Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam oder undurchführbar sein oder werden, berührt dies die Wirksamkeit der übrigen Bestimmungen nicht. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung, die dem wirtschaftlichen Zweck der unwirksamen Regelung am nächsten kommt.',
        'Diese AGB stellen die vollständige Vereinbarung zwischen dem Anbieter und dem Nutzer in Bezug auf den Nutzungsvertrag dar und ersetzen alle früheren mündlichen oder schriftlichen Absprachen zu diesem Gegenstand, soweit nicht in dieser AGB ausdrücklich anderes bestimmt ist.',
      ],
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [IMPRESSUM, DATENSCHUTZ, AGB];

export const LEGAL_FOOTER_LINKS = LEGAL_DOCS.map((d) => ({ label: d.title, path: d.path }));
