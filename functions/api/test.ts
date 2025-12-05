export async function onRequest(context: any) {
    const { env } = context;

    return new Response(JSON.stringify({
        hasDB: !!env.DB,
        hasAdminUser: !!env.ADMIN_USER,
        hasAdminPassword: !!env.ADMIN_PASSWORD,
        dbType: typeof env.DB,
        adminUserValue: env.ADMIN_USER ? 'SET' : 'NOT SET',
        adminPasswordValue: env.ADMIN_PASSWORD ? 'SET' : 'NOT SET',
    }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}
