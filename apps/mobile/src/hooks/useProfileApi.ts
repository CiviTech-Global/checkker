import { useCallback } from "react";
import { ADDRESS_OF_SERVER } from "../config/features";
import type { MyProfile, PublicProfile, UpdateProfileRequest, ChangeUsernameRequest, AvatarUploadResponse, SessionInfo } from "@checkker/shared";

const API_BASE = `${ADDRESS_OF_SERVER}/api/v1`;

async function authFetch(
  token: string | null,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

export function useProfileApi(sessionToken: string | null) {
  const getMyProfile = useCallback(async (): Promise<MyProfile> => {
    const res = await authFetch(sessionToken, "/users/me");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [sessionToken]);

  const updateProfile = useCallback(
    async (input: UpdateProfileRequest): Promise<PublicProfile> => {
      const res = await authFetch(sessionToken, "/users/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    [sessionToken]
  );

  const changeUsername = useCallback(
    async (input: ChangeUsernameRequest): Promise<{ oldUsername: string; newUsername: string }> => {
      const res = await authFetch(sessionToken, "/users/me/username", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    [sessionToken]
  );

  const uploadAvatar = useCallback(
    async (file: { uri: string; name: string; type: string }): Promise<AvatarUploadResponse> => {
      const formData = new FormData();
      formData.append("file", file as any);
      const res = await fetch(`${API_BASE}/users/me/avatar`, {
        method: "POST",
        headers: {
          Authorization: sessionToken ? `Bearer ${sessionToken}` : "",
        },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    [sessionToken]
  );

  const getPublicProfile = useCallback(
    async (username: string): Promise<PublicProfile> => {
      const res = await authFetch(sessionToken, `/users/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    [sessionToken]
  );

  const listSessions = useCallback(async (): Promise<{ sessions: SessionInfo[] }> => {
    const res = await authFetch(sessionToken, "/users/sessions");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [sessionToken]);

  const revokeSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const res = await authFetch(sessionToken, `/users/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
    },
    [sessionToken]
  );

  const requestAccountDeletion = useCallback(async (): Promise<{ scheduledAt: string; completedAt: string; message: string }> => {
    const res = await authFetch(sessionToken, "/users/me/delete", {
      method: "POST",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [sessionToken]);

  return {
    getMyProfile,
    updateProfile,
    changeUsername,
    uploadAvatar,
    getPublicProfile,
    listSessions,
    revokeSession,
    requestAccountDeletion,
  };
}
