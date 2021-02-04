# DOM Mutator

**Development In Progress - DO NOT USE!!!**

Apply persistent DOM mutations on top of anything (static HTML, React, Vue, etc.)

Particularly useful for A/B testing.

Features:

*  No dependencies
*  Super fast and light-weight
*  If an element doesn't exist yet, wait for it
*  If an element is updated externally (e.g. a React render), re-apply the mutation immediately
*  Ability to revert a mutation at any time

## Basic Usage

```ts
import {mutate} from "@growthbook/mutate";

// css selector, mutation type, value
mutate("h1", "setHTML", "Hello <strong>World</strong>");
```

## Available Mutations

-  addClass
-  removeClass
-  setHTML
-  appendHTML
-  setAttribute

For `setAttribute`, the "value" is in the format `{attribute}="{value}"` (e.g. `href="/about"`)

## Reverting

The `mutate` function returns a revert callback.  Use that to revert the mutation and remove all event listeners.

```ts
const revert = mutate("h1", "setHTML", "Hello <strong>World</strong>");

// later
revert();
```

## Developing

Built with [TSDX](https://github.com/formium/tsdx).

We use [np](https://github.com/sindresorhus/np) to publish to npm.
