import { getScreenContent } from "@/components/internal/screens/screen_content";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { AllContentScreen } from "@/components/internal/screens/content/all_content";
import { ContentOverviewScreen } from "@/components/internal/screens/overview/content_overview";
import { GeneralScreen } from "@/components/internal/screens/settings/general";
import { WorkspaceScreen } from "@/components/internal/screens/settings/workspace";
import { DraftsScreen } from "@/components/internal/screens/content/drafts";
import { PagesScreen } from "@/components/internal/screens/content/pages";
import { CollectionsScreen } from "@/components/internal/screens/content/collections";
import { AssetsScreen } from "@/components/internal/screens/content/assets";
import { SlotsScreen } from "@/components/internal/screens/content/slots";
import { ScheduledScreen } from "@/components/internal/screens/content/scheduled";
import { ArchivedScreen } from "@/components/internal/screens/content/archived";
import { ContentTypesScreen } from "@/components/internal/screens/architecture/content_types";
import { FieldSchemasScreen } from "@/components/internal/screens/architecture/field_schemas";
import { BlocksScreen } from "@/components/internal/screens/architecture/blocks";
import { ReferencesScreen } from "@/components/internal/screens/architecture/references";
import { ValidationScreen } from "@/components/internal/screens/architecture/validation";
import { TaxonomiesScreen } from "@/components/internal/screens/architecture/taxonomies";
import { LocalizationScreen } from "@/components/internal/screens/architecture/localization";
import { SourcesScreen } from "@/components/internal/screens/architecture/sources";
import { StructuredEditorScreen } from "@/components/internal/screens/editorial/structured_editor";
import { VisualEditorScreen } from "@/components/internal/screens/editorial/visual_editor";
import { CommentsScreen } from "@/components/internal/screens/editorial/comments";
import { AssignmentsScreen } from "@/components/internal/screens/editorial/assignments";
import { ReviewQueueScreen } from "@/components/internal/screens/editorial/review_queue";
import { WorkflowsScreen } from "@/components/internal/screens/editorial/workflows";
import { VersionHistoryScreen } from "@/components/internal/screens/editorial/version_history";
import { CompareScreen } from "@/components/internal/screens/editorial/compare";
import { BulkScreen } from "@/components/internal/screens/editorial/bulk";
import { PublishingQueueScreen } from "@/components/internal/screens/publishing/queue";
import { ReleasesScreen } from "@/components/internal/screens/publishing/releases";
import { EnvironmentsScreen } from "@/components/internal/screens/publishing/environments";
import { DeliveryApisScreen } from "@/components/internal/screens/publishing/delivery_apis";
import { WebhooksScreen } from "@/components/internal/screens/publishing/webhooks";
import { PublishingHistoryScreen } from "@/components/internal/screens/publishing/history";
import { TeamMembersScreen } from "@/components/internal/screens/governance/team";
import { RolesScreen } from "@/components/internal/screens/governance/roles";
import { PermissionsScreen } from "@/components/internal/screens/governance/permissions";
import { ContentPoliciesScreen } from "@/components/internal/screens/governance/policies";
import { AuditLogsScreen } from "@/components/internal/screens/governance/audit_logs";
import { RetentionScreen } from "@/components/internal/screens/governance/retention";
import { ApiExplorerScreen } from "@/components/internal/screens/developers/api_explorer";
import { RestApiScreen } from "@/components/internal/screens/developers/rest";
import { GraphqlApiScreen } from "@/components/internal/screens/developers/graphql";
import { SdksScreen } from "@/components/internal/screens/developers/sdks";
import { TypesScreen } from "@/components/internal/screens/developers/types";
import { PreviewScreen } from "@/components/internal/screens/developers/preview";
import { TokensScreen } from "@/components/internal/screens/developers/tokens";
import { ServiceAccountsScreen } from "@/components/internal/screens/developers/service_accounts";
import { AppsScreen } from "@/components/internal/screens/developers/apps";
import { LogsScreen } from "@/components/internal/screens/developers/logs";
import { ImportExportScreen } from "@/components/internal/screens/developers/import_export";
import { ProfilesScreen } from "@/components/internal/screens/audiences/profiles";
import { AnonymousScreen } from "@/components/internal/screens/audiences/anonymous";
import { IdentityScreen } from "@/components/internal/screens/audiences/identity";
import { TraitsScreen } from "@/components/internal/screens/audiences/traits";
import { CalculatedScreen } from "@/components/internal/screens/audiences/calculated";
import { EventsScreen } from "@/components/internal/screens/audiences/events";
import { SegmentsScreen } from "@/components/internal/screens/audiences/segments";
import { ConsentScreen } from "@/components/internal/screens/audiences/consent";
import { HistoryScreen } from "@/components/internal/screens/audiences/history";
import { ConnectionsScreen } from "@/components/internal/screens/audiences/connections";
import { VariantsScreen } from "@/components/internal/screens/personalization/variants";
import { TargetingScreen } from "@/components/internal/screens/personalization/targeting";
import { SegmentsTargetScreen } from "@/components/internal/screens/personalization/segments_target";
import { ContextTargetScreen } from "@/components/internal/screens/personalization/context_target";
import { ComponentTargetScreen } from "@/components/internal/screens/personalization/component_target";
import { BehaviorTargetScreen } from "@/components/internal/screens/personalization/behavior_target";
import { EdgeScreen } from "@/components/internal/screens/personalization/edge";
import { FrequencyScreen } from "@/components/internal/screens/personalization/frequency";
import { BoostsScreen } from "@/components/internal/screens/personalization/boosts";
import { StagesScreen } from "@/components/internal/screens/personalization/stages";
import { ExperimentsListScreen } from "@/components/internal/screens/experiments/list";
import { AbScreen } from "@/components/internal/screens/experiments/ab";
import { TrafficScreen } from "@/components/internal/screens/experiments/traffic";
import { GoalsScreen } from "@/components/internal/screens/experiments/goals";
import { HoldoutsScreen } from "@/components/internal/screens/experiments/holdouts";
import { EligibilityScreen } from "@/components/internal/screens/experiments/eligibility";
import { ScheduleScreen } from "@/components/internal/screens/experiments/schedule";
import { ResultsScreen } from "@/components/internal/screens/experiments/results";
import { WinnersScreen } from "@/components/internal/screens/experiments/winners";
import { BanditsScreen } from "@/components/internal/screens/experiments/bandits";
import { CollisionsScreen } from "@/components/internal/screens/experiments/collisions";
import { ModelsScreen } from "@/components/internal/screens/recommendations/models";
import { SimilarScreen } from "@/components/internal/screens/recommendations/similar";
import { AffinityScreen } from "@/components/internal/screens/recommendations/affinity";
import { TrendingScreen } from "@/components/internal/screens/recommendations/trending";
import { ContentRankScreen } from "@/components/internal/screens/recommendations/content_rank";
import { CollabRankScreen } from "@/components/internal/screens/recommendations/collab_rank";
import { ContextRankScreen } from "@/components/internal/screens/recommendations/context_rank";
import { DiversityScreen } from "@/components/internal/screens/recommendations/diversity";
import { BusinessScreen } from "@/components/internal/screens/recommendations/business";
import { RealtimeScreen } from "@/components/internal/screens/recommendations/realtime";
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
import { AiAssistantScreen } from "@/components/internal/screens/editorial/ai_assistant";
import { EdgeDeliveryScreen } from "@/components/internal/screens/publishing/edge_delivery";
import { CacheInvalidationScreen } from "@/components/internal/screens/publishing/cache_invalidation";
import { SitesBrandsScreen } from "@/components/internal/screens/publishing/sites_brands";
import { ConsentPrivacyScreen } from "@/components/internal/screens/governance/consent_privacy";
import { BrandingScreen } from "@/components/internal/screens/settings/branding";
import { IntegrationsScreen } from "@/components/internal/screens/settings/integrations";
import { SecurityScreen } from "@/components/internal/screens/settings/security";

function createScreenDefinition(title) {
  const [description, details] = getScreenContent(title);

  return {
    title,
    description,
    details,
  };
}

// Registry keys match sidebar titles; entity detail tabs use workspace query parameters.
const COMPONENT_REGISTRY = {
  Overview: ContentOverviewScreen,
  "All Content": AllContentScreen,
  Content: AllContentScreen,
  Drafts: DraftsScreen,
  Pages: PagesScreen,
  Collections: CollectionsScreen,
  Assets: AssetsScreen,
  "Content Slots": SlotsScreen,
  Scheduled: ScheduledScreen,
  Archived: ArchivedScreen,
  "Content Types": ContentTypesScreen,
  "Field Schemas": FieldSchemasScreen,
  "Reusable Blocks": BlocksScreen,
  References: ReferencesScreen,
  "Validation Rules": ValidationScreen,
  Taxonomies: TaxonomiesScreen,
  Localization: LocalizationScreen,
  "External Sources": SourcesScreen,
  "Structured Editor": StructuredEditorScreen,
  "Visual Editor": VisualEditorScreen,
  "Comments & Mentions": CommentsScreen,
  Assignments: AssignmentsScreen,
  "Review Queue": ReviewQueueScreen,
  "Approval Workflows": WorkflowsScreen,
  "Version History": VersionHistoryScreen,
  "Compare & Rollback": CompareScreen,
  "Bulk Editing": BulkScreen,
  "AI Assistant": AiAssistantScreen,
  "Publishing Queue": PublishingQueueScreen,
  Releases: ReleasesScreen,
  Environments: EnvironmentsScreen,
  "Delivery APIs": DeliveryApisScreen,
  Webhooks: WebhooksScreen,
  "Publishing History": PublishingHistoryScreen,
  "Edge Delivery": EdgeDeliveryScreen,
  "Cache Invalidation": CacheInvalidationScreen,
  "Sites & Brands": SitesBrandsScreen,
  "Team & Members": TeamMembersScreen,
  Roles: RolesScreen,
  Permissions: PermissionsScreen,
  "Content Policies": ContentPoliciesScreen,
  "Audit Logs": AuditLogsScreen,
  "Retention Policies": RetentionScreen,
  "Consent & Privacy": ConsentPrivacyScreen,
  "API Explorer": ApiExplorerScreen,
  "REST API": RestApiScreen,
  "GraphQL API": GraphqlApiScreen,
  "SDKs & CLI": SdksScreen,
  "Type Generation": TypesScreen,
  "Preview Tools": PreviewScreen,
  "API Tokens": TokensScreen,
  "Service Accounts": ServiceAccountsScreen,
  "Apps & Plugins": AppsScreen,
  "Logs & Usage": LogsScreen,
  "Import & Export": ImportExportScreen,
  Profiles: ProfilesScreen,
  "Anonymous Visitors": AnonymousScreen,
  "Identity Resolution": IdentityScreen,
  Traits: TraitsScreen,
  "Calculated Attributes": CalculatedScreen,
  "Behavior Events": EventsScreen,
  Segments: SegmentsScreen,
  "Consent State": ConsentScreen,
  "Profile History": HistoryScreen,
  "Data Connections": ConnectionsScreen,
  "Content Variants": VariantsScreen,
  "Targeting Rules": TargetingScreen,
  "Segment Targeting": SegmentsTargetScreen,
  "Context Targeting": ContextTargetScreen,
  "Component Targeting": ComponentTargetScreen,
  "Behavior Targeting": BehaviorTargetScreen,
  "Edge Decisions": EdgeScreen,
  "Frequency Caps": FrequencyScreen,
  "Boosts & Exclusions": BoostsScreen,
  "Topic Journey Stages": StagesScreen,
  "All Experiments": ExperimentsListScreen,
  "A/B Tests": AbScreen,
  "Traffic Allocation": TrafficScreen,
  "Goals & Metrics": GoalsScreen,
  "Holdout Groups": HoldoutsScreen,
  "Eligibility Rules": EligibilityScreen,
  "Experiment Schedule": ScheduleScreen,
  Results: ResultsScreen,
  "Winner Suggestions": WinnersScreen,
  "Multi-armed Bandits": BanditsScreen,
  "Collision Control": CollisionsScreen,
  "Recommendation Models": ModelsScreen,
  "Similar Content": SimilarScreen,
  "User Affinity": AffinityScreen,
  "Trending Content": TrendingScreen,
  "Content-based Ranking": ContentRankScreen,
  "Collaborative Ranking": CollabRankScreen,
  "Context-aware Ranking": ContextRankScreen,
  "Diversity Controls": DiversityScreen,
  "Business Rules": BusinessScreen,
  "Real-time Ranking": RealtimeScreen,
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
  General: GeneralScreen,
  Workspace: WorkspaceScreen,
  Branding: BrandingScreen,
  Integrations: IntegrationsScreen,
  Security: SecurityScreen,
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

// Sidebar and placeholder screens share the same implementation check.
export function isScreenImplemented(title) {
  return Boolean(COMPONENT_REGISTRY[title]);
}
