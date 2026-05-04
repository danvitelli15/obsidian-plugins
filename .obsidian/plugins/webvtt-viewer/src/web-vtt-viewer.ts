import { TextFileView, WorkspaceLeaf } from "obsidian";
import { deserializeVtt, type SpeakerBlock, type Transcript } from "./vtt.ts";

export const VIEW_TYPE_WEBVTT = "webvtt-viewer";

export class WebVTTViewer extends TextFileView {
  private _data: string = "";
  private _transcript: Transcript = {
    blocks: [],
    cues: [],
  };

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  clear(): void {
    this._data = "";
  }

  getDisplayText(): string {
    if (this.file) {
      return this.file.name;
    } else {
      return "WebVTT Viewer";
    }
  }

  getViewData(): string {
    return this._data;
  }

  getViewType(): string {
    return VIEW_TYPE_WEBVTT;
  }

  async onOpen() {
    this.contentEl.empty();
    this.renderContent(this.contentEl);
  }

  setViewData(data: string, clear: boolean): void {
    if (clear) {
      this.clear();
    }
    this._data = data;
    this._transcript = deserializeVtt(data);
    this.renderContent(this.contentEl);
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = (seconds % 60).toFixed(3);
    return `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(6, "0")}`;
  }

  private renderBlock(block: SpeakerBlock, parent: HTMLElement) {
    const blockEl = parent.createEl("div", { cls: "webvtt-block" });
    const blockHeaderEl = blockEl.createEl("div", { cls: "webvtt-block-header" });
    blockHeaderEl.createEl("h3", { text: block.speaker, cls: "webvtt-speaker" });
    blockHeaderEl.createEl("span", {
      text: `${this.formatTime(block.startTime)} → ${this.formatTime(block.endTime)}`,
      cls: "webvtt-timestamp",
    });
    block.cues.forEach((cue) => {
      blockEl.createEl("p", { text: cue.text });
    });
  }

  private renderContent(parent: HTMLElement) {
    parent.empty();
    const contentDiv = parent.createEl("div");
    this._transcript.blocks.forEach((block) => {
      this.renderBlock(block, contentDiv);
    });
  }
}
