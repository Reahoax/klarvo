"use client";

import { useActionState, useEffect, useState } from "react";
import { UserRound, Palette, Scale, Info, Plug, Check, X, type LucideIcon } from "lucide-react";
import {
  opdaterNavn,
  opdaterAvatar,
  skiftAdgangskode,
  gemForretningsregler,
  gemCvrForbindelse,
  afproevCvrForbindelse,
  fjernCvrForbindelse,
  opdaterOsintKontaktEmail,
} from "./indstillinger-actions";
import { TemaVaelger } from "./tema-vaelger";
import { opretBrowserKlient } from "@/lib/supabase/client";

const AVATAR_BUCKET = "profil-billeder";

type Konfiguration = {
  tilladte_virksomhedsformer: string[];
  virksomhedsformer_fysiske_personer: string[];
  import_advarsel_graense: number;
  ringetid_fra: string;
  ringetid_til: string;
  ringetid_ugedage: number[];
  osint_kontakt_email: string | null;
} | null;

const UGEDAGE = [
  { tal: 1, label: "Man" },
  { tal: 2, label: "Tir" },
  { tal: 3, label: "Ons" },
  { tal: 4, label: "Tor" },
  { tal: 5, label: "Fre" },
  { tal: 6, label: "Lør" },
  { tal: 7, label: "Søn" },
] as const;

type CvrForbindelse = {
  brugernavn: string | null;
  forbundet_tidspunkt: string | null;
  sidst_testet: string | null;
  sidst_test_ok: boolean | null;
  sidst_test_besked: string | null;
} | null;

type Sektion = "konto" | "udseende" | "forretningsregler" | "integrationer";

// Pop-op igen (2026-08-13): var kortvarigt en fuld side (/indstillinger), men
// brugeren ville have den tilbage som pop-op - "ligesom her i Claude". Selve
// sidebar+sektions-indholdet fra siden er bevaret uændret, kun rammen er nu
// en modal (fixed inset-0 + backdrop) i stedet for en route.
export function IndstillingerModal({
  email,
  rolle,
  navn,
  avatarUrl,
  konfiguration,
  cvrForbindelse,
  onLuk,
}: {
  email: string | undefined;
  rolle: string;
  navn: string | null;
  avatarUrl: string | null;
  konfiguration: Konfiguration;
  cvrForbindelse: CvrForbindelse;
  onLuk: () => void;
}) {
  const erEjer = rolle === "ejer";
  const [sektion, setSektion] = useState<Sektion>("konto");

  useEffect(() => {
    function paaEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onLuk();
    }
    window.addEventListener("keydown", paaEscape);
    return () => window.removeEventListener("keydown", paaEscape);
  }, [onLuk]);

  const punkter: { id: Sektion; label: string; Ikon: LucideIcon }[] = [
    { id: "konto", label: "Konto", Ikon: UserRound },
    { id: "udseende", label: "Udseende", Ikon: Palette },
    ...(erEjer
      ? ([
          { id: "forretningsregler", label: "Forretningsregler", Ikon: Scale },
          { id: "integrationer", label: "Integrationer", Ikon: Plug },
        ] as const)
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onLuk} aria-hidden />

      <div className="relative flex max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border border-kant bg-flade shadow-2xl shadow-black/50">
        <nav className="w-48 shrink-0 overflow-y-auto border-r border-kant bg-flade-haevet/40 p-3">
          <p className="mb-2 px-2 text-sm font-semibold text-tekst">Indstillinger</p>
          <ul className="flex flex-col gap-0.5">
            {punkter.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSektion(p.id)}
                  className={
                    sektion === p.id
                      ? "flex w-full items-center gap-2 rounded-md bg-flade-haevet px-3 py-1.5 text-left text-sm font-medium text-tekst"
                      : "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
                  }
                >
                  <p.Ikon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end border-b border-kant px-4 py-2.5">
            <button
              type="button"
              onClick={onLuk}
              className="rounded p-1 text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
              aria-label="Luk"
            >
              ✕
            </button>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
            {sektion === "konto" && (
              <KontoSektion email={email} rolle={rolle} navn={navn} avatarUrl={avatarUrl} />
            )}
            {sektion === "udseende" && <UdseendeSektion />}
            {sektion === "forretningsregler" && erEjer && (
              <ForretningsreglerSektion konfiguration={konfiguration} />
            )}
            {sektion === "integrationer" && erEjer && (
              <IntegrationerSektion cvrForbindelse={cvrForbindelse} konfiguration={konfiguration} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KontoSektion({
  email,
  rolle,
  navn,
  avatarUrl,
}: {
  email: string | undefined;
  rolle: string;
  navn: string | null;
  avatarUrl: string | null;
}) {
  const [navnState, navnAction, navnPending] = useActionState(opdaterNavn, null);
  const [kodeState, kodeAction, kodePending] = useActionState(skiftAdgangskode, null);
  const [avatarState, avatarAction] = useActionState(opdaterAvatar, null);
  const [visAvatarUrl, setVisAvatarUrl] = useState(avatarUrl);
  const [avatarUploader, setAvatarUploader] = useState(false);
  const [avatarFejl, setAvatarFejl] = useState<string | null>(null);
  const forbogstav = (navn || email || "?").slice(0, 1).toUpperCase();

  async function haandterAvatarUpload(fil: File) {
    if (fil.size > 5 * 1024 * 1024) {
      setAvatarFejl("Billedet må maks. være 5 MB.");
      return;
    }
    setAvatarUploader(true);
    setAvatarFejl(null);
    try {
      const supabase = opretBrowserKlient();
      const endelse = fil.name.split(".").pop() || "jpg";
      const sti = `${crypto.randomUUID()}.${endelse}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(sti, fil, { upsert: false });
      if (uploadError) {
        setAvatarFejl(uploadError.message);
        return;
      }
      const forrigeSti = visAvatarUrl ? visAvatarUrl.split(`${AVATAR_BUCKET}/`)[1] : null;
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(sti);
      const form = new FormData();
      form.set("avatar_url", data.publicUrl);
      avatarAction(form);
      setVisAvatarUrl(data.publicUrl);
      if (forrigeSti) {
        await supabase.storage.from(AVATAR_BUCKET).remove([forrigeSti]);
      }
    } finally {
      setAvatarUploader(false);
    }
  }

  async function fjernAvatar() {
    if (!visAvatarUrl) return;
    const forrigeSti = visAvatarUrl.split(`${AVATAR_BUCKET}/`)[1];
    const form = new FormData();
    form.set("avatar_url", "");
    avatarAction(form);
    setVisAvatarUrl(null);
    if (forrigeSti) {
      const supabase = opretBrowserKlient();
      await supabase.storage.from(AVATAR_BUCKET).remove([forrigeSti]);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 flex items-center gap-2 text-lg font-semibold text-tekst">
          <UserRound className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          Konto
        </h1>
        <p className="text-sm text-tekst">{email}</p>
        <p className="text-xs text-tekst-daempet">{rolle === "ejer" ? "Ejer" : "Operatør"}</p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
          Profilbillede
        </h2>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-flade-haevet text-lg font-medium text-tekst">
            {visAvatarUrl ? (
              <img src={visAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              forbogstav
            )}
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <label className="inline-block w-fit cursor-pointer rounded-md border border-kant px-3 py-1.5 text-xs text-tekst transition-colors hover:border-accent">
                {avatarUploader ? "Uploader…" : visAvatarUrl ? "Skift billede" : "Vælg billede"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={avatarUploader}
                  onChange={(e) => {
                    const fil = e.target.files?.[0];
                    if (fil) haandterAvatarUpload(fil);
                    e.target.value = "";
                  }}
                />
              </label>
              {visAvatarUrl && (
                <button
                  type="button"
                  onClick={fjernAvatar}
                  className="rounded-md border border-kant px-2.5 py-1.5 text-xs text-tekst transition-colors hover:border-spaerret hover:text-spaerret"
                >
                  Fjern
                </button>
              )}
            </div>
            {avatarFejl && <p className="text-xs text-spaerret">{avatarFejl}</p>}
            {avatarState?.fejl && <p className="text-xs text-spaerret">{avatarState.fejl}</p>}
            <p className="text-xs text-tekst-daempet">JPG, PNG, WebP eller GIF, maks. 5 MB.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
          Navn
        </h2>
        <form action={navnAction} className="flex gap-2">
          <input
            type="text"
            name="navn"
            defaultValue={navn ?? ""}
            placeholder="Dit navn"
            className="flex-1 rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <button
            type="submit"
            disabled={navnPending}
            className="glow-accent shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
          >
            Gem
          </button>
        </form>
        {navnState?.fejl && <p className="mt-1.5 text-xs text-spaerret">{navnState.fejl}</p>}
        {navnState?.ok && <p className="mt-1.5 text-xs text-godkendt">Gemt.</p>}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
          Adgangskode
        </h2>
        <form action={kodeAction} className="flex flex-col gap-2 sm:max-w-xs">
          <input
            type="password"
            name="ny_adgangskode"
            placeholder="Ny adgangskode (min. 8 tegn)"
            autoComplete="new-password"
            className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <input
            type="password"
            name="gentag_adgangskode"
            placeholder="Gentag ny adgangskode"
            autoComplete="new-password"
            className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <button
            type="submit"
            disabled={kodePending}
            className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst transition-colors hover:border-accent disabled:opacity-60"
          >
            Skift adgangskode
          </button>
        </form>
        {kodeState?.fejl && <p className="mt-1.5 text-xs text-spaerret">{kodeState.fejl}</p>}
        {kodeState?.ok && <p className="mt-1.5 text-xs text-godkendt">Adgangskode skiftet.</p>}
      </section>
    </div>
  );
}

function UdseendeSektion() {
  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-lg font-semibold text-tekst">
        <Palette className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Udseende
      </h1>
      <TemaVaelger />
    </div>
  );
}

const FORRETNINGSREGLER_INFO_NOEGLE = "klarvo-forretningsregler-info-laest";

const FORRETNINGSREGLER_INFO: { titel: string; forklaring: string }[] = [
  {
    titel: "Tilladte virksomhedsformer",
    forklaring:
      "Kun leads med en af disse virksomhedsformer (fx ApS, A/S) slipper igennem R4-filteret ved den automatiske CVR-import. Alt andet frasorteres automatisk.",
  },
  {
    titel: "Virksomhedsformer for fysiske personer",
    forklaring:
      "Virksomhedsformer der reelt drives af en privatperson (fx Enkeltmandsvirksomhed). Står en af disse i listen ovenfor, viser importsiden en advarsel om at tjekke Robinsonlisten, da personen kan have frabedt sig markedsføring.",
  },
  {
    titel: "Import-advarselsgrænse",
    forklaring:
      "Et loft for det samlede antal leads i systemet. Ville en import bringe det samlede antal over denne grænse, viser importsiden en advarsel, så en stor fejlagtig import ikke sker ved et uheld.",
  },
  {
    titel: "Ringetidsvindue",
    forklaring:
      "De tidspunkter og ugedage hvor Ringelisten må vises og bruges til opkald. Uden for vinduet skjules listen helt for alle brugere, så I overholder markedsføringslovens ringetidsregler.",
  },
];

function ForretningsreglerInfoPopup({ onLuk }: { onLuk: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-kant bg-flade shadow-2xl shadow-black/50">
        <div className="border-b border-kant px-5 py-4">
          <h2 className="text-base font-semibold text-tekst">Hvad betyder felterne?</h2>
          <p className="mt-1 text-xs text-tekst-daempet">
            En kort forklaring af hver indstilling i Forretningsregler, før du ændrer dem.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="flex flex-col gap-4">
            {FORRETNINGSREGLER_INFO.map((punkt) => (
              <div key={punkt.titel}>
                <dt className="text-sm font-medium text-tekst">{punkt.titel}</dt>
                <dd className="mt-0.5 text-sm text-tekst-daempet">{punkt.forklaring}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border-t border-kant px-5 py-3.5">
          <button
            type="button"
            onClick={onLuk}
            className="glow-accent w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-tekst"
          >
            Jeg har læst det, fortsæt
          </button>
        </div>
      </div>
    </div>
  );
}

function ForretningsreglerSektion({ konfiguration }: { konfiguration: Konfiguration }) {
  const [state, action, pending] = useActionState(gemForretningsregler, null);
  const [infoAaben, setInfoAaben] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(FORRETNINGSREGLER_INFO_NOEGLE)) {
      setInfoAaben(true);
    }
  }, []);

  function lukInfo() {
    localStorage.setItem(FORRETNINGSREGLER_INFO_NOEGLE, "1");
    setInfoAaben(false);
  }

  return (
    <div>
      {infoAaben && <ForretningsreglerInfoPopup onLuk={lukInfo} />}
      <div className="mb-1 flex items-center gap-1.5">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
          <Scale className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          Forretningsregler
        </h1>
        <button
          type="button"
          onClick={() => setInfoAaben(true)}
          title="Hvad betyder felterne?"
          aria-label="Hvad betyder felterne?"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-tekst-daempet text-tekst-daempet transition-colors hover:border-accent hover:text-accent"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <p className="mb-4 text-sm text-tekst-daempet">
        Styrer R4-filteret ved den automatiske CVR-import (Leads → Leads fra CVR). Kun synlig for ejere.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Tilladte virksomhedsformer (kommasepareret)
          </label>
          <input
            type="text"
            name="tilladte_virksomhedsformer"
            defaultValue={(konfiguration?.tilladte_virksomhedsformer ?? []).join(", ")}
            placeholder="Fx: ApS, A/S"
            className="w-full rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Virksomhedsformer for fysiske personer (kommasepareret)
          </label>
          <input
            type="text"
            name="virksomhedsformer_fysiske_personer"
            defaultValue={(konfiguration?.virksomhedsformer_fysiske_personer ?? []).join(", ")}
            placeholder="Fx: Enkeltmandsvirksomhed"
            className="w-full rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <p className="mt-1 text-xs text-tekst-daempet">
            Tilføjes en af disse til listen ovenfor, viser importsiden en advarsel om
            Robinsonliste-tjek.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Import-advarselsgrænse
          </label>
          <input
            type="number"
            name="import_advarsel_graense"
            min={0}
            defaultValue={konfiguration?.import_advarsel_graense ?? undefined}
            className="w-32 rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <p className="mt-1 text-xs text-tekst-daempet">
            Advarer ved import, hvis det samlede antal leads efter importen overstiger dette tal.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Ringetidsvindue
          </label>
          <p className="mb-2 text-xs text-tekst-daempet">
            Ringelisten skjules automatisk uden for disse tidspunkter og ugedage.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              name="ringetid_fra"
              defaultValue={konfiguration?.ringetid_fra?.slice(0, 5)}
              className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
            />
            <span className="text-sm text-tekst-daempet">til</span>
            <input
              type="time"
              name="ringetid_til"
              defaultValue={konfiguration?.ringetid_til?.slice(0, 5)}
              className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {UGEDAGE.map((d) => (
              <label key={d.tal} className="flex items-center gap-1.5 text-xs text-tekst">
                <input
                  type="checkbox"
                  name="ringetid_ugedage"
                  value={d.tal}
                  defaultChecked={(konfiguration?.ringetid_ugedage ?? [1, 2, 3, 4, 5]).includes(
                    d.tal
                  )}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="glow-accent w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
        >
          Gem forretningsregler
        </button>
        {state?.fejl && <p className="text-xs text-spaerret">{state.fejl}</p>}
        {state?.ok && <p className="text-xs text-godkendt">Gemt.</p>}
      </form>
    </div>
  );
}

// Etape 11 forberedelse — CVR system-til-system-adgang. Formularen forsvinder
// og erstattes af en status-visning, så snart en forbindelse er gemt ("den
// skal forsvinde", som brugeren bad om) - password'et vises aldrig igen,
// hverken her eller nogen andre steder, og sendes aldrig til klienten fra
// serveren (se cvr_forbindelse-migrationen: kun ejer-rollen kan overhovedet
// læse rækken, og selv da henter layout.tsx bevidst ikke password-kolonnen).
// Selve forbindelsen kører 24/7 i backend'en, uafhængigt af om nogen er
// logget ind - gemmes den én gang, kan et senere datatræk (Etape 11) bruge
// den når som helst.
function IntegrationerSektion({
  cvrForbindelse,
  konfiguration,
}: {
  cvrForbindelse: CvrForbindelse;
  konfiguration: Konfiguration;
}) {
  const [gemState, gemAction, gemPending] = useActionState(gemCvrForbindelse, null);
  const [emailState, emailAction, emailPending] = useActionState(opdaterOsintKontaktEmail, null);
  const [testPending, setTestPending] = useState(false);
  const [testResultat, setTestResultat] = useState<{ ok: boolean; besked: string } | null>(null);
  const [fjernPending, setFjernPending] = useState(false);
  const [redigerer, setRedigerer] = useState(false);

  // Kilden til sandhed er cvrForbindelse-prop'en fra serveren (opdateres via
  // revalidatePath, efter gemAction er kørt færdig) - ikke gemState, som kun
  // bruges til pending/fejl-visning mens formularen stadig er synlig.
  const erForbundet = !!cvrForbindelse?.brugernavn && !redigerer;

  async function haandterTest() {
    setTestPending(true);
    setTestResultat(null);
    const resultat = await afproevCvrForbindelse();
    setTestPending(false);
    if (resultat.fejl) {
      setTestResultat({ ok: false, besked: resultat.fejl });
    } else {
      setTestResultat({ ok: resultat.ok ?? false, besked: resultat.besked ?? "" });
    }
  }

  async function haandterFjern() {
    if (!confirm("Fjern den gemte CVR-forbindelse? Automatiske datatræk stopper, indtil den gemmes igen.")) {
      return;
    }
    setFjernPending(true);
    await fjernCvrForbindelse();
    setFjernPending(false);
  }

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 text-lg font-semibold text-tekst">
        <Plug className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Integrationer
      </h1>
      <p className="mb-4 text-sm text-tekst-daempet">
        Forbindelse til Erhvervsstyrelsens CVR system-til-system-adgang. Kun synlig for ejere.
        Login gemmes sikkert i backend'en og bruges automatisk til fremtidige datatræk — I skal
        ikke logge ind igen, hver gang appen bruges.
      </p>

      {erForbundet ? (
        <div className="flex flex-col gap-4 rounded-lg border border-kant bg-flade p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-godkendt/15">
              <Check className="h-4 w-4 text-godkendt" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-medium text-tekst">
                Forbundet som {cvrForbindelse?.brugernavn}
              </p>
              {cvrForbindelse?.forbundet_tidspunkt && (
                <p className="text-xs text-tekst-daempet">
                  Tilføjet {new Date(cvrForbindelse.forbundet_tidspunkt).toLocaleString("da-DK")}
                </p>
              )}
            </div>
          </div>

          {cvrForbindelse?.sidst_testet && (
            <p className="text-xs text-tekst-daempet">
              Sidst testet {new Date(cvrForbindelse.sidst_testet).toLocaleString("da-DK")} —{" "}
              <span className={cvrForbindelse.sidst_test_ok ? "text-godkendt" : "text-spaerret"}>
                {cvrForbindelse.sidst_test_besked}
              </span>
            </p>
          )}

          {testResultat && (
            <p className={`text-xs ${testResultat.ok ? "text-godkendt" : "text-spaerret"}`}>
              {testResultat.besked}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={haandterTest}
              disabled={testPending}
              className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst transition-colors hover:border-accent disabled:opacity-60"
            >
              {testPending ? "Tester…" : "Test forbindelse"}
            </button>
            <button
              type="button"
              onClick={() => setRedigerer(true)}
              className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst transition-colors hover:border-accent"
            >
              Skift login
            </button>
            <button
              type="button"
              onClick={haandterFjern}
              disabled={fjernPending}
              className="flex items-center gap-1.5 rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-spaerret hover:text-spaerret disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              Fjern forbindelse
            </button>
          </div>
        </div>
      ) : (
        <form action={gemAction} className="flex flex-col gap-3 rounded-lg border border-kant bg-flade p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tekst-daempet">Brugernavn</span>
            <input
              type="text"
              name="brugernavn"
              autoComplete="off"
              defaultValue={cvrForbindelse?.brugernavn ?? ""}
              className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tekst-daempet">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder={cvrForbindelse?.brugernavn ? "Skriv nyt password for at skifte" : undefined}
              className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
            />
          </label>
          <p className="text-xs text-tekst-daempet">
            Fra Erhvervsstyrelsens system-til-system-adgang (kontakt cvrselvbetjening@erst.dk for
            login). Gemmes kun i backend'en — vises aldrig igen efter dette.
          </p>
          {gemState?.fejl && <p className="text-xs text-spaerret">{gemState.fejl}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={gemPending}
              className="glow-accent w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
            >
              {gemPending ? "Forbinder…" : "Gem forbindelse"}
            </button>
            {redigerer && (
              <button
                type="button"
                onClick={() => setRedigerer(false)}
                className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:text-tekst"
              >
                Annullér
              </button>
            )}
          </div>
        </form>
      )}

      <h2 className="mb-1 mt-6 text-sm font-semibold text-tekst">OSINT-signaler</h2>
      <p className="mb-4 text-sm text-tekst-daempet">
        Når Klarvo henter offentlige signaler fra en virksomheds egen hjemmeside (Etape 8),
        identificerer den sig ærligt med en kontakt-e-mail i forespørgslen — så en sideejer altid
        kan se hvem der spurgte. Uden en adresse her henter systemet ingenting.
      </p>
      <form
        action={emailAction}
        className="flex flex-col gap-3 rounded-lg border border-kant bg-flade p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tekst-daempet">Kontakt-e-mail</span>
          <input
            type="email"
            name="osint_kontakt_email"
            defaultValue={konfiguration?.osint_kontakt_email ?? ""}
            placeholder="fx hello@jeresfirma.dk"
            className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
        </label>
        {emailState?.fejl && <p className="text-xs text-spaerret">{emailState.fejl}</p>}
        {emailState?.ok && <p className="text-xs text-godkendt">Gemt.</p>}
        <button
          type="submit"
          disabled={emailPending}
          className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst disabled:opacity-60"
        >
          {emailPending ? "Gemmer…" : "Gem"}
        </button>
      </form>
    </div>
  );
}
