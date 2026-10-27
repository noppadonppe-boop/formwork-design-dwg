import { describe, expect, it } from 'vitest'
import { DEFAULT_SHOP, withPrice } from '@/data/types'
import type { BomSummary } from './bom'
import { costRows, totalCost } from './cost'

const sum: BomSummary = {
  plywood: [{ description: 'ไม้อัด 18 มม.', area: 30, sheets: 11 }],
  timber: [{ description: 'เคร่า 1½"×3"', length: 100, volumeFt3: 10 }],
  steel: [{ description: 'ท่อ Ø2"', length: 50, weightKg: 200 }],
  counts: [
    { description: 'Form tie Ø1/2"', qty: 40, unit: 'ชุด' },
    { description: 'แป้นรองฐาน', qty: 20, unit: 'ตัว' },
  ],
  concreteM3: 5,
}

describe('purchase quantities and cost', () => {
  const s = withPrice(withPrice({ ...DEFAULT_SHOP, reuse: 2 }, 'ไม้อัด 18 มม.', 500), 'Form tie Ø1/2"', 25)
  const rows = costRows(sum, s, new Map([['ไม้อัด 18 มม.', 12]]), new Set(['Form tie Ø1/2"']))
  const by = (k: string) => rows.find((r) => r.key === k)!
  it('plywood: cutting-plan sheets + 10 % waste ÷ 2 reuses, rounded up', () => expect(by('ไม้อัด 18 มม.').buy).toBe(Math.ceil((12 * 1.1) / 2)))
  it('timber in ลบ.ฟ. with waste and reuse', () => expect(by('เคร่า 1½"×3"').buy).toBeCloseTo(5.5, 6))
  it('form ties are bought for every pour (no reuse)', () => expect(by('Form tie Ø1/2"').buy).toBe(40))
  it('other accessories are reused', () => expect(by('แป้นรองฐาน').buy).toBe(10))
  it('amount = price × buy, total over priced rows', () => {
    expect(by('ไม้อัด 18 มม.').amount).toBe(500 * 7)
    expect(totalCost(rows)).toBe(500 * 7 + 25 * 40)
  })
})
