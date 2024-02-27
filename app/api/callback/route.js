import loadStytch from "@/utils/loadStytch";
import { redirect } from "next/navigation";
import { SESSION_DURATION_MINUTES, setIntermediateSession, setOrganization, setSession } from "@/utils/sessionManagement";

async function authenticateOauth(stytchClient, token, slug) {
    const authRes = await stytchClient.oauth.authenticate({
        oauth_token: token,
        session_duration_minutes: SESSION_DURATION_MINUTES,
    });
    setSession(authRes.session_jwt);
    await setOrgIdCookie(stytchClient, slug);
    return `/${slug}/dashboard`;
}

async function authenticateOrgMagicLink(stytchClient, token, slug) {
    const authRes = await stytchClient.magicLinks.authenticate({
        magic_links_token: token,
        session_duration_minutes: SESSION_DURATION_MINUTES,
    });
    setSession(authRes.session_jwt);
    await setOrgIdCookie(stytchClient, slug);
    return `/${slug}/dashboard`;
}

async function authenticateDiscoveryMagicLink(stytchClient, token) {
    const authRes = await stytchClient.magicLinks.discovery.authenticate({
      discovery_magic_links_token: token,
    });
    setIntermediateSession(authRes.intermediate_session_token);
    return "/discovery";
}

async function authenticateDiscoveryOauth(stytchClient, token) {
    const authRes = await stytchClient.oauth.discovery.authenticate({
      discovery_oauth_token: token,
    });
    setIntermediateSession(authRes.intermediate_session_token);
    return "/discovery";
}


async function setOrgIdCookie(client, slug) {
    const { organizations } = await client.organizations.search({
        query: {
            operator: "AND",
            operands: [
                {
                    filter_name: "organization_slugs",
                    filter_value: [slug],
                },
            ],
        },
    });

    if (organizations.length > 0) {
        // Set cookie org cookie
        setOrganization(organizations[0].organization_id)
    }
}

export async function GET(request) {
    const stytchClient = loadStytch();
    const searchParams = request.nextUrl.searchParams;
    const stytch_token_type = searchParams.get("stytch_token_type");
    const token = searchParams.get("token");
    const slug = searchParams.get("slug");

    let redirectPath = "";

    switch (stytch_token_type) {
        case "oauth":
            redirectPath = await authenticateOauth(stytchClient, token, slug);
            break;
        case "multi_tenant_magic_links":
            redirectPath = await authenticateOrgMagicLink(
                stytchClient,
                token,
                slug
            );
        case 'discovery':
            redirectPath = await authenticateDiscoveryMagicLink(stytchClient, token);
            break;
        case 'discovery_oauth':
            redirectPath = await authenticateDiscoveryOauth(stytchClient, token);
            break;

            break;
        default:
            // Handle unsupported stytch_token_type
            break;
    }

    return redirect(redirectPath);
}
