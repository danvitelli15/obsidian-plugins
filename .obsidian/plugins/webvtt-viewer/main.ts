import { Notice, Plugin } from "obsidian";

export default class WebVTTViewerPlugin extends Plugin {
  async onload() {
    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      new Notice("Click");
    });
  }

  onunload() {}
}
