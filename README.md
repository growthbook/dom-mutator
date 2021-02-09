# DOM Mutator

![Build Status](https://github.com/growthbook/dom-mutator/workflows/CI/badge.svg)

**Development In Progress - DO NOT USE!!!**

Apply persistent DOM mutations on top of anything (static HTML, React, Vue, etc.)

Particularly useful for A/B testing.

Features:

*  No dependencies, written in Typescript, 100% test coverage
*  Light-weight (< 1Kb) and super fast (using MutationObservers)
*  If an element doesn't exist yet, wait for it to appear
*  If an element is updated externally (e.g. a React render), re-apply the mutation immediately
*  Ability to revert a mutation at any time

`yarn add dom-mutator` OR `npm install --save dom-mutator`.

## Basic Usage

```ts
import mutate from "dom-mutator";

// mutate(css selector, mutation type, value)
const revert = mutate("#greeting", "setHTML", "hello");

// works even if the selector doesn't exist yet
document.body.innerHTML += "<div id='greeting'></div>";

//**** div innerHTML = "hello" at this point!

// external changes are ignored and the mutation persists
document.getElementById('greeting').innerHTML = 'something new';

//**** div innerHTML = "hello" still!

// Stop mutating the element
revert();

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

When you call `mutate`, we check to see if the selector exists in the document.  If not, we use a global MutationObserver on document.body to wait for the element to appear.  

Once a matching element is found, we apply the change.  We then attach a separate MutationObserver, just for the element and attributes being modified.  That second MutationObserver will re-apply the change if needed.

When revert is called, we undo the change and go back to the last externally set value. We also disconnect the element MutationObserver.

## Pausing / Resuming the Global MutationObserver

While the library is waiting for elements to appear, it runs `document.querySelector` every time a batch of elements is added to the DOM.

This is fast enough for most cases, but if you want more control, you can pause and resume the global MutationObserver.

One example use case is if you are making a ton of DOM changes that you know have nothing to do with the element you are watching. You would pause right before making the changes and resume after.

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

`npm run lint --fix` or `yarn lint --fix` to lint your code and autofix probelsm when possible.