// Etape 12 (Spec.md "R7 — Dataminimering og sletning") - "leads uden
// aktivitet i X måneder (konfigurerbar, default 12) markeres til sletning."
//
// "Aktivitet" er bevidst defineret som et opkald (en `aktiviteter`-række),
// ikke enhver databaseændring - `activity_log` rammes også af automatiske
// ting som CVR-genimport, og ville gøre stort set intet lead "forældet"
// nogensinde. Et lead uden noget menneske har rørt, er det, reglen sigter på.
//
// Et lead kan tidligst blive forældet, når det selv er ældre end tærsklen -
// ellers ville et lead importeret i går blive markeret med det samme, bare
// fordi det (endnu) ikke har nogen aktivitet.
const DAGE_PR_MAANED = 30.44; // gennemsnitlig månedslængde - præcist nok til en tærskel i måneder

export function erForaeldet(
  oprettet: Date,
  senesteAktivitet: Date | null,
  taerskelMaaneder: number,
  nu: Date = new Date()
): boolean {
  const referenceDato = senesteAktivitet ?? oprettet;
  const dageSiden = (nu.getTime() - referenceDato.getTime()) / (1000 * 60 * 60 * 24);
  return dageSiden >= taerskelMaaneder * DAGE_PR_MAANED;
}
