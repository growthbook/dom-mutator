# DOM Mutator

Apply persistent DOM mutations on top of anything (static HTML, React, Vue, etc.)

```ts
import mutate from "dom-mutator";
mutate("h1", "setHTML", "Hello World");
```

Features:

*  No dependencies, written in Typescript, 100% test coverage
*  Super fast and light-weight (1Kb gzipped)
*  Mutations apply to all current and future elements that match the selector
*  Mutations persist even if the underlying element is updated externally (e.g. by a React render)
*  Ability to remove a mutation at any time and go back to the original value

`yarn add dom-mutator` OR `npm install --save dom-mutator`.

![Build Status](https://github.com/growthbook/dom-mutator/workflows/CI/badge.svg)

## Basic Usage

```ts
import mutate from "dom-mutator";

// mutate(css selector, mutation type, value)
const stop = mutate("#greeting", "setHTML", "hello");

// works even if the selector doesn't exist yet
document.body.innerHTML += "<div id='greeting'></div>";

//**** div innerHTML = "hello" at this point!

// external changes are ignored and the mutation persists
document.getElementById('greeting').innerHTML = 'something new';

//**** div innerHTML = "hello" still!

// Stop mutating the element
stop();

//**** div innerHTML = "something new" (the last external value)
```

## Available Mutation Types

-  addClass
-  removeClass
-  setHTML
-  appendHTML
-  setAttribute

For `setAttribute`, the "value" is in the format `{attribute}="{value}"` (e.g. `href="/about"`).

## How it Works

When you call `mutate`, we start watching the document for elements matching the selector to appear. We do this with a single shared MutationObserver on the body.

When a matching element is found, we attach a separate MutationObserver filtered to the exact attribute being mutated.  If an external change happens (e.g. from a React render), we re-apply your mutation on top of the new baseline value.

When `stop` is called, we undo the change and go back to the last externally set value. We also disconnect the element's MutationObserver to save resources.

## Pausing / Resuming the Global MutationObserver

While the library is waiting for elements to appear, it runs `document.querySelectorAll` every time a batch of elements is added or removed from the DOM.

This is performant enough in most cases, but if you want more control, you can pause and resume the global MutationObserver on demand.

One example use case is if you are making a ton of DOM changes that you know have nothing to do with the elements you are watching. You would pause right before making the changes and resume after.

```ts
import {disconnectGlobalObserver, connectGlobalObserver} from "dom-mutator";

// Pause
disconnectGlobalObserver();

// ... do a bunch of expensive DOM updates

// Resume
connectGlobalObserver();
```

## Developing

Built with [TSDX](https://github.com/formium/tsdx).

`npm start` or `yarn start` to rebuild on file change.

`npm run build` or `yarn build` to bundle the package to the `dist` folder.

`npm test --coverage` or `yarn test --coverage` to run the Jest test suite with coverage report.

`npm run lint --fix` or `yarn lint --fix` to lint your code and autofix problems when possible.
