// Server entry for the full-screen live feed. Same segment config as the project workspace: the page is
// a client component and its data (session, project, feed) resolves client-side after the shell paints.

export const dynamic = "force-static";

export default function FeedSegmentLayout({ children }) {
  return children;
}
