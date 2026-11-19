import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { WorkspaceSummary } from '@/lib/api/endpoints/workspaces';
import type { ImportSourceEntry } from '@/features/settings/types/importSource';
import type { WorkspaceSection } from '@/features/teams/types/workspaceSection';
import type { GodSection } from '@/utils/godSections';
import type { SettingsSection } from '@/utils/settingsSections';
import {
  AgentAnalyticsExtras,
  godSections,
  SidebarFooterAction,
  useImportSources,
  useProjectSettingsSections,
  useToolSources,
  useWorkspaceSections,
  WorkspaceRailActions,
} from '@/cloud';

// This instance is its own edition: no slot adds a locked preview or a link to another one.

it('renders nothing where the self-hosted stubs point to Pro', () => {
  assert.equal(SidebarFooterAction(), null);
  assert.equal(WorkspaceRailActions({ variant: 'tile' }), null);
  assert.equal(AgentAnalyticsExtras({ scope: { workspaceId: 1 }, days: 30 }), null);
});

it('lists only the core sections and sources', () => {
  const imports = [{ kind: 'core', key: 'plane' }] as unknown as ImportSourceEntry[];
  assert.deepEqual(useImportSources(imports), imports);

  const settings = [{ slug: 'schedules' }, { slug: 'webhooks' }] as SettingsSection[];
  assert.deepEqual(useProjectSettingsSections(null, settings), settings);

  const workspace = [{ id: 'general' }, { id: 'queue' }] as WorkspaceSection[];
  const owner = { role: 'owner' } as WorkspaceSummary;
  assert.deepEqual(useWorkspaceSections(owner, workspace), workspace);

  const god = [{ slug: 'general' }] as GodSection[];
  assert.deepEqual(godSections(god), god);

  assert.deepEqual(useToolSources(), []);
});
