<p align="center">
  <img src="images/icon.png" width="96" alt="Workcard icon">
</p>

<h1 align="center">Workcard</h1>

<p align="center">
  See your <code>.w.md</code> work cards the way the workflow runs them: cards, forms, gates and records.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-blue.svg" alt="License: GPLv3"></a>
</p>

Work cards are Markdown files (`.w.md`) that specify reliable AI workflows.
This extension styles the built-in Markdown preview for them.
Other Markdown files are left untouched.

## Features

- **Cards** with their `agent/skill` in the corner. Agent cards are purple.
- **Forms** with their name, inputs and the record each input fills.
- **Go/nogo gates** with the `check` bubble before the last branch.
- **In/out bubbles** and **records** with their `select` path.
- **Six targets**, switched from the **W** menu in the top-right corner.

## Targets

| Target     | Shows                                                        |
| ---------- | ------------------------------------------------------------ |
| `full`     | Everything, with boxes, bubbles and labels                   |
| `screen`   | Like full, without nested quotes and front matter            |
| `document` | A plain doc: like screen, without nogo, boxes or colors      |
| `flow`     | Only cards, forms, gates, bubbles and records                |
| `receipt`  | Only records, one per line. Printing uses this target too    |
| `disabled` | The plain Markdown preview, as if the extension were off     |

## Usage

1. Open a `.w.md` file.
2. Run **Markdown: Open Preview to the Side** (`Ctrl+K V`, or `Cmd+K V` on macOS).
3. Click the **W** icon in the top-right corner of the preview and pick a target.

The target is kept while the preview stays open.

## Requirements

VS Code 1.90 or newer.

## Install from a VSIX

```sh
npx @vscode/vsce package
code --install-extension wmd-*.vsix
```

## Develop

1. Clone this repo and open its folder in VS Code (`code .`).
   Don't clone it under `~/.vscode/extensions`, VS Code won't load it from there.
2. Press `F5` (**Run Extension**). It starts the minifier in watch mode
   and opens a second VS Code window with the extension loaded.
3. In that window, open a `.w.md` file and run **Markdown: Open Preview to the Side**.
4. After editing `media/`, run **Developer: Reload Window** in the second window.
   Requires Node.js.

`media/palette.css` is copied unedited from project-branding by
`scripts/vendor-palette.sh` (`main` by default). `media/vendor/highlight.js` is
highlight.js core and JSON, bundled by `scripts/vendor-highlight.sh` (latest 11.x by default).

## Release

1. In GitHub, open **Actions** > **Release** > **Run workflow**.
2. Enter the new version (for example `0.3.2`).
   Notes are the `## Unreleased` section of `CHANGELOG.md`, written as the changes land.
   The workflow dates that section as the new version and leaves a fresh `## Unreleased`.
3. The workflow commits `Release X.Y.Z` on main (signed by GitHub), tags `vX.Y.Z`, builds the
   `.vsix` and attaches it to a GitHub Release with the changelog section as notes.
4. Approve the `marketplace` deployment in the run to publish to the Marketplace.

Pushing a `v*` tag by hand still works: the workflow checks that the tag matches `package.json`
and continues from step 3.

Every PR and push to main also builds the `.vsix` as a downloadable CI artifact.

One-time setup:

1. Create the publisher `enterprise-r` at <https://marketplace.visualstudio.com/manage>.
2. On the publisher's **Trusted Publishing** page, create a policy with owner `enterprise-r`,
   repository `vscode-wmd-plugin`, workflow `release.yml` and environment `marketplace`.
3. In the repo settings, create the environment `marketplace` with required reviewers.
   No token or secret is needed.

Report bugs on [GitHub Issues](https://github.com/enterprise-r/vscode-wmd-plugin/issues).

## License

[GPL-3.0-only](LICENSE)

## About

Made by [Enterprise-R](https://www.enterprise-r.com).
Contact: [info@enterprise-r.com](mailto:info@enterprise-r.com).
