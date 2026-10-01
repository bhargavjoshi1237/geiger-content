export class VectorError extends Error {
  constructor(code, message, status = 400, retryAt = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
  }
}

export const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function assertSameOrigin(request, configuredOrigin = process.env.VECTOR_APP_ORIGIN) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let expected;
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    expected = configuredOrigin
      ? new URL(configuredOrigin).origin
      : host ? new URL(`${url.protocol}//${host}`).origin : url.origin;
  } catch {
    throw new VectorError("invalid_origin", "This request must come from the application.", 403);
  }
  if (origin !== expected)
    throw new VectorError("invalid_origin", "This request must come from the application.", 403);
}

export async function authorizeProject(
  client,
  projectId,
  permissions = ["content.intelligence.view", "content.recommendations.view"],
) {
  if (!isUuid(projectId))
    throw new VectorError("invalid_project", "Choose a valid project.");
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user)
    throw new VectorError(
      "unauthorized",
      "Sign in to use semantic search.",
      401,
    );
  const scoped = client.schema("content");
  const access = await scoped.rpc("can_access_project", {
    p_project_id: projectId,
  });
  if (access.error || access.data !== true)
    throw new VectorError(
      "forbidden",
      "You do not have access to this project.",
      403,
    );
  let allowed = false;
  for (const permission of permissions) {
    const result = await scoped.rpc("rbac_allows", {
      p_permission: permission,
      p_project: projectId,
    });
    if (!result.error && result.data === true) {
      allowed = true;
      break;
    }
  }
  if (!allowed)
    throw new VectorError(
      "forbidden",
      "Your role does not allow this operation.",
      403,
    );
  return { projectId, user: data.user, client, content: scoped };
}
