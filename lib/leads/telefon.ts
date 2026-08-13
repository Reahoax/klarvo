// Telefonnormalisering (Etape 2-modul, se Spec.md afsnit 2B "Datakvalitet").
// Alle numre normaliseres til formatet +45XXXXXXXX. Numre der ikke kan
// tolkes som et dansk 8-cifret nummer afvises (returnerer null) fremfor at gætte.
export function normaliserTelefon(raa: string | null | undefined): string | null {
  if (!raa) return null;

  const cifre = raa.replace(/[^\d+]/g, "");

  let ottecifre: string | null = null;

  if (/^\+45\d{8}$/.test(cifre)) {
    ottecifre = cifre.slice(3);
  } else if (/^0045\d{8}$/.test(cifre)) {
    ottecifre = cifre.slice(4);
  } else if (/^\d{8}$/.test(cifre)) {
    ottecifre = cifre;
  }

  if (!ottecifre) return null;

  return `+45${ottecifre}`;
}
