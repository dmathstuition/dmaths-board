import { vi } from "vitest";

export function makeMockSupabaseClient() {
  // Tracks direct-await resolution for chains like await client.from(...).update(...).eq(...)
  let directResolve: { data: any; error: any } = { data: null, error: null };

  const queryBuilder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Allow await on any point in the chain (for update/insert/delete without .single())
    then(resolve: (v: any) => any, reject: (e: any) => any) {
      return Promise.resolve(directResolve).then(resolve, reject);
    },
    // Helper: configure what direct-await resolves to (for update/insert/delete results)
    _setDirectResolve(v: { data?: any; error?: any }) {
      directResolve = { data: v.data ?? null, error: v.error ?? null };
    },
  };

  const storageBuilder = {
    upload: vi.fn().mockResolvedValue({ data: { path: "uploads/file.pdf" }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/uploads/file.pdf" } }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://cdn.test/storage/v1/object/sign/submissions/a/b.png?token=sig" },
      error: null,
    }),
  };

  const client = {
    from: vi.fn().mockReturnValue(queryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: "DM-2026-0001", error: null }),
    storage: {
      from: vi.fn().mockReturnValue(storageBuilder),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "new-user-1" } },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUserById: vi.fn().mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null }),
        getUserById: vi.fn().mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null }),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
    // Exposed for assertions / per-test configuration
    _qb: queryBuilder,
    _storage: storageBuilder,
  };

  return client;
}

export type MockSupabaseClient = ReturnType<typeof makeMockSupabaseClient>;
