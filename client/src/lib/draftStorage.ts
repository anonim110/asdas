// Shared so both the composer (reads/writes the draft) and the auth store
// (clears it on logout, so the next account on a shared device never sees
// someone else's unsent draft) can reference the same key without a
// circular import between them.
export const DRAFT_KEY = 'murmur:composer-draft';
