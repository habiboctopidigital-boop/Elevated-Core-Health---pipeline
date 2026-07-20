export const config = {
  app: {
    name: "Elevated Core Health",
    description: "Patient Pipeline Portal",
    version: "1.0.0",
  },
  pagination: {
    defaultPageSize: 50,
    pageSizeOptions: [20, 50, 100] as const,
  },
  auth: {
    tokenKey: "ech_access_token",
    refreshTokenKey: "ech_refresh_token",
  },
}
