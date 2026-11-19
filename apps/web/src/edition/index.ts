import type { ImportSourceEntry } from '@/features/settings/types/importSource';
import type { ToolSourceEntry } from '@/features/teams/types/toolSource';
import type { WorkspaceSection } from '@/features/teams/types/workspaceSection';
import type { AgentAnalyticsScope } from '@/lib/api/endpoints/agentAnalytics';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { WorkspaceSummary } from '@/lib/api/endpoints/workspaces';
import type { GodSection } from '@/utils/godSections';
import type { SettingsSection } from '@/utils/settingsSections';

// What `@/cloud` resolves to in this fork. The instance is its own edition, so it keeps
// upstream's self-hosted stubs except the ones that add locked previews of another edition
// or links to it; those show the core alone.
export * from '../ce';

export function SidebarFooterAction() {
  return null;
}

export function WorkspaceRailActions(_props: { variant?: 'tile' | 'row' }) {
  return null;
}

export function AgentAnalyticsExtras(_props: { scope: AgentAnalyticsScope; days: number }) {
  return null;
}

export function useImportSources(core: ImportSourceEntry[]): ImportSourceEntry[] {
  return core;
}

export function useProjectSettingsSections(
  _project: ProjectDetail | null,
  core: SettingsSection[],
): SettingsSection[] {
  return core;
}

export function useWorkspaceSections(
  _workspace: WorkspaceSummary,
  core: WorkspaceSection[],
): WorkspaceSection[] {
  return core;
}

export function useToolSources(): ToolSourceEntry[] {
  return [];
}

export function godSections(core: GodSection[]): GodSection[] {
  return core;
}
