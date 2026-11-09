
import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PlatformSetting = {
  key: string;
  category: string;
  value: unknown;
  description: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function displayValue(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function saveSetting(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const rawValue = String(formData.get("value") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!key || !category || !rawValue || !reason) {
    redirect("/admin/settings?error=" + encodeURIComponent("Complete all required fields."));
  }

  let value: unknown;

  try {
    value = JSON.parse(rawValue);
  } catch {
    redirect("/admin/settings?error=" + encodeURIComponent("The value must contain valid JSON."));
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("upsert_platform_setting", {
    p_key: key,
    p_category: category,
    p_value: value,
    p_description: description,
    p_reason: reason,
  });

  if (error) {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent(error.message || "Unable to save the setting.")
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit-logs");

  redirect("/admin/settings?saved=1");
}

function SettingsLoading() {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-700/20 border-t-green-700" />
      <p className="mt-3 text-sm text-gray-600">Loading platform settings...</p>
    </div>
  );
}

async function SettingsContent({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await connection();

  const supabase = await createClient();

  const [
    { data: settingsData, error: settingsError },
    { data: adminData },
    params,
  ] = await Promise.all([
    supabase
      .from("platform_settings")
      .select("key, category, value, description, updated_by, created_at, updated_at")
      .order("category", { ascending: true })
      .order("key", { ascending: true }),
    supabase
      .from("admin_users")
      .select("role, status")
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    searchParams,
  ]);

  const settings = (settingsData ?? []) as PlatformSetting[];
  const canManage = adminData?.role === "super_admin";
  const categories = [...new Set(settings.map((setting) => setting.category))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-700">Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Manage configurable NiaWorld platform values and review changes.
            Sensitive credentials should remain in secure server-side environment variables.
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-800">
            Access level
          </p>
          <p className="mt-1 font-semibold text-green-950">
            {canManage ? "Super Admin · Manage" : "Read only"}
          </p>
        </div>
      </div>

      {params.saved === "1" && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Setting saved successfully. The change has been recorded in the audit log.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error}
        </div>
      )}

      {settingsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Unable to load settings: {settingsError.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total settings</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{settings.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{categories.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Your access</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {canManage ? "Full management" : "View only"}
          </p>
        </div>
      </div>

      {canManage && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">Add a platform setting</h2>
            <p className="mt-1 text-sm text-gray-500">
              Use a unique key. Values must be valid JSON, such as a string, number,
              boolean, array, or object.
            </p>
          </div>

          <form action={saveSetting} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Setting key *
                </span>
                <input
                  name="key"
                  required
                  maxLength={100}
                  pattern="[a-z][a-z0-9_.-]{1,99}"
                  placeholder="platform.maintenance_mode"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Lowercase letters, numbers, dots, underscores and hyphens.
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category *
                </span>
                <input
                  name="category"
                  required
                  maxLength={50}
                  placeholder="platform"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Value (JSON) *
              </span>
              <textarea
                name="value"
                required
                rows={4}
                placeholder={'true\nor\n{"enabled": true}'}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </span>
              <input
                name="description"
                maxLength={500}
                placeholder="Explain what this setting controls."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for change *
              </span>
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={1000}
                rows={2}
                placeholder="Explain why this setting is being created."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <div>
              <button
                type="submit"
                className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                Save setting
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Existing settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            {settings.length} saved {settings.length === 1 ? "setting" : "settings"}.
            Changes are recorded in Admin Audit Logs.
          </p>
        </div>

        {settings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
              <span className="text-2xl">⚙</span>
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">No platform settings yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Add the first setting above. We will introduce specific NiaWorld
              configuration options after confirming their intended behavior.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {categories.map((category) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  {category}
                </h3>

                {settings
                  .filter((setting) => setting.category === category)
                  .map((setting) => (
                    <article
                      key={setting.key}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{setting.key}</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {setting.description || "No description provided."}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          {category}
                        </span>
                      </div>

                      <div className="space-y-3 p-5">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Current value
                          </p>
                          <pre className="overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs text-gray-800">
                            {displayValue(setting.value)}
                          </pre>
                        </div>

                        <p className="text-xs text-gray-500">
                          Last updated:{" "}
                          {new Date(setting.updated_at).toLocaleString()}
                        </p>

                        {canManage && (
                          <details className="rounded-xl border border-gray-200">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-50">
                              Edit this setting
                            </summary>

                            <form action={saveSetting} className="grid gap-4 border-t border-gray-100 p-4">
                              <input type="hidden" name="key" value={setting.key} />

                              <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                                  Category
                                </span>
                                <input
                                  name="category"
                                  required
                                  maxLength={50}
                                  defaultValue={setting.category}
                                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                                  Value (JSON)
                                </span>
                                <textarea
                                  name="value"
                                  required
                                  rows={5}
                                  defaultValue={displayValue(setting.value)}
                                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                                  Description
                                </span>
                                <input
                                  name="description"
                                  maxLength={500}
                                  defaultValue={setting.description}
                                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                                  Reason for change *
                                </span>
                                <textarea
                                  name="reason"
                                  required
                                  minLength={3}
                                  maxLength={1000}
                                  rows={2}
                                  placeholder="Explain why this value needs to change."
                                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                />
                              </label>

                              <div>
                                <button
                                  type="submit"
                                  className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
                                >
                                  Update setting
                                </button>
                              </div>
                            </form>
                          </details>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-950">Security notice</h3>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Do not save Supabase keys, payment gateway secrets, passwords, private
          tokens, or other credentials in this table. Keep those in secure
          environment variables. Also, a saved setting only changes platform
          behavior after the relevant application feature is programmed to read it.
        </p>
      </div>
    </div>
  );
}

export default function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent searchParams={searchParams} />
    </Suspense>
  );
}
