const API = "https://api.pagerduty.com";

function headers(token: string) {
  return {
    Authorization: `Token token=${token}`,
    Accept: "application/vnd.pagerduty+json;version=2",
  };
}

export async function pagerdutyValidate(token: string) {
  // /abilities works for both account-level "API Access Keys" and personal
  // "User API Tokens" — /users/me only works for the latter and 400s on the
  // (more common) account-level key type, which is misleading.
  const res = await fetch(`${API}/abilities`, { headers: headers(token) });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("PagerDuty rejected this API key — check it was copied correctly and hasn't been revoked");
    }
    throw new Error(`PagerDuty token invalid (${res.status})`);
  }
  return { name: "PagerDuty account" };
}

export async function pagerdutyOpenIncidents(token: string, serviceId?: string) {
  const params = new URLSearchParams();
  params.append("statuses[]", "triggered");
  params.append("statuses[]", "acknowledged");
  if (serviceId) params.append("service_ids[]", serviceId);
  const res = await fetch(`${API}/incidents?${params.toString()}`, { headers: headers(token) });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("PagerDuty rejected this API key when listing incidents — it may have been revoked");
    }
    throw new Error(`PagerDuty list incidents failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return (data.incidents ?? []).map((inc: Record<string, unknown>) => ({
    id: inc.id,
    title: inc.title,
    urgency: inc.urgency,
    status: inc.status,
    service: (inc.service as { summary?: string } | undefined)?.summary,
    createdAt: inc.created_at,
  }));
}
