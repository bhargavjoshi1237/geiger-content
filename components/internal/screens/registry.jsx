import { getScreenContent } from "@/components/internal/screens/screen_content";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { AllContentScreen } from "@/components/internal/screens/content/all_content";

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
// the open entry lives in ?content= (see useWorkspaceUrl), so only
// workspace-level views are registered here. Unlisted titles fall back to
// ComingSoonScreen via getScreen().
const COMPONENT_REGISTRY = {
  "All Content": AllContentScreen,
  Content: AllContentScreen,
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
