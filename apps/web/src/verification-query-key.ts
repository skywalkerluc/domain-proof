export function verificationQueryKey(id: string) {
  return ['domain-verification', id] as const;
}
