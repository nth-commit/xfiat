export type ObjectHelpers = {
  map<Key extends keyof any, Value, NewValue>(
    record: Record<Key, Value>,
    f: (value: Value, Key: Key) => NewValue
  ): Record<Key, NewValue>
}

const ObjectHelpers: ObjectHelpers = {
  map: (record, f) =>
    Object.entries(record).reduce((acc, [key, value]) => {
      acc[key] = f(value as any, key as any)
      return acc
    }, {} as any),
}

export default ObjectHelpers
