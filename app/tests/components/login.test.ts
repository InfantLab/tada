/**
 * Component tests for app/pages/login.vue
 *
 * Tests form validation logic, input binding, submit behavior, and mode toggling.
 * Uses @nuxt/test-utils/runtime mountSuspended for proper Nuxt environment support.
 *
 * Limitations:
 * - API endpoints are mocked via registerEndpoint
 * - navigateTo is mocked via mockNuxtImport
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createError } from "h3";
import {
  mountSuspended,
  mockNuxtImport,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import LoginPage from "~/pages/login.vue";

// mockNuxtImport is a compile-time macro that gets hoisted.
// The factory must not reference variables defined after it.
// Use vi.fn() inside the factory and export the mock for later assertions.
const { navigateToMock } = vi.hoisted(() => {
  return { navigateToMock: vi.fn() };
});

mockNuxtImport("navigateTo", () => navigateToMock);

mockNuxtImport("useRoute", () => () => ({
  query: {},
}));

// Register mock endpoints for session and has-users checks
let mockHasUsers = true;

registerEndpoint("/api/auth/session", () => {
  throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
});

registerEndpoint("/api/auth/has-users", () => ({
  hasUsers: mockHasUsers,
}));

// Auth endpoint behavior
let authShouldFail = false;
let authErrorMessage = "Authentication failed";

registerEndpoint("/api/auth/login", () => {
  if (authShouldFail) {
    throw createError({ statusCode: 401, statusMessage: authErrorMessage });
  }
  return {};
});

registerEndpoint("/api/auth/register", () => {
  if (authShouldFail) {
    throw createError({ statusCode: 400, statusMessage: authErrorMessage });
  }
  return {};
});

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasUsers = true;
    authShouldFail = false;
    authErrorMessage = "Authentication failed";
  });

  async function mountLogin() {
    const wrapper = await mountSuspended(LoginPage);
    await flushPromises();
    return wrapper;
  }

  describe("rendering", () => {
    it("renders login form with username and password fields", async () => {
      const wrapper = await mountLogin();

      const usernameInput = wrapper.find("input#username");
      const passwordInput = wrapper.find("input#password");

      expect(usernameInput.exists()).toBe(true);
      expect(passwordInput.exists()).toBe(true);
      expect(passwordInput.attributes("type")).toBe("password");
    });

    it("renders Sign In button in login mode", async () => {
      const wrapper = await mountLogin();

      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.exists()).toBe(true);
      expect(submitBtn.text()).toContain("Sign In");
    });

    it("does not show confirm password field in login mode", async () => {
      const wrapper = await mountLogin();

      const confirmInput = wrapper.find("input#confirmPassword");
      expect(confirmInput.exists()).toBe(false);
    });

    it("shows mode toggle button when users exist", async () => {
      const wrapper = await mountLogin();

      const toggleBtn = wrapper.find('button[type="button"]');
      expect(toggleBtn.exists()).toBe(true);
      expect(toggleBtn.text()).toContain("Need an account? Register");
    });
  });

  describe("mode toggling", () => {
    it("switches to register mode when toggle is clicked", async () => {
      const wrapper = await mountLogin();

      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger("click");

      expect(wrapper.find("input#confirmPassword").exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').text()).toContain(
        "Create Account",
      );
    });

    it("switches back to login mode when toggle is clicked again", async () => {
      const wrapper = await mountLogin();

      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger("click");
      await toggleBtn.trigger("click");

      expect(wrapper.find("input#confirmPassword").exists()).toBe(false);
      expect(wrapper.find('button[type="submit"]').text()).toContain("Sign In");
    });
  });

  describe("input binding", () => {
    it("binds username input to reactive state", async () => {
      const wrapper = await mountLogin();

      const input = wrapper.find("input#username");
      await input.setValue("testuser");

      expect((input.element as HTMLInputElement).value).toBe("testuser");
    });

    it("binds password input to reactive state", async () => {
      const wrapper = await mountLogin();

      const input = wrapper.find("input#password");
      await input.setValue("mypassword");

      expect((input.element as HTMLInputElement).value).toBe("mypassword");
    });
  });

  describe("form validation (login mode)", () => {
    it("shows error when submitting with empty fields", async () => {
      const wrapper = await mountLogin();

      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Please fill in all fields");
    });

    it("shows error when username is empty", async () => {
      const wrapper = await mountLogin();

      await wrapper.find("input#password").setValue("password123");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Please fill in all fields");
    });

    it("shows error when password is empty", async () => {
      const wrapper = await mountLogin();

      await wrapper.find("input#username").setValue("testuser");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Please fill in all fields");
    });

    it("navigates to home after successful login", async () => {
      const wrapper = await mountLogin();

      await wrapper.find("input#username").setValue("testuser");
      await wrapper.find("input#password").setValue("password123");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(navigateToMock).toHaveBeenCalledWith("/");
    });

    it("shows error message on API failure", async () => {
      authShouldFail = true;
      authErrorMessage = "Invalid credentials";

      const wrapper = await mountLogin();

      await wrapper.find("input#username").setValue("testuser");
      await wrapper.find("input#password").setValue("wrongpass");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      // Should show some error (exact text depends on how the error propagates)
      const text = wrapper.text();
      expect(
        text.includes("Invalid credentials") ||
          text.includes("Authentication failed"),
      ).toBe(true);
    });
  });

  describe("form validation (register mode)", () => {
    async function mountInRegisterMode() {
      const wrapper = await mountLogin();
      const toggleBtn = wrapper.find('button[type="button"]');
      await toggleBtn.trigger("click");
      return wrapper;
    }

    it("shows error when passwords do not match", async () => {
      const wrapper = await mountInRegisterMode();

      await wrapper.find("input#username").setValue("newuser");
      await wrapper.find("input#password").setValue("password123");
      await wrapper.find("input#confirmPassword").setValue("different");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain("Passwords do not match");
    });

    it("shows error when password is too short", async () => {
      const wrapper = await mountInRegisterMode();

      await wrapper.find("input#username").setValue("newuser");
      await wrapper.find("input#password").setValue("short");
      await wrapper.find("input#confirmPassword").setValue("short");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Password must be at least 8 characters",
      );
    });

    it("does not submit when passwords do not match", async () => {
      const wrapper = await mountInRegisterMode();

      await wrapper.find("input#username").setValue("newuser");
      await wrapper.find("input#password").setValue("password123");
      await wrapper.find("input#confirmPassword").setValue("mismatch123");
      await wrapper.find("form").trigger("submit");
      await flushPromises();

      // navigateTo should NOT have been called (validation prevented submit)
      expect(navigateToMock).not.toHaveBeenCalled();
    });
  });

  describe("submit button state", () => {
    it("submit button exists and is not disabled initially", async () => {
      const wrapper = await mountLogin();

      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.exists()).toBe(true);
      // Not disabled before any submission
      expect(submitBtn.attributes("disabled")).toBeUndefined();
    });
  });

  describe("first-user flow", () => {
    it("forces register mode when no users exist", async () => {
      mockHasUsers = false;

      const wrapper = await mountSuspended(LoginPage);
      await flushPromises();
      // Extra ticks to ensure onMounted async logic completes and DOM updates
      await nextTick();
      await flushPromises();
      await nextTick();

      // Should be in register mode
      expect(wrapper.find("input#confirmPassword").exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').text()).toContain(
        "Create Account",
      );

      // Should show first-user welcome message
      expect(wrapper.text()).toContain(
        "Welcome! Create your first account",
      );
    });
  });
});
