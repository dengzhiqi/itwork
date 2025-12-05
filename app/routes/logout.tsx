import { ActionFunctionArgs, redirect } from "@remix-run/cloudflare";
import { logout } from "../utils/auth.server";

export async function loader() {
    return redirect("/");
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { env } = context as { env: any };
    return logout(request, env);
}
