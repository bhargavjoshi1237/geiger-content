import { getScreenContent } from "@/components/internal/screens/screen_content";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";

function createScreenDefinition(title) {
  const [description, details] = getScreenContent(title);

  return {
    title,
    description,
    details,
  };
}

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
