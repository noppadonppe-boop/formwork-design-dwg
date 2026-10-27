// Internal unit system follows the reference book (MKS-technical):
// force kg, length cm for sections/stresses, m for geometry, pressure kg/m², stress kg/cm².

export const PSF_TO_KGM2 = 4.882
export const FT = 0.3048 // m
export const INCH_CM = 2.54

export const mPerHrToFtPerHr = (r: number) => r / FT
export const cToF = (t: number) => 1.8 * t + 32
export const psfToKgm2 = (p: number) => p * PSF_TO_KGM2

/** kg/m² acting on a strip of width b (m) → line load kg/cm */
export const pressureToLineLoad = (pKgm2: number, tributaryM: number) => (pKgm2 * tributaryM) / 100

export const mToCm = (m: number) => m * 100
export const cmToM = (cm: number) => cm / 100

export function round(x: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(x * f) / f
}

/** Round a span down to a practical module (default 5 cm). */
export function floorTo(xCm: number, moduleCm = 5): number {
  return Math.floor(xCm / moduleCm + 1e-9) * moduleCm
}

export function fmt(x: number, digits = 0): string {
  return x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Linear interpolation in a sorted x array, clamped at the ends. */
export function interp1(xs: readonly number[], ys: readonly number[], x: number): number {
  if (x <= xs[0]) return ys[0]
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1]
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
      return ys[i - 1] + t * (ys[i] - ys[i - 1])
    }
  }
  return ys[ys.length - 1]
}

/** Bilinear interpolation on a grid table[row][col], clamped. */
export function interp2(rows: readonly number[], cols: readonly number[], table: readonly (readonly number[])[], r: number, c: number): number {
  const perRow = table.map((row) => interp1(cols, row, c))
  return interp1(rows, perRow, r)
}
