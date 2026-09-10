import { z } from "zod";
import { body, ok, fail, limit, HttpError } from "@/lib/server";
import { searchKnowledgebase, productLinkFor } from "@/lib/chatbot-search";

const schema = z.object({ message: z.string().trim().min(1).max(500) });

export async function POST(req: Request) {
  try {
    await limit(req, "chatbot", 60);
    const parsed = schema.safeParse(await body(req));
    if (!parsed.success) throw new HttpError(400, "Ask a short question (up to 500 characters).");
    const { message } = parsed.data;

    const results = searchKnowledgebase(message, 2);
    if (results.length === 0) {
      return ok({
        answer:
          "I couldn't find that in the Perfect HR, AI Professor, Eduvas or LeadershipOS knowledge base. Try asking about specific features, pricing, modules, or integrations — or talk to our team for anything else.",
        sources: [],
      });
    }

    const answer = results.map((r) => r.text).join("\n\n");
    const sources = Array.from(
      new Map(
        results
          .map((r) => productLinkFor(r.source) || productLinkFor(r.title))
          .filter((x): x is { label: string; href: string } => Boolean(x))
          .map((x) => [x.href, x]),
      ).values(),
    );

    return ok({ answer, sources });
  } catch (e) {
    return fail(e);
  }
}
