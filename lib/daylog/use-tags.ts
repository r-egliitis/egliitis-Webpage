"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createTag } from "@/app/os/(private)/actions/daylog";
import { TAG_COLORS } from "@/lib/daylog/tag-colors";
import type { DaylogTag } from "@/types/database";

export type TagLite = Pick<DaylogTag, "id" | "name" | "color">;

/**
 * Day Log tags: the server's list plus tags created here that the server
 * hasn't returned yet. createTagLocal returns the new id immediately;
 * tagsReady() waits until those tags exist, so entries can link them.
 */
export function useDaylogTags(serverTags: TagLite[], onError: (message: string) => void) {
  const [localTags, setLocalTags] = useState<TagLite[]>([]);
  const pending = useRef(new Map<string, Promise<unknown>>());

  const tags = useMemo(
    () => [...serverTags, ...localTags.filter((tag) => !serverTags.some((known) => known.id === tag.id))],
    [serverTags, localTags],
  );

  const createTagLocal = useCallback(
    (name: string) => {
      const id = crypto.randomUUID();
      const color = TAG_COLORS[(serverTags.length + localTags.length) % TAG_COLORS.length];
      setLocalTags((current) => [...current, { id, name, color }]);
      pending.current.set(
        id,
        createTag({ id, name, color }).then((result) => {
          if (!result.ok) onError(result.error);
        }),
      );
      return id;
    },
    [serverTags.length, localTags.length, onError],
  );

  const tagsReady = useCallback((tagIds: string[]) => Promise.all(tagIds.map((id) => pending.current.get(id))), []);

  return { tags, createTagLocal, tagsReady };
}
