const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateDiscriminant(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
