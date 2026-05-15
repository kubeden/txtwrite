const distRoot = new URL("./dist/", import.meta.url);
const port = Number(Deno.env.get("PORT") ?? "4173");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentType(pathname: string) {
  const extension = pathname.match(/\.[^.\/]+$/)?.[0].toLowerCase();
  return extension
    ? contentTypes[extension] ?? "application/octet-stream"
    : "application/octet-stream";
}

function resolveDistPath(pathname: string) {
  const decodedPathname = decodeURIComponent(pathname);
  const normalizedPathname = decodedPathname === "/"
    ? "/index.html"
    : decodedPathname;
  const fileUrl = new URL(`.${normalizedPathname}`, distRoot);

  if (!fileUrl.href.startsWith(distRoot.href)) {
    return null;
  }

  return fileUrl;
}

async function serveFile(fileUrl: URL, pathname: string, method: string) {
  const stat = await Deno.stat(fileUrl);
  if (!stat.isFile) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "content-length": String(stat.size),
    "content-type": contentType(pathname),
  });

  if (method === "HEAD") {
    return new Response(null, { headers });
  }

  const file = await Deno.open(fileUrl);
  return new Response(file.readable, { headers });
}

Deno.serve({ hostname: "0.0.0.0", port }, async (request) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const fileUrl = resolveDistPath(url.pathname);
  if (!fileUrl) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    return await serveFile(fileUrl, fileUrl.pathname, request.method);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }

    const acceptsHtml = request.headers.get("accept")?.includes("text/html") ??
      false;
    if (!acceptsHtml) {
      return new Response("Not found", { status: 404 });
    }

    return await serveFile(
      new URL("./index.html", distRoot),
      "/index.html",
      request.method,
    );
  }
});
