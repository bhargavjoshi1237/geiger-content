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
import { ContentPerformanceScreen } from "@/components/internal/screens/intelligence/content_performance";
import { AudiencePerformanceScreen } from "@/components/internal/screens/intelligence/audience_performance";
import { FunnelsJourneysScreen } from "@/components/internal/screens/intelligence/funnels_journeys";
import { TopicInterestScreen } from "@/components/internal/screens/intelligence/topic_interest";
import { SemanticSearchScreen } from "@/components/internal/screens/intelligence/semantic_search";
import { AiTagSuggestionsScreen } from "@/components/internal/screens/intelligence/ai_tag_suggestions";
import { EmbeddingsScreen } from "@/components/internal/screens/intelligence/embeddings";
import { DuplicateDetectionScreen } from "@/components/internal/screens/intelligence/duplicate_detection";
import { ContentGapsScreen } from "@/components/internal/screens/intelligence/content_gaps";
import { KnowledgeGraphScreen } from "@/components/internal/screens/intelligence/knowledge_graph";
import { DecisionExplanationsScreen } from "@/components/internal/screens/intelligence/decision_explanations";

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
  "Content Performance": ContentPerformanceScreen,
  "Audience Performance": AudiencePerformanceScreen,
  "Funnels & Journeys": FunnelsJourneysScreen,
  "Topic Interest": TopicInterestScreen,
  "Semantic Search": SemanticSearchScreen,
  "AI Tag Suggestions": AiTagSuggestionsScreen,
  Embeddings: EmbeddingsScreen,
  "Duplicate Detection": DuplicateDetectionScreen,
  "Content Gaps": ContentGapsScreen,
  "Knowledge Graph": KnowledgeGraphScreen,
  "Decision Explanations": DecisionExplanationsScreen,
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
