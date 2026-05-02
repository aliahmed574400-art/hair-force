import path from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "bcryptjs") {
    const shimPath = path.resolve(process.cwd(), "tests", "bcryptjs-shim.mjs");
    return nextResolve(pathToFileURL(shimPath).href, context);
  }

  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2);
    const nextPath = path.resolve(
      process.cwd(),
      path.extname(relativePath) ? relativePath : `${relativePath}.js`
    );
    return nextResolve(pathToFileURL(nextPath).href, context);
  }

  return nextResolve(specifier, context);
}
