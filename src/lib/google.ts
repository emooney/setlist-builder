import { google } from "googleapis";
import { getSetting, setSetting } from "./settings";
import type { SetGroups, Song } from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
];

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function saveGoogleCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  await setSetting("googleTokens", JSON.stringify(tokens));
}

export async function getAuthorizedClient() {
  const client = getOAuthClient();
  const tokens = await getSetting("googleTokens");

  if (!tokens) {
    throw new Error("Google Drive is not connected yet.");
  }

  client.setCredentials(JSON.parse(tokens));
  client.on("tokens", async (newTokens) => {
    const merged = { ...JSON.parse(tokens), ...newTokens };
    await setSetting("googleTokens", JSON.stringify(merged));
  });

  return client;
}

export function buildSetlistText(name: string, sets: SetGroups, songMap: Map<string, Song>) {
  const chunks = [`${name} Setlist`, ""];

  sets.forEach((set, index) => {
    chunks.push(`Set ${index + 1}`);
    set.forEach((songId, songIndex) => {
      const song = songMap.get(songId);
      if (song) {
        chunks.push(`${songIndex + 1}. ${song.title}`);
      }
    });
    chunks.push("");
  });

  return chunks.join("\n").trimEnd();
}

export function buildLyricsText(name: string, sets: SetGroups, songMap: Map<string, Song>) {
  return buildLyricsDocument(name, sets, songMap).text.trimEnd();
}

type Range = {
  startIndex: number;
  endIndex: number;
};

export type LyricsDocument = {
  text: string;
  titleRange: Range;
  tocRange: Range;
  tocItemRanges: Array<Range & { songId: string }>;
  setHeadingRanges: Range[];
  songHeadingRanges: Array<Range & { songId: string }>;
  backToTopRanges: Range[];
};

export function buildLyricsDocument(name: string, sets: SetGroups, songMap: Map<string, Song>): LyricsDocument {
  let text = "";
  let cursor = 1;
  const tocItemRanges: LyricsDocument["tocItemRanges"] = [];
  const setHeadingRanges: Range[] = [];
  const songHeadingRanges: LyricsDocument["songHeadingRanges"] = [];
  const backToTopRanges: Range[] = [];

  const append = (value: string) => {
    text += value;
    cursor += value.length;
  };
  const appendLine = (value = "") => append(`${value}\n`);
  const rangeForLine = (value: string) => {
    const startIndex = cursor;
    appendLine(value);
    return { startIndex, endIndex: startIndex + value.length };
  };

  const titleRange = rangeForLine(`${name} Lyrics`);
  appendLine();
  const tocRange = rangeForLine("Table of Contents");

  sets.forEach((set, setIndex) => {
    appendLine(`Set ${setIndex + 1}`);
    set.forEach((songId) => {
      const song = songMap.get(songId);
      if (!song) return;
      tocItemRanges.push({ ...rangeForLine(song.title), songId });
    });
    appendLine();
  });

  sets.forEach((set, setIndex) => {
    setHeadingRanges.push(rangeForLine(`Set ${setIndex + 1}`));
    appendLine();
    set.forEach((songId) => {
      const song = songMap.get(songId);
      if (!song) return;

      songHeadingRanges.push({ ...rangeForLine(song.title), songId });
      const body = song.body.trim();
      if (body) {
        appendLine(body);
      }
      backToTopRanges.push(rangeForLine("Back to Top"));
      appendLine();
    });
  });

  return {
    text,
    titleRange,
    tocRange,
    tocItemRanges,
    setHeadingRanges,
    songHeadingRanges,
    backToTopRanges,
  };
}

export async function createGoogleDoc(title: string, content: string, folderId: string) {
  const auth = await getAuthorizedClient();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  const created = await docs.documents.create({
    requestBody: { title },
  });

  const documentId = created.data.documentId;
  if (!documentId) {
    throw new Error("Google Docs did not return a document ID.");
  }

  if (content) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  await moveFileToFolder(drive, documentId, folderId);

  const file = await drive.files.get({
    fileId: documentId,
    fields: "webViewLink",
  });

  return file.data.webViewLink ?? `https://docs.google.com/document/d/${documentId}/edit`;
}

export async function createLyricsGoogleDoc(
  title: string,
  name: string,
  sets: SetGroups,
  songMap: Map<string, Song>,
  folderId: string,
) {
  const document = buildLyricsDocument(name, sets, songMap);
  const auth = await getAuthorizedClient();
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });
  const batchUpdate = docs.documents.batchUpdate.bind(docs.documents) as (params: {
    documentId: string;
    requestBody: { requests: object[] };
  }) => Promise<unknown>;

  const created = await docs.documents.create({
    requestBody: { title },
  });

  const documentId = created.data.documentId;
  if (!documentId) {
    throw new Error("Google Docs did not return a document ID.");
  }

  await batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: document.text,
          },
        },
      ],
    },
  });

  await batchUpdate({
    documentId,
    requestBody: {
      requests: [
        paragraphStyleRequest(document.titleRange, "TITLE"),
        paragraphStyleRequest(document.tocRange, "HEADING_1"),
        ...document.setHeadingRanges.map((range) => paragraphStyleRequest(range, "HEADING_2")),
        ...document.songHeadingRanges.map((range) => paragraphStyleRequest(range, "HEADING_1")),
      ],
    },
  });

  try {
    const freshDocument = await docs.documents.get({ documentId, includeTabsContent: true });
    const headings = headingIdsByStartIndex(freshDocument.data as GoogleDocWithContent);
    const tocHeadingId = headings.get(document.tocRange.startIndex);
    const linkRequests = document.tocItemRanges.flatMap((tocRange) => {
      const heading = document.songHeadingRanges.find((range) => range.songId === tocRange.songId);
      const headingId = heading ? headings.get(heading.startIndex) : undefined;
      return headingId ? [headingLinkRequest(tocRange, headingId)] : [];
    });

    if (tocHeadingId) {
      linkRequests.push(...document.backToTopRanges.map((range) => headingLinkRequest(range, tocHeadingId)));
    }

    if (linkRequests.length) {
      await batchUpdate({
        documentId,
        requestBody: { requests: linkRequests },
      });
    }
  } catch (error) {
    console.warn("Lyrics document text and headings were created, but links failed.", error);
  }

  await moveFileToFolder(drive, documentId, folderId);

  const file = await drive.files.get({
    fileId: documentId,
    fields: "webViewLink",
  });

  return file.data.webViewLink ?? `https://docs.google.com/document/d/${documentId}/edit`;
}

function paragraphStyleRequest(range: Range, namedStyleType: string) {
  return {
    updateParagraphStyle: {
      range: paragraphRange(range),
      paragraphStyle: { namedStyleType },
      fields: "namedStyleType",
    },
  };
}

function paragraphRange(range: Range) {
  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex + 1,
  };
}

function headingLinkRequest(range: Range, headingId: string) {
  return {
    updateTextStyle: {
      range,
      textStyle: {
        underline: true,
        foregroundColor: {
          color: {
            rgbColor: {
              red: 0.06666667,
              green: 0.33333334,
              blue: 0.8,
            },
          },
        },
        link: {
          headingId,
        },
      },
      fields: "underline,foregroundColor,link",
    },
  };
}

type GoogleDocWithContent = {
  body?: { content?: GoogleStructuralElement[] | null } | null;
  tabs?: Array<{ documentTab?: { body?: { content?: GoogleStructuralElement[] | null } | null } | null }> | null;
};

type GoogleStructuralElement = {
  startIndex?: number | null;
  paragraph?: {
    paragraphStyle?: {
      headingId?: string | null;
    } | null;
  } | null;
};

function headingIdsByStartIndex(document: GoogleDocWithContent) {
  const content =
    document.tabs?.flatMap((tab) => tab.documentTab?.body?.content ?? []) ??
    document.body?.content ??
    [];
  const headings = new Map<number, string>();

  for (const element of content) {
    const startIndex = element.startIndex;
    const headingId = element.paragraph?.paragraphStyle?.headingId;
    if (typeof startIndex === "number" && headingId) {
      headings.set(startIndex, headingId);
    }
  }

  return headings;
}

async function moveFileToFolder(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  folderId: string,
) {
  if (!folderId) {
    return;
  }

  const file = await drive.files.get({
    fileId,
    fields: "parents",
  });
  const previousParents = file.data.parents?.join(",");

  await drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: previousParents || undefined,
    fields: "id, parents, webViewLink",
  });
}
