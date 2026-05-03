export type Cue = {
  id: string;
  blockId: string;
  blockIndex: number;
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
};

export type SpeakerBlock = {
  blockId: string;
  speaker: string;
  startTime: number;
  endTime: number;
  cues: Cue[];
};

export type Transcript = {
  cues: Cue[];
  blocks: SpeakerBlock[];
};

const TIMING_REGULAR_EXPRESSION = /^(\S+)\s+-->\s+(\S+)/;

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.replace(",", ".").split(":");
  if (parts.length === 3) {
    return parseInt(parts[0] ?? "0") * 3600 + parseInt(parts[1] ?? "0") * 60 + parseFloat(parts[2] ?? "0");
  }
  return parseInt(parts[0] ?? "0") * 60 + parseFloat(parts[1] ?? "0");
}

function extractSpeaker(raw: string): { speaker: string; text: string } {
  const match = raw.match(/^<v ([^>]+)>([\s\S]*)/);
  if (match) {
    return {
      speaker: match[1]?.trim() ?? "",
      text: match[2]?.trim() ?? "",
    };
  }
  return { speaker: "", text: raw };
}

// Splits "uuid-2" → { blockId: "uuid", blockIndex: 2 }
// Falls back to { blockId: id, blockIndex: 0 } for IDs without the pattern
function parseBlockId(id: string): { blockId: string; blockIndex: number } {
  const match = id.match(/^(.*)-(\d+)$/);
  if (match) {
    return {
      blockId: match[1] ?? id,
      blockIndex: parseInt(match[2] ?? "0"),
    };
  }
  return { blockId: id, blockIndex: 0 };
}

export function deserializeVtt(content: string): Transcript {
  // Normalize line endings, split into blank-line-separated blocks
  const rawBlocks = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/);

  const cues: Cue[] = [];
  let syntheticId = 0;

  for (const block of rawBlocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;

    const first = lines[0] ?? "";

    // Skip header and non-cue blocks
    if (
      first.startsWith("WEBVTT") ||
      first.startsWith("NOTE") ||
      first.startsWith("STYLE") ||
      first.startsWith("REGION")
    ) {
      continue;
    }

    // Determine whether first line is an ID or a timing line
    let idLine: string | undefined;
    let timingIdx: number;

    if (TIMING_REGULAR_EXPRESSION.test(first)) {
      timingIdx = 0;
    } else if (lines.length > 1 && TIMING_REGULAR_EXPRESSION.test(lines[1] ?? "")) {
      idLine = first;
      timingIdx = 1;
    } else {
      continue;
    }

    const timingMatch = (lines[timingIdx] ?? "").match(TIMING_REGULAR_EXPRESSION);
    if (!timingMatch) continue;

    const startTime = parseTimestamp(timingMatch[1] ?? "");
    const endTime = parseTimestamp(timingMatch[2] ?? "");
    const rawText = lines.slice(timingIdx + 1).join("\n");
    const { speaker, text } = extractSpeaker(rawText);

    const id = idLine ?? String(syntheticId++);
    const { blockId, blockIndex } = parseBlockId(id);

    cues.push({ id, blockId, blockIndex, startTime, endTime, speaker, text });
  }

  // Group cues into speaker blocks, preserving order of first appearance
  const blockMap = new Map<string, SpeakerBlock>();
  const blockOrder: string[] = [];

  for (const cue of cues) {
    if (blockMap.has(cue.blockId)) {
      const block = blockMap.get(cue.blockId)!;
      block.cues.push(cue);
      block.endTime = Math.max(block.endTime, cue.endTime);
    } else {
      blockMap.set(cue.blockId, {
        blockId: cue.blockId,
        speaker: cue.speaker,
        startTime: cue.startTime,
        endTime: cue.endTime,
        cues: [],
      });
      blockOrder.push(cue.blockId);
    }
  }

  const blocks = blockOrder.map((id) => blockMap.get(id)!);
  return { cues, blocks };
}
