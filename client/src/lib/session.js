// A 401 on a request that carried a token means the token expired or was revoked.
// Without a token (the login form) a 401 just means the password was wrong.
export const isSessionExpired = (result, token) => result?.error?.status === 401 && Boolean(token);
