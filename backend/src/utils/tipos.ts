// Helpers de tipos reutilizables.

/**
 * Exactamente una de las claves de T presente (las demás prohibidas).
 * `ExactlyOne<{ a: number; b: number }>` = `{ a: number; b?: never } | { a?: never; b: number }`.
 */
export type ExactlyOne<T> = {
  [K in keyof T]: Pick<T, K> & { [O in Exclude<keyof T, K>]?: never };
}[keyof T];


