For those times you need to apply persistent DOM changes on top of HTML you don't control.

*  No dependencies, written in Typescript, 100% test coverage
*  Super fast and light-weight (1Kb gzipped)
*  Persists mutations even if the underlying element is updated externally (e.g. by a React render)
*  Picks up new matching elements that are added to the DOM
*  Easily remove a mutation at any time

## Demo

<style>
.demo-holder {
  display: flex;
  flex-wrap: wrap;
  border: 1px dotted #ddd;
  margin-bottom: 20px;
  padding: 10px;
  min-height: 72px;
}
.demo {
    width: 50px;
    height: 50px;
    background: #159957;
    border-radius: 5px;
    font-weight: bold;
    color: #fff;
    border: 1px solid #ccc;
    line-height: 50px;
    text-align: center;
    font-size: 18px;
    margin-right: 10px;
}
.apply-area {
  margin-bottom: 10px;
}
#uppercase, #revert {
    padding: 7px 20px;
    color: #fff;
    border: 0;
    border-radius: 5px;
}
#uppercase {
    background: #15678a;
}
#revert {
  background: #f36868;
}
</style>

```js
import mutate from "dom-mutator"

// Start mutating
const mutation = mutate.html(".demo", html => html.toUpperCase());

// Stop mutating
mutation.revert();
```

<div class="apply-area">
  <button id='uppercase'>Start Mutating</button>
  <button id='revert'>Stop Mutating</button>
</div>
<div class="demo-holder">
  <div class="demo">a</div>
</div>

## Usage

`yarn add dom-mutator` OR `npm install --save dom-mutator`.

```js
import mutate from "dom-mutator";

mutate.html(".demo", html => html.toUpperCase());

mutate.classes("div.greeting", classes => classes.add("new-class"));

mutate.attr(".get-started", "title", (oldVal) => "This is my new title attribute");
```

And there's even a declarative option if you don't want to use callbacks:

```js
import mutate from "dom-mutator";

mutate.declarative({
  selector: "h1",
  action: "set",
  attribute: "html",
  value: "hello world"
});
```

`attribute` can be "html" or any valid html attribute (title, class, href, etc.).

`action` can be "set" or "append".  If the attribute is "class", there is an additional "remove" action you can use.



<script type="module">
import mutate from "https://unpkg.com/dom-mutator@0.3.1/dist/dom-mutator.esm.js";

const demoHolder = document.querySelector(".demo-holder");
window.setInterval(() => {
  const els = document.querySelectorAll(".demo");
  if(els.length > 10) {
    demoHolder.innerHTML = "";
    return;
  }

  els.forEach((el,i) => {
    el.innerHTML = String.fromCharCode(
      Math.floor(Math.random()*26+97)
    );
  });

  const div = document.createElement("div");
  div.innerHTML = "a";
  div.className = "demo";
  demoHolder.append(div);
}, 500);

let controller = null;
document.querySelector("#uppercase").addEventListener("click", (e) => {
  e.preventDefault();
  if(controller) return;
  controller = mutate.html(".demo", html => html.toUpperCase());
});
document.querySelector("#revert").addEventListener("click", (e) => {
  e.preventDefault();
  if(!controller) return;
  controller.revert();
  controller = null;
});
</script>
