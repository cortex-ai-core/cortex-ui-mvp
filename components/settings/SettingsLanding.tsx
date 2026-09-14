import { IconLock, IconSettings } from "@/components/icons";
import { SettingsDestination } from "./shared";

export type SettingsDestinationView =
  | "user-settings"
  | "user-management"
  | "organization-administration"
  | "role-management"
  | "personas";

export default function SettingsLanding({
  onNavigate,
  role,
}: {
  onNavigate: (view: SettingsDestinationView) => void;
  role: string;
}) {
  const canManageSettings = role === "admin" || role === "super_admin";
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-900">
            Settings
          </h2>
          <p className="mt-1 text-[14px] text-ink-muted">
            {canManageSettings
              ? "Manage your preferences, people, workspace, and access controls."
              : "Manage your personal preferences and settings."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsDestination
            title="User Settings"
            description="Your account, how Cortéx answers you, and what happens to your chats."
            detail="Account · Display · Answer length · Personalization · Privacy and Data"
            icon={<IconSettings size={19} />}
            onClick={() => onNavigate("user-settings")}
          />
          {canManageSettings && <>
          <SettingsDestination
            title="User Management"
            description="The people in your organization: who they are, what they may do, and which namespaces and persona they have."
            detail="People · Roles · Namespaces · Personas"
            icon={<span className="text-lg font-semibold">U</span>}
            onClick={() => onNavigate("user-management")}
          />
          <SettingsDestination
            title="Organization Administration"
            description="Organizations and their namespaces, who belongs to each, and the organization-wide settings for chats and documents."
            detail="Organizations · Namespaces · Members · Chat retention · Document types · Default personas"
            icon={<span className="text-lg font-semibold">O</span>}
            onClick={() => onNavigate("organization-administration")}
          />
          <SettingsDestination
            title="Role Management"
            description="What each role may do, and which role each person holds."
            detail="Roles · Permissions · Assignments"
            icon={<IconLock size={18} />}
            onClick={() => onNavigate("role-management")}
          />
          <SettingsDestination
            title="Personas"
            description="Define how Cortéx sounds and works for each audience, version the rules, and see what any user will get."
            detail="Personas · Rules and versions · Preview"
            icon={<span className="text-lg font-semibold">P</span>}
            onClick={() => onNavigate("personas")}
          />
          </>}
        </div>
      </div>
    </div>
  );
}
