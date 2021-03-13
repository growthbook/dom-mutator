For those times you need to apply DOM changes on top of HTML you don't control.  The underlying site may lazy load elements, constantly re-render with React, or do other weird stuff.  **dom-mutator** handles all of that for you.

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
    background: #129462;
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
  margin-bottom: 30px;
}
</style>

<p>Works even when new elements are created or the original value changes!</p>
<div class="demo-holder">
  <div class="demo">a</div>
</div>

<div class="apply-area">
  <h4>Apply Mutation</h4>
  <button id='uppercase'>Start</button>
  <button id='revert'>Stop</button>
</div>


```js
import mutate from "dom-mutator"

// Start mutating
const mutation = mutate.html(".demo", html => html.toUpperCase());

// Stop mutating
mutation.revert();
```



<script type="module">
import mutate from "https://unpkg.com/dom-mutator@0.3.1/dist/dom-mutator.esm.js";

const demoHolder = document.querySelector(".demo-holder");
window.setInterval(() => {
  const els = document.querySelectorAll(".demo");
  if(els.length > 10) {
    demoHolder.innerHTML = "";
    return;
  }

  els.forEach(el => {
    el.innerHTML = String.fromCharCode(el.innerHTML.charCodeAt(0)+1);
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
