/** Склейка классов без лишних пробелов. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter((value): value is string => Boolean(value)).join(' ')
}