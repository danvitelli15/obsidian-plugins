import assert from "node:assert/strict";
import { describe, it, suite } from "node:test";
import { deserializeVtt, extractSpeaker, parseBlockId, parseTimestamp } from "./vtt.ts";

suite("VTT Parser Tests", () => {
  describe("parseTimestamp", () => {
    it("parses MM:SS.mmm", () => {
      assert.ok(Math.abs(parseTimestamp("01:30.500") - 90.5) < 0.001);
    });

    it("parses HH:MM:SS.mmm", () => {
      assert.ok(Math.abs(parseTimestamp("01:02:03.000") - 3723) < 0.001);
    });

    it("handles comma as decimal separator", () => {
      assert.ok(Math.abs(parseTimestamp("00:11,000") - 11) < 0.001);
    });

    it("parses zero timestamp", () => {
      assert.equal(parseTimestamp("00:00.000"), 0);
    });
  });

  describe("extractSpeaker", () => {
    it("extracts speaker and text from a voice tag", () => {
      assert.deepEqual(extractSpeaker("<v Roger Bingham>Hello there"), {
        speaker: "Roger Bingham",
        text: "Hello there",
      });
    });

    it("trims whitespace from speaker and text", () => {
      assert.deepEqual(extractSpeaker("<v  Jane Doe >  some text  "), {
        speaker: "Jane Doe",
        text: "some text",
      });
    });

    it("returns empty speaker when no voice tag", () => {
      assert.deepEqual(extractSpeaker("Just plain text"), {
        speaker: "",
        text: "Just plain text",
      });
    });

    it("handles multiline text after voice tag", () => {
      const result = extractSpeaker("<v Speaker>line one\nline two");
      assert.equal(result.speaker, "Speaker");
      assert.equal(result.text, "line one\nline two");
    });
  });

  describe("parseBlockId", () => {
    it("splits uuid-N into blockId and blockIndex", () => {
      assert.deepEqual(parseBlockId("abc123-2"), { blockId: "abc123", blockIndex: 2 });
    });

    it("handles index 0", () => {
      assert.deepEqual(parseBlockId("abc123-0"), { blockId: "abc123", blockIndex: 0 });
    });

    it("handles full UUID with trailing index", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000-3";
      assert.deepEqual(parseBlockId(id), {
        blockId: "550e8400-e29b-41d4-a716-446655440000",
        blockIndex: 3,
      });
    });

    it("treats a plain string with no dash as its own block", () => {
      assert.deepEqual(parseBlockId("nohyphen"), { blockId: "nohyphen", blockIndex: 0 });
    });
  });

  describe("deserializeVtt", () => {
    it("skips the WEBVTT header", () => {
      const vtt = "WEBVTT\n\n00:01.000 --> 00:02.000\nHello";
      const { cues } = deserializeVtt(vtt);
      assert.equal(cues.length, 1);
    });

    it("parses a cue with no ID and no speaker", () => {
      const vtt = "WEBVTT\n\n00:01.000 --> 00:02.000\nHello world";
      const { cues } = deserializeVtt(vtt);
      const cue = cues[0]!;
      assert.ok(Math.abs(cue.startTime - 1) < 0.001);
      assert.ok(Math.abs(cue.endTime - 2) < 0.001);
      assert.equal(cue.text, "Hello world");
      assert.equal(cue.speaker, "");
    });

    it("parses a cue with an explicit ID", () => {
      const vtt = "WEBVTT\n\nmyid-0\n00:01.000 --> 00:02.000\n<v Alice>Hi";
      const { cues } = deserializeVtt(vtt);
      const cue = cues[0]!;
      assert.equal(cue.id, "myid-0");
      assert.equal(cue.blockId, "myid");
      assert.equal(cue.blockIndex, 0);
      assert.equal(cue.speaker, "Alice");
      assert.equal(cue.text, "Hi");
    });

    it("groups cues sharing a blockId into one SpeakerBlock", () => {
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
      ].join("\n");

      const { blocks, cues } = deserializeVtt(vtt);
      assert.equal(cues.length, 2);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0]!.speaker, "Alice");
      assert.equal(blocks[0]!.cues.length, 2);
      assert.ok(Math.abs(blocks[0]!.startTime - 1) < 0.001);
      assert.ok(Math.abs(blocks[0]!.endTime - 5) < 0.001);
    });

    it("produces separate blocks for different speakers", () => {
      const vtt = [
        "WEBVTT",
        "",
        "aaa-0",
        "00:01.000 --> 00:02.000",
        "<v Alice>Hello",
        "",
        "bbb-0",
        "00:02.000 --> 00:03.000",
        "<v Bob>Hi there",
      ].join("\n");

      const { blocks } = deserializeVtt(vtt);
      assert.equal(blocks.length, 2);
      assert.equal(blocks[0]!.speaker, "Alice");
      assert.equal(blocks[1]!.speaker, "Bob");
    });

    it("skips NOTE blocks", () => {
      const vtt = "WEBVTT\n\nNOTE This is a comment\n\n00:01.000 --> 00:02.000\nHello";
      const { cues } = deserializeVtt(vtt);
      assert.equal(cues.length, 1);
    });

    it("normalizes CRLF line endings", () => {
      const vtt = "WEBVTT\r\n\r\n00:01.000 --> 00:02.000\r\nHello";
      const { cues } = deserializeVtt(vtt);
      assert.equal(cues.length, 1);
      assert.equal(cues[0]!.text, "Hello");
    });
  });
});
