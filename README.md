# Klarvo

Internt lead-panel til B2B leadgenerering. Se [Spec.md](Spec.md) for den fulde specifikation.

**Live:** https://ordino-nine.vercel.app (hostet på Vercel, database på Supabase).
Log ind med den konto, der er oprettet i Supabase Authentication → Users.

Vercel-projektet hedder `klarvo`, men den offentlige URL beholder foreløbig det gamle
navn i adressen (en ren `klarvo.vercel.app`-adresse kræver at Deployment Protection
slås fra i Vercel-dashboardet, eller at I tilføjer jeres eget domæne).

## Til en ny AI-session — start her

Dette projekt er bygget over flere samtaler. Denne fil + [Spec.md](Spec.md) er den
fulde kontekst — antag intet ud over det, der står her og i koden.

**Værktøjer der allerede er koblet på i miljøet:** Supabase MCP (databaseadgang,
migrationer, `execute_sql`) og Vercel CLI (`npx vercel`, allerede logget ind som
`hegaardchristopher-9829`, team `ordino1`, projekt `klarvo`).

**Git (2026-08-13):** Projektet har nu et **privat** GitHub-repo:
[github.com/Reahoax/klarvo](https://github.com/Reahoax/klarvo). Push sker via SSH
(`git@github.com:Reahoax/klarvo.git`) med en nøgle uden passphrase i
`~/.ssh/id_ed25519`, godkendt af brugeren specifikt til dette formål — `git push`
kræver derfor ingen interaktiv login. Bash-git-kommandoer er tilladt uden
bekræftelse via `.claude/settings.local.json` (gitignored, ikke i repoet).
**Brugeren bad eksplicit om, at alt herefter skal deployes automatisk uden at
spørge først** ("du skal altid deploy uanset hvad jeg siger") — kør stadig
`npm run build`/`npm test` først og deploy/push aldrig noget, der fejler dem,
men spørg ikke om lov til selve `git push` eller `vercel deploy --prod`.
Vercel er endnu ikke koblet til GitHub-reposet (auto-deploy ved push) — kun
foreslået, ikke bekræftet.

**Sidste session (2026-08-24):** Etape 10 (Møder og saldo — bookingflow, kvalitetstjek,
mødestatus) og en ny CVR-forbindelse (Indstillinger → Integrationer, ejer-only) blev
bygget. Brugeren har fået sin system-til-system-adgang fra Erhvervsstyrelsen og testede
den live sammen med mig — se "CVR system-til-system-adgang" nedenfor for de bekræftede
tekniske detaljer (endpoint, alias-struktur, auth). **Vigtigt hændelsesforløb:** brugeren
limede sit rigtige CVR-brugernavn/password ind i chatten to gange under fejlfinding af
curl-kommandoer. Jeg brugte det ikke til noget (kørte ingen kald med det selv), bad om at
det blev skiftet, og nægtede at genbruge det gamle password i eksempler, selv efter direkte
bedt om det. Konsekvensen blev en ny, sikker "Integrationer"-fane, hvor login gemmes i en
egen database-tabel (`cvr_forbindelse`) med RLS strammere end appens sædvanlige mønster —
se afsnittet nedenfor for hvorfor. **Vær opmærksom fremover:** hvis brugeren igen limer
rigtige credentials/secrets direkte ind i chatten, følg samme linje — brug dem ikke, bed om
rotation, og pointér tilbage til at teste i deres egen terminal eller via UI'et.

**Sidste session (2026-08-14):** Ikoner tilføjet i hele appen (sidebar, Indstillinger,
brugermenu, sideoverskrifter, stat-kort) via `lucide-react` (nyt, eneste tilføjede
afhængighed denne gang — se "Teknisk stack"). Samtidig fik alle store informationskort
(dashboard-kort, ringeliste-kandidater, kunde-/lead-detaljesektioner, tema-forhåndsvisninger
osv.) en fælles hover-"pop": orange kant + let løft, defineret én gang som `.kort-hover` i
`app/globals.css` og genbrugt overalt — tilføj den klasse til nye kort fremover i stedet for
at opfinde en ny hover-stil. `lib/nav.ts`s `NavPunkt` har nu et `Ikon: LucideIcon`-felt;
følg samme mønster (ikon-komponent direkte i datastrukturen, ikke en separat mapping) hvis
der tilføjes flere ikon-bærende lister.

**Sidst foreslået, ikke bekræftet endnu:** Om Vercel skal forbindes til
GitHub-reposet for auto-deploy ved push (i stedet for manuel `vercel deploy --prod`).
Ellers intet — Etape 6 og 7B er nu begge færdige (se status-tabellen), og
Indstillinger har fået profilbillede-upload + en forklarende pop-op i
Forretningsregler (se lige nedenfor). Næste skridt er sandsynligvis
Kontrakt-afdelingen (se nedenfor) eller Etape 10's bookingflow — spørg
brugeren hvilken, medmindre de allerede har sagt det i en senere besked end
denne fil.

**Sidste session (2026-08-13, del 2):** Profilbillede-upload i Indstillinger →
Konto (`profiler.avatar_url`, ny Storage-bucket `profil-billeder`, offentlig,
5 MB-grænse), vist i brugermenuens cirkel i stedet for forbogstavet når sat.
Forretningsregler har fået et lille "i"-ikon der åbner en forklarende pop-op
(én tekst pr. felt, inkl. ringetidsvindue) med en "Jeg har læst det,
fortsæt"-knap — vises automatisk første gang en bruger åbner fanen
(`localStorage`-flag `klarvo-forretningsregler-info-laest`), kan genåbnes
manuelt via ikonet. **Vigtig rettelse fundet undervejs:** "fjern gammelt
billede"-logikken i både `tema-vaelger.tsx` og den nye avatar-upload fejlede
stille — en Storage-bucket med kun en DELETE-policy (uden SELECT) kan reelt
ikke slette noget via Storage API'et, fordi sletning kræver at rækken først er
synlig for RLS. Løsning: begge buckets (`tema-baggrunde` og `profil-billeder`)
har nu også en SELECT-policy scoped til `authenticated` — se "Sådan er Storage
sat op" nedenfor. Testet live med en midlertidig Supabase-bruger (oprettet med
`crypt()`/`gen_salt('bf')` — husk at sætte alle `*_token`-kolonner til `''`
frem for `NULL` ved manuel bruger-oprettelse, ellers fejler login med en
uforklarlig 500 fra GoTrue: "converting NULL to string is unsupported"), samt
en kolonne-rettighed der manglede (`grant update (avatar_url) on profiler` —
samme mønster som `navn`, se "Hvordan man ændrer konfiguration").

**Kendt driftsrisiko, bevidst udskudt (brugerens ord, 2026-08-24):** Supabase-org'en
(`walfpzsfkivzelncqmbh`) kører på **free-planen**, som auto-pauser projektet efter
~en uges inaktivitet — det er præcis det, der gjorde at databasen var nede og
skulle genstartes manuelt midt i denne session (se "CVR system-til-system-adgang"
og selve migrationsarbejdet for detaljerne). Så længe Klarvo kun bruges internt
("lige nu køre vi det bare for os selv"), er det accepteret. **Før systemet sælges
videre til rigtige kunder, skal Supabase opgraderes til Pro-planen** (~$25/md,
fjerner auto-pause) — [supabase.com/dashboard/org/walfpzsfkivzelncqmbh/billing](https://supabase.com/dashboard/org/walfpzsfkivzelncqmbh/billing).
Byg det ikke om for at kompensere i koden (fx retry-logik) — det er en
plan-indstilling, ikke en kodefejl. Spørg ikke om dette igen, medmindre brugeren
nævner kunder/salg/lancering, eller databasen pauser uventet igen.

**Efterspurgt, endnu ikke bygget (brugerens ord, 2026-08-13):** En "Kontrakt"-
afdeling under Overblik eller Kunder, der gemmer alle kontrakter elektronisk pr.
firma/kunde, OG som selv kan generere kontrakter, så de er nemme at sende ud.
Brugeren bad eksplicit om at få det skrevet ned til senere ("da vi ikke selv har
skabt det endnu") — ikke bygget nu, byg det først når brugeren beder om det
konkret. Overvej ved implementering: hvor lagres selve kontraktfilerne (Supabase
Storage, som `tema-baggrunde`-bucket'en fra Udseende er et eksempel på), og
hvordan hænger "generér kontrakt" sammen med kundens `pris_pr_moede`/
`moeder_koebt` fra Økonomi-siden og DPA-feltet, der allerede findes på `kunder`.

**Sidste session (2026-08-13):** Fuld fejlgennemgang af den live side (se
"Kendte rettelser" nedenfor), samt større, brugerinitierede tilføjelser uden for
Spec.md: en ny Dashboard-forside (`/dashboard`, nu appens startside i stedet for
`/leads`), Indstillinger som pop-op (se note i "Etablerede mønstre" — var
kortvarigt en fuld side, brugeren ville have den tilbage som pop-op) inkl. et
100% brugerstyret tema (farver, baggrundsbillede, paneltransparens), og en
Økonomi-side (`/okonomi`, kun `ejer`) med indtægt/forbrug-graf og en logbog for
virksomhedens egne omkostninger. Etape 7B (Snapshots) og resten af Etape 6
(ringetidsvindue, opkaldsmanuskripter, indvendingslog) blev også færdigbygget.
Projektet fik sit første git-repo (se "Git" ovenfor). Se "Udover Spec.md" og
"Mappestruktur" nedenfor for detaljer.

**Én ting afventer stadig brugeren** (spørg ikke om det igen, bare tjek om det er løst):
1. `ANTHROPIC_API_KEY` til AI-berigelse (Etape 5). Aftalt tilgang: AI må kun *foreslå*
   svar til kvalificeringsfelterne — mennesket skal stadig klikke Ja/Nej selv (R6).

CVR system-til-system-adgangen (punkt 2 herover, tidligere) er modtaget og forbundet
2026-08-24 — se "CVR system-til-system-adgang" nedenfor.

**Etablerede mønstre — følg dem, medmindre brugeren beder om andet:**
- Hurtige handlinger (opret/rediger noget lille) bygges som pop-op'er
  (`fixed inset-0` + backdrop), ikke som nye sider — se `kunder/ny-kunde-modal.tsx`
  eller `indstillinger-modal.tsx`. Kun indhold, der reelt kræver en hel side
  (leaddetaljer, kundedetaljer), er en rigtig route. **Historik:** Indstillinger
  blev midlertidigt (samme session, 2026-08-13) lavet om til en fuld side
  (`/indstillinger`) med sidebar-sektioner, efter et ønske om at den skulle ligne
  en større SaaS-apps indstillingsside. Brugeren fortrød og ville have den
  tilbage som pop-op "ligesom i Claude" — den er nu `indstillinger-modal.tsx`
  igen, men beholder sidebar-navigationen (Konto/Udseende/Forretningsregler)
  internt i pop-op'en i stedet for som en side. Byg den ikke om til en fuld
  side igen uden at spørge.
- Skærme med ét fokus ad gangen (Kvalificering, Ringeliste) er centreret med
  `mx-auto max-w-*`, ikke skubbet ud til venstre kant.
- Design er mørkt (bevidst fravigelse af Spec.md 6B, se "Kendt afvigelse" nedenfor).
  Farver er CSS-variabler i `app/globals.css`, ikke hardkodede hex-værdier.
- Beregnede felter (`maa_kontaktes`, `kvalificeret`, saldo) sættes altid af databasen
  (triggere/views), aldrig af klientkoden — bryd ikke det mønster.
- **Test altid ændringer i browseren før du melder noget færdigt.** Opret en
  midlertidig Supabase-auth-bruger via `execute_sql` (se eksempel nedenfor),
  test med *rigtige* museklik (`computer` med `ref`), og slet altid
  testbrugeren og -data igen bagefter. **Filfelter** (CSV-import, tema-
  baggrundsbillede): et almindeligt `.click()` på selve `<input type="file">`
  åbner en OS-fildialog, som browserværktøjet ikke kan styre — men at bygge en
  rigtig `File` + `DataTransfer` i `javascript_tool` og sætte `input.files`
  før man sender et `change`-event virker fint og er blevet brugt med succes
  flere gange (se fx hvordan billedupload til `tema-baggrunde` og CSV-import
  er testet i sessionerne 2026-08-13).
- Kør `npm run build` og `npm test` før hver deploy/push. Kør dem ALDRIG mens
  en `npm run dev`-forhåndsvisning kører samtidig i samme mappe — begge deler
  `.next`-cachen, og en produktions-build midt i en kørende dev-session
  korrumperer den (viser sig som "Cannot find module './xxx.js'" eller
  "__webpack_modules__[moduleId] is not a function" i dev-serverens logs).
  Ramt 2026-08-14 under test af bookingflowet; løst med `rm -rf .next` og en
  frisk `preview_start`. Stop forhåndsvisningen eller kør build/test i en
  anden mappe/gren, hvis begge er nødvendige i samme session.
- **Klient-tilstand der skal overleve en server-genhentning må ikke eje af en
  komponent, hvis eksistens afhænger af de data, handlingen selv ændrer.**
  Ramt konkret i bookingmodalen (Etape 10, 2026-08-14): en "Møde booket"-modal
  der viste en bekræftelsestekst efter en vellykket booking blev først lagt
  inde i hvert ringeliste-kandidatkort — men en vellykket booking lukker
  leadet, kandidaten forsvinder fra `ringeliste_kandidater` ved den
  automatiske genhentning som Next.js kører efter en server action, og kortet
  (og dermed modal-tilstanden) blev afmonteret midt i det hele. Løsningen var
  at flytte modal-tilstanden op i en stabil forælder-klientkomponent
  (`kandidat-liste.tsx`), der altid rendres uanset kandidatlistens indhold —
  se dens kommentar for detaljen. Genbrug det mønster for lignende
  "handling fjerner sit eget UI"-scenarier.

## Status

| Etape | Status |
|---|---|
| 1 — Fundament | Bygget: database, login, leadtabel |
| 2 — Import | Bygget: CSV-import, R1/R3/R4, dublet-håndtering, telefonnormalisering |
| 3 — Leadvisning og filtre | Bygget: filtrering, sortering, søgning, detaljevisning + historik. Branche-/geografifiltre (DB07-træ) mangler — kræver referencedata vi ikke har |
| 4 — Kvalificeringskø | Bygget: ét lead ad gangen, tastaturgenveje (1-8, "?" for oversigt) |
| 6 — Godkendelse og ringeliste | Bygget (2026-08-13): godkendelse, ringeliste, 5 udfald, genringning (maks. 4 forsøg), ringetidsvindue (default hverdage 9-16, `lib/leads/ringetid.ts`, redigeres i Indstillinger → Forretningsregler), indvendingslog (fast liste, `lib/leads/indvendinger.ts`, kun ved "Lagde på"/"Ikke interesseret"), opkaldsmanuskripter pr. kunde med versionering (`manuskripter`-tabel, redigeres på kundedetaljer, vist i ringelisten, version logges på hvert opkald). Manuskripter pr. *segment* har kun fået sin databasekolonne (`segment_id`) — ingen UI endnu, da leads ikke tildeles segmenter automatisk (Etape 9). "Møde booket" er stadig kun deaktiveret indtil et lead kan tildeles en kunde (Matching, Etape 9) |
| 7 — Kunder | Bygget: liste, oprettelse, stamdata, saldo, DPA-tracker, ICP-kriterier |
| 7B — Snapshots | Bygget (2026-08-13): `lead_snapshots` fyldes automatisk ved hver import (før helt ubrugt), diffes mod forrige snapshot og vises på leaddetaljer under "Snapshot-historik" — adskilt fra den generelle "Historik" (activity_log), som dækker alle kilder. `soegning_snapshots` gemmer nu også CVR-listen pr. import. "Ny P-enhed" fra Spec.md kan ikke spores — P-enhed findes ikke som felt i datamodellen |
| 5 — AI-berigelse | Ikke bygget — afventer `ANTHROPIC_API_KEY` fra dig |
| 11 — CVR API-integration | Delvist (2026-08-24): forbindelsen (Indstillinger → Integrationer, ejer-only) er bygget og testet live mod det rigtige Erhvervsstyrelse-endpoint — se "CVR system-til-system-adgang" nedenfor. Selve datatrækket (søgning, filtrering, lagring i Supabase) er IKKE bygget endnu — det er næste skridt |
| 8, 9, 12 | Ikke bygget endnu |
| 10 — Møder og saldo | Bygget (2026-08-14): "Møde booket" i Ringeliste åbner en bookingmodal (dato/tid, mødeform, deltager, kontekstnote) → opretter en `moeder`-række ("planlagt") og viser en genereret bekræftelsestekst til at kopiere og sende manuelt (systemet sender aldrig selv noget) — se `lib/moeder/bekraeftelsestekst.ts`. Ny side `/moeder`: fire kvalitetstjek-flueben pr. møde (kun alle fire + status "afholdt" tæller som leveret/fakturerbart, jf. `kunde_saldo`-viewet), statusskift (afholdt/afvist af kunde + begrundelse/no-show/aflyst), og en klient-side `window.confirm()` hvis et møde ville sende kundens saldo i minus. Saldo-siden af skærmbillede H fandtes allerede på Økonomi-siden (se "Udover Spec.md") |

**Udover Spec.md:**
- Kanban-visning af leads (`?visning=kanban`), klikbar pipeline-status på
  leaddetaljer (se dog "Kendte rettelser" — kun "Ny/Kvalificering/Lukket" kan
  sættes manuelt, "Godkendt/Ringeliste" nås kun via de rigtige handlinger).
- **Dashboard (`/dashboard`)** — ny forside (2026-08-13), erstatter `/leads` som
  landingsside efter login. Viser: et regelbaseret "Dagens overblik" (forfaldne
  genringninger, godkendte leads i kø, DPA-mangler, langsomt-bevægende leads —
  ikke AI, forberedt til at blive erstattet/suppleret af en rigtig AI-brief i
  Etape 5), 4 stat-kort, pipeline-status med fremgangslinjer, "Ring igen i dag",
  kunde-snapshot, og en samlet aktivitetsfeed (fletter `activity_log` +
  `aktiviteter`). Bygget efter brugerens eksplicitte ønske om at tage "meget stor
  inspiration" fra et referencebillede af en anden SaaS-dashboard (ikke en
  1:1-kopi — juridiske moduler som Trust/IOLTA/Matters er ikke relevante for
  Klarvos B2B-leadgenerering og er udeladt).
- **Indstillinger** — pop-op (`indstillinger-modal.tsx`, åbnes fra brugermenuen
  i sidebaren) med intern sidebar-navigation (Konto, Udseende, Forretningsregler
  — sidstnævnte kun for `ejer`, tilføjer nu også ringetidsvindue). Konto har et
  profilbillede-upload (Storage-bucket `profil-billeder`, `profiler.avatar_url`),
  vist i brugermenuens cirkel i stedet for forbogstavet. Forretningsregler har et
  "i"-ikon der åbner en forklarende pop-op af hvert felt, med en
  fortsæt-knap — se "Sidste session" ovenfor. Udseende har nu tre valg:
  Mørk, Lys, og **Brugerdefineret** — fuld kontrol over alle 12 CSS-farvevariabler
  (via en custom picker i `farve-vaelger.tsx`, bygget med `react-colorful` efter
  brugerens skærmbillede-reference), paneltransparens (0,3–1, styret af
  `--panel-alpha` i `app/globals.css`), og et selvvalgt baggrundsbillede
  (uploades til Supabase Storage-bucket `tema-baggrunde`, offentlig bucket,
  RLS: kun autentificerede kan skrive). Gemmes i `localStorage`
  (`klarvo-tema` + `klarvo-brugertema`), ikke i databasen — se `lib/tema.ts`.
  Forretningsregler-fanen giver UI til `konfiguration`-tabellens
  `tilladte_virksomhedsformer`, `virksomhedsformer_fysiske_personer` og
  `import_advarsel_graense` (var før kun redigerbare direkte i Supabase).
- **Økonomi (`/okonomi`)** — ny side under Overblik, kun synlig for `ejer`
  (både siden og server actions tjekker rollen). Viser månedlig/årlig
  indkomst og forbrug, en indtægt-vs-forbrug-graf (håndrullet SVG, intet
  chart-bibliotek) og en kontraktoversigt pr. kunde. Indkomsttallene lægger
  automatisk kundernes kontraktværdi (`pris_pr_moede × moeder_koebt`, spredt
  over kontraktperioden hvis `startdato`/`pilot_slutdato` er sat, ellers over
  12 måneder som antagelse) sammen med det, ejeren selv logger i en ny
  `oekonomi_poster`-tabel (indtægt/omkostning, engangs/månedlig/årlig
  gentagelse) — ikke to adskilte tal. Bygget efter eksplicit ønske om at
  spore virksomhedens egne omkostninger (domæne, hosting, API osv.), ikke
  kun kundernes betaling. `oekonomi_poster` har RLS som resten af databasen
  (permissiv, `ejer`-tjekket sker i `app/(panel)/okonomi/actions.ts`).

Designet er skiftet fra det oprindelige lyse "fagsystem"-look (Spec.md 6B) til en
mørk dashboard-stil, efter eksplicit ønske — se `tailwind.config.ts` for paletten.
Databasen indeholdt allerede skema for langt mere end Etape 1 ved projektets start
(kunder, søgninger, segmenter, møder, signaler, AI-kald); applikationskoden bygges
stadig etape for etape.

## Sådan starter du systemet

1. Installér afhængigheder:
   ```
   npm install
   ```
2. Kopiér `.env.example` til `.env.local` og udfyld med Supabase-projektets
   URL og anon-nøgle (findes under Project Settings → API i Supabase).
   `.env.local` må ALDRIG committes til git.
3. Start udviklingsserveren:
   ```
   npm run dev
   ```
4. Åbn `http://localhost:3000`.

### Opret de to brugere

Der er bevidst ingen selvbetjent oprettelse af konto — "ét delt login" i
specen betyder, at de to konti oprettes manuelt:

1. Gå til Supabase-dashboardet → Authentication → Users → "Add user".
2. Opret en bruger med e-mail og adgangskode.
3. Brugeren får automatisk en profil i `profiler`-tabellen med rollen
   `operator` (via en database-trigger). Skal en bruger være `ejer`, ændres
   det direkte i `profiler`-tabellen — ikke fra klienten.

## Hvor data kommer fra

CVR-data hentes fra en CSV-udtræksfil fra cvr.dk, uploadet via Leads → Importér
leads. **Ingen scraping af Virk** — det er en hård regel (R1), håndhævet ved at
der ikke findes nogen kode i dette projekt, der henter data fra datacvr.virk.dk.

Forventede kolonner i CSV-filen (aliaser accepteret, se `lib/leads/import.ts`):
`cvr_nummer`, `virksomhedsnavn`, `virksomhedsform`, `branchekode`, `branchetekst`,
`antal_ansatte`, `status`, `adresse`, `postnr`, `by`, `telefon`, `website`,
`reklamebeskyttelse`. Disse er gættet ud fra datamodellen i Spec.md, ikke fra en
rigtig udtræksfil — udvid aliaslisten, når I har set en ægte fil fra cvr.dk.

## Hvad de hårde regler betyder i praksis

Disse er beskrevet i Spec.md afsnit 1. Sådan er de implementeret:

- **R1 (ingen scraping)** — der er ingen HTML-parser eller browserautomatisering
  mod Virk noget sted i koden.
- **R3 (reklamebeskyttelse er en spærring)** — `maa_kontaktes` beregnes af en
  database-trigger (`beregn_lead_felter`), ikke af applikationskoden. Kan derfor
  ikke sættes forkert fra UI'et. Et lead spærres automatisk, hvis det matcher
  `opt_out_register` på CVR-nummer eller telefon.
- **R4 (virksomhedsform-filter)** — whitelisten ligger i `konfiguration`-tabellen
  (`tilladte_virksomhedsformer`), ikke hardcodet. Rækker uden for listen
  frasorteres ved import og vises i importrapporten. Udvides listen til former,
  der dækker fysiske personer (`virksomhedsformer_fysiske_personer`), viser
  importsiden en advarsel om Robinsonliste-tjek.
- **R5 (menneskelig godkendelse)** — et lead skal have `godkendt = true` (sat via
  et eksplicit klik på leaddetaljer) for at optræde i ringelisten.
- **R6 (AI må aldrig opfinde felter)** — implementeres i Etape 5, ikke bygget endnu.
- **R8 (alt logges)** — hver ændring af et lead logges automatisk i
  `activity_log`, én række pr. ændret felt, med gammel og ny værdi, via en
  database-trigger. Kan ikke omgås fra klienten.

### Etape 2-moduler (afsnit 2B)

- **Dublet-håndtering** — CVR-nummer er unikt, så genimport opdaterer (upsert)
  frem for at duplikere. Samme navn+postnummer med forskelligt CVR-nummer flages
  som "mulig duplet" til manuelt tjek.
- **Telefonnormalisering** — `lib/leads/telefon.ts` normaliserer til
  `+45XXXXXXXX`. Numre der ikke kan tolkes som danske sættes til tomt med en
  advarsel, i stedet for at blive gættet på.

## Hvordan man ændrer konfiguration

Virksomhedsform-whitelist, import-advarselsgrænse og ringetidsvindue kan
ændres i UI'et: Indstillinger → Forretningsregler (kun `ejer`). Andre dele af
`konfiguration`-tabellen (fx `sletning_maaneder` — bruges endnu ikke, Etape 12
er ikke bygget) justeres stadig direkte i Supabase. Brugerens eget navn,
adgangskode, profilbillede og udseende ændres i Indstillinger → Konto/Udseende
(klik på profilen i sidebaren → Indstillinger). Kolonner der kan skrives fra
klienten (som `navn` og `avatar_url` på `profiler`) skal have en eksplicit
`grant update (kolonne) on profiler to authenticated` — se
`supabase/migrations` eller kør et opslag i `information_schema.column_privileges`
hvis en gemmeknap fejler med "permission denied for table" på trods af, at RLS
ser rigtig ud.

## Sådan er Storage sat op

To offentlige buckets, samme mønster: `tema-baggrunde` (baggrundsbilleder til
brugerdefineret tema) og `profil-billeder` (avatarer, 5 MB-grænse). Begge har:

- **INSERT** og **DELETE**, scoped til `authenticated`, filtreret på `bucket_id`.
- **SELECT**, også scoped til `authenticated` — *ikke* valgfri selvom bucket'en
  er offentlig og filer kan læses via den offentlige URL uden den: uden en
  SELECT-policy kan Storage API'et ikke se rækken, og en `DELETE`/`remove()`
  fejler stille (svarer 200 med en tom liste, intet bliver faktisk slettet).
  Det ramte "fjern gammelt billede"-logikken i begge Udseende- og
  Konto-uploads, indtil det blev opdaget og rettet 2026-08-13. Ingen SELECT
  for `anon` — kun autentificerede kan liste filnavne, offentlig læsning sker
  udelukkende via `/storage/v1/object/public/...`, som ikke er RLS-styret.

## CVR system-til-system-adgang

Etape 11's datakilde. Erhvervsstyrelsens Elasticsearch-baserede løsning — login
(brugernavn/password, ikke en API-nøgle) fås ved at skrive til
`cvrselvbetjening@erst.dk`. Følgende er **bekræftet ved et rigtigt, levende kald**
2026-08-24 (ikke kun læst i dokumentation):

- **Base-URL:** `http://distribution.virk.dk/cvr-permanent` — kun HTTP bekræftet
  virker, HTTPS er ikke afprøvet. Auth er HTTP Basic (brugernavn:password).
- **`cvr-permanent` er et alias**, ikke ét indeks — det peger på fire underliggende
  indeks, adskilt efter hvilket top-level felt et dokument har:
  - `Vrvirksomhed.*` — virksomheder
  - `VrproduktionsEnhed.*` — produktionsenheder (bl.a. `antalAnsatte` findes her,
    ikke på virksomheden selv)
  - `Vrdeltagerperson.*` — deltagere/personkreds
  - Et fjerde metadata-indeks (kun tidsstempler)
- **Der findes ikke separate URL'er som `/virksomhed/_search`** — det gav 404 fra
  nginx-proxyen foran Elasticsearch, som tilsyneladende kun ruter `/cvr-permanent/...`.
  Søg mod `cvr-permanent/_search` og filtrér på `Vrvirksomhed.*`-felter i `query`
  eller `_source` — kun virksomheds-dokumenter har de felter, så det virker som et
  filter i praksis.
- **`max_result_window: 3000` bekræftet** — brug Elasticsearch Scroll API for større
  uddrag end det.
- Nested felter (`navne`, `hovedbranche`, `beliggenhedsadresse`, `virksomhedsstatus`
  m.fl.) har `include_in_parent: true` i mappingen, så almindelige flade
  `term`/`match`-forespørgsler på fx `Vrvirksomhed.hovedbranche.branchekode` virker
  uden en fuld `nested`-query-indpakning.
- ES-version er 6.x-serien (ikke 1.7.4, som en uofficiel tredjepartskilde påstod).

**Hvor login gemmes:** tabellen `cvr_forbindelse` (singleton-række, `id boolean
primary key default true`), skrives/læses via Indstillinger → Integrationer
(kun `ejer`). RLS er bevidst strammere end appens sædvanlige "permissive true +
app-lags rollecheck"-mønster (se fx `konfiguration`) — her håndhæves ejer-rollen i
selve RLS-policyen (`exists (select 1 from profiler where id = auth.uid() and
rolle = 'ejer')`), fordi rækken indeholder et rigtigt tredjeparts-login, ikke bare
forretningsregler. Password'et ekkoes aldrig tilbage til klienten: `layout.tsx`
henter bevidst kun `brugernavn, forbundet_tidspunkt, sidst_testet, sidst_test_ok,
sidst_test_besked` fra tabellen, aldrig `password`-kolonnen, uanset at RLS ville
tillade ejer at læse den. `lib/cvr/klient.ts` har selve HTTP-kaldet (bruges af
"Test forbindelse"-knappen); genbrug den, når det rigtige datatræk bygges.

**Næste skridt (ikke bygget):** selve søgning/filtrering/lagring af CVR-data i
Supabase (Fase 2-3 i brugerens oprindelige plan). Se "Efterspurgt, endnu ikke
bygget" og brugerens fase-inddeling, hvis den findes i chatten, for rækkefølgen.

## Teknisk stack

- **Next.js (App Router) + TypeScript** — server-rendering, så følsomme kald
  (fx til AI senere) kan holdes på serveren.
- **Supabase** (Postgres + Auth) — databasen var allerede oprettet ved
  projektets start.
- **Tailwind CSS** — til designet, med farverne som CSS-variabler (se nedenfor).
- **react-colorful** — let (~2,8 kB) farvevælger-komponent til det brugerdefinerede
  tema i Indstillinger.
- **lucide-react** — ikonbibliotek, brugt konsekvent i hele appen (sidebar, Indstillinger,
  sideoverskrifter, stat-kort). De eneste to UI-biblioteker i projektet ud over Tailwind.

Valgt fordi det er den simpleste stack, der dækker behovet: server-side
rendering uden en separat backend, og Vercel (valgt hosting) er bygget til
netop Next.js.

## Mappestruktur

```
Ordino/
  Spec.md                      Specifikationen
  README.md
  vercel.json                  Fortæller Vercel eksplicit at det er et Next.js-projekt
  .env.example                 Skabelon til miljøvariabler
  app/
    layout.tsx                 Rod-layout. TEMA_SCRIPT sætter gemt tema (mørk/lys/
                                brugerdefineret) på <html> før første maling -
                                suppressHydrationWarning er bevidst (se kommentar i filen)
    page.tsx                   Sender videre til /dashboard eller /login
    login/
      page.tsx                 Login-formular
      actions.ts                Server action til login, redirect til /dashboard
    (panel)/
      layout.tsx                Venstremenu + hovedområde, hver med egen scroll
      sidebar-nav.tsx           Skærmbillederne, grupperet
      bruger-menu.tsx           Klikbar profil nederst i sidebaren (popup), åbner
                                IndstillingerModal ved klik på "Indstillinger"
      indstillinger-modal.tsx  Pop-op med intern sidebar (Konto/Udseende/
                                Forretningsregler - sidstnævnte kun `ejer`)
      indstillinger-actions.ts Server actions: navn, adgangskode, forretningsregler
                                (inkl. ringetidsvindue)
      brugertema-effekt.tsx    Sætter baggrundsbillede på <body> (kan ikke gøres i
                                TEMA_SCRIPT, da <body> ikke findes når det kører)
      tema-vaelger.tsx          Mørk/Lys/Brugerdefineret - hele tema-editoren
      farve-vaelger.tsx        Popover-farvevælger (react-colorful) til hver af de
                                12 CSS-farvevariabler
      dashboard/
        page.tsx                 Ny forside: dagens overblik, stat-kort, pipeline-
                                  status, ring-igen-liste, kunde-snapshot, aktivitet
      okonomi/
        page.tsx                 Kun `ejer`. Indkomst/forbrug, graf, kontraktoversigt
        actions.ts                Server actions for oekonomi_poster, tjekker ejer-rolle
        linje-graf.tsx           Håndrullet SVG-linjegraf (intet chart-bibliotek)
        okonomi-formular.tsx    Klientkomponent: log en indtægt/omkostning
      leads/
        page.tsx                 Skærmbillede B+J: leadtabel, filterpanel, stat-kort,
                                  Tabel/Kanban-visning
        [id]/
          page.tsx                 Detaljevisning: alle felter + activity_log-historik +
                                    Snapshot-historik (Etape 7B, diffet mod forrige import)
          actions.ts                Server actions: skift pipeline-stadie, godkend lead
        importer/
          page.tsx                 CSV-import
          actions.ts                Server action der udfører importen + gemmer
                                    lead_snapshots pr. berørt lead (Etape 7B)
          importer-form.tsx         Klientkomponent med rapportvisning
      kvalificering/
        page.tsx                 Skærmbillede C: kvalificeringskø, ét lead ad gangen
        kvalificerings-kort.tsx  Klientkomponent: tastaturgenveje, optimistisk gemning
        actions.ts                Server action: gem ét kvalificeringsfelt
      ringeliste/
        page.tsx                 Skærmbillede D: godkendte, kvalificerede leads.
                                  Tjekker ringetidsvindue (skjuler listen udenfor),
                                  viser kundens nyeste opkaldsmanuskript pr. kort
        actions.ts                Server action: log opkaldsudfald (inkl. indvending,
                                  manuskript-version), luk/genring lead
      kunder/
        page.tsx                 Skærmbillede E: kundeliste, saldo, DPA-status
        ny-kunde-modal.tsx        Pop-op til oprettelse
        actions.ts                Server actions: opret/opdater kunde, ICP, DPA, saldo,
                                  opretManuskript (ny version, aldrig UPDATE)
        [id]/
          page.tsx                 Stamdata, saldo, DPA, ICP, opkaldsmanuskript
                                  (nuværende + historik), tilknyttede leads
      soegninger/
        page.tsx                 Liste over gemte søgninger (ikke i venstremenuen)
  lib/
    nav.ts                      Venstremenuens punkter, grupperet ("Hjem"-gruppe
                                med Dashboard er uden for Spec.md's bogstaver B-J)
    tema.ts                     Delt logik for det brugerdefinerede tema: hex↔rgb,
                                standardpaletter, gem/hent/anvend/nulstil
    leads/
      import.ts                  Importfilter (R1/R3/R4, dubletter) + tests
      telefon.ts                  Telefonnormalisering + tests
      filters.ts                  Filterparsing/-anvendelse for leadtabellen
      pipeline.ts                  Delt definition af pipeline-stadier, labels, farver
      snapshots.ts                 Etape 7B: felter der spores, diff-beregning + tests
      ringetid.ts                   Etape 6: beregner om "nu" er indenfor det
                                    konfigurerede ringetidsvindue (dansk lokaltid,
                                    uafhængigt af serverens tidszone) + tests
      indvendinger.ts               Etape 6: fast liste over indvendinger, og hvilke
                                    opkaldsudfald der overhovedet spørger om én
    supabase/
      client.ts                  Supabase-klient til browseren
      server.ts                  Supabase-klient til server components/actions
  middleware.ts                Beskytter alle sider undtagen /login
```

## Deployment

```
git push
npx vercel deploy --prod
```

Push til [github.com/Reahoax/klarvo](https://github.com/Reahoax/klarvo) (privat)
sker efter hver godkendt ændring, men Vercel er endnu ikke forbundet til
GitHub-reposet, så deploy er stadig en separat manuel kommando (kun foreslået
som næste skridt, ikke bekræftet endnu — se toppen af filen).

## Kendt afvigelse fra Spec.md

Designet (afsnit 6B: lys baggrund, ingen mørk tilstand, ingen dekorativ farve) er
erstattet af en mørk dashboard-stil efter eksplicit brugerønske (2026-08-12) — se
`tailwind.config.ts`. Selve princippet om at farve kun må bruges funktionelt (rød =
spærret/fejl, grøn = godkendt) er bevaret, selvom baggrunden er skiftet.

## Design og fremtidige brugerindstillinger

Farverne ligger som CSS-variabler i `app/globals.css` (`:root`), ikke som faste
hex-koder — forberedelse til en fremtidig side hvor I selv kan ændre
baggrund/farver/UI, uden at appen skal bygges om. Primære handlinger har en
dæmpet "glow"-effekt (`.glow-accent` / `.glow-accent-blod`), holdt tilbage med
vilje, så data stadig er hovedpersonen.

## Kendte rettelser (2026-08-13)

- **Pipeline-piller på leaddetaljer tillod at springe R5 over.** Man kunne
  manuelt klikke et lead direkte til "Godkendt" eller "Ringeliste" uden at det
  var kvalificeret eller reelt godkendt — leadet viste da en modstridende
  tilstand (pillen sagde "Ringeliste", men "Godkendt: Nej", og leadet dukkede
  ikke op på selve Ringeliste-siden, som filtrerer på `godkendt=true`). R5 blev
  aldrig reelt brudt (databasens view holdt stand), men det var forvirrende UI.
  Rettet i `leads/[id]/actions.ts` (`opdaterPipelineStatus` afviser nu
  "godkendt"/"ringeliste") og `leads/[id]/page.tsx` (pillerne er visuelt
  deaktiverede for de to stadier, medmindre leadet allerede reelt er der).

## Kendt teknisk gæld

- `npm audit` viser 3 "high" sårbarheder i Next.js' egne build-afhængigheder
  (postcss, sharp — ikke i den kørende server). Kræver en Next.js-hovedopgradering,
  ikke lavet nu for ikke at introducere breaking changes.
- Facet-tællinger i leadfilterpanelet (antal pr. virksomhedsform/status) beregnes
  ud fra ALLE leads, ikke kun dem der matcher de øvrige aktive filtre. Den simple
  version — bør laves om til en fuld facet-optælling, hvis leadmængden bliver
  stor nok til at tallene bliver misvisende.
