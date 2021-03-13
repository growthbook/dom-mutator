For those times you need to apply DOM changes on top of HTML you don't control.  The underlying site may lazy load elements, constantly re-render with React, or do other weird stuff.  **dom-mutator** handles all of that for you.

## Demo

<style>
.demo-holder {
  display: flex;
  flex-wrap: wrap;
  border: 1px dotted #ddd;
  margin-bottom: 20px;
}
.demo {
  width: 50px;
  height: 500px;
  background: #ddd;
  border-radius: 5px;
  margin: 10px;
  line-height: 50px;
  text-align: center;
  font-size: 18px;
}
</style>

<div class="demo-holder">
  <div class="demo">a</div>
  <div class="demo">b</div>
  <div class="demo">c</div>
  <div class="demo">d</div>
</div>

<div>
  <h4>Mutation: Make Uppercase</h4>
  <button id='uppercase'>Start</button>
  <button id='revert'>Stop</button>
</div>

<script type="module">
import mutate from "https://unpkg.com/dom-mutator@0.3.1/dist/dom-mutator.esm.js";

const demoHolder = document.querySelector(".demo-holder");
let i = 5;
window.setInterval(() => {
  if(i>=10) {
    demoHolder.innerHTML = "";
    i = 1;
    return;
  }

  const div = document.createElement("div");
  div.innerHTML = String.fromCharCode(i+96);
  div.className = "demo";
  demoHolder.append(div);
  i++;
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

```js
import mutate from "dom-mutator"

// Start mutating
const mutation = mutate.html(".demo", html => html.toUpperCase());

// Stop mutating
mutation.revert();
```