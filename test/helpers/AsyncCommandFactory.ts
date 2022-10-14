import fc from 'fast-check'

export type AsyncCommandFactory<Model extends object, Real> = {
  createCommand(spec: AsyncCommandFactory.Spec<Model, Real>): fc.AsyncCommand<Model, Real>
}

export namespace AsyncCommandFactory {
  export type Spec<Model extends object, Real> = Omit<fc.AsyncCommand<Model, Real>, 'check'> &
    Partial<Pick<fc.AsyncCommand<Model, Real>, 'check'>>

  export type Invariant<Model, Real> = (m: Readonly<Model>, r: Readonly<Real>) => Promise<void>

  export type Options<Model extends object, Real> = {
    globalCheck: fc.AsyncCommand<Model, Real>['check']
    globalPostRun: fc.AsyncCommand<Model, Real>['run']
    invariants: Invariant<Model, Real>[]
  }

  export function create<Model extends object, Real>(
    options: Partial<Options<Model, Real>> = {}
  ): AsyncCommandFactory<Model, Real> {
    const options_: Options<Model, Real> = {
      globalCheck: () => true,
      globalPostRun: () => Promise.resolve(),
      invariants: [],
      ...options,
    }

    return {
      createCommand: (spec) => {
        return {
          check: (m) => options_.globalCheck(m) && (!spec.check || spec.check(m)),
          run: async (m, r) => {
            await spec.run(m, r)

            for (const invariant of options_.invariants) {
              await invariant(m, r)
            }

            await options_.globalPostRun(m, r)
          },
          toString: () => spec.toString(),
        }
      },
    }
  }
}
