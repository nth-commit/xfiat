import fc from 'fast-check'

export type AsyncCommandFactory<Model extends object, Real> = {
  createCommand(spec: AsyncCommandFactory.Spec<Model, Real>): fc.AsyncCommand<Model, Real>
}

export namespace AsyncCommandFactory {
  export type Spec<Model extends object, Real> = Omit<fc.AsyncCommand<Model, Real>, 'check'> &
    Partial<Pick<fc.AsyncCommand<Model, Real>, 'check'>>

  export type Invariant<Real> = (r: Readonly<Real>) => Promise<void>

  export type Options<Model extends object, Real> = {
    globalCheck: fc.AsyncCommand<Model, Real>['check']
    globalPostRun: fc.AsyncCommand<Model, Real>['run']
    invariants: Invariant<Real>[]
    logging: boolean
  }

  export function create<Model extends object, Real>(
    options: Partial<Options<Model, Real>> = {}
  ): AsyncCommandFactory<Model, Real> {
    const options_: Options<Model, Real> = {
      globalCheck: () => true,
      globalPostRun: () => Promise.resolve(),
      invariants: [],
      logging: false,
      ...options,
    }

    return {
      createCommand: (spec) => {
        return {
          check: (m) => options_.globalCheck(m) && (!spec.check || spec.check(m)),
          run: async (m, r) => {
            if (options_.logging) {
              const m_ = m as any
              if (!m_.hasLoggedStart) {
                console.log('Start')
                m_.hasLoggedStart = true
              }

              console.log(spec.toString())
            }

            await spec.run(m, r)

            for (const invariant of options_.invariants) {
              await invariant(r)
            }

            await options_.globalPostRun(m, r)
          },
          toString: () => spec.toString(),
        }
      },
    }
  }
}
