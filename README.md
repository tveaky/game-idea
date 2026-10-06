# Konsultbolaget

Ett spelbart svenskspråkigt strategispel om att bygga ett IT-konsultbolag, med React, TypeScript och Vite. En tur är en månad. Spela 36 månader, se resultatet och fortsätt om bolaget överlever.

## Starta

Node.js 22 eller 24 och npm rekommenderas.

```sh
npm ci --cache /tmp/konsult-npm
npm run dev
```

Vite startar på port 5173. Ingen backend, inloggning, API-nyckel eller extern AI-tjänst behövs. Typsnitten paketeras lokalt så att spelet inte gör externa anrop.

```sh
npm test        # Spelmotorns tester
npm run build  # TypeScript och produktionsbygge till dist/
npm run preview
```

Browserkontroller kräver en lokal Chromium och en startad utvecklingsserver på port 5173:

```sh
node scripts/browser-check.mjs
node scripts/interaction-check.mjs
```

De använder `/usr/bin/chromium`; sätt `CHROMIUM_PATH` för en annan installation. Browserkontrollen spelar 36 månader via riktiga kontroller, fortsätter omgången, kontrollerar sparning/import/export och granskar alla vyer vid 1440, 768 och 390 px. Den andra kontrollen provar reversibla planer, kandidatbedömning, projekt och kredit. Bilder och en testsparfil skrivs till `/tmp/konsult-shots`.

## Så spelar du

1. Välj namn och en av tre inriktningar. Du börjar med 600 000 kr, en grundare och två affärsmöjligheter.
2. Avsätt tid i **Personal**. Dra först ner andra aktiviteter för att frigöra kapacitet. Ingen kan planeras över 100 %.
3. Prioritera affärer och välj pris i **Försäljning**. Prioriterade affärer delar på säljtiden; om ingen prioriteras bearbetas de första två. Teknikstöd, säljbarhet, konkurrens, relationer och relevant material spelar roll.
4. Signerade avtal måste bemannas i **Uppdrag** och konsulten måste ha leveranstid. Underkonsult är ett flexibelt men osäkert alternativ.
5. Bedöm kandidater innan erbjudande. Bedömning kräver 10 %, erbjudande 20 % rekryteringstid. Sökning kräver 20 %. Kandidater kan tacka nej och börjar efter 1–3 månader.
6. Bygg kunskap och material i **Marknad**. Budget ensam ger ingen färdig produkt. Nationell expansion kräver kunskap, relationer, trovärdighet och intern tid.
7. Kontrollera **Ekonomi**, klicka **Nästa månad**, granska planen och genomför den. Månadsrapporten beskriver utfallet.

En möjlig start är att prioritera en affär och lägga mycket av grundarens tid på försäljning. När avtalet är vunnet måste du växla till leverans. Det ger intäkter men lämnar mindre tid för nästa affär och bolagets utveckling. En större personalstyrka ger mer kapacitet och betydligt högre fasta kostnader. Det finns ingen garanterad vinnande strategi.

## Spelmotor och månadsordning

`src/game/engine.ts` innehåller `advance(state)`, som klonar indata och returnerar ett nytt tillstånd. All slump använder en LCG med ett sparat 32-bitars tillstånd. Samma tillstånd och plan ger samma nästa månad. Motorn använder inte datum, nätverk eller global slump.

Ordningen är:

1. Validera tidsplan och fastställ vilka personer som har börjat denna månad.
2. Beräkna löner, overhead och ränta; hantera kredit, kandidatbedömning och erbjudanden. Nyrekryteringar börjar i framtiden.
3. Leverera befintliga avtal. Seniorers handledning tar av deras leveranstid. Matchning, kapacitet, frånvaro och trivsel påverkar kvaliteten.
4. Skapa fakturor för faktisk leverans, dra kostnader och ta emot tidigare förfallna fakturor. En ny faktura betalas aldrig samma månad.
5. Genomför marknadsarbete och interna projekt. Nationell expansion reserverar först 25 % av en persons kapacitet. Projekten delar sedan på 75 % av återstående intern tid; 25 % går till marknadskunskap när projekt pågår. Utan projekt går intern tid till kunskap. Inget arbete kan samtidigt faktureras som leverans.
6. Bearbeta pipeline. Nya vunna avtal börjar tidigast nästa månad. Hantera relationer, personalfrågor och tillståndsberoende händelser.
7. Spara månadsresultat, kontrollera likviditet och konkurs, öka månadsnumret och töm engångsplanen. Tidsfördelning, målsegment och säljfokus kvarstår.

Omsättning kommer från leverans, resultat från omsättning minus kostnader, och kassa från faktiska betalningar. Prognosen räknar kontrakterad bemannad leverans, planerade kostnader och förfallande kundfordringar separat. Sjukfrånvaro, nekade erbjudanden och försenade betalningar kan göra utfallet annorlunda. Pipeline ingår aldrig som säker intäkt. Negativ kassa täcks av återstående kredit innan eventuell konkurs.

## Data, balans och antaganden

Ändra innehåll under `src/game/content/`:

- `balance.ts`: 160 timmar/månad, 42 % arbetsgivarschablon, 12 000 kr overhead, 300 000 kr kredit och 0,9 % månadsränta.
- `candidates.ts`: tolv konsulter och två säljare med olika kompetens, erfarenhet, lön, säljbarhet och startfördröjning.
- `customers.ts` och `categories.ts`: tolv kundorganisationer, tre segment och tre kompetensinriktningar.
- `materials.ts`: fem interna projekt med budget, arbete, förutsättningar och segmentanknuten effekt.
- `events.ts`: händelsekatalog. Tillståndsvillkor och sannolikheter finns vid motsvarande steg i motorn.

Ekonomin är justerbara spelantaganden. Juniorer är personer med mindre än två års erfarenhet. Handledning tar 10 % av en seniors kapacitet per junior. Säljare har en introduktionsmånad med reducerad effekt. Marknadens kunskap och trovärdighet stödjer försäljning; material används bara i relevant segment och relevanta affärsstadier. Materialets direkta effekt varar tolv månader och samma material kan inte staplas eller produceras om. Ett seminarium skapar kontakter som behöver följas upp.

Förenklingar: en konsult kan tilldelas ett aktivt avtal även om avtalet är på deltid; återstående kapacitet kan användas till andra aktiviteter. Ingen personalneddragning eller aktiv avtalshävning finns i första versionen. Timavtal förlängs eller avslutas enligt behov och kvalitet; större upphandlingar simulerar ramavtal utan separat juridisk avtalsvy. Utländsk expansion, förvärv, fastprisprojekt och detaljerad skatteadministration är avgränsade enligt projektbeskrivningen. Spelbalansen är en första iteration, inte empiriskt validerad företagsekonomi.

## Sparning

`src/game/save.ts` versionsmärker formatet (version 1) och validerar importerade data: typer, talgränser, kapacitet, ID:n, referenser och månadshistorik. Felaktiga importer ersätter inte din omgång. Tillstånd, plan, historik och slumptillstånd lagras automatiskt i `localStorage` under `konsultbolaget-v1`. Export/import är JSON. Att rensa webbläsardata tar bort lokal sparning; exportera en kopia om omgången ska behållas. Ny omgång kräver en bekräftelse.

## Validering

20 motortester täcker ekonomi, fakturering/betalning, framtida startdatum, kapacitet, dubbelbokning, begränsad kredit, rekrytering, delad projekttid, expansionstid, sparvalidering, reproducerbar slump och en hel 36-månadersomgång. Browserkontroller täcker den fungerande spelcykeln och responsiva vyer. Produktion byggs med TypeScript-kontroll. Webbpublicering görs separat enligt avsnittet nedan.

## Spela på webben / GitHub Pages

Spelet är ett statiskt webbprojekt. Publiceringskommandot bygger det och laddar upp `dist/` till grenen `gh-pages` i repot som `origin` pekar på:

```sh
npm run deploy
```

Kommandot kräver skrivbehörighet till GitHub-repot. Första gången behöver repoägaren gå till **Settings → Pages**, välja **Deploy from a branch**, välja **gh-pages** och **/ (root)**, och spara. GitHub visar webbadressen och byggstatusen på samma sida. För detta repo är den förväntade adressen `https://tveaky.github.io/game-idea/`. Adressen blir aktiv först efter att Pages har aktiverats och publiceringen har slutförts.

Vite använder relativa resursadresser (`base: "./"`), så spelet fungerar både under `/game-idea/` och på en egen domän. `.nojekyll` läggs till vid uppladdning. Ingen server eller databas behövs; varje spelares omgång sparas i spelarens egen webbläsare. Exportera en sparfil innan du byter mellan den lokala versionen och webbversionen, eftersom de har separata sparningar.

För att uppdatera webbversionen efter en kodändring, kör testerna och `npm run deploy` igen. GitHub sköter därefter publiceringen från `gh-pages`. Publicering är en separat åtgärd från `npm run build` och från att spara molnmiljöns konfiguration.
