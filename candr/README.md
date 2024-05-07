# Candr

Project management for JavaScript and TypeScript.

- [Features](#features)
- [Terminology](#terminology)
- [Getting Started](#getting-started)
- [Global Options](#global-options)
  - [Option: `--log-level <level>`](#option---log-level-level)
  - [Option: `--no-color`](#option---no-color)
  - [Option: `--filter <filter>`](#option---filter-filter)
  - [Option: `--filter-allow-root`](#option---filter-allow-root)
  - [Option: `--parallel`](#option---parallel)
  - [Option: `--stream`](#option---stream)
  - [Option: `--concurrency <count>`](#option---concurrency-count)
  - [Option: `--delay <seconds>`](#option---delay-seconds)
- [Core Commands](#core-commands)
- [Package Management Commands](#package-management-commands)
- [Official Commands](#official-commands)
- [Custom Commands](#custom-commands)
- [Why Candr?](#why-candr)

## Features

- Normalized `install`, `add`, and `remove` commands for package management.
  - Delegates to your preferred package manager (NPM, PNPM, Yarn).
  - Reduces the learning curve and cognitive load required to switch between package managers.
- Minimal but powerful core features.
  - Invoke scripts and local binaries succinctly and independently of the package manager (`can <script-or-bin>`).
  - Invoke packages without installing them (`can do <package>`).
- Extensible.
  - Choose the workflow that fits your project, adding only the commands you need, avoiding confusion and increasing security.
  - Easily implement custom commands, leveraging the Project Management API, and with increased discoverability provided by the plugin ecosystem.

## Terminology

The terminology of monorepos has become confused and inconsistent. Specifically, workspace can mean the whole monorepo (PNPM), or one package in a monorepo (NPM, Yarn). To try and avoid this confusion, the word "workspace" is avoided. Instead, the following terms are used:

- **Project**
  - The root of a repository.
  - Is itself a (root) package.
  - May contain other packages.
  - AKA: (mono)repo, root package, solution
- **Package**
  - Any directory with a `package.json` file that contains at least a `name` field.
  - May be one of many packages contained in a project.
  - AKA: module, library, component

## Getting Started

Install Candr globally.

```sh
npm add --global candr
```

> NOTE: Candr provides both the `can` and `candr` binaries. These are aliases for each other. Unless there's a conflict, the `can` binary is recommended for day-to-day use. It's faster to type and more fun to say.

Initialize Candr in your project. The `init` command is an (optional) convenience which ensures a `package.json` file exists, Corepack is configured, and Candr is a dev dependency. Installing Candr as a dev dependency ensures each project always uses a stable local version, regardless of the globally installed version.

```sh
# Auto detect the package manager in existing projects.
can init

# Specify the package manager to use in new projects.
can init npm@latest
can init pnpm@latest
can init yarn@latest
```

It is recommended that you avoid using the underlying package manager directly after switching to Candr. While it should be safe to do so, because Candr doesn't interfere with the normal operation of the package manager, it can lead to lock-in and unnecessary complexity.

Use Candr for simplified and normalized package management. The `install` command invokes your chosen package manager to actually install dependencies, ensuring that package manager configuration, credentials, and strategies work as expected. The `add` and `remove` commands modify `package.json` files directly, and then use your chosen package manger to apply the changes.

```sh
# Install dependencies defined in package.json files.
can install

# Add dependencies.
can add <packages...>

# Remove dependencies.
can remove <packages...>
```

Install plugin packages to add additional commands. Any project root dependency named `candr-plugin-*`, `@<scope>/candr-plugin-*`, or `@candr/plugin-*` is a plugin. No additional configuration needed.

```sh
# Install the official "run" command.
can add --dev @candr/plugin-run

# Run a script in every project package where it exists.
can run <script>
```

Use Candr to invoke package scripts or locally installed binaries.

```sh
can <script-or-bin> [args...]
```

> NOTE: Plugin and built-in commands take precedence, followed by package scripts, and finally local binaries. This will not invoke global binaries.

> NOTE: Local binaries _MUST_ be installed at the project root. This enables the common pattern of only installing dev dependencies at the project root, and avoids bin path inconsistencies between package managers.

Use Candr to invoke packages without installing them.

```sh
can do <package> [args...]
```

## Global Options

Global options apply to all Candr commands.

### Option: `--log-level <level>`

The value can be `silent`, `error`, `warn`, or `info`. The default is `info`.

### Option: `--no-color`

Disable color output.

### Option: `--filter <filter>`

> NOTE: This option has no effect in single package projects.

Filter packages by name, path, or by Git modified status. Heavily influenced by PNPM filters.

- `--filter my-package`: Include `my-package`.
- `--filter {./my-package}`: Include the package in the `./my-package` directory.
- `--filter [origin/head]`: Include packages which have modifications when compared to the Git `origin/head` reference.

Filter package names and directories can be glob patterns. Remember to quote glob patterns to prevent shell expansion.

- `--filter "@my-project/*"`: Include packages in the `@my-project` scope.
- `--filter "{./components/*}"`: Include packages in the `./components` directory.

Filters can be expanded to dependencies or dependents by using an ellipses (`...`) prefix or suffix.

- `--filter my-package...`: Include `my-package` and its dependencies.
- `--filter my-package^...`: Include `my-package` dependencies, but not `my-package` itself.
- `--filter ...my-package`: Include `my-package` and its dependents.
- `--filter ...^my-package`: Include `my-package` dependents, but not `my-package` itself.
- `--filter ...my-package...`: Include `my-package`, its dependencies, and its dependents.
- `--filter ...^my-package^...`: Include `my-package` dependencies and dependents, but not `my-package` itself.

Filters can be used to exclude packages when prefixed with `!`.

> NOTE: The order of inclusions and exclusions matters because filters are applied in order to progressively refine package selection.

- `--filter !my-package`: Exclude `my-package`.
- `--filter !...my-package`: Exclude `my-package` and its dependencies.

### Option: `--filter-allow-root`

> NOTE: This option has no effect in single package projects.

Allow filters to select the project root package. By default, the project root package cannot be selected in multi-package projects. This option does not select the root package by itself, but allows it be selected by filters.

### Option: `--parallel`

> NOTE: This option has no effect in single package projects.

Run commands in parallel across all selected packages. All packages are processed at the same time, without dependency awaiting. This is usually used to run commands like `start` which run continuously until manually stopped.

### Option: `--stream`

> NOTE: This option has no effect in single package projects.

Run commands with limited concurrency. Processing of each package will wait until dependencies have been processed. This is useful for speeding up commands like `build`, where some concurrency is possible, but dependent processing may fail if dependents are not processed first.

### Option: `--concurrency <count>`

> NOTE: This option has no effect in single package projects.

Set the maximum package concurrency when using the `--stream` option. The default is is `auto`, which will choose a reasonable number based on the number of available CPU cores.

The value can be `auto` or a positive non-zero integer.

### Option: `--delay <seconds>`

> NOTE: This option has no effect in single package projects.

Stagger package processing by ensuring a minimum delay between each package. This can be useful with the `--parallel` option and commands like `start` to preven dev server listener errors when starting multiple servers at once.

The value can be any positive number.

## Core Commands

Core commands are always available, and cannot be replaced by plugins.

- [do](./docs/command-do.md): Invoke packages without installing them.
- [init](./docs/command-init.md): Initialize Candr in a project.
- [list](./docs/command-list.md): List the packages in a project.

## Package Management Commands

Package management commands are always available, but they can be replaced by plugins. The default implementations delegate to your preferred package manager, but provide normalized options and behavior. The printed output will vary depending on the package manager used.

- [install](./docs/command-install.md): Install (aka: restore) project dependencies. This does not add new dependencies.
- [add](./docs/command-add.md): Add dependencies to the project.
- [remove](./docs/command-remove.md): Remove dependencies from the project.

Candr is committed to providing support for all major package managers, including any that arise in the future. But, we recognize that some may prefer less popular package managers, or that support may lag behind package manager adoption. Therefore, the built-in package management commands will always support replacement via plugin.

## Official Commands

Official commands are only available when the corresponding plugin is installed. Official command plugin packages are always named `@candr/plugin-<command>`.

- [run](../plugins/run/README.md): Run package scripts across multiple packages.
- [exec](../plugins/exec/README.md): Execute commands across multiple packages.
- [version](../plugins/version/README.md): Update package versions. (TODO)
- [publish](../plugins/publish/README.md): Publish packages. (TODO)

## Custom Commands

Anyone can contribute custom commands as Candr plugins. Just publish a package with a `candr-plugin-*` or `@<scope>/candr-plugin-*` name prefix. Get started by reading the [Custom Command Plugin Guide](./docs/custom-command-plugin-guide.md).

## Why Candr?

**TL;DR:** Candr is better than the alternatives for reducing complexity and cognitive load, while increasing flexibility, and avoiding lock-in.

Project management tools provide high-level monorepo orchestration features, while leaving package management to the package manager of your choice.

- **Nx:** Is extensible. But, it does not normalize package management, and is invested in up-selling their own cloud services.
- **Turborepo:** Is not extensible, does not normalize package management, and has a bias for the Vercel platform.
- **Lerna:** Is not extensible, does not normalize package management, and has been purchased by Nrwl which has led to it being positioned as secondary (and as a gateway) to Nx.
- **Rush:** Is not extensible, has a large number of github issues (Microsoft is notorious for stale backlogs), and its package manager support is outdated and heavy handed.

Using a package manager without a project management tool is also possible. But, they specialize in installing packages, not project management.

- **NPM:** Only low-level monorepo (aka: project management) features, and not extensible.
- **Yarn v1:** Equivalent to NPM. But, unsupported and with known dependency hoisting issues.
- **Yarn v2+ (Berry):** High-level monorepo features. But, poorly documented, is the most likely to have project incompatibilities.
- **PNPM:** High-level monorepo features. But, not extensible.
