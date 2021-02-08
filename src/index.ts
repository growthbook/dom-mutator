export type MutationType =
  | 'addClass'
  | 'removeClass'
  | 'appendHTML'
  | 'setHTML'
  | 'setAttribute';

  
let unapplyFn: Function;

const applyMutation = (targetNode: Element, type: MutationType, value:string) => {
 if(type === 'addClass') {
  if(!targetNode.className.match(new RegExp("\\b"+value+"\\b"))) {
    let originalClassName = targetNode.className;
    unapplyFn = () => {
      targetNode.className = originalClassName;
    };
   targetNode.className += " "+value;
  }
 } else if (type === "removeClass") {
   if(targetNode.className.match(new RegExp("\\b"+value+"\\b"))) {
    let originalClassName = targetNode.className;
    unapplyFn = () => {
      targetNode.className = originalClassName;
    };
    targetNode.className = targetNode.className.replace(value, '');
   }
 } else if (type === "appendHTML") {
   // todo: make sure if there is a mutation event, we don't reapply this in a stupid way
  let originalHTML = targetNode.innerHTML;
  unapplyFn = () => {
    targetNode.innerHTML = originalHTML;
  };
  targetNode.innerHTML = targetNode.innerHTML+value;
 } else if (type === "setHTML") {
  let originalHTML = targetNode.innerHTML;
  unapplyFn = () => {
    targetNode.innerHTML = originalHTML;
  };
  targetNode.innerHTML = value;
 } else if (type === "setAttribute") {
  //targetNode.setAttribute(value); set Attribute needs name/value pairs. 
  // prop="value"
  let rx = /^(.*)=\"(.*)\"/;
  let match = rx.exec(value);
  if(match?.length && match.length === 3) {
    let key = match[1];
    let val = match[2];
    let originalValue = targetNode.getAttribute(key);
    if(originalValue) {
      unapplyFn = () => {
        targetNode.setAttribute(key, originalValue!);
      };
    } else {
      unapplyFn = () => {
        targetNode.removeAttribute(key);
      };
    }
    targetNode.setAttribute(key, val);
  }
  
 }
}

const mutationConfig = {
  childList: true
, subtree: true
, attributes: false
, characterData: false
};

export function mutate(
  selector: string,
  type: MutationType,
  value: string
): () => void {
  // once we've modified a node, we want to monitor it for a change, stub. 
  let elObserver: MutationObserver;
  // document level observer: checks for new nodes added
  let observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes) return
      // is it here now: we could select just this one node, but this is simpler:
      const el = document.querySelector(selector);
      if (el) {
        applyMutation(el, type, value);
        elObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if(mutation.type === "attributes" && (type === "setAttribute" || type === "addClass" || type === "removeClass")) {
              applyMutation(el, type, value);
            } else if (type === "setHTML" || type === "appendHTML") {
              applyMutation(el, type, value);
            }
          });
        });
        elObserver.observe(el, mutationConfig);
      }
    })
  });
  
  // check if the selector exists:
  const el = document.querySelector(selector);
  if (!el) {
    // it doesn't exist, wait for it:
    observer.observe(document.body, mutationConfig);
  } else {
    applyMutation(el, type, value);
    // add mutation observer to re-apply mutations if needed
    elObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if(mutation.type === "attributes" && (type === "setAttribute" || type === "addClass" || type === "removeClass")) {
          applyMutation(el, type, value);
        } else if (type === "setHTML" || type === "appendHTML") {
          applyMutation(el, type, value);
        }
      });
    });
    elObserver.observe(el, mutationConfig);
  }

  //console.log(selector, type, value);

  return () => {
    // TODO: revert value back to previous
    if(unapplyFn) {
      unapplyFn();
    }
    // TODO: stop event listeners and observers
    observer.disconnect();
    if(elObserver) elObserver.disconnect();
    console.log('revert');
  };
}
