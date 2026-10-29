import "@testing-library/jest-dom";
import { server } from "./mocks/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.PAYSTACK_SECRET_KEY = "sk_test_fake";
process.env.EMAIL_RELAY_URL = "https://script.google.com/fake";
process.env.EMAIL_RELAY_SECRET = "test-secret";
process.env.NEXT_PUBLIC_SITE_URL = "https://dmaths.test";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
