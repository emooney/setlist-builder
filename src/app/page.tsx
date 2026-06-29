"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  Folder,
  Moon,
  Music,
  Plus,
  Save,
  Search,
  Sun,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { SetGroups, Setlist, Settings, Song } from "@/lib/types";
import { BAND_NAME, DEFAULT_GOOGLE_EXPORT_FOLDER_URL } from "@/lib/app-config";
import styles from "./page.module.css";

const emptySong = {
  id: "new",
  title: "",
  artist: "Duran Duran",
  performedBy: BAND_NAME,
  lyrics: "",
  performanceNotes: "",
  key: "",
  tempo: "",
  durationSeconds: null,
  tags: [],
  active: true,
  body: "",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
} satisfies Song;

function createEmptySong() {
  return { ...emptySong };
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [settings, setSettings] = useState<Settings>({ googleFolderId: "", googleConnected: false });
  const [query, setQuery] = useState("");
  const [activeSong, setActiveSong] = useState<Song>(() => createEmptySong());
  const [showName, setShowName] = useState("New Show");
  const [setCount, setSetCount] = useState(2);
  const [sets, setSets] = useState<SetGroups>([[], []]);
  const [currentSetlistId, setCurrentSetlistId] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState(
    "https://docs.google.com/document/d/1mFenXoYcxr_WEhTyT0oM949JTfEJ9qZSVlK_f0sPrJY/edit",
  );
  const [importText, setImportText] = useState("");
  const [status, setStatus] = useState("");
  const [theme, setTheme] = useState(() =>
    typeof window === "undefined" ? "dark" : window.localStorage.getItem("setlist-theme") ?? "dark",
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overSetIndex, setOverSetIndex] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const songMap = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const filteredSongs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(needle) ||
        song.lyrics.toLowerCase().includes(needle) ||
        song.performanceNotes.toLowerCase().includes(needle) ||
        song.key.toLowerCase().includes(needle) ||
        song.tempo.toLowerCase().includes(needle),
    );
  }, [query, songs]);
  const draggingSong = draggingId ? songMap.get(baseId(draggingId)) : null;

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function refreshAll() {
    const [songsResponse, setlistsResponse, settingsResponse] = await Promise.all([
      fetch("/api/songs"),
      fetch("/api/setlists"),
      fetch("/api/settings"),
    ]);
    setSongs(await songsResponse.json());
    setSetlists(await setlistsResponse.json());
    setSettings(await settingsResponse.json());
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("setlist-theme", next);
  }

  function changeSetCount(nextCount: number) {
    setSetCount(nextCount);
    setSets((current) => Array.from({ length: nextCount }, (_, index) => current[index] ?? []));
  }

  function startNewSetlist() {
    setCurrentSetlistId(null);
    setShowName("New Show");
    setSetCount(2);
    setSets([[], []]);
  }

  function loadSetlist(setlist: Setlist) {
    setCurrentSetlistId(setlist.id);
    setShowName(setlist.name);
    setSetCount(setlist.setCount);
    setSets(setlist.sets);
  }

  async function saveSetlist() {
    setStatus("Saving setlist...");
    const payload = { name: showName || "Untitled Setlist", setCount, sets };
    const response = await fetch(currentSetlistId ? `/api/setlists/${currentSetlistId}` : "/api/setlists", {
      method: currentSetlistId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const saved = await response.json();
    if (!response.ok) {
      setStatus(saved.error ?? "Could not save setlist.");
      return;
    }
    setCurrentSetlistId(saved.id);
    await refreshAll();
    setStatus("Setlist saved.");
  }

  async function exportSetlist() {
    const id = currentSetlistId;
    if (!id) {
      setStatus("Save the setlist before exporting.");
      return;
    }

    setStatus("Creating Google Docs...");
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setlistId: id }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error ?? "Export failed.");
      return;
    }
    await refreshAll();
    setStatus("Google Docs created.");
  }

  async function deleteSetlist(id: string) {
    await fetch(`/api/setlists/${id}`, { method: "DELETE" });
    if (currentSetlistId === id) startNewSetlist();
    await refreshAll();
  }

  async function saveSong() {
    if (!activeSong.title.trim()) {
      setStatus("Song title is required.");
      return;
    }
    const isNew = activeSong.id === "new";
    const response = await fetch(isNew ? "/api/songs" : `/api/songs/${activeSong.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: activeSong.title,
        artist: activeSong.artist,
        performedBy: activeSong.performedBy,
        lyrics: activeSong.lyrics,
        performanceNotes: activeSong.performanceNotes,
        key: activeSong.key,
        tempo: activeSong.tempo,
        durationSeconds: activeSong.durationSeconds,
        tags: activeSong.tags,
        active: activeSong.active,
      }),
    });
    const saved = await response.json();
    if (!response.ok) {
      setStatus(saved.error ?? "Could not save song.");
      return;
    }

    setActiveSong(isNew ? createEmptySong() : saved);
    await refreshAll();
    setStatus(isNew ? "Song saved. Ready for the next one." : "Song saved.");
  }

  async function duplicateSong() {
    const title = `${activeSong.title || "Untitled"} copy`;
    const response = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        artist: activeSong.artist,
        performedBy: activeSong.performedBy,
        lyrics: activeSong.lyrics,
        performanceNotes: activeSong.performanceNotes,
        key: activeSong.key,
        tempo: activeSong.tempo,
        durationSeconds: activeSong.durationSeconds,
        tags: activeSong.tags,
        active: activeSong.active,
      }),
    });
    const saved = await response.json();
    if (!response.ok) {
      setStatus(saved.error ?? "Could not duplicate song.");
      return;
    }
    setActiveSong(saved);
    await refreshAll();
    setStatus("Song duplicated.");
  }

  async function deleteSong() {
    if (activeSong.id === "new") return;
    await fetch(`/api/songs/${activeSong.id}`, { method: "DELETE" });
    setSets((current) => current.map((set) => set.filter((songId) => songId !== activeSong.id)));
    setActiveSong(createEmptySong());
    await refreshAll();
    setStatus("Song deleted.");
  }

  async function importMaster() {
    setStatus("Importing into database catalog...");
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: importUrl, text: importText }),
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.error ?? "Import failed.");
      return;
    }
    await refreshAll();
    setStatus(`Imported ${result.imported} songs.`);
  }

  async function saveFolderId(googleFolderId: string) {
    setSettings((current) => ({ ...current, googleFolderId }));
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleFolderId }),
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over ? String(event.over.id) : null;
    const target = overId ? locateTarget(overId, sets) : null;
    setOverSetIndex(target?.setIndex ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setDraggingId(null);
    setOverSetIndex(null);
    if (!overId) return;

    const songId = baseId(activeId);
    const from = locateSong(activeId);
    const to = locateTarget(overId, sets);
    if (!to) return;

    setSets((current) => {
      const next = current.map((set) => [...set]);
      if (from) {
        next[from.setIndex].splice(from.itemIndex, 1);
      }

      if (from && from.setIndex === to.setIndex && to.itemIndex !== null) {
        next[to.setIndex] = arrayMove(current[to.setIndex], from.itemIndex, to.itemIndex);
        return next;
      }

      const insertAt = to.itemIndex ?? next[to.setIndex].length;
      next[to.setIndex].splice(insertAt, 0, songId);
      return next;
    });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{BAND_NAME}</p>
          <h1>Setlist Builder</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconButton} onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a className={styles.secondaryButton} href="/api/google/auth">
            <Folder size={16} /> Connect Drive
          </a>
        </div>
      </header>

      <section className={styles.importBand}>
        <div>
          <strong>Import / refresh database catalog</strong>
          <span>Google Docs are import sources only. Saved songs in this database are authoritative for edits and exports.</span>
        </div>
        <input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="Google Doc URL" />
        <button onClick={importMaster}>
          <UploadCloud size={16} /> Import
        </button>
      </section>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDraggingId(null);
          setOverSetIndex(null);
        }}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <section className={styles.workspace}>
          <aside className={styles.panel}>
            <div className={styles.panelTitle}>
              <Music size={18} />
              <h2>Database Song Catalog</h2>
            </div>
            <label className={styles.search}>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs" />
            </label>
            <div className={styles.songList}>
              {filteredSongs.map((song) => (
                <CatalogSong key={song.id} song={song} onEdit={() => setActiveSong(song)} />
              ))}
            </div>
            <button className={styles.fullButton} onClick={() => setActiveSong(createEmptySong())}>
              <Plus size={16} /> New song
            </button>
          </aside>

          <section className={styles.builder}>
            <div className={styles.builderTop}>
              <input className={styles.showName} value={showName} onChange={(event) => setShowName(event.target.value)} />
              <div className={styles.segmented}>
                {[1, 2, 3].map((count) => (
                  <button
                    className={setCount === count ? styles.selected : ""}
                    key={count}
                    onClick={() => changeSetCount(count)}
                  >
                    {count} Set{count > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
              <button onClick={saveSetlist}>
                <Save size={16} /> Save
              </button>
              <button onClick={exportSetlist}>
                <FileText size={16} /> Export Docs
              </button>
            </div>
            <div className={styles.setGrid}>
              {sets.map((set, index) => (
                <SetColumn
                  key={index}
                  index={index}
                  isOver={overSetIndex === index}
                  onRemove={(itemIndex) => removeSongFromSet(index, itemIndex)}
                  songIds={set}
                  songMap={songMap}
                />
              ))}
            </div>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelTitle}>
              <FileText size={18} />
              <h2>Saved</h2>
            </div>
            <button className={styles.fullButton} onClick={startNewSetlist}>
              <Plus size={16} /> New setlist
            </button>
            <div className={styles.savedList}>
              {setlists.map((setlist) => (
                <article className={styles.savedItem} key={setlist.id}>
                  <button onClick={() => loadSetlist(setlist)}>
                    <strong>{setlist.name}</strong>
                    <span>{setlist.setCount} set{setlist.setCount > 1 ? "s" : ""}</span>
                  </button>
                  <button className={styles.deleteButton} onClick={() => deleteSetlist(setlist.id)} title="Delete setlist">
                    <Trash2 size={15} />
                  </button>
                  {setlist.setlistDocUrl && (
                    <a href={setlist.setlistDocUrl} target="_blank">
                      Setlist doc
                    </a>
                  )}
                  {setlist.lyricsDocUrl && (
                    <a href={setlist.lyricsDocUrl} target="_blank">
                      Lyrics doc
                    </a>
                  )}
                </article>
              ))}
            </div>
          </aside>
        </section>
        <DragOverlay>{draggingSong ? <div className={styles.dragOverlay}>{draggingSong.title}</div> : null}</DragOverlay>
      </DndContext>

      <section className={styles.lowerGrid}>
        <section className={styles.editor}>
          <div className={styles.panelTitle}>
            <Music size={18} />
            <h2>Song Editor</h2>
          </div>
          <input
            value={activeSong.title}
            onChange={(event) => setActiveSong({ ...activeSong, title: event.target.value })}
            placeholder="Song title"
          />
          <div className={styles.inlineFields}>
            <input
              value={activeSong.artist}
              onChange={(event) => setActiveSong({ ...activeSong, artist: event.target.value })}
              placeholder="Original artist"
            />
            <input
              value={activeSong.performedBy}
              onChange={(event) => setActiveSong({ ...activeSong, performedBy: event.target.value })}
              placeholder="Performed by"
            />
          </div>
          <div className={styles.inlineFields}>
            <input
              value={activeSong.key}
              onChange={(event) => setActiveSong({ ...activeSong, key: event.target.value })}
              placeholder="Key"
            />
            <input
              value={activeSong.tempo}
              onChange={(event) => setActiveSong({ ...activeSong, tempo: event.target.value })}
              placeholder="Tempo"
            />
          </div>
          <textarea
            value={activeSong.lyrics}
            onChange={(event) => setActiveSong({ ...activeSong, lyrics: event.target.value })}
            placeholder="Lyrics"
          />
          <textarea
            value={activeSong.performanceNotes}
            onChange={(event) => setActiveSong({ ...activeSong, performanceNotes: event.target.value })}
            placeholder="Performance notes, cues, arrangement notes"
          />
          <div className={styles.rowActions}>
            <button onClick={saveSong}>Save song</button>
            <button onClick={duplicateSong} disabled={!activeSong.title}>
              Duplicate
            </button>
            <button className={styles.dangerButton} onClick={deleteSong} disabled={activeSong.id === "new"}>
              Delete
            </button>
          </div>
        </section>

        <section className={styles.editor}>
          <div className={styles.panelTitle}>
            <Folder size={18} />
            <h2>Settings</h2>
          </div>
          <p className={styles.muted}>
            Google Drive is {settings.googleConnected ? "connected" : "not connected"}. Add OAuth values to `.env.local`
            before connecting. Exports default to {BAND_NAME}&apos;s Drive folder.
          </p>
          <p className={styles.muted}>
            Destination: <a href={DEFAULT_GOOGLE_EXPORT_FOLDER_URL}>{DEFAULT_GOOGLE_EXPORT_FOLDER_URL}</a>
          </p>
          <input
            value={settings.googleFolderId}
            onChange={(event) => void saveFolderId(event.target.value)}
            placeholder="The Duran Band Google Drive folder ID"
          />
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Optional pasted master doc text"
          />
          <p className={styles.status}>{status || "Ready."}</p>
        </section>
      </section>
    </main>
  );

  function removeSongFromSet(setIndex: number, itemIndex: number) {
    setSets((current) =>
      current.map((set, index) => (index === setIndex ? set.filter((_, songIndex) => songIndex !== itemIndex) : set)),
    );
    setStatus("Song removed from set. Save to keep this change.");
  }
}

function CatalogSong({ song, onEdit }: { song: Song; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog:${song.id}`,
  });

  return (
    <div ref={setNodeRef} className={`${styles.songCard} ${isDragging ? styles.dragging : ""}`}>
      <button className={styles.dragHandle} {...attributes} {...listeners} title="Drag song">
        {song.title}
      </button>
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}

function SetColumn({
  index,
  isOver,
  onRemove,
  songIds,
  songMap,
}: {
  index: number;
  isOver: boolean;
  onRemove: (itemIndex: number) => void;
  songIds: string[];
  songMap: Map<string, Song>;
}) {
  const { setNodeRef } = useDroppable({ id: `set:${index}` });
  const sortableIds = songIds.map((songId, itemIndex) => `set:${index}:${itemIndex}:${songId}`);

  return (
    <section className={`${styles.setColumn} ${isOver ? styles.setColumnOver : ""}`} ref={setNodeRef}>
      <h2>Set {index + 1}</h2>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className={styles.setSongs}>
          {songIds.map((songId, itemIndex) => {
            const song = songMap.get(songId);
            return (
              <SetSong
                key={`${songId}-${itemIndex}`}
                id={`set:${index}:${itemIndex}:${songId}`}
                onRemove={() => onRemove(itemIndex)}
                title={song?.title ?? "Missing song"}
              />
            );
          })}
          {!songIds.length && <p className={styles.emptySet}>Drop songs here</p>}
        </div>
      </SortableContext>
    </section>
  );
}

function SetSong({ id, onRemove, title }: { id: string; onRemove: () => void; title: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`${styles.setSong} ${isDragging ? styles.dragging : ""}`}>
      <button className={styles.setSongHandle} {...attributes} {...listeners} title="Drag song">
        {title}
      </button>
      <button
        className={styles.removeSongButton}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        title="Remove from set"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function baseId(id: string) {
  const parts = id.split(":");
  return parts[0] === "catalog" ? parts[1] : parts[3] ?? id;
}

function locateSong(id: string) {
  const parts = id.split(":");
  if (parts[0] !== "set") return null;
  return { setIndex: Number(parts[1]), itemIndex: Number(parts[2]) };
}

function locateTarget(id: string, sets: SetGroups) {
  const parts = id.split(":");
  if (parts[0] === "set" && parts.length === 2) {
    return { setIndex: Number(parts[1]), itemIndex: null };
  }
  if (parts[0] === "set") {
    return { setIndex: Number(parts[1]), itemIndex: Number(parts[2]) };
  }
  return sets.length ? { setIndex: 0, itemIndex: null } : null;
}
