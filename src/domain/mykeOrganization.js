import { mykeSearchWords } from "./mykeKnowledge.js";

export function buildMykeOrganization(rolesMarkdown, readmeMarkdown) {
  const roles = [
    ...rolesMarkdown.matchAll(
      /^## ([A-Z]+) — (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm,
    ),
  ].flatMap(([, id, responsibility, body]) => {
    const ui = body.match(/^\*\*UI:\*\* (.+?) \| (.+)$/m);
    return ui
      ? [
          {
            id,
            title: ui[1],
            summary: ui[2],
            responsibility,
            color:
              body.match(/^\*\*Color:\*\* (#[0-9a-f]{6})$/im)?.[1] || "#f5821f",
          },
        ]
      : [];
  });
  const topics = [
    ...readmeMarkdown.matchAll(
      /^### (.+)\n<!-- myke: ([a-z]+) \| (.*?) \| (.*?)-->\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm,
    ),
  ].map(([, title, id, keywords, sources, body]) => ({
    id,
    title,
    keywords: mykeSearchWords(keywords),
    sources: sources.trim().split(/\s+/).filter(Boolean),
    paragraphs: body
      .trim()
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\*\*|`/g, "")),
  }));
  return {
    manager: roles.find((role) => role.id === "ORCH") || null,
    employees: roles.filter((role) => role.id !== "ORCH"),
    topics,
  };
}
