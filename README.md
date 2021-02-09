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

## Basic Usage

```ts
import mutate from "@growthbook/mutate";

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

## Developing

Built with [TSDX](https://github.com/formium/tsdx).

We use [np](https://github.com/sindresorhus/np) to publish to npm.
