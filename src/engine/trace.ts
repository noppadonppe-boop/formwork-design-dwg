// A calculation trace is the step-by-step record shown in the calc report.
// Every engine function returns its result together with the steps that produced it.

export interface Step {
  label: string // Thai/English description
  expr?: string // formula with substituted values
  value?: number
  unit?: string
  ref?: string // equation / table / book page, e.g. "สมการ 2.7 หน้า 37"
  status?: 'ok' | 'warn' | 'fail'
}

export class Trace {
  readonly steps: Step[] = []
  readonly warnings: string[] = []

  add(step: Step): number {
    this.steps.push(step)
    return step.value ?? NaN
  }

  warn(msg: string) {
    this.warnings.push(msg)
  }

  merge(other: Trace, prefix?: string) {
    for (const s of other.steps) this.steps.push(prefix ? { ...s, label: `${prefix} — ${s.label}` } : s)
    this.warnings.push(...other.warnings)
  }
}
