export const minimumPasswordLength = 12
export const maximumPasswordLength = 256

export function isNewPassword(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= minimumPasswordLength
    && value.length <= maximumPasswordLength
    && value.trim().length > 0
}
