# Asmali Konak – Website + Bot (Template-ready)

Diese Codebasis ist ein **übertragbares Template** für Restaurant-Websites mit Chat-Bot.  
**Single Source of Truth (SST):** `bot-data/bot.json`.  
Alle sichtbaren Inhalte + E-Mail-Flow werden daraus gespeist.

---

## Projektstruktur

├─ index.html
├─ favicon.ico
├─ styles/
│ ├─ site.css
│ └─ bot.css
├─ bot-data/
│ └─ bot.json ← Single Source of Truth
├─ bot/
│ ├─ loader.js ← lädt bot.json, optional EmailJS, dann Orchestrator
│ ├─ index.js ← Orchestrator (lädt Module sequentiell)
│ ├─ core.js
│ ├─ ui/
│ │ ├─ panel.js
│ │ ├─ styles-inject.js
│ │ └─ components/
│ │ ├─ buttons.js
│ │ └─ forms.js
│ ├─ services/
│ │ ├─ email.js ← EmailJS-Service (Senden, Auto-Reply)
│ │ └─ openHours.js
│ └─ flows/
│ ├─ home.js
│ ├─ speisen.js
│ ├─ reservieren.js
│ ├─ hours.js
│ ├─ kontakt.js
│ ├─ contactform.js
│ └─ faq.js
├─ images/
└─ pdf/


---

## Voraussetzungen

- GitHub Repository (dieses Template)
- GitHub Codespaces **oder** lokales Node/Python
- EmailJS-Account (Service + Templates)
- Browser (DevTools/Console)

---

## Setup (Repo → Codespace → Branch)

1. **Template verwenden:** `Use this template` → neues Repo.
2. **Codespace öffnen:** `Code` → `Codespaces` → `Create Codespace`.
3. **Arbeitsbranch anlegen:** Seitenleiste → Quellcodeverwaltung → `Branch…` → `work` → veröffentlichen.
4. **Testserver starten:** Terminal →  
   `python3 -m http.server 8080`  
   (Ports-Tab → Port 8080 Link öffnen)

---

## Assets tauschen

- `images/` & `pdf/` **1:1 ersetzen** (gleiche Dateinamen).
- Commit-Flow: **Stage → Commit → Push**.
- PR & Merge: `Compare & pull request` → `Merge`.

---

## EmailJS einrichten

1. **Service anlegen:**  
   - Name: `service_brand` (z. B. `service_asmali_konak`)  
   - Mit Kunden-E-Mail verbinden/verifizieren.

2. **Drei Templates klonen/benennen:**  
   - `template_kontakt_brand` (Kontakt / To: Kunde)  
   - `template_reserv_brand`  (Reservierung / To: Kunde)  
   - `template_kunde_brand`   (Auto-Reply / To: Gast)

3. **IDs notieren:** `publicKey`, `service`, `template_*`.

4. **Allowed Origins (wichtig, sonst 403):**  
   - Codespaces-URL `https://…app.github.dev`  
   - Optional lokal: `http://localhost:8080`

5. **Datenschutz (vor Livebetrieb):** DPA/AV mit EmailJS abschließen.

---

## Konfiguration (SST: `bot-data/bot.json`)

**Kanonische EMAIL-Keys (genau so):**
```json
"EMAIL": {
  "publicKey": "...",
  "service": "...",
  "contactTemplate": "...",
  "reservTemplate": "...",
  "autoReplyTemplate": "..."
}
