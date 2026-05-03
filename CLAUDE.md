# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a pnpm monorepo serving as a development environment for Obsidian plugins. The repository itself is an Obsidian vault — plugins are developed in `.obsidian/plugins/<plugin-name>/` and tested live by opening this directory in Obsidian.

## Build

`webvtt-viewer` uses esbuild to bundle `src/` into a single `main.js` in the plugin root. From the plugin directory:

```sh
cd .obsidian/plugins/webvtt-viewer
pnpm build
```

Or from the repo root:

```sh
pnpm --filter webvtt-viewer build
```

Type-check without emitting:

```sh
pnpm --filter webvtt-viewer tsc --noEmit
```

`main.js` is what Obsidian loads. After rebuilding, reload the plugin in Obsidian via Settings → Community Plugins → disable/enable, or use the "Reload app without saving" command.

There are no tests or lint scripts configured yet.

## Architecture

**Monorepo layout**: `pnpm-workspace.yaml` points to `.obsidian/plugins/*` — each plugin directory is its own pnpm workspace package. Shared TypeScript config lives in `tsconfig.base.json` at the root and is extended by each plugin's `tsconfig.json`.

**Plugin entry point**: Each plugin has a `main.ts` that exports a default class extending Obsidian's `Plugin`. Obsidian calls `onload()` at activation and `onunload()` at deactivation.

**Test vault**: The repo root is the Obsidian vault. Sample VTT files for testing live in `VTT Veiwer/`. When Obsidian is open on this directory, changes to `main.js` take effect after reloading the plugin.

**TypeScript settings** (from `tsconfig.base.json`): strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, target `esnext`, module `nodenext`.

## Adding a New Plugin

1. Create a directory under `.obsidian/plugins/<name>/`
2. Add `package.json`, `manifest.json`, and `tsconfig.json` (extending `../../../tsconfig.base.json`)
3. Write `main.ts` with a default export extending `Plugin`
4. The plugin will be auto-discovered by pnpm workspace
