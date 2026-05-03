import { TextFileView, WorkspaceLeaf } from "obsidian";
import { deserializeVtt, type Transcript } from "./vtt.js";

export const VIEW_TYPE_WEBVTT = "webvtt-viewer";

export class WebVTTViewer extends TextFileView {
  private _data: string = "";
  private _transcript: Transcript | null = null;

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
    console.log(this._transcript);
    this.renderContent(this.contentEl);
  }

  private renderCaption(caption: string, parent: HTMLElement) {
    parent.createEl("p", { text: caption });
  }

  private renderContent(parent: HTMLElement) {
    parent.empty();

    const captions = this._data.split("\n\n");

    const contentDiv = parent.createEl("div");

    captions.forEach((caption) => {
      this.renderCaption(caption, contentDiv);
    });
  }
}
