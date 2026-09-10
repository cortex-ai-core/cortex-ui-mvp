import { IconLock, IconSettings } from "@/components/icons";
import { SettingsDestination } from "./shared";

export type SettingsDestinationView =
  | "user-settings"
  | "user-management"
  | "organization-administration"
  | "role-management";

export default function SettingsLanding({
  onNavigate,
}: {
  onNavigate: (view: SettingsDestinationView) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-900">
            Settings
          </h2>
          <p className="mt-1 text-[14px] text-ink-muted">
            Manage your preferences, people, workspace, and access controls.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsDestination
            title="User Settings"
            description="Personalize how Cortéx responds and manage your document and privacy preferences."
            detail="Display · Response Style · Document Types · Privacy and Data"
            icon={<IconSettings size={19} />}
            onClick={() => onNavigate("user-settings")}
          />
          <SettingsDestination
            title="User Management"
            description="View the people who have access to this Cortéx workspace."
            icon={<span className="text-lg font-semibold">U</span>}
            onClick={() => onNavigate("user-management")}
          />
          <SettingsDestination
            title="Organization Administration"
            description="Browse organizations and the namespaces contained within them."
            icon={<span className="text-lg font-semibold">O</span>}
            onClick={() => onNavigate("organization-administration")}
          />
          <SettingsDestination
            title="Role Management"
            description="View your role or manage role assignments for your organization."
            icon={<IconLock size={18} />}
            onClick={() => onNavigate("role-management")}
          />
        </div>
      </div>
    </div>
  );
}
