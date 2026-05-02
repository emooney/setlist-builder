export type ParsedSong = {
  title: string;
  body: string;
};

type GoogleDocElement = {
  paragraph?: {
    elements?: Array<{
      textRun?: { content?: string | null };
      pageBreak?: unknown;
    }>;
    paragraphStyle?: {
      namedStyleType?: string | null;
    };
  };
  tableOfContents?: unknown;
};

type GoogleDocLike = {
  body?: { content?: GoogleDocElement[] } | null;
  tabs?: Array<{
    body?: { content?: GoogleDocElement[] } | null;
    documentTab?: { body?: { content?: GoogleDocElement[] } | null } | null;
  }> | null;
};

const NON_SONG_LINES = new Set(["back to top", "________________"]);

function normalizeLine(line: string) {
  return line.replace(/\uFEFF/g, "").trim();
}

function normalizeTitle(title: string) {
  return title.replace(/\s+/g, " ").trim();
}

function isSeparator(line: string) {
  return /^_{4,}$/.test(line.trim());
}

function isIgnoredHeading(line: string) {
  return NON_SONG_LINES.has(line.toLowerCase());
}

export function parseMasterDoc(text: string): ParsedSong[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cleaned = lines.map(normalizeLine);
  const startIndex = cleaned.findIndex((line) => isSeparator(line));

  if (startIndex === -1) {
    return parseLooseSections(cleaned);
  }

  const songs: ParsedSong[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const flush = () => {
    if (!currentTitle) {
      return;
    }

    songs.push({
      title: normalizeTitle(currentTitle),
      body: currentBody.join("\n").trim(),
    });
  };

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const rawLine = lines[index].replace(/\uFEFF/g, "");
    const line = normalizeLine(rawLine);

    if (isSeparator(line)) {
      flush();
      currentTitle = "";
      currentBody = [];
      continue;
    }

    if (!currentTitle) {
      if (!line || isIgnoredHeading(line)) {
        continue;
      }

      currentTitle = line;
      continue;
    }

    if (line.toLowerCase() === "back to top") {
      continue;
    }

    currentBody.push(rawLine.trimEnd());
  }

  flush();

  return dedupeSongs(songs.filter((song) => song.title && song.body));
}

export function parseGoogleDocSongs(document: GoogleDocLike): ParsedSong[] {
  const content = getDocumentContent(document);
  const hasTableOfContents = content.some((element) => element.tableOfContents);
  const songs: ParsedSong[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];
  let sawTableOfContents = !hasTableOfContents;

  const flush = () => {
    if (!currentTitle) {
      return;
    }

    const body = currentBody.join("\n").trim();
    if (body) {
      songs.push({ title: normalizeTitle(currentTitle), body });
    }
  };

  for (const element of content) {
    if (element.tableOfContents) {
      sawTableOfContents = true;
      continue;
    }

    const paragraph = element.paragraph;
    if (!paragraph) {
      continue;
    }

    const style = paragraph.paragraphStyle?.namedStyleType;
    const text = paragraphText(paragraph).replace(/\u000b/g, "\n").trimEnd();
    const line = normalizeLine(text);

    if (style === "HEADING_1") {
      if (!sawTableOfContents) {
        continue;
      }

      flush();
      currentTitle = line;
      currentBody = [];
      continue;
    }

    if (!currentTitle || isIgnoredHeading(line)) {
      continue;
    }

    currentBody.push(text);
  }

  flush();

  return dedupeSongs(songs);
}

function parseLooseSections(lines: string[]): ParsedSong[] {
  const songs: ParsedSong[] = [];
  let currentTitle = "";
  const currentBody: string[] = [];

  const flush = () => {
    if (currentTitle && currentBody.length) {
      songs.push({ title: normalizeTitle(currentTitle), body: currentBody.join("\n").trim() });
    }
  };

  for (const line of lines) {
    if (!line) {
      currentBody.push("");
      continue;
    }

    if (!currentTitle) {
      currentTitle = line;
      continue;
    }

    currentBody.push(line);
  }

  flush();
  return dedupeSongs(songs);
}

function dedupeSongs(songs: ParsedSong[]) {
  const seen = new Set<string>();
  return songs.filter((song) => {
    const key = song.title.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function extractGoogleDocId(url: string) {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

function getDocumentContent(document: GoogleDocLike) {
  const tabContent = document.tabs?.flatMap((tab) => tab.body?.content ?? tab.documentTab?.body?.content ?? []) ?? [];
  return tabContent.length ? tabContent : document.body?.content ?? [];
}

function paragraphText(paragraph: NonNullable<GoogleDocElement["paragraph"]>) {
  return (
    paragraph.elements
      ?.map((element) => element.textRun?.content ?? "")
      .join("")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n$/, "") ?? ""
  );
}
