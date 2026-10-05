// Presentation data extracted from the actual repository documents; no AI or inventory calculations.
export function buildMykeOrganization(rolesMarkdown, readmeMarkdown) {
  const roles = [
    ...rolesMarkdown.matchAll(
      /^## ([A-Z]+) — (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm,
    ),
  ].flatMap(([, id, title, body]) => {
    const ui = body.match(/^\*\*UI:\*\* (.+?) \| (.+)$/m);
    return ui
      ? [{ id, title: ui[1], summary: ui[2], responsibility: title }]
      : [];
  });
  const topicDefinitions = [
    ["engine", "Cómo se obtiene el resultado", "Arquitectura"],
    ["finance", "NET y SWING", "Reglas financieras actuales"],
    ["snapshot", "Qué es un snapshot", "Metadatos de snapshot"],
    ["sources", "De dónde vienen los datos", "Fuentes de datos"],
  ];
  const topics = topicDefinitions.map(([id, title, heading]) => {
    const lines = readmeMarkdown.split("\n");
    const start = lines.indexOf(`## ${heading}`);
    const end =
      start < 0
        ? -1
        : lines.findIndex(
            (line, index) => index > start && line.startsWith("## "),
          );
    let section =
      start < 0
        ? ""
        : lines
            .slice(start + 1, end < 0 ? undefined : end)
            .join("\n")
            .trim();
    if (id === "finance") {
      section = ["Diferencia total / NET", "SWING"]
        .map((name) => {
          const marker = `### ${name}\n`;
          const from = section.indexOf(marker);
          if (from < 0) return "";
          const to = section.indexOf("\n### ", from + marker.length);
          return section
            .slice(from + marker.length, to < 0 ? undefined : to)
            .trim();
        })
        .join("\n\n");
    }
    const paragraphs = section
      .replace(/```[^\n]*\n([\s\S]*?)```/g, (_, content) =>
        id === "finance" ? content : "",
      )
      .replace(/^#{1,6} .+$/gm, "")
      .split(/\n\s*\n/)
      .flatMap((text) =>
        text.startsWith("|")
          ? text
              .split("\n")
              .slice(2)
              .filter((line) => line.startsWith("|"))
              .map((line) =>
                line
                  .split("|")
                  .slice(1, -1)
                  .map((cell) => cell.trim())
                  .join(" · "),
              )
          : [text],
      )
      .map((text) => text.replace(/\*\*|`/g, "").trim())
      .filter(Boolean);
    const excerpt =
      id === "snapshot"
        ? [paragraphs[0], paragraphs.at(-1)].filter(Boolean)
        : paragraphs.slice(0, 6);
    return { id, title, heading, paragraphs: excerpt, available: start >= 0 };
  });
  return {
    manager: roles.find((role) => role.id === "ORCH") || null,
    employees: roles.filter((role) => role.id !== "ORCH"),
    topics,
  };
}
