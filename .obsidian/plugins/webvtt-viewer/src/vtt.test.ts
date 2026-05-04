import assert from "node:assert/strict";
import { describe, it, suite } from "node:test";
import {
  _extractSpeaker,
  _groupIntoBlocks,
  _parseBlockId,
  _parseTimestamp,
  deserializeVtt,
  type Cue,
} from "./vtt.ts";

const makeCue = (overrides: Partial<Cue> & { blockId: string }): Cue => ({
  id: overrides.blockId + "-0",
  blockIndex: 0,
  startTime: 0,
  endTime: 1,
  speaker: "",
  text: "",
  ...overrides,
});

suite("VTT Parser Tests", () => {
  describe("_parseTimestamp", () => {
    it("parses MM:SS.mmm", () => {
      assert.ok(Math.abs(_parseTimestamp("01:30.500") - 90.5) < 0.001);
    });

    it("parses HH:MM:SS.mmm", () => {
      assert.ok(Math.abs(_parseTimestamp("01:02:03.000") - 3723) < 0.001);
    });

    it("handles comma as decimal separator", () => {
      assert.ok(Math.abs(_parseTimestamp("00:11,000") - 11) < 0.001);
    });

    it("parses zero timestamp", () => {
      assert.equal(_parseTimestamp("00:00.000"), 0);
    });
  });

  describe("_extractSpeaker", () => {
    it("extracts speaker and text from a voice tag", () => {
      assert.deepEqual(_extractSpeaker("<v Roger Bingham>Hello there"), {
        speaker: "Roger Bingham",
        text: "Hello there",
      });
    });

    it("trims whitespace from speaker and text", () => {
      assert.deepEqual(_extractSpeaker("<v  Jane Doe >  some text  "), {
        speaker: "Jane Doe",
        text: "some text",
      });
    });

    it("returns empty speaker when no voice tag", () => {
      assert.deepEqual(_extractSpeaker("Just plain text"), {
        speaker: "",
        text: "Just plain text",
      });
    });

    it("handles multiline text after voice tag", () => {
      const result = _extractSpeaker("<v Speaker>line one\nline two");
      assert.equal(result.speaker, "Speaker");
      assert.equal(result.text, "line one\nline two");
    });
  });

  describe("_parseBlockId", () => {
    it("splits uuid-N into blockId and blockIndex", () => {
      assert.deepEqual(_parseBlockId("abc123-2"), { blockId: "abc123", blockIndex: 2 });
    });

    it("handles index 0", () => {
      assert.deepEqual(_parseBlockId("abc123-0"), { blockId: "abc123", blockIndex: 0 });
    });

    it("handles full UUID with trailing index", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000-3";
      assert.deepEqual(_parseBlockId(id), {
        blockId: "550e8400-e29b-41d4-a716-446655440000",
        blockIndex: 3,
      });
    });

    it("treats a plain string with no trailing number as its own block", () => {
      assert.deepEqual(_parseBlockId("nohyphen"), { blockId: "nohyphen", blockIndex: 0 });
    });
  });

  describe("_groupIntoBlocks", () => {
    it("returns an empty array for no cues", () => {
      assert.deepEqual(_groupIntoBlocks([]), []);
    });

    it("groups cues with the same blockId into one block", () => {
      const cues = [
        makeCue({ blockId: "uuid", blockIndex: 0, id: "uuid-0", startTime: 1, endTime: 3, speaker: "Alice", text: "First" }),
        makeCue({ blockId: "uuid", blockIndex: 1, id: "uuid-1", startTime: 3, endTime: 5, speaker: "Alice", text: "Second" }),
      ];
      const blocks = _groupIntoBlocks(cues);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0]!.speaker, "Alice");
      assert.equal(blocks[0]!.cues.length, 2);
      assert.equal(blocks[0]!.startTime, 1);
      assert.equal(blocks[0]!.endTime, 5);
    });

    it("produces separate blocks for different blockIds", () => {
      const cues = [
        makeCue({ blockId: "aaa", speaker: "Alice" }),
        makeCue({ blockId: "bbb", speaker: "Bob" }),
      ];
      const blocks = _groupIntoBlocks(cues);
      assert.equal(blocks.length, 2);
      assert.equal(blocks[0]!.speaker, "Alice");
      assert.equal(blocks[1]!.speaker, "Bob");
    });

    it("preserves order of first appearance", () => {
      const cues = [
        makeCue({ blockId: "bbb", speaker: "Bob" }),
        makeCue({ blockId: "aaa", speaker: "Alice" }),
      ];
      const blocks = _groupIntoBlocks(cues);
      assert.equal(blocks[0]!.speaker, "Bob");
      assert.equal(blocks[1]!.speaker, "Alice");
    });

    it("tracks endTime as the max across cues in a block", () => {
      const cues = [
        makeCue({ blockId: "uuid", id: "uuid-0", startTime: 1, endTime: 3 }),
        makeCue({ blockId: "uuid", id: "uuid-1", startTime: 3, endTime: 7 }),
        makeCue({ blockId: "uuid", id: "uuid-2", startTime: 5, endTime: 6 }),
      ];
      assert.equal(_groupIntoBlocks(cues)[0]!.endTime, 7);
    });
  });

  describe("deserializeVtt (integration)", () => {
    it("parses cues and groups them into blocks end-to-end", () => {
      const vtt = [
        "WEBVTT",
        "",
        "uuid-0",
        "00:01.000 --> 00:03.000",
        "<v Alice>First",
        "",
        "uuid-1",
        "00:03.000 --> 00:05.000",
        "<v Alice>Second",
        "",
        "other-0",
        "00:05.000 --> 00:06.000",
        "<v Bob>Hi",
      ].join("\n");

      const { cues, blocks } = deserializeVtt(vtt);
      assert.equal(cues.length, 3);
      assert.equal(blocks.length, 2);
      assert.equal(blocks[0]!.speaker, "Alice");
      assert.equal(blocks[1]!.speaker, "Bob");
    });

    it("skips WEBVTT header, NOTE, STYLE, and REGION blocks", () => {
      const vtt = "WEBVTT\n\nNOTE comment\n\n00:01.000 --> 00:02.000\nHello";
      assert.equal(deserializeVtt(vtt).cues.length, 1);
    });

    it("normalizes CRLF line endings", () => {
      const vtt = "WEBVTT\r\n\r\n00:01.000 --> 00:02.000\r\nHello";
      const { cues } = deserializeVtt(vtt);
      assert.equal(cues[0]!.text, "Hello");
    });
  });
});
