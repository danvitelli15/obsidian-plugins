import { Plugin } from "obsidian";
import { VIEW_TYPE_WEBVTT, WebVTTViewer } from "./web-vtt-viewer.js";

export default class WebVTTViewerPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_WEBVTT, (leaf) => new WebVTTViewer(leaf));
    this.registerExtensions(["vtt"], VIEW_TYPE_WEBVTT);
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_WEBVTT);
  }
}
