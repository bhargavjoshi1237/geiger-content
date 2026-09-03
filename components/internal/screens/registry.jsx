import { getScreenContent } from "@/components/internal/screens/screen_content";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { AllContentScreen } from "@/components/internal/screens/content/all_content";
import { DraftsScreen } from "@/components/internal/screens/content/drafts";
import { PagesScreen } from "@/components/internal/screens/content/pages";
import { CollectionsScreen } from "@/components/internal/screens/content/collections";
import { AssetsScreen } from "@/components/internal/screens/content/assets";
import { SlotsScreen } from "@/components/internal/screens/content/slots";
import { ScheduledScreen } from "@/components/internal/screens/content/scheduled";
import { ArchivedScreen } from "@/components/internal/screens/content/archived";

function createScreenDefinition(title) {
  const [description, details] = getScreenContent(title);

  return {
    title,
    description,
    details,
  };
}

// Registry keys must exactly match `title` in sidebar_nav.jsx.
// Per-entity features are tabs inside the detail screen, not top-level entries:
// the open record lives in ?content=/?collection=/?asset=/?slot= (see
// useWorkspaceUrl), so only workspace-level views are registered here.
// Unlisted titles fall back to ComingSoonScreen via getScreen().
const COMPONENT_REGISTRY = {
  "All Content": AllContentScreen,
  Content: AllContentScreen,
  Drafts: DraftsScreen,
  Pages: PagesScreen,
  Collections: CollectionsScreen,
  Assets: AssetsScreen,
  "Content Slots": SlotsScreen,
  Scheduled: ScheduledScreen,
  Archived: ArchivedScreen,
};

export const SCREEN_REGISTRY = Object.fromEntries(
  workspaceNav.flatMap((item) => [
    [item.title, createScreenDefinition(item.title)],
    ...(item.subItems || []).map((subItem) => [
      subItem.title,
      createScreenDefinition(subItem.title),
    ]),
  ]),
);

export function getScreen(title) {
  return SCREEN_REGISTRY[title] || createScreenDefinition(title);
}

export function getScreenComponent(title) {
  return COMPONENT_REGISTRY[title] || null;
}
