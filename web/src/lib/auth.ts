import { createAuthClient } from "better-auth/react"
import { organizationClient, adminClient, usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL || (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/auth` : "http://localhost:3010/api/v1/auth"),
    plugins: [organizationClient(), adminClient(), usernameClient()]
})
