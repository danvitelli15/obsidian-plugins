import { Plugin, TextFileView, WorkspaceLeaf } from "obsidian";
import { deserializeVtt } from "./vtt";

export const VIEW_TYPE_WEBVTT = "webvtt-viewer";

export class WebVTTViewer extends TextFileView {
  private _data: string = "";

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

export default class WebVTTViewerPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_WEBVTT, (leaf) => new WebVTTViewer(leaf));
    this.registerExtensions(["vtt"], VIEW_TYPE_WEBVTT);
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_WEBVTT);
  }
}
